import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { getSessionParent, type Parent } from "./db";

export const SESSION_COOKIE = "vm_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}
export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

/** Resolve the logged-in parent from the session cookie, or undefined. */
export function currentParent(req: Request): Parent | undefined {
  const sid = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    SESSION_COOKIE
  ];
  return getSessionParent(sid);
}

/** Express middleware: 401 unless a valid parent session is present. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const parent = currentParent(req);
  if (!parent) {
    res.status(401).json({ error: { code: "unauthorized", message: "请先登录。" } });
    return;
  }
  (req as Request & { parent?: Parent }).parent = parent;
  next();
}
