import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Minimal file-backed datastore behind a repository API. It is intentionally
 * swappable: every access goes through the functions below, so moving to
 * Prisma/Postgres later means reimplementing this module, not the callers.
 * Single-process dev use; writes are atomic (temp file + rename).
 */

export interface Parent {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}
export interface Session {
  id: string;
  parentId: string;
  expiresAt: number;
}
export interface ConsentRecord {
  id: string;
  parentId: string;
  childId: string;
  scope: string;
  method: string;
  sensitive: boolean; // true for under-14 (PIPL sensitive personal info)
  at: number;
}
export interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  birthdate: string; // YYYY-MM-DD
  grade: string;
  pinHash: string; // "" if none
  dailyCallLimit: number; // 0 = unlimited
  consentId: string;
  createdAt: number;
}
export interface UsageEvent {
  id: string;
  childId: string;
  kind: string; // "explain" | "image" | ...
  estCostCents: number;
  at: number;
}

interface DBShape {
  parents: Parent[];
  sessions: Session[];
  children: ChildProfile[];
  consents: ConsentRecord[];
  usage: UsageEvent[];
}

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), ".data");
const DB_FILE = join(DATA_DIR, "accounts.json");

const empty: DBShape = { parents: [], sessions: [], children: [], consents: [], usage: [] };

let cache: DBShape | null = null;

function load(): DBShape {
  if (cache) return cache;
  try {
    if (existsSync(DB_FILE)) {
      cache = { ...empty, ...(JSON.parse(readFileSync(DB_FILE, "utf8")) as DBShape) };
    } else {
      cache = structuredClone(empty);
    }
  } catch {
    cache = structuredClone(empty);
  }
  return cache;
}

function save(db: DBShape): void {
  mkdirSync(dirname(DB_FILE), { recursive: true });
  const tmp = `${DB_FILE}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(tmp, JSON.stringify(db));
  renameSync(tmp, DB_FILE);
}

export function newId(): string {
  return randomBytes(16).toString("hex");
}

// ── Parents ───────────────────────────────────────────────────────────────
export function findParentByEmail(email: string): Parent | undefined {
  return load().parents.find((p) => p.email === email.toLowerCase());
}
export function getParent(id: string): Parent | undefined {
  return load().parents.find((p) => p.id === id);
}
export function createParent(email: string, passwordHash: string): Parent {
  const db = load();
  const parent: Parent = {
    id: newId(),
    email: email.toLowerCase(),
    passwordHash,
    createdAt: Date.now(),
  };
  db.parents.push(parent);
  save(db);
  return parent;
}

// ── Sessions ──────────────────────────────────────────────────────────────
export function createSession(parentId: string, ttlMs: number): Session {
  const db = load();
  const session: Session = { id: newId() + newId(), parentId, expiresAt: Date.now() + ttlMs };
  db.sessions.push(session);
  save(db);
  return session;
}
export function getSessionParent(sessionId: string | undefined): Parent | undefined {
  if (!sessionId) return undefined;
  const db = load();
  const s = db.sessions.find((x) => x.id === sessionId);
  if (!s || s.expiresAt < Date.now()) return undefined;
  return db.parents.find((p) => p.id === s.parentId);
}
export function deleteSession(sessionId: string | undefined): void {
  if (!sessionId) return;
  const db = load();
  db.sessions = db.sessions.filter((s) => s.id !== sessionId);
  save(db);
}

// ── Children + consent ──────────────────────────────────────────────────────
export function listChildren(parentId: string): ChildProfile[] {
  return load().children.filter((c) => c.parentId === parentId);
}
export function getChild(id: string): ChildProfile | undefined {
  return load().children.find((c) => c.id === id);
}
export function createChild(
  child: Omit<ChildProfile, "id" | "createdAt" | "consentId">,
  consent: Omit<ConsentRecord, "id" | "childId" | "at">,
): ChildProfile {
  const db = load();
  const id = newId();
  const consentRecord: ConsentRecord = { ...consent, id: newId(), childId: id, at: Date.now() };
  const profile: ChildProfile = {
    ...child,
    id,
    consentId: consentRecord.id,
    createdAt: Date.now(),
  };
  db.consents.push(consentRecord);
  db.children.push(profile);
  save(db);
  return profile;
}
export function deleteChild(id: string): void {
  const db = load();
  db.children = db.children.filter((c) => c.id !== id);
  db.consents = db.consents.filter((c) => c.childId !== id);
  db.usage = db.usage.filter((u) => u.childId !== id);
  save(db);
}
export function getConsent(id: string): ConsentRecord | undefined {
  return load().consents.find((c) => c.id === id);
}

// ── Usage ───────────────────────────────────────────────────────────────────
export function addUsage(event: Omit<UsageEvent, "id" | "at">): UsageEvent {
  const db = load();
  const ev: UsageEvent = { ...event, id: newId(), at: Date.now() };
  db.usage.push(ev);
  save(db);
  return ev;
}
export function usageFor(childId: string): UsageEvent[] {
  return load().usage.filter((u) => u.childId === childId);
}

/** For tests: reset the in-memory cache (does not touch disk file). */
export function _resetCacheForTest(): void {
  cache = structuredClone(empty);
}
