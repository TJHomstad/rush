# Codebase Structure

**Analysis Date:** 2026-02-25

## Directory Layout

```
rush/
├── src/                          # Application source code (ES modules)
│   ├── main.js                   # App controller (routing, UI, timer, Canvas lifecycle)
│   ├── game.js                   # Game model (state, rotation, BFS flow, win, undo/redo)
│   ├── renderer.js               # Canvas renderer (tiles, donuts, particles, animation)
│   ├── catalog.js                # Puzzle loader & validator
│   ├── api.js                    # API client (auth, scores, leaderboards)
│   ├── storage.js                # localStorage wrapper (prefix: glazerush.v1)
│   ├── constants.js              # Difficulties, sizes, tile types, colors
│   └── utils.js                  # Helpers (formatMs, coordinate math)
├── assets/
│   ├── catalog-index.json        # Level index by difficulty/size
│   ├── puzzles/                  # Pre-generated puzzle JSON files
│   │   ├── glazed/               # Easy (5x5, 7x7)
│   │   ├── frosted/              # Medium (7x7, 10x10)
│   │   ├── sprinkled/            # Hard (15x15, 20x20)
│   │   └── double_chocolate/     # Expert (25x25)
│   └── sprites/                  # SVG/PNG assets (added later)
├── scripts/
│   └── generate-catalog.mjs      # Puzzle generator (Node.js)
├── .github/
│   └── workflows/                # GitHub Pages deploy
├── index.html                    # SPA shell (login, home, levels, puzzle, solved)
├── how-to-play.html              # Game rules page
├── privacy.html                  # Privacy policy
├── styles.css                    # CSS design system
├── package.json                  # Scripts only, zero dependencies
├── CLAUDE.md                     # Technical build instructions
├── GlazeRush-PRD.md              # Product requirements
├── donut-logo-2.png              # DerpyDonut brand logo
├── donut-plain-2.png             # Plain donut icon
└── donut-sprinkles-2.png         # Sprinkle donut icon
```

## Directory Purposes

**src/**
- Purpose: All browser-side application JavaScript
- Contains: ES module `.js` files
- Key files: `main.js` (app entry), `game.js` (core logic), `renderer.js` (Canvas)
- Subdirectories: None (flat structure)

**assets/puzzles/**
- Purpose: Pre-generated puzzle data files
- Contains: JSON files organized by `{difficulty}/{size}/{level}.json`
- Key files: `catalog-index.json` (master index)
- Subdirectories: `glazed/`, `frosted/`, `sprinkled/`, `double_chocolate/` with size subdirs

**scripts/**
- Purpose: Offline tooling (puzzle generation)
- Contains: `generate-catalog.mjs` (Node.js script)
- Key files: `generate-catalog.mjs` — spanning tree generation, uniqueness validation
- Subdirectories: None

## Key File Locations

**Entry Points:**
- `index.html` — Browser entry, SPA shell with all screens
- `src/main.js` — JavaScript entry (type=module, loaded from index.html)
- `scripts/generate-catalog.mjs` — Puzzle generator (run via `npm run generate:catalog`)

**Configuration:**
- `package.json` — Scripts (`start`, `serve`, `generate:catalog`), zero dependencies
- `src/constants.js` — Game configuration (difficulties, sizes, colors, tile types)

**Core Logic:**
- `src/game.js` — Game model (pure functions: create, rotate, flow, win, undo/redo)
- `src/renderer.js` — Canvas rendering (tiles, pipes, donuts, particles)
- `src/catalog.js` — Puzzle loading and validation

**Persistence:**
- `src/api.js` — Shared API client (auth, scores, leaderboards)
- `src/storage.js` — localStorage wrapper (progress, times, last puzzle)

**Presentation:**
- `styles.css` — Full design system (DerpyDonut base + Glaze Rush additions)
- `index.html` — All UI screens (login, home, levels, puzzle, solved modal)

**Documentation:**
- `CLAUDE.md` — Technical build instructions and architecture
- `GlazeRush-PRD.md` — Product requirements document

## Naming Conventions

**Files:**
- `camelCase.js` for source modules: `main.js`, `game.js`, `renderer.js`
- `kebab-case.mjs` for Node scripts: `generate-catalog.mjs`
- `kebab-case.html` for pages: `how-to-play.html`
- Zero-padded numbers for puzzle files: `01.json`, `02.json`, ..., `50.json`
- `UPPERCASE.md` for important docs: `CLAUDE.md`, `README.md`

**Directories:**
- Lowercase for all dirs: `src/`, `assets/`, `scripts/`
- Underscores in puzzle paths: `double_chocolate/`
- Size format: `5x5/`, `7x7/`, `10x10/`, `15x15/`, `20x20/`, `25x25/`

**Special Patterns:**
- No barrel files or `index.js` re-exports
- Puzzle path format: `assets/puzzles/{difficulty}/{width}x{height}/{level}.json`

## Where to Add New Code

**New Game Feature:**
- Primary code: `src/game.js` (logic) or `src/renderer.js` (visual)
- Integration: `src/main.js` (wire to UI/input)
- Constants: `src/constants.js`

**New Screen/Page:**
- HTML: Add screen div in `index.html`
- Logic: `src/main.js` (screen routing)
- Styles: `styles.css`

**New Utility:**
- Implementation: `src/utils.js`

**New Puzzle Difficulty/Size:**
- Generator: Update `scripts/generate-catalog.mjs`
- Constants: Update `src/constants.js` (`SIZES_BY_DIFFICULTY`)
- Output: `assets/puzzles/{new_difficulty}/{new_size}/`

**New Static Page:**
- Implementation: Root directory (`{page-name}.html`)

## Special Directories

**assets/puzzles/**
- Purpose: Pre-generated puzzle data (not hand-authored)
- Source: Generated by `scripts/generate-catalog.mjs`
- Committed: Yes (needed for deployment to GitHub Pages)

**assets/sprites/**
- Purpose: Game art assets (SVG/PNG)
- Source: Manually created or designed
- Committed: Yes
- Status: Placeholder (to be added later)

**.github/workflows/**
- Purpose: CI/CD automation
- Source: Manual configuration
- Committed: Yes

---

*Structure analysis: 2026-02-25*
*Update when directory structure changes*
