# Testing Patterns

**Analysis Date:** 2026-02-25

## Test Framework

**Runner:**
- None - No automated test framework (zero-dependency constraint)

**Assertion Library:**
- None - Manual testing only

**Run Commands:**
```bash
npm start                         # Serve locally at http://localhost:4173
npm run generate:catalog          # Generate puzzle data
# No test command defined
```

## Test Strategy

**Approach:** Manual functional testing per checklist in `CLAUDE.md`

This project follows a zero-dependency philosophy. Quality assurance relies on:
1. Manual testing against a defined checklist
2. Puzzle generator's built-in uniqueness validation (constraint propagation + backtracking)
3. Browser DevTools console for error monitoring
4. All 350+ generated puzzles serve as implicit test data

## Testing Checklist

From `CLAUDE.md` (the definitive quality gate):

- [ ] Puzzle generator produces valid, unique-solution puzzles for all difficulty tiers
- [ ] All tile types rotate correctly and connections update
- [ ] BFS flow computation correctly identifies connected tiles from source
- [ ] Win detection triggers only when all terminals are reached with no loops
- [ ] Undo/redo works across all actions
- [ ] Timer starts on first interaction, pauses correctly, displays accurately
- [ ] Score submission works with existing API (test with seeded users: Dad/donut, Mom/donut, etc.)
- [ ] Leaderboard loads and displays per-level rankings
- [ ] Canvas renders correctly on mobile (touch input, responsive sizing)
- [ ] Lock/pin tiles works (right-click and long-press)
- [ ] Level completion persists in localStorage
- [ ] Guest play works (play without login, prompted to save score)
- [ ] No console errors in dev or prod

## Critical Logic to Validate

**Puzzle Generator (`scripts/generate-catalog.mjs`):**
- Spanning tree produces connected graph with no cycles
- Tile type assignment matches node degree (degree 1=terminal, 2=straight/elbow, 3=tee, 4=cross)
- Uniqueness solver confirms exactly one valid rotation assignment per puzzle
- Initial scramble ensures at least N tiles are wrong

**Game Model (`src/game.js`):**
- `getActiveConnections()` correctly applies rotation math: `(base + rotation/90) % 4`
- `tilesConnect()` checks matching opposite ports between adjacent tiles
- `computeFlow()` BFS from source reaches correct tile set
- `isSolved()` verifies all terminals reached AND tree property (edges = nodes - 1)
- Undo/redo correctly snapshots and restores tile rotations + lock states

**Canvas Renderer (`src/renderer.js`):**
- High-DPI rendering: canvas dimensions = display size x devicePixelRatio
- `cellFromPoint()` correctly maps click/touch coordinates to grid cell
- Pipe connections render from cell center to correct edge
- Flow state visually distinguishes connected vs disconnected pipes

**API Integration (`src/api.js`):**
- `resolveApiBase()` correctly detects prod vs local environment
- Score submission uses correct levelKey format
- Session token stored/retrieved from localStorage

## Test Data

**Puzzle Files:**
- 350 pre-generated puzzles across 7 difficulty/size tiers
- Each puzzle validated for uniqueness during generation
- Stored in `assets/puzzles/{difficulty}/{size}/{level}.json`

**Seeded Users (for API testing):**
- Dad/donut, Mom/donut, Stephen/donut, Lydia/donut, Emmy/donut, Hazel/donut
- Same credentials as Shikaku game

## Coverage Gaps

**No automated tests for:**
- Game model logic (BFS, connectivity, win detection)
- Renderer coordinate math
- API error handling paths
- Storage serialization/deserialization
- Mobile touch input handling

**Recommended if adding tests later:**
- Test framework: Vitest or similar (would require adding as dev dependency)
- Priority: `game.js` pure functions (most testable, most critical)
- Test files: Co-located `src/game.test.js` or separate `tests/` directory

---

*Testing analysis: 2026-02-25*
*Update when test patterns change*
