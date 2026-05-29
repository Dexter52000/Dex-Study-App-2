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

// ── Parametric, draggable geometry (Phase 2) ──────────────────────────────
// The AI supplies only geometry DATA — coordinates, which points are
// draggable, and what to label. The client computes all live measurements
// (lengths, area, angles) from the current point positions, so dragging a
// vertex updates the numbers in real time. No formulas/code from the model.

const GeometryPointSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  label: z.string(), // "" for none
  draggable: z.boolean(),
});
const GeometrySegmentSchema = z.object({
  from: z.string(),
  to: z.string(),
  showLength: z.boolean(),
});
const GeometryPolygonSchema = z.object({
  points: z.array(z.string()),
  showArea: z.boolean(),
});
const GeometryCircleSchema = z.object({
  center: z.string(),
  throughPoint: z.string(), // a point on the circle (defines radius); "" if none
  showRadius: z.boolean(),
});
const GeometryAngleSchema = z.object({
  vertex: z.string(),
  from: z.string(),
  to: z.string(),
  showDegrees: z.boolean(),
  right: z.boolean(), // mark as a right angle
});

export const DiagramSpecSchema = z.object({
  width: z.number(),
  height: z.number(),
  unit: z.string(), // length unit for labels, e.g. "cm" ("" if unitless)
  unitScale: z.number(), // real units per coordinate unit (≥0; 0 → hide measures)
  points: z.array(GeometryPointSchema),
  segments: z.array(GeometrySegmentSchema),
  polygons: z.array(GeometryPolygonSchema),
  circles: z.array(GeometryCircleSchema),
  angles: z.array(GeometryAngleSchema),
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
  /** Interactive geometry (preferred for standard shapes). Empty points → none. */
  diagramSpec: DiagramSpecSchema,
  /** Static SVG fallback for figures the spec can't express. "" → none. */
  diagramSvg: z.string(),
  realLifeExample: z.string(),
  flashcards: z.array(FlashcardSchema),
});

export type MathResult = z.infer<typeof MathResultSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;
