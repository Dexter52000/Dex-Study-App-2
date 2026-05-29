import { z } from "zod/v4";

/**
 * A single guided step. `hint` is a Socratic nudge shown first (a question or
 * pointer that gets the student thinking); `explanation` is the worked step
 * revealed when they're ready. This powers the "default guided, reveal on
 * demand" flow and keeps us off the "answer machine" positioning.
 */
export const StepSchema = z.object({
  hint: z.string(),
  explanation: z.string(),
});

export const FlashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
});

/**
 * The structured result Claude must return. Kept deliberately flat and free of
 * JSON-schema constraints that structured outputs don't support (no
 * minLength/array-length keywords) — we enforce "non-empty" and SVG size in our
 * own validation layer instead. `diagramSvg` is a required string; the model
 * returns "" when a diagram wouldn't help (e.g. pure arithmetic).
 */
export const MathResultSchema = z.object({
  title: z.string(),
  concept: z.string(),
  steps: z.array(StepSchema),
  answer: z.string(),
  diagramSvg: z.string(),
  realLifeExample: z.string(),
  flashcards: z.array(FlashcardSchema),
});

export type MathResult = z.infer<typeof MathResultSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
