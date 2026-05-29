import { describe, expect, it } from "vitest";
import { ageFromBirthdate, countToday, isOverDailyLimit, startOfToday } from "./usage";
import type { ChildProfile, UsageEvent } from "./db";

const now = new Date("2026-05-29T12:00:00").getTime();
const ev = (kind: string, at: number): UsageEvent => ({
  id: "x",
  childId: "c",
  kind,
  estCostCents: 5,
  at,
});

describe("countToday", () => {
  it("counts only today's events of the kind", () => {
    const events = [
      ev("explain", now), // today
      ev("explain", startOfToday(now) - 1000), // yesterday
      ev("image", now), // wrong kind
    ];
    expect(countToday(events, "explain", now)).toBe(1);
  });
});

describe("isOverDailyLimit", () => {
  const child = (limit: number): ChildProfile => ({
    id: "c",
    parentId: "p",
    name: "k",
    birthdate: "2015-01-01",
    grade: "5",
    pinHash: "",
    dailyCallLimit: limit,
    consentId: "x",
    createdAt: 0,
  });

  it("is false when limit is 0 (unlimited)", () => {
    const events = [ev("explain", now), ev("explain", now), ev("explain", now)];
    expect(isOverDailyLimit(child(0), events, now)).toBe(false);
  });

  it("is true once today's count reaches the limit", () => {
    const events = [ev("explain", now), ev("explain", now)];
    expect(isOverDailyLimit(child(2), events, now)).toBe(true);
    expect(isOverDailyLimit(child(3), events, now)).toBe(false);
  });
});

describe("ageFromBirthdate", () => {
  it("computes whole years", () => {
    expect(ageFromBirthdate("2015-05-29", now)).toBe(11);
    expect(ageFromBirthdate("2015-05-30", now)).toBe(10); // birthday not yet reached
  });
  it("returns 0 for invalid dates", () => {
    expect(ageFromBirthdate("nope", now)).toBe(0);
  });
});
