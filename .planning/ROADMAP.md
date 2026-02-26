# Glaze Rush — Roadmap

## Milestone 1: v1.0 — Playable Game

Ship a fully functional pipe puzzle game at derpydonut.com/rush/ with puzzle generation, game logic, Canvas rendering, full SPA UI, API integration, and mobile support.

### Phase 1: Project Scaffold + Constants
**Goal:** Initialize repo structure (package.json, directory layout, constants, utils) so all subsequent phases have a foundation to build on.

### Phase 2: Puzzle Generator
**Goal:** Build `scripts/generate-catalog.mjs` that produces 350 valid, unique-solution puzzles across all difficulty tiers, outputting to `assets/puzzles/` and `assets/catalog-index.json`.

### Phase 3: Game Model
**Goal:** Build `src/game.js` with tile rotation, BFS connectivity/flow computation, win detection (no loops), undo/redo, and tile locking. Pure logic, no rendering.

### Phase 4: Canvas Renderer
**Goal:** Build `src/renderer.js` with placeholder graphics — pipe tiles, donuts, source, flow state coloring, rotation animation, sprinkle particles, win celebration FX, hit testing, and resize handling.

### Phase 5: API + Storage + Catalog
**Goal:** Build `src/api.js` (shared API client), `src/storage.js` (localStorage wrapper), and `src/catalog.js` (puzzle loader/validator). Persistence layer complete.

### Phase 6: HTML + CSS + App Controller
**Goal:** Build `index.html` (full SPA), `styles.css` (design system), and `src/main.js` (screen routing, input handling, timer, game lifecycle). Wire everything together into a playable game.

### Phase 7: Polish + Static Pages + Deploy
**Goal:** Add `how-to-play.html`, `privacy.html`, guest play flow, mobile touch refinements, and final testing. Prepare for GitHub Pages deployment.

---
*Last updated: 2026-02-25 after initialization*
