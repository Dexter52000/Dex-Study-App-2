import type { Deck } from "../types";
import { dueCards } from "../srs";

interface Props {
  decks: Deck[];
  onStudy: (deckId: string) => void;
  onEdit: (deckId: string) => void;
  onCreate: () => void;
  onDelete: (deckId: string) => void;
}

export default function DeckList({
  decks,
  onStudy,
  onEdit,
  onCreate,
  onDelete,
}: Props) {
  return (
    <section>
      <div className="row" style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Your decks</h2>
        <div className="spacer" />
        <button className="btn-primary" onClick={onCreate}>
          + New deck
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="empty">
          No decks yet. Create one to start studying.
        </div>
      ) : (
        <div className="deck-grid">
          {decks.map((deck) => {
            const due = dueCards(deck.cards).length;
            return (
              <article key={deck.id} className="deck-card">
                <h3>{deck.name}</h3>
                {deck.description && <p className="desc">{deck.description}</p>}
                <div className="deck-stats">
                  <span className={`pill ${due > 0 ? "due" : ""}`}>
                    <span className="dot" />
                    {due} due
                  </span>
                  <span className="pill">
                    <span className="dot" />
                    {deck.cards.length} cards
                  </span>
                </div>
                <div className="row">
                  <button
                    className="btn-primary"
                    onClick={() => onStudy(deck.id)}
                    disabled={due === 0}
                    title={due === 0 ? "Nothing due right now" : undefined}
                  >
                    Study {due > 0 ? `(${due})` : ""}
                  </button>
                  <button className="btn-ghost" onClick={() => onEdit(deck.id)}>
                    Edit
                  </button>
                  <div className="spacer" />
                  <button
                    className="btn-ghost btn-danger"
                    onClick={() => onDelete(deck.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
