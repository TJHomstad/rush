# Architecture

**Analysis Date:** 2026-02-25

## Pattern Overview

**Overall:** Static SPA (Single Page Application) with Shared Microservice API

**Key Characteristics:**
- Zero-dependency, vanilla JavaScript with ES modules
- Frontend-only repo; leverages existing shared API infrastructure
- Canvas-based game rendering with pure game logic separation
- Mirrors sibling `shikaku-codex` project architecture

## Layers

**Presentation Layer:**
- Purpose: HTML screens, CSS styling, Canvas game board
- Contains: `index.html` (SPA shell), `styles.css`, `how-to-play.html`, `privacy.html`
- Depends on: App controller layer
- Used by: Browser directly

**App Controller Layer:**
- Purpose: Screen routing, UI state management, input handling, timer, Canvas lifecycle
- Contains: `src/main.js`
- Depends on: Game logic, renderer, API, storage, catalog
- Used by: Presentation layer (wired via script tag)

**Game Logic Layer:**
- Purpose: Pure game model (state, rotation, BFS connectivity, win detection, undo/redo)
- Contains: `src/game.js`
- Depends on: `src/constants.js`, `src/utils.js`
- Used by: App controller

**Rendering Layer:**
- Purpose: Canvas drawing (tiles, pipes, donuts, particles, animations)
- Contains: `src/renderer.js`
- Depends on: `src/constants.js` (colors, styles)
- Used by: App controller

**Data Layer:**
- Purpose: Puzzle loading, API communication, local persistence
- Contains: `src/catalog.js`, `src/api.js`, `src/storage.js`
- Depends on: `src/constants.js`, browser APIs (fetch, localStorage)
- Used by: App controller

**Utilities Layer:**
- Purpose: Shared helpers and game configuration constants
- Contains: `src/constants.js`, `src/utils.js`
- Depends on: Nothing (leaf modules)
- Used by: All other layers

**Puzzle Generation (Offline):**
- Purpose: Pre-generate puzzle data files
- Contains: `scripts/generate-catalog.mjs`
- Depends on: Node.js built-ins only
- Used by: Developer (run before deployment)

## Data Flow

**Game Session Flow:**

1. Player loads `index.html` in browser
2. `src/main.js` initializes, checks session via `api.me()`
3. If logged in → render home screen; if not → render login screen
4. Player selects difficulty/size → `catalog.getAvailableLevels()` returns level list
5. Player selects level → `catalog.loadPuzzle()` fetches `assets/puzzles/{...}/{level}.json`
6. `game.createGameModel(puzzle)` initializes game state from puzzle JSON
7. `renderer.createRenderer(canvas, model)` sets up Canvas and renders
8. Player clicks tile → `rotateTile()` → `computeFlow()` → `render()` redraws
9. `isSolved()` checks win condition after each move
10. On win: `api.submitScore(levelKey, completionMs)` → show solved modal with leaderboard

**State Management:**
- Game state lives in memory (game model object)
- In-progress puzzles persisted to localStorage via `src/storage.js`
- Each screen transition is a DOM show/hide toggle (SPA pattern)

## Key Abstractions

**Game Model:**
- Purpose: Encapsulate all game state and logic
- Functions: `createGameModel()`, `rotateTile()`, `computeFlow()`, `isSolved()`, `undo()`, `redo()`, `toggleLock()`
- Pattern: Pure functions operating on state objects (no classes)
- Location: `src/game.js`

**TileState:**
- Purpose: Represent a single grid cell's state
- Properties: `type`, `baseConnections`, `rotation`, `isTerminal`, `isSource`, `donutStyle`
- Pattern: Plain object with computed active connections via rotation math

**Connection Model:**
- Purpose: Encode pipe connectivity between adjacent tiles
- Encoding: `0=top, 1=right, 2=bottom, 3=left` (clockwise from top)
- Matching: Opposite pairs `0↔2`, `1↔3` — both tiles must point toward each other
- Rotation: Each 90deg CW shifts all connections by `+1 (mod 4)`

**Renderer:**
- Purpose: Canvas drawing separated from game logic
- Functions: `createRenderer()`, `render()`, `drawTile()`, `drawDonut()`, `drawSource()`, `cellFromPoint()`
- Pattern: Stateful (canvas context, layout cache) but deterministic given game state
- Location: `src/renderer.js`

## Entry Points

**Browser Entry:**
- Location: `index.html` → `src/main.js` (type=module)
- Triggers: Page load in browser
- Responsibilities: Initialize app, register event listeners, route screens, manage game lifecycle

**Puzzle Generator Entry:**
- Location: `scripts/generate-catalog.mjs` (run via `npm run generate:catalog`)
- Triggers: Developer runs manually before deployment
- Responsibilities: Generate 350 puzzle JSON files + `assets/catalog-index.json`

## Error Handling

**Strategy:** Not formally specified yet — needs definition during implementation

**Expected Patterns:**
- API errors: Catch at `api.js` boundary, surface via toast/UI messages
- Catalog fetch errors: Fallback messaging if puzzle file not found
- Game logic: Defensive checks in `rotateTile()` (reject if locked)
- Guest play: Graceful degradation when not logged in (skip score submission)

## Cross-Cutting Concerns

**Logging:**
- `console.log` for development output
- `console.error` for errors
- No structured logging framework

**Validation:**
- Puzzle JSON validated on load in `src/catalog.js`
- API levelKey regex: `/^[A-Za-z0-9_.-]+$/`

**Authentication:**
- Session-based via shared API
- Token in localStorage, checked on app init
- Guest play bypasses auth for gameplay (blocks score submission)

**Relative Paths:**
- All asset references must be relative (not absolute)
- Critical for GitHub Pages `/rush/` subpath deployment

---

*Architecture analysis: 2026-02-25*
*Update when major patterns change*
