import { useEffect, useMemo, useState } from "react";
import type { Card, Deck, Grade } from "../types";
import { dueCards, previewInterval, review } from "../srs";
import { hasGeometry } from "../api";
import SvgDiagram from "./SvgDiagram";
import DynamicGeometry from "./DynamicGeometry";

interface Props {
  deck: Deck;
  /** Persist a single graded card back into the deck. */
  onGrade: (card: Card) => void;
  onExit: () => void;
}

const GRADES: { grade: Grade; label: string; className: string }[] = [
  { grade: "again", label: "Again", className: "grade-again" },
  { grade: "hard", label: "Hard", className: "grade-hard" },
  { grade: "good", label: "Good", className: "grade-good" },
  { grade: "easy", label: "Easy", className: "grade-easy" },
];

export default function StudySession({ deck, onGrade, onExit }: Props) {
  // Snapshot the due queue once when the session starts so newly-scheduled
  // cards don't reappear mid-session.
  const queue = useMemo(() => dueCards(deck.cards), [deck.id]);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const card = queue[index];
  const total = queue.length;

  function handleGrade(grade: Grade) {
    if (!card) return;
    onGrade(review(card, grade));
    setReviewed((n) => n + 1);
    setShowBack(false);
    setIndex((i) => i + 1);
  }

  // Keyboard shortcuts: Space/Enter to flip, 1-4 to grade.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!card) return;
      if (!showBack && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setShowBack(true);
        return;
      }
      if (showBack && e.key >= "1" && e.key <= "4") {
        handleGrade(GRADES[Number(e.key) - 1].grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, showBack]);

  if (!card) {
    return (
      <section>
        <div className="empty">
          <h2 style={{ marginTop: 0 }}>🎉 Session complete</h2>
          <p>You reviewed {reviewed} card{reviewed === 1 ? "" : "s"}.</p>
          <button className="btn-primary" onClick={onExit}>
            Back to decks
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="row" style={{ marginBottom: "0.75rem" }}>
        <button className="btn-ghost" onClick={onExit}>
          ← Exit
        </button>
        <div className="spacer" />
        <span className="muted">
          {index + 1} / {total} · {deck.name}
        </span>
      </div>

      <div className="study-progress">
        <div style={{ width: `${(index / total) * 100}%` }} />
      </div>

      <div className="flashcard">
        <div className="face">{card.front}</div>
        {showBack && (
          <>
            <div className="divider" />
            <div className="back">{card.back}</div>
            {hasGeometry(card.diagramSpec) ? (
              <DynamicGeometry spec={card.diagramSpec} />
            ) : (
              card.diagramSvg && <SvgDiagram svg={card.diagramSvg} />
            )}
            {card.realLifeExample && (
              <div className="reallife-box" style={{ textAlign: "left" }}>
                🌍 {card.realLifeExample}
              </div>
            )}
          </>
        )}
      </div>

      {!showBack ? (
        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: "1.25rem" }}
          onClick={() => setShowBack(true)}
        >
          Show answer <span className="muted">(Space)</span>
        </button>
      ) : (
        <div className="grade-row">
          {GRADES.map(({ grade, label, className }, i) => (
            <button
              key={grade}
              className={className}
              onClick={() => handleGrade(grade)}
            >
              <span className="label">{label}</span>
              <span className="hint">
                {i + 1} · {previewInterval(card, grade)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
