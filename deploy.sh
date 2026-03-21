#!/bin/bash
# ============================================================================
# 400m Pace Lab — Claude Code Session
# ============================================================================
# Run this script in your terminal to:
#   1. Create a GitHub repo (alphapeakio/400m-pace-lab)
#   2. Deploy as a static site on Cloudflare Pages
#
# Prerequisites:
#   - GitHub CLI (gh) authenticated: brew install gh && gh auth login
#   - Cloudflare CLI (wrangler) authenticated: npm i -g wrangler && wrangler login
#   - The project files in ~/400m-pace-lab/
#
# If using Claude Code, paste the PROMPT below into your Claude Code session
# and it will handle everything interactively.
# ============================================================================

set -e

PROJECT_DIR="$HOME/400m-pace-lab"
REPO_NAME="400m-pace-lab"
GITHUB_ORG="alphapeakio"

echo "============================================"
echo "  400m Pace Lab — Setup & Deploy"
echo "============================================"
echo ""

# ---- STEP 1: Copy project files ----
echo "[1/6] Setting up project directory..."
mkdir -p "$PROJECT_DIR/public"

# Check if files exist from the Claude chat export
if [ -f "/tmp/400m-pace-lab/public/index.html" ]; then
  cp -r /tmp/400m-pace-lab/* "$PROJECT_DIR/"
else
  echo "  ⚠ Project files not found at /tmp/400m-pace-lab/"
  echo "  Make sure index.html and data.js are in $PROJECT_DIR/public/"
  echo "  You can download them from the Claude chat."
fi

cd "$PROJECT_DIR"

# ---- STEP 2: Create package.json ----
echo "[2/6] Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "400m-pace-lab",
  "version": "1.0.0",
  "description": "Professional 400m split times database & pacing calculator",
  "scripts": {
    "dev": "npx serve public",
    "build": "echo 'Static site — no build step needed'"
  },
  "keywords": ["track", "400m", "pacing", "splits", "athletics"],
  "license": "MIT"
}
EOF

# ---- STEP 3: Create README ----
echo "[3/6] Creating README..."
cat > README.md << 'READMEEOF'
# 400m Pace Lab

Professional 400m split times database & pacing calculator built from elite race data spanning 1968–2025.

🏃 **[Live Site →](https://400m-pace-lab.pages.dev)**

## Features

- **Pace Calculator** — Enter any target time + gender to get recommended 100m splits, velocities, and differential
- **Men's Database** — 34+ elite race entries with 100m segment splits (43.03 WR → 44.22)
- **Women's Database** — 31+ elite race entries with 100m segment splits (47.60 WR → 49.07)
- **Pacing Models** — Split distribution templates for 8 performance tiers per gender (World Record → Youth/MS)
- Sortable, searchable, filterable tables
- Color-coded record badges (WR, OR, AR, NR, PB)

## Data Sources

| Source | Coverage |
|--------|----------|
| [Athletes First](https://athletefirst.org) | 192-page men's PDF, 215-page women's PDF (updated 2025) |
| IAAF/World Athletics Biomechanical Reports | Ferro 2001, Mochida 2008, Graubner 2011, Pollitt 2018 |
| Omega Timing | Diamond League race analysis 2018–2025 |
| Seiko Timing | World Championships race analysis 2023–2025 |
| Paris 2024 Results Book | Official Olympic results with 50m intermediate splits |

## Pacing Model

The calculator interpolates split percentages between performance tiers:

| Segment | Elite Male % | Elite Female % | HS Varsity Male % | HS Varsity Female % |
|---------|-------------|---------------|-------------------|-------------------|
| 0–100m | 25.1% | 24.7% | 24.8% | 24.3% |
| 100–200m | 23.2% | 23.0% | 23.0% | 22.7% |
| 200–300m | 24.6% | 24.8% | 24.6% | 24.8% |
| 300–400m | 27.1% | 27.5% | 27.6% | 28.2% |

Key insight: The **differential** (200–400m minus 0–200m) increases at lower performance levels, reflecting greater deceleration in the final 100m.

## Development

```bash
# Serve locally
npx serve public

# Or just open public/index.html in a browser
```

## Deployment

Deployed automatically to Cloudflare Pages on push to `main`.

## Built By

[AlphaPeak](https://alphapeak.io) — The Athlete's Operating System

## License

MIT
READMEEOF

# ---- STEP 4: Create .gitignore ----
echo "[4/6] Creating .gitignore..."
cat > .gitignore << 'EOF'
node_modules/
.DS_Store
.wrangler/
EOF

# ---- STEP 5: Git init & push to GitHub ----
echo "[5/6] Initializing git and pushing to GitHub..."
git init
git add -A
git commit -m "Initial commit: 400m Pace Lab — split times database & pacing calculator"

# Create GitHub repo (public)
if gh repo view "$GITHUB_ORG/$REPO_NAME" &>/dev/null; then
  echo "  Repo $GITHUB_ORG/$REPO_NAME already exists, pushing..."
  git remote add origin "https://github.com/$GITHUB_ORG/$REPO_NAME.git" 2>/dev/null || true
else
  echo "  Creating repo $GITHUB_ORG/$REPO_NAME..."
  gh repo create "$GITHUB_ORG/$REPO_NAME" --public --source=. --remote=origin \
    --description "Professional 400m split times database & pacing calculator"
fi

git branch -M main
git push -u origin main --force

echo "  ✅ GitHub repo: https://github.com/$GITHUB_ORG/$REPO_NAME"

# ---- STEP 6: Deploy to Cloudflare Pages ----
echo "[6/6] Deploying to Cloudflare Pages..."

# Create Cloudflare Pages project and deploy
npx wrangler pages project create "$REPO_NAME" --production-branch=main 2>/dev/null || true
npx wrangler pages deploy public --project-name="$REPO_NAME" --branch=main

echo ""
echo "============================================"
echo "  ✅ DEPLOYMENT COMPLETE"
echo "============================================"
echo ""
echo "  GitHub:     https://github.com/$GITHUB_ORG/$REPO_NAME"
echo "  Live site:  https://$REPO_NAME.pages.dev"
echo ""
echo "  To update: edit files in public/, commit, push."
echo "  Cloudflare will auto-deploy on push if you"
echo "  connect the repo in the Cloudflare dashboard."
echo "============================================"
