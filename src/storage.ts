import type { Deck } from "./types";
import { createCard } from "./srs";

const STORAGE_KEY = "dex-study:decks:v1";

/** A small starter deck so a first-time user has something to study. */
function seedDecks(): Deck[] {
  const now = Date.now();
  return [
    {
      id: crypto.randomUUID(),
      name: "几何概念入门",
      description: "几个最常用的几何公式,用闪卡先记住。",
      createdAt: now,
      cards: [
        createCard("三角形面积公式", "底 × 高 ÷ 2"),
        createCard("长方形周长公式", "(长 + 宽) × 2"),
        createCard("长方形面积公式", "长 × 宽"),
        createCard("勾股定理", "直角三角形里:两条直角边的平方和 = 斜边的平方(a² + b² = c²)"),
        createCard("圆的周长公式", "直径 × π(π ≈ 3.14)"),
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
