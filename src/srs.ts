import type { Card, Grade } from "./types";

export const DAY_MS = 24 * 60 * 60 * 1000;

const MIN_EASE = 1.3;

/** Map our four-button grade onto the SM-2 quality scale (0-5). */
const GRADE_QUALITY: Record<Grade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

/**
 * Create a fresh card with sensible SM-2 defaults. A new card is due
 * immediately so it shows up in the next study session.
 */
export function createCard(front: string, back: string, now = Date.now()): Card {
  return {
    id: crypto.randomUUID(),
    front: front.trim(),
    back: back.trim(),
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    due: now,
    createdAt: now,
  };
}

/**
 * Apply the SM-2 spaced-repetition algorithm and return an updated copy of
 * the card. A failing grade ("again") resets the repetition streak and
 * schedules the card for another look in ~10 minutes; passing grades grow
 * the interval geometrically by the ease factor.
 */
export function review(card: Card, grade: Grade, now = Date.now()): Card {
  const quality = GRADE_QUALITY[grade];

  // Adjust the ease factor using the standard SM-2 formula, clamped so a
  // card can never become impossibly hard to graduate.
  const ease = Math.max(
    MIN_EASE,
    card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (grade === "again") {
    return {
      ...card,
      ease,
      repetitions: 0,
      interval: 0,
      due: now + 10 * 60 * 1000, // try again in 10 minutes
    };
  }

  const repetitions = card.repetitions + 1;
  let interval: number;
  if (repetitions === 1) {
    interval = grade === "easy" ? 4 : 1;
  } else if (repetitions === 2) {
    interval = 6;
  } else {
    interval = Math.round(card.interval * ease);
  }

  return {
    ...card,
    ease,
    repetitions,
    interval,
    due: now + interval * DAY_MS,
  };
}

/** Cards whose due time has passed, ordered by how overdue they are. */
export function dueCards(cards: Card[], now = Date.now()): Card[] {
  return cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
}

/** Human-friendly preview of when a grade will push the card next. */
export function previewInterval(card: Card, grade: Grade): string {
  const next = review(card, grade);
  if (grade === "again") return "10m";
  const days = next.interval;
  if (days < 1) return "<1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}
