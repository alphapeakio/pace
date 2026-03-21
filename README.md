# 400m Pace Lab

Professional 400m split times database & pacing calculator built from elite race data spanning 1968–2025.

## Features

- **Pace Calculator** — Enter any target time + gender to get recommended 100m splits, velocities, and differential
- **Men's Database** — 34+ elite race entries with 100m segment splits (43.03 WR → 44.22)
- **Women's Database** — 31+ elite race entries with 100m segment splits (47.60 WR → 49.07)
- **Pacing Models** — Split distribution templates for 8 performance tiers per gender (World Record → Youth/MS)

## Data Sources

- [Athletes First](https://athletefirst.org) — 192-page men's + 215-page women's PDF (updated 2025)
- IAAF/World Athletics Biomechanical Reports
- Omega Timing — Diamond League 2018–2025
- Seiko Timing — World Championships 2023–2025
- Paris 2024 Results Book

## Development

\`\`\`bash
npx serve public
\`\`\`

## Deployment

Static site on Cloudflare Pages. See CLAUDE_CODE_SESSION.md for deployment instructions.

## Built By

[AlphaPeak](https://alphapeak.io) — The Athlete's Operating System
