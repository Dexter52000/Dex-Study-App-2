import { describe, expect, it } from "vitest";
import { createCard, dueCards, previewInterval, review, DAY_MS } from "./srs";

describe("createCard", () => {
  it("starts a card with SM-2 defaults and due immediately", () => {
    const now = 1000;
    const card = createCard("  hola  ", "  hi  ", now);
    expect(card.front).toBe("hola");
    expect(card.back).toBe("hi");
    expect(card.ease).toBe(2.5);
    expect(card.repetitions).toBe(0);
    expect(card.interval).toBe(0);
    expect(card.due).toBe(now);
  });
});

describe("review", () => {
  it("graduates a new card to a 1-day interval on 'good'", () => {
    const now = 0;
    const card = createCard("a", "b", now);
    const next = review(card, "good", now);
    expect(next.repetitions).toBe(1);
    expect(next.interval).toBe(1);
    expect(next.due).toBe(now + DAY_MS);
  });

  it("jumps a new card to 4 days on 'easy'", () => {
    const card = createCard("a", "b", 0);
    expect(review(card, "easy", 0).interval).toBe(4);
  });

  it("resets the streak and reschedules soon on 'again'", () => {
    const now = 0;
    let card = createCard("a", "b", now);
    card = review(card, "good", now); // rep 1
    card = review(card, "good", now); // rep 2
    const lapsed = review(card, "again", now);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.interval).toBe(0);
    expect(lapsed.due).toBe(now + 10 * 60 * 1000);
  });

  it("grows the interval geometrically after the second review", () => {
    const now = 0;
    let card = createCard("a", "b", now);
    card = review(card, "good", now); // interval 1
    card = review(card, "good", now); // interval 6
    expect(card.interval).toBe(6);
    const third = review(card, "good", now); // 6 * ease
    expect(third.interval).toBeGreaterThan(6);
    expect(third.interval).toBe(Math.round(6 * third.ease));
  });

  it("never lets the ease factor fall below 1.3", () => {
    let card = createCard("a", "b", 0);
    for (let i = 0; i < 20; i++) card = review(card, "again", 0);
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
  });
});

describe("dueCards", () => {
  it("returns only past-due cards, most overdue first", () => {
    const now = 10_000;
    const a = { ...createCard("a", "a", 0), due: now - 100 };
    const b = { ...createCard("b", "b", 0), due: now - 500 };
    const c = { ...createCard("c", "c", 0), due: now + 100 };
    const due = dueCards([a, b, c], now);
    expect(due.map((d) => d.front)).toEqual(["b", "a"]);
  });
});

describe("previewInterval", () => {
  it("formats upcoming intervals for the UI", () => {
    const card = createCard("a", "b", 0);
    expect(previewInterval(card, "again")).toBe("10m");
    expect(previewInterval(card, "good")).toBe("1d");
    expect(previewInterval(card, "easy")).toBe("4d");
  });
});
