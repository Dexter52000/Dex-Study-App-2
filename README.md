# 📚 Dex Study

A lightweight flashcard study app with spaced repetition, built with React +
Vite + TypeScript. Everything runs in the browser and persists to
`localStorage` — no backend, no account.

## Features

- **Decks & cards** — create decks, add/edit/delete cards inline.
- **Spaced repetition** — review scheduling uses the SM-2 algorithm with four
  grades (Again / Hard / Good / Easy) and live interval previews.
- **Study sessions** — flip cards, grade recall, track progress; keyboard
  shortcuts (`Space`/`Enter` to flip, `1`–`4` to grade).
- **Local persistence** — your decks are saved automatically in the browser.
- **Seed deck** — a starter "Spanish Basics" deck on first launch.

## Getting started

```bash
npm install
npm run dev      # start the dev server
```

Then open the printed local URL.

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the Vite dev server            |
| `npm run build`    | Type-check and build for production   |
| `npm run preview`  | Preview the production build          |
| `npm test`         | Run the unit tests (Vitest)          |

## How scheduling works

Each card tracks an ease factor, interval, and due date. Grading a card runs
the SM-2 update in [`src/srs.ts`](src/srs.ts):

- **Again** resets the streak and re-shows the card in ~10 minutes.
- **Hard / Good / Easy** grow the interval geometrically by the ease factor.

The algorithm is covered by unit tests in `src/srs.test.ts`.

## Project structure

```
src/
  types.ts          Domain types (Deck, Card, Grade)
  srs.ts            SM-2 scheduling logic
  storage.ts        localStorage load/save + seed deck
  App.tsx           State container + view routing
  components/
    DeckList.tsx    Deck overview
    StudySession.tsx Review flow
    DeckEditor.tsx  Deck/card editing
```
