import { useState } from "react";
import type { Card, Deck } from "../types";
import { createCard } from "../srs";

interface Props {
  deck: Deck;
  onChange: (deck: Deck) => void;
  onBack: () => void;
}

export default function DeckEditor({ deck, onChange, onBack }: Props) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  function updateMeta(patch: Partial<Pick<Deck, "name" | "description">>) {
    onChange({ ...deck, ...patch });
  }

  function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    const card = createCard(front, back);
    onChange({ ...deck, cards: [card, ...deck.cards] });
    setFront("");
    setBack("");
  }

  function deleteCard(id: string) {
    onChange({ ...deck, cards: deck.cards.filter((c) => c.id !== id) });
  }

  function editCard(id: string, patch: Partial<Pick<Card, "front" | "back">>) {
    onChange({
      ...deck,
      cards: deck.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  }

  return (
    <section>
      <div className="row" style={{ marginBottom: "1rem" }}>
        <button className="btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <div className="spacer" />
        <span className="muted">{deck.cards.length} cards</span>
      </div>

      <label className="section-title">Deck name</label>
      <input
        value={deck.name}
        onChange={(e) => updateMeta({ name: e.target.value })}
        placeholder="Deck name"
      />

      <label className="section-title">Description</label>
      <textarea
        value={deck.description}
        onChange={(e) => updateMeta({ description: e.target.value })}
        placeholder="What's this deck about?"
        style={{ minHeight: "3rem" }}
      />

      <form className="add-card-form" onSubmit={addCard}>
        <div className="section-title" style={{ margin: 0 }}>
          Add a card
        </div>
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Front (question / prompt)"
        />
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Back (answer)"
        />
        <div className="row">
          <div className="spacer" />
          <button
            type="submit"
            className="btn-primary"
            disabled={!front.trim() || !back.trim()}
          >
            Add card
          </button>
        </div>
      </form>

      <div className="section-title">Cards</div>
      {deck.cards.length === 0 ? (
        <div className="empty">No cards yet. Add one above.</div>
      ) : (
        <div className="card-list">
          {deck.cards.map((c) => (
            <div key={c.id} className="card-row">
              <input
                className="ftext"
                value={c.front}
                onChange={(e) => editCard(c.id, { front: e.target.value })}
              />
              <input
                className="btext"
                value={c.back}
                onChange={(e) => editCard(c.id, { back: e.target.value })}
              />
              {(c.diagramSvg || c.explanation) && (
                <span className="card-badge" title="含 AI 图解 / 讲解">
                  图解
                </span>
              )}
              <button
                className="btn-ghost btn-danger"
                onClick={() => deleteCard(c.id)}
                title="删除卡片"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
