# Claude Code Session: 400m Pace Lab

## What to paste into Claude Code

Copy everything below the line into a Claude Code session on your M4 Pro MacBook:

---

I have a project called "400m Pace Lab" — a static website with a 400m split times database and pacing calculator. The source files are ready. I need you to:

1. **Create the project at `~/400m-pace-lab/`** with the files I'll provide
2. **Create a public GitHub repo** at `alphapeakio/400m-pace-lab`
3. **Deploy to Cloudflare Pages** as a static site

Here's what to do step by step:

### Step 1: Create the project structure

```
~/400m-pace-lab/
├── public/
│   ├── index.html    (main page — calculator, data tables, pacing models)
│   └── data.js       (all race data as JS objects)
├── package.json
├── README.md
├── .gitignore
└── deploy.sh
```

The `public/` folder is the entire site — it's a pure static HTML/CSS/JS app, no build step needed.

I'll paste the file contents for `public/index.html` and `public/data.js` next. For now, create the scaffolding:

```bash
mkdir -p ~/400m-pace-lab/public
cd ~/400m-pace-lab

# package.json
cat > package.json << 'EOF'
{
  "name": "400m-pace-lab",
  "version": "1.0.0",
  "description": "Professional 400m split times database & pacing calculator",
  "scripts": {
    "dev": "npx serve public"
  },
  "license": "MIT"
}
EOF

# .gitignore
cat > .gitignore << 'EOF'
node_modules/
.DS_Store
.wrangler/
EOF
```

### Step 2: Create the GitHub repo

```bash
cd ~/400m-pace-lab
git init
git add -A
git commit -m "feat: 400m Pace Lab — split times database & pacing calculator

- 34 men's elite race entries (43.03 WR → 44.22)
- 31 women's elite race entries (47.60 WR → 49.07)
- Interactive pace calculator with gender/time inputs
- 8 performance tiers per gender (WR → Youth/MS)
- Data from Athletes First, IAAF/WA biomechanics, Omega/Seiko timing
- Pure static HTML/CSS/JS, no build step"

gh repo create alphapeakio/400m-pace-lab \
  --public \
  --source=. \
  --remote=origin \
  --description "Professional 400m split times database & pacing calculator — data from 1968-2025"

git branch -M main
git push -u origin main
```

### Step 3: Deploy to Cloudflare Pages

```bash
# Install wrangler if not already
npm i -g wrangler

# Login if needed
wrangler login

# Create and deploy
npx wrangler pages project create 400m-pace-lab --production-branch=main
npx wrangler pages deploy public --project-name=400m-pace-lab --branch=main
```

Then optionally connect the GitHub repo in the Cloudflare dashboard for auto-deploy on push:
- Go to https://dash.cloudflare.com → Pages → 400m-pace-lab → Settings → Builds & deployments
- Connect to GitHub → alphapeakio/400m-pace-lab
- Build command: (leave empty)
- Build output directory: `public`
- Deploy branch: `main`

### Result

- **GitHub**: https://github.com/alphapeakio/400m-pace-lab
- **Live site**: https://400m-pace-lab.pages.dev

---

## Alternative: Run the deploy script

If you'd rather run it all at once, the `deploy.sh` script handles steps 2-3 automatically. Just make sure:
- `gh` is authenticated (`gh auth status`)
- `wrangler` is authenticated (`wrangler whoami`)

Then:
```bash
cd ~/400m-pace-lab
bash deploy.sh
```
