import { Router, type Request } from "express";
import {
  clearSessionCookie,
  currentParent,
  hashPassword,
  requireAuth,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  setSessionCookie,
  verifyPassword,
} from "./auth";
import {
  createChild,
  createParent,
  createSession,
  deleteChild,
  deleteSession,
  findParentByEmail,
  getChild,
  getConsent,
  getParent,
  listChildren,
  usageFor,
  type ChildProfile,
  type Parent,
} from "./db";
import { ageFromBirthdate, countToday } from "./usage";

export const accountRouter = Router();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function publicChild(c: ChildProfile) {
  return {
    id: c.id,
    name: c.name,
    grade: c.grade,
    birthdate: c.birthdate,
    dailyCallLimit: c.dailyCallLimit,
    hasPin: Boolean(c.pinHash),
    age: ageFromBirthdate(c.birthdate),
  };
}

function ownChild(req: Request, id: string): ChildProfile | undefined {
  const parent = (req as Request & { parent?: Parent }).parent;
  const child = getChild(id);
  if (!parent || !child || child.parentId !== parent.id) return undefined;
  return child;
}

accountRouter.post("/auth/register", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: { code: "bad_request", message: "请输入有效的邮箱。" } });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: { code: "bad_request", message: "密码至少 8 位。" } });
    return;
  }
  if (findParentByEmail(email)) {
    res.status(409).json({ error: { code: "conflict", message: "这个邮箱已经注册过了。" } });
    return;
  }
  const parent = createParent(email, await hashPassword(password));
  const session = createSession(parent.id, SESSION_TTL_MS);
  setSessionCookie(res, session.id);
  res.json({ email: parent.email });
});

accountRouter.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const parent = typeof email === "string" ? findParentByEmail(email) : undefined;
  if (!parent || typeof password !== "string" || !(await verifyPassword(password, parent.passwordHash))) {
    res.status(401).json({ error: { code: "unauthorized", message: "邮箱或密码不对。" } });
    return;
  }
  const session = createSession(parent.id, SESSION_TTL_MS);
  setSessionCookie(res, session.id);
  res.json({ email: parent.email });
});

accountRouter.post("/auth/logout", (req, res) => {
  const sid = (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  deleteSession(sid);
  clearSessionCookie(res);
  res.json({ ok: true });
});

accountRouter.get("/auth/me", (req, res) => {
  const parent = currentParent(req);
  res.json({ email: parent?.email ?? null });
});

/** Re-verify the parent's password (used to leave 孩子模式). */
accountRouter.post("/auth/verify", requireAuth, async (req, res) => {
  const parent = getParent((req as Request & { parent?: Parent }).parent!.id);
  const { password } = req.body ?? {};
  const ok = !!parent && typeof password === "string" && (await verifyPassword(password, parent.passwordHash));
  if (!ok) {
    res.status(401).json({ error: { code: "unauthorized", message: "密码不对。" } });
    return;
  }
  res.json({ ok: true });
});

accountRouter.get("/children", requireAuth, (req, res) => {
  const parent = (req as Request & { parent?: Parent }).parent!;
  res.json({ children: listChildren(parent.id).map(publicChild) });
});

accountRouter.post("/children", requireAuth, async (req, res) => {
  const parent = (req as Request & { parent?: Parent }).parent!;
  const { name, birthdate, grade, pin, dailyCallLimit, consent } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: { code: "bad_request", message: "请填写孩子的名字。" } });
    return;
  }
  if (typeof birthdate !== "string" || Number.isNaN(new Date(birthdate).getTime())) {
    res.status(400).json({ error: { code: "bad_request", message: "请填写有效的出生日期。" } });
    return;
  }
  if (consent !== true) {
    res
      .status(400)
      .json({ error: { code: "bad_request", message: "需要监护人同意才能创建孩子档案。" } });
    return;
  }
  const age = ageFromBirthdate(birthdate);
  const child = createChild(
    {
      parentId: parent.id,
      name: name.trim().slice(0, 40),
      birthdate,
      grade: typeof grade === "string" ? grade.slice(0, 20) : "",
      pinHash: typeof pin === "string" && pin ? await hashPassword(pin) : "",
      dailyCallLimit: Number.isFinite(dailyCallLimit) ? Math.max(0, Math.floor(dailyCallLimit)) : 0,
    },
    {
      parentId: parent.id,
      scope: "child_profile,learning_records,ai_usage",
      method: "in_app_guardian_confirmation",
      sensitive: age < 14, // PIPL: under-14 personal info is sensitive
    },
  );
  res.json({ child: publicChild(child) });
});

accountRouter.delete("/children/:id", requireAuth, (req, res) => {
  if (!ownChild(req, String(req.params.id))) {
    res.status(404).json({ error: { code: "not_found", message: "找不到这个档案。" } });
    return;
  }
  deleteChild(String(req.params.id));
  res.json({ ok: true });
});

/** Export all stored data for a child (parent right to access/portability). */
accountRouter.get("/children/:id/export", requireAuth, (req, res) => {
  const child = ownChild(req, String(req.params.id));
  if (!child) {
    res.status(404).json({ error: { code: "not_found", message: "找不到这个档案。" } });
    return;
  }
  res.json({
    profile: publicChild(child),
    consent: getConsent(child.consentId),
    usage: usageFor(child.id),
  });
});

accountRouter.get("/children/:id/usage", requireAuth, (req, res) => {
  const child = ownChild(req, String(req.params.id));
  if (!child) {
    res.status(404).json({ error: { code: "not_found", message: "找不到这个档案。" } });
    return;
  }
  const today = countToday(usageFor(child.id), "explain");
  res.json({
    today,
    limit: child.dailyCallLimit,
    remaining: child.dailyCallLimit > 0 ? Math.max(0, child.dailyCallLimit - today) : null,
  });
});
