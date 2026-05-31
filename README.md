# Wheel Lab — Roulette Tracker & Bias Detector

A clean, honest, mobile-first web app for logging spins on **one physical roulette wheel**,
visualising the stats, and using real statistics (chi-square + sector analysis) to check
whether that wheel is actually biased. Installable as a PWA — works offline.

Open `index.html` in any browser, or install it to your home screen.

## Layout (bottom tabs)

- **Play** — next-bet suggestion (colour + odd/even with an honesty badge), tap-to-log number pad, board scanner (OCR), recent spins
- **Stats** — sample-size meter, even-money bets, dozens & columns
- **Analysis** — wheel heatmap, chi-square verdict, sector-bias test, hottest numbers
- **More** — table profiles (one per machine), wheel type, export/import, demos, and the honest "how it works" notes

## The honest part

| Truth | Why it matters |
|---|---|
| Fair wheels can't be predicted | Spins are independent — believing otherwise is the gambler's fallacy |
| Bias detection is the only real edge | And it needs **thousands of spins** on the same physical wheel |
| Online/electronic wheels use certified RNGs | No physical bias — logging does nothing there |
| Magnets are mostly a myth in licensed casinos | Swiss casinos are ESBK-regulated; what you *can* catch is mechanical **sector bias** |
| The green zero(s) make the long-run EV negative | The longer you play, the closer you get to that loss |

The colour / odd-even suggestion only carries weight when the app shows **"Bias detected"** (|z| ≥ 3).
Otherwise it says so plainly.

### Sources
[García-Pelayo](https://www.casino.org/news/vegas-myths-busted-gonzalo-garcia-pelayo-invented-the-only-technique-to-beat-roulette-without-cheating/) ·
[wheel bias](https://www.roulettephysics.com/roulette-wheel-bias/) ·
[magnets myth](https://www.roulettephysics.com/casino-roulette-wheel-magnets/) ·
[Swiss regulation](https://www.gespa.ch/en/regulation-and-licensing/operators) ·
[casino psychology](https://culture.org/gambling/casino-tricks/)

> Educational / record-keeping tool — not a way to beat the house. Data stays on your device. Set a budget and play responsibly.
