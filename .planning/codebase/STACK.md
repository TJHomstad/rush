# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**
- JavaScript (ES2015+ modules) - All application code (`src/*.js`)

**Secondary:**
- JavaScript (.mjs) - Node.js scripts (`scripts/generate-catalog.mjs`)
- HTML5 - SPA shell (`index.html`, `how-to-play.html`, `privacy.html`)
- CSS3 - Styling (`styles.css`)
- JSON - Puzzle data (`assets/puzzles/**/*.json`, `assets/catalog-index.json`)

## Runtime

**Environment:**
- Node.js - Puzzle generation script only (`scripts/generate-catalog.mjs`)
- Browser (ES2015+) - Frontend game client (Canvas API, localStorage, requestAnimationFrame)
- Python 3 - Local development server (`python3 -m http.server 4173`)
- No version constraint files detected (no `.nvmrc`, no `engines` field)

**Package Manager:**
- npm - `package.json` present with scripts only
- No lockfile (zero-dependency project)

## Frameworks

**Core:**
- None - Vanilla JavaScript with ES modules, no framework

**Testing:**
- None - Manual testing checklist only, no test framework

**Build/Dev:**
- None - Zero build step (no webpack, Vite, esbuild, TypeScript)
- Python HTTP server for local development

## Key Dependencies

**Critical:**
- None - Explicitly zero-dependency project per `CLAUDE.md`

**Infrastructure:**
- HTML5 Canvas API - Game board rendering (`src/renderer.js`)
- localStorage API - Client-side persistence (`src/storage.js`)
- Fetch API - API communication (`src/api.js`) and puzzle loading (`src/catalog.js`)
- requestAnimationFrame - Smooth animations (`src/renderer.js`)

## Configuration

**Environment:**
- No `.env` files - All configuration hardcoded or auto-detected
- API base URL auto-detected from hostname in `src/api.js`
- Game constants defined in `src/constants.js`
- Auth tokens stored in localStorage (`glazerush.sessionToken`)

**Build:**
- `package.json` - Scripts only (`start`, `serve`, `generate:catalog`)
- No build config files (no tsconfig, vite.config, etc.)

## Platform Requirements

**Development:**
- Any platform with Node.js (for puzzle generation) and Python 3 (for dev server)
- No external dependencies or Docker required

**Production:**
- GitHub Pages - Static files served at `derpydonut.com/rush/`
- Shared API at `api.derpydonut.com` (deployed on Railway from `shikaku-codex` repo)
- All asset paths must be relative (served under `/rush/` subpath)

---

*Stack analysis: 2026-02-25*
*Update after major dependency changes*
