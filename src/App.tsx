import { useEffect, useRef, useState } from "react";
import type { Card, Deck } from "./types";
import { loadDecks, saveDecks } from "./storage";
import { createCard } from "./srs";
import { auth, type Child } from "./auth";
import DeckList from "./components/DeckList";
import StudySession from "./components/StudySession";
import DeckEditor from "./components/DeckEditor";
import ExplainView, { type SaveExtras } from "./components/ExplainView";
import ParentPanel from "./components/ParentPanel";
import BreakReminder from "./components/BreakReminder";

type View =
  | { name: "explain" }
  | { name: "decks" }
  | { name: "study"; deckId: string }
  | { name: "edit"; deckId: string };

const AI_DECK_NAME = "AI 讲解";
const CHILD_KEY = "visumath:activeChild";
const CHILD_MODE_KEY = "visumath:childMode";

function readActiveChild(): Child | null {
  try {
    const raw = localStorage.getItem(CHILD_KEY);
    return raw ? (JSON.parse(raw) as Child) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [activeChild, setActiveChild] = useState<Child | null>(() => readActiveChild());
  const [childMode, setChildMode] = useState<boolean>(
    () => localStorage.getItem(CHILD_MODE_KEY) === "1",
  );
  const [showParent, setShowParent] = useState(false);
  const [, setParentEmail] = useState<string | null>(null);

  const namespace = childMode && activeChild ? activeChild.id : "guest";
  const namespaceRef = useRef(namespace);

  const [decks, setDecks] = useState<Deck[]>(() => loadDecks(namespace));
  const [view, setView] = useState<View>({ name: "explain" });

  // Reload decks when the active namespace (child) changes.
  useEffect(() => {
    namespaceRef.current = namespace;
    setDecks(loadDecks(namespace));
  }, [namespace]);

  // Persist on deck changes, always to the namespace those decks belong to.
  useEffect(() => {
    saveDecks(decks, namespaceRef.current);
  }, [decks]);

  // Persist child-mode selection.
  useEffect(() => {
    if (activeChild) localStorage.setItem(CHILD_KEY, JSON.stringify(activeChild));
    else localStorage.removeItem(CHILD_KEY);
    localStorage.setItem(CHILD_MODE_KEY, childMode ? "1" : "0");
  }, [activeChild, childMode]);

  const activeId = view.name === "study" || view.name === "edit" ? view.deckId : null;
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
    if (!window.confirm(`删除「${deck?.name ?? "这个卡组"}」和里面所有卡片?此操作无法撤销。`)) return;
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
  }

  function saveAiCard(front: string, back: string, extras: SaveExtras) {
    const card: Card = { ...createCard(front, back), ...extras };
    setDecks((prev) => {
      const existing = prev.find((d) => d.name === AI_DECK_NAME);
      if (existing) {
        return prev.map((d) => (d.id === existing.id ? { ...d, cards: [card, ...d.cards] } : d));
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

  function enterChildMode(child: Child) {
    setActiveChild(child);
    setChildMode(true);
    setShowParent(false);
    setView({ name: "explain" });
  }

  async function exitChildMode() {
    const pw = window.prompt("请输入家长密码以退出孩子模式:");
    if (!pw) return;
    try {
      await auth.verify(pw);
      setChildMode(false);
    } catch {
      window.alert("密码不对,无法退出。");
    }
  }

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
          <button className={tab === "explain" ? "tab active" : "tab"} onClick={() => setView({ name: "explain" })}>
            讲解模式
          </button>
          <button className={tab === "decks" ? "tab active" : "tab"} onClick={() => setView({ name: "decks" })}>
            复习模式
          </button>
          {!childMode && (
            <button className="tab" onClick={() => setShowParent(true)}>
              👪 家长
            </button>
          )}
        </nav>
      </header>

      {childMode && activeChild && (
        <div className="child-banner">
          <span>🧒 孩子模式:{activeChild.name}</span>
          <div className="spacer" />
          <button className="btn-ghost" onClick={exitChildMode}>
            退出(需家长密码)
          </button>
        </div>
      )}

      {view.name === "explain" && (
        <ExplainView
          onSaveCard={saveAiCard}
          childId={childMode && activeChild ? activeChild.id : null}
        />
      )}

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
        <DeckEditor deck={activeDeck} onChange={upsertDeck} onBack={() => setView({ name: "decks" })} />
      )}

      {showParent && (
        <ParentPanel
          onClose={() => setShowParent(false)}
          onEnterChildMode={enterChildMode}
          onAuthChange={setParentEmail}
        />
      )}

      <BreakReminder active={childMode} />
    </div>
  );
}
