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
