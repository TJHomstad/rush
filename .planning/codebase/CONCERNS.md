# Codebase Concerns

**Analysis Date:** 2026-02-25

**Note:** This project is in the pre-implementation/planning phase. No source code exists yet. Concerns below are based on analysis of the specification documents (`CLAUDE.md`, `GlazeRush-PRD.md`) and identify issues to address before or during implementation.

## Documentation Inconsistencies

**Inconsistent difficulty grid sizes:**
- Issue: `CLAUDE.md` specifies "Glazed: 5x5, 7x7" while `GlazeRush-PRD.md` specifies "Glazed: 4x4, 5x5"
- Files: `CLAUDE.md` (difficulty tiers table) vs `GlazeRush-PRD.md` (difficulty table)
- Impact: Confusion during implementation; wrong grid sizes generated
- Fix approach: Align both documents before implementation. Recommend keeping 5x5 and 7x7 (more consistently referenced throughout CLAUDE.md)

**Inconsistent levelKey prefix:**
- Issue: `CLAUDE.md` uses `glazerush.*` prefix while `GlazeRush-PRD.md` uses `pipes.*` prefix
- Files: `CLAUDE.md` (score submission section) vs `GlazeRush-PRD.md` (level key format)
- Impact: Wrong prefix would break leaderboard namespacing on shared API
- Fix approach: Use `glazerush.*` consistently. Update PRD to match CLAUDE.md

## Architecture Gaps

**No error handling strategy defined:**
- Issue: No guidance on handling failed API calls, puzzle fetch failures, or network timeouts
- Files: `CLAUDE.md` (Phase 4 - api.js, catalog.js sections)
- Impact: Silent failures or poor UX when API is unreachable
- Fix approach: Define error handling patterns before implementing `src/api.js` and `src/catalog.js`:
  - Should failed score submissions block puzzle completion? (No)
  - Fallback behavior if leaderboard is unreachable? (Show local times only)
  - Retry strategy for API calls? (None initially, fail gracefully)

**Uniqueness validation algorithm underspecified:**
- Issue: `CLAUDE.md` says "use constraint propagation + backtracking solver" but provides no pseudocode or reference
- Files: `CLAUDE.md` (Uniqueness Validation section)
- Impact: Most algorithmically complex part of generator; incorrect implementation could produce unsolvable or multi-solution puzzles
- Fix approach: Implement and validate uniqueness solver in isolation before integrating into full generator

## Performance Concerns

**No memory management for large grids:**
- Issue: 25x25 grids have 625 tiles. Undo/redo snapshots all tile states repeatedly. No limits defined.
- Files: `CLAUDE.md` (Phase 2 - game.js undo/redo specification)
- Impact: Memory growth on mobile devices during extended play sessions
- Fix approach: Define max undo history depth (suggest 50 moves) and particle count limits

**Sprinkle particle system unbounded:**
- Issue: Animated particles on connected pipes with no documented limits
- Files: `CLAUDE.md` (Phase 3 - renderer.js animation section)
- Impact: Large grids with many connected pipes could spawn excessive particles, degrading frame rate
- Fix approach: Cap particle count (suggest 100 max active particles) and recycle them

## Security Considerations

**No puzzle JSON validation schema:**
- Issue: `catalog.js` described as "validate puzzle JSON" but no validation rules specified
- Files: `CLAUDE.md` (Phase 4 - catalog.js)
- Risk: Malformed puzzle data could crash renderer or game model
- Current mitigation: Puzzles are self-generated (trusted source)
- Recommendations: Add basic validation: tile coords within grid bounds, valid tile types, source exists, at least one terminal

**Score submission integrity:**
- Issue: Client submits completion time; no server-side solution verification
- Files: `CLAUDE.md` (Phase 5 - score submission)
- Risk: Trivially cheatable (submit fake times via DevTools)
- Current mitigation: Small user base (family game), trust model acceptable
- Recommendations: Acceptable for current scope. If needed later, add server-side puzzle verification

## Test Coverage Gaps

**No automated tests:**
- Issue: Zero-dependency constraint means no test framework. All testing is manual.
- Files: `CLAUDE.md` (Testing Checklist section)
- Risk: Regression bugs in core game logic (BFS, connectivity, win detection) during iteration
- Fix approach: Consider adding Vitest as dev dependency (wouldn't affect production), or validate thoroughly via manual testing during each phase

**Puzzle generator has no regression tests:**
- Issue: Generator produces 350 puzzles but has no automated verification beyond built-in uniqueness check
- Files: `scripts/generate-catalog.mjs`
- Risk: Generator changes could silently produce invalid puzzles
- Fix approach: After generation, run validation pass over all generated puzzles checking: connectivity, solvability, uniqueness, correct tile type assignments

## Missing Specifications

**Undo/redo scope unclear:**
- Issue: Should tile lock/unlock actions be undoable? Max history depth?
- Files: `CLAUDE.md` (Phase 2 - undo/redo)
- Impact: Implementation ambiguity
- Fix approach: Clarify during implementation: undo reverts rotation + lock state per move; max 50 history entries

**Canvas touch input edge cases:**
- Issue: Long press (>500ms) for lock toggle may conflict with browser context menus or scroll on mobile
- Files: `CLAUDE.md` (Phase 5 - input handling)
- Impact: Poor mobile UX if touch events not handled carefully
- Fix approach: Use `preventDefault()` on touchstart/touchend, test on real mobile devices

**Catalog loading strategy unspecified:**
- Issue: 350 levels listed in one catalog-index.json but fetch/cache strategy not defined
- Files: `CLAUDE.md` (Phase 4 - catalog.js)
- Impact: Minor (350 level index is ~50KB, acceptable for single fetch)
- Fix approach: Single monolithic index fetch on first load, individual puzzle files fetched on demand

---

*Concerns audit: 2026-02-25*
*Update as issues are fixed or new ones discovered*
