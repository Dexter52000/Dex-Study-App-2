import { useEffect, useState } from "react";
import type { Card, Deck } from "./types";
import { loadDecks, saveDecks } from "./storage";
import { createCard } from "./srs";
import DeckList from "./components/DeckList";
import StudySession from "./components/StudySession";
import DeckEditor from "./components/DeckEditor";
import ExplainView, { type SaveExtras } from "./components/ExplainView";

type View =
  | { name: "explain" }
  | { name: "decks" }
  | { name: "study"; deckId: string }
  | { name: "edit"; deckId: string };

const AI_DECK_NAME = "AI 讲解";

export default function App() {
  const [decks, setDecks] = useState<Deck[]>(() => loadDecks());
  const [view, setView] = useState<View>({ name: "explain" });

  // Persist on every change so nothing is lost between sessions.
  useEffect(() => {
    saveDecks(decks);
  }, [decks]);

  const activeId =
    view.name === "study" || view.name === "edit" ? view.deckId : null;
  const activeDeck = decks.find((d) => d.id === activeId) ?? null;

  function upsertDeck(updated: Deck) {
    setDecks((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function gradeCard(deckId: string, card: Card) {
    setDecks((prev) =>
      prev.map((d) =>
        d.id === deckId
          ? { ...d, cards: d.cards.map((c) => (c.id === card.id ? card : c)) }
          : d,
      ),
    );
  }

  function createDeck() {
    const deck: Deck = {
      id: crypto.randomUUID(),
      name: "Untitled deck",
      description: "",
      cards: [],
      createdAt: Date.now(),
    };
    setDecks((prev) => [...prev, deck]);
    setView({ name: "edit", deckId: deck.id });
  }

  function deleteDeck(deckId: string) {
    const deck = decks.find((d) => d.id === deckId);
    const ok = window.confirm(
      `删除「${deck?.name ?? "这个卡组"}」和里面所有卡片?此操作无法撤销。`,
    );
    if (!ok) return;
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
  }

  /** Save an AI-suggested flashcard into the dedicated "AI 讲解" deck. */
  function saveAiCard(front: string, back: string, extras: SaveExtras) {
    const base = createCard(front, back);
    const card: Card = { ...base, ...extras };
    setDecks((prev) => {
      const existing = prev.find((d) => d.name === AI_DECK_NAME);
      if (existing) {
        return prev.map((d) =>
          d.id === existing.id ? { ...d, cards: [card, ...d.cards] } : d,
        );
      }
      const deck: Deck = {
        id: crypto.randomUUID(),
        name: AI_DECK_NAME,
        description: "从讲解模式保存的卡片,用间隔重复巩固。",
        cards: [card],
        createdAt: Date.now(),
      };
      return [...prev, deck];
    });
  }

  // Guard against a view pointing at a deck that no longer exists.
  if ((view.name === "study" || view.name === "edit") && !activeDeck) {
    setView({ name: "decks" });
  }

  const tab = view.name === "explain" ? "explain" : "decks";

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>📐 VisuMath</h1>
          <div className="tagline">看图理解数学 · 不止给答案</div>
        </div>
        <nav className="mode-tabs">
          <button
            className={tab === "explain" ? "tab active" : "tab"}
            onClick={() => setView({ name: "explain" })}
          >
            讲解模式
          </button>
          <button
            className={tab === "decks" ? "tab active" : "tab"}
            onClick={() => setView({ name: "decks" })}
          >
            复习模式
          </button>
        </nav>
      </header>

      {view.name === "explain" && <ExplainView onSaveCard={saveAiCard} />}

      {view.name === "decks" && (
        <DeckList
          decks={decks}
          onStudy={(deckId) => setView({ name: "study", deckId })}
          onEdit={(deckId) => setView({ name: "edit", deckId })}
          onCreate={createDeck}
          onDelete={deleteDeck}
        />
      )}

      {view.name === "study" && activeDeck && (
        <StudySession
          deck={activeDeck}
          onGrade={(card) => gradeCard(activeDeck.id, card)}
          onExit={() => setView({ name: "decks" })}
        />
      )}

      {view.name === "edit" && activeDeck && (
        <DeckEditor
          deck={activeDeck}
          onChange={upsertDeck}
          onBack={() => setView({ name: "decks" })}
        />
      )}
    </div>
  );
}
