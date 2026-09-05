# Vienna vs Munich · 8–10 September 2026

Travel-magazine style comparison deck for a three-day trip from Interlaken West.

- **Final PDF:** `Vienna_vs_Munich_2026-09-08_to_10_FINAL.pdf` (14 pages, 16:9)
- **Contact sheet:** `contact_sheet.png`
- **Source:** `deck/deck.html` with local fonts and images; re-render with
  `cd deck && NODE_PATH=/opt/node22/lib/node_modules node render.cjs` (Playwright + Chromium).

## Data behind the numbers (all checked 5 Sept 2026)

| Item | Source | Status |
| --- | --- | --- |
| Train times, 8 and 10 Sept | ÖBB Scotty HAFAS timetable (`deck/trains_oebb_timetable.json`) | actual timetable |
| Munich fare | SBB quote supplied by the traveller: Interlaken West → München, 05:30, CHF 107 | verified |
| Vienna fare | SBB domestic tariff + ÖBB Sparschiene / Standard tiers | **estimate** (fare APIs at bahn.de, ÖBB, Booking blocked automated access) |
| Hotel rates | Google Hotels listings for 8–10 Sept, 1 adult, EUR (`deck/hotels_google_2026-09-08.json`) | live listings, provider named per card |
| Weather | Open-Meteo forecast run of 5 Sept 2026 | forecast |
| Events | wiener-staatsoper.at, munich.travel, oktoberfest.de | checked |
| FX | ECB reference via Frankfurter, 4 Sept 2026: 1 EUR = 0.9405 CHF | checked |

Photos: Unsplash (credited on the last page), Wikimedia Commons (CC BY-SA), and the hotels' own listing photos.
