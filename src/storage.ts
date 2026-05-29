import type { Deck } from "./types";
import { createCard } from "./srs";

const STORAGE_KEY = "dex-study:decks:v1";

/** A small starter deck so a first-time user has something to study. */
function seedDecks(): Deck[] {
  const now = Date.now();
  return [
    {
      id: crypto.randomUUID(),
      name: "Spanish Basics",
      description: "Common everyday words to get you started.",
      createdAt: now,
      cards: [
        createCard("hola", "hello", now),
        createCard("gracias", "thank you", now),
        createCard("por favor", "please", now),
        createCard("adiós", "goodbye", now),
        createCard("sí / no", "yes / no", now),
      ],
    },
  ];
}

export function loadDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDecks();
    const parsed = JSON.parse(raw) as Deck[];
    if (!Array.isArray(parsed)) return seedDecks();
    return parsed;
  } catch {
    return seedDecks();
  }
}

export function saveDecks(decks: Deck[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  } catch {
    // Storage may be unavailable (private mode, quota). Fail silently —
    // the app stays usable for the current session.
  }
}
