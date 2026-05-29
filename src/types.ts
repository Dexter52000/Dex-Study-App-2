export interface Card {
  id: string;
  front: string;
  back: string;
  /** SM-2 ease factor; starts at 2.5, never drops below 1.3. */
  ease: number;
  /** Current inter-repetition interval in days. */
  interval: number;
  /** Number of consecutive successful reviews. */
  repetitions: number;
  /** Epoch ms when this card is next due. New cards are due immediately. */
  due: number;
  createdAt: number;

  // ── Optional AI-explanation extras (backward compatible) ───────────────
  /** Interactive, draggable geometry spec, if one was generated. */
  diagramSpec?: import("./api").DiagramSpec;
  /** Sanitized SVG geometry diagram, if one was generated. */
  diagramSvg?: string;
  /** A real-life analogy connecting the concept to everyday life. */
  realLifeExample?: string;
  /** Step-by-step explanation text (one entry per step). */
  explanation?: string[];
  /** Concept/skill tag, e.g. "三角形面积" — used for weak-area tracking. */
  concept?: string;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: Card[];
  createdAt: number;
}

/** How well the learner recalled a card during review. */
export type Grade = "again" | "hard" | "good" | "easy";
