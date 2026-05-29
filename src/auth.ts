/** Client for parent accounts, child profiles, and usage (Phase 4). */

export interface Child {
  id: string;
  name: string;
  grade: string;
  birthdate: string;
  dailyCallLimit: number;
  hasPin: boolean;
  age: number;
}

export interface UsageInfo {
  today: number;
  limit: number;
  remaining: number | null;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "出了点问题,请重试。");
  }
  return body as T;
}

export const auth = {
  me: () => call<{ email: string | null }>("/auth/me"),
  register: (email: string, password: string) =>
    call<{ email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    call<{ email: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => call<{ ok: true }>("/auth/logout", { method: "POST" }),
  verify: (password: string) =>
    call<{ ok: true }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  listChildren: () => call<{ children: Child[] }>("/children"),
  createChild: (input: {
    name: string;
    birthdate: string;
    grade: string;
    pin?: string;
    dailyCallLimit: number;
    consent: boolean;
  }) =>
    call<{ child: Child }>("/children", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteChild: (id: string) =>
    call<{ ok: true }>(`/children/${id}`, { method: "DELETE" }),
  usage: (id: string) => call<UsageInfo>(`/children/${id}/usage`),
  exportChild: (id: string) => call<unknown>(`/children/${id}/export`),
};
