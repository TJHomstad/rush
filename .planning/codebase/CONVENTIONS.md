# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**
- camelCase.js for source modules: `main.js`, `game.js`, `renderer.js`, `api.js`
- kebab-case.mjs for Node scripts: `generate-catalog.mjs`
- Zero-padded numbers for puzzle data: `01.json`, `02.json`
- UPPERCASE.md for project docs: `CLAUDE.md`, `README.md`

**Functions:**
- camelCase for all functions: `createGameModel()`, `rotateTile()`, `computeFlow()`
- Prefix getters with `get`: `getAvailableLevels()`, `getActiveConnections()`
- Action verbs for mutators: `rotateTile()`, `toggleLock()`, `submitScore()`
- Boolean-returning functions: `isSolved()`, `tilesConnect()`

**Variables:**
- camelCase for variables: `cellSize`, `flowState`, `donutStyle`
- UPPER_SNAKE_CASE for constants: `STORAGE_PREFIX`, `PIPE_COLOR`, `MAX_STORED_TIMES`
- No underscore prefix for private members

**Types:**
- Not applicable (vanilla JS, no TypeScript)
- Object shapes documented via comments in `CLAUDE.md`

## Code Style

**Formatting:**
- No Prettier or formatter configured
- 2-space indentation (standard for web projects)
- Single quotes for strings
- Semicolons required
- Follow existing DerpyDonut/Shikaku patterns

**Linting:**
- No ESLint or linter configured
- Zero-dependency constraint means no dev dependencies either
- Manual code review for quality

## Import Organization

**Order:**
1. No external packages (zero-dependency project)
2. Internal modules from `src/`: `import { fn } from './module.js'`
3. Constants imports: `import { CONSTANT } from './constants.js'`

**Path Style:**
- Relative imports with file extension: `'./game.js'`, `'./constants.js'`
- No path aliases (no bundler)

**Module System:**
- ES modules (`type: "module"` in `package.json`)
- Named exports preferred: `export function createGameModel() {}`
- `export const` for constants: `export const PIPE_COLOR = "#5C3317";`

## Error Handling

**Patterns:**
- API errors: Catch at `api.js` boundary, return error info to caller
- Game logic: Return `{ ok, reason? }` from state-changing functions like `rotateTile()`
- Fail fast: Reject invalid operations (e.g., rotating locked tiles) before state change

**Logging:**
- `console.log` for development output
- `console.error` for errors
- No structured logging framework

## Comments

**When to Comment:**
- Explain connection encoding: `// 0=top, 1=right, 2=bottom, 3=left (clockwise from top)`
- Explain algorithms: `// BFS from source through connected pipes`
- Explain non-obvious math: `// Rotation shifts connections by +1 (mod 4)`
- Inline comments on Canvas draw operations for clarity

**JSDoc:**
- Function signatures documented via comments:
  ```js
  // createGameModel(puzzle) -> initialize from puzzle JSON
  // rotateTile(model, row, col, direction) -> rotate CW (+1) or CCW (-1)
  ```

**TODO Comments:**
- Format: `// TODO: description`

## Function Design

**Size:**
- Keep functions focused on one responsibility
- Extract helpers for complex logic (BFS, constraint solving)

**Parameters:**
- Game model passed as first parameter: `rotateTile(model, row, col, direction)`
- Return objects for multi-value results: `{ ok, reason? }`

**Return Values:**
- Pure functions return new state or computed values
- State-changing functions return success/failure indicators
- BFS returns `Set<"row,col">` for flow state

## Module Design

**Exports:**
- Named exports for all public functions and constants
- No default exports
- No barrel files or index.js re-exports

**Module Boundaries:**
- `game.js` — Pure logic, no DOM, no rendering
- `renderer.js` — Canvas drawing only, consumes game state
- `api.js` — Network only, no game logic
- `storage.js` — localStorage only, no game logic
- `main.js` — Orchestration, wires everything together

## Key Conventions

**Coordinate Encoding:**
- Grid position: `{row, col}` objects or `"row,col"` strings for Map/Set keys
- Connection directions: `0=top, 1=right, 2=bottom, 3=left`
- Opposite pairs: `0↔2` (top↔bottom), `1↔3` (right↔left)

**Storage Key Format:**
- Prefix: `glazerush.v1`
- Progress: `glazerush.v1.progress.{storageId}`
- Times: `glazerush.v1.times.{storageId}`
- Last puzzle: `glazerush.v1.lastPuzzle`

**Level Key Format (API):**
- `glazerush.{difficulty}.{width}x{height}.{level_padded}`
- Example: `glazerush.glazed.5x5.01`

---

*Convention analysis: 2026-02-25*
*Update when patterns change*
