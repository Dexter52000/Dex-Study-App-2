import { useEffect, useState } from "react";
import type { Card, Deck } from "./types";
import { loadDecks, saveDecks } from "./storage";
import DeckList from "./components/DeckList";
import StudySession from "./components/StudySession";
import DeckEditor from "./components/DeckEditor";

type View =
  | { name: "decks" }
  | { name: "study"; deckId: string }
  | { name: "edit"; deckId: string };

export default function App() {
  const [decks, setDecks] = useState<Deck[]>(() => loadDecks());
  const [view, setView] = useState<View>({ name: "decks" });

  // Persist on every change so nothing is lost between sessions.
  useEffect(() => {
    saveDecks(decks);
  }, [decks]);

  const activeId = view.name === "decks" ? null : view.deckId;
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
      `Delete "${deck?.name ?? "this deck"}" and all its cards? This can't be undone.`,
    );
    if (!ok) return;
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
  }

  // Guard against a view pointing at a deck that no longer exists.
  if (view.name !== "decks" && !activeDeck) {
    setView({ name: "decks" });
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>📚 Dex Study</h1>
          <div className="tagline">Flashcards with spaced repetition</div>
        </div>
      </header>

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
