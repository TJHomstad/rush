# Glaze Rush

## What This Is

Glaze Rush is a donut-themed pipe puzzle game for derpydonut.com. Players rotate pipe tiles on a grid to deliver chocolate sprinkles from a source to all donut terminals. It's the second game in the DerpyDonut portfolio, alongside Shikaku, sharing auth, leaderboards, and brand identity. Deployed as a static SPA at derpydonut.com/rush/.

## Core Value

The pipe network must work correctly — valid puzzle generation (unique solutions), accurate BFS connectivity/flow, and correct win detection are non-negotiable. Everything else (polish, animation, daily challenges) is secondary.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Puzzle generator producing valid, unique-solution puzzles for all 7 difficulty/size tiers (350 total levels)
- [ ] Game model with tile rotation, BFS flow computation, win detection (no loops), undo/redo, tile locking
- [ ] Canvas renderer with placeholder graphics (pipes, donuts, source, flow state, rotation animation)
- [ ] Full SPA with login, home, difficulty/size selection, level grid, puzzle screen, solved modal
- [ ] API integration (auth, score submission, per-level leaderboards, home leaderboards) via shared api.derpydonut.com
- [ ] localStorage persistence (in-progress puzzles, best times, last played)
- [ ] Mobile-responsive Canvas with touch input (tap rotate, long-press lock)
- [ ] Timer (performance.now based, pauses on blur)
- [ ] Guest play (play without login, prompted to save score on win)
- [ ] Sprinkle flow particle animation on connected pipes
- [ ] Win celebration animation (sprinkle burst from all donuts)

### Out of Scope

- Daily/Weekly challenge system — deferred to post-launch (PRD Phase 3 stretch)
- Tutorial/onboarding overlay — deferred to post-launch polish
- AI-generated SVG sprite assets — using Canvas-drawn placeholders for v1
- Sound effects & music — post-launch
- PWA support — post-launch
- Multiplayer — post-launch
- Wrap-around mode — removed from scope entirely per PRD
- Server-side solution validation / anti-cheat — shared API works as-is, trust model acceptable for family game
- Backend/server code — shared API at api.derpydonut.com requires no changes
- npm dependencies — zero-dependency constraint

## Context

- Sibling project `shikaku-codex` provides reference patterns for api.js, storage.js, catalog.js, main.js, styles.css, and HTML structure
- Shared API at api.derpydonut.com handles auth (first name + password), score submission, and leaderboards for ALL DerpyDonut games
- API levelKey regex `/^[A-Za-z0-9_.-]+$/` supports `glazerush.difficulty.size.level` format
- Known seeded users: Dad, Mom, Stephen, Lydia, Emmy, Hazel (password: donut)
- GitHub Pages serves at derpydonut.com/rush/ — all paths must be relative
- PRD has inconsistency: says "Glazed: 4x4, 5x5" but CLAUDE.md says "Glazed: 5x5, 7x7" — using CLAUDE.md (authoritative technical spec)
- PRD uses `pipes.*` levelKey prefix but CLAUDE.md uses `glazerush.*` — using `glazerush.*`

## Constraints

- **Zero dependencies**: No npm packages, no framework, no build step — vanilla JS with ES modules only
- **No backend work**: Shared API at api.derpydonut.com works as-is
- **Relative paths**: All asset references must be relative (served under /rush/)
- **Canvas for game only**: HTML/CSS for UI chrome, Canvas only for game board
- **Browser ES modules**: `type: "module"` in package.json, native import/export

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CLAUDE.md authoritative over PRD for technical details | PRD has inconsistencies in grid sizes and levelKey prefix | — Pending |
| Glazed difficulty: 5x5 and 7x7 (not 4x4, 5x5) | CLAUDE.md spec, more consistent throughout docs | — Pending |
| levelKey prefix: `glazerush.*` (not `pipes.*`) | CLAUDE.md spec, matches game branding | — Pending |
| Canvas-drawn placeholders (no SVG sprites for v1) | Ship faster, swap in real art later | — Pending |
| Daily/Weekly challenges deferred | Not in CLAUDE.md build phases, adds complexity | — Pending |

---
*Last updated: 2026-02-25 after initialization*
