import type { ChildProfile, UsageEvent } from "./db";

/** Local-midnight epoch ms for the given instant (server local time). */
export function startOfToday(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Count a child's usage events of a kind since local midnight. */
export function countToday(
  events: UsageEvent[],
  kind: string,
  now = Date.now(),
): number {
  const since = startOfToday(now);
  return events.filter((e) => e.kind === kind && e.at >= since).length;
}

/** True when the child has hit their daily call limit (0 = unlimited). */
export function isOverDailyLimit(
  child: ChildProfile,
  events: UsageEvent[],
  now = Date.now(),
): boolean {
  if (!child.dailyCallLimit || child.dailyCallLimit <= 0) return false;
  return countToday(events, "explain", now) >= child.dailyCallLimit;
}

/** Whole years old from a YYYY-MM-DD birthdate (0 if unparseable). */
export function ageFromBirthdate(birthdate: string, now = Date.now()): number {
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return 0;
  const d = new Date(now);
  let age = d.getFullYear() - b.getFullYear();
  const m = d.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && d.getDate() < b.getDate())) age--;
  return Math.max(0, age);
}
