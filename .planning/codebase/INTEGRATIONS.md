# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**Shared DerpyDonut API** - Auth, scores, leaderboards for all DerpyDonut games
  - Base URL: `api.derpydonut.com` (auto-detected via `resolveApiBase()` in `src/api.js`)
  - Hosting: Railway (deployed from `shikaku-codex` repo, no changes needed)
  - Auth: Session-based (token stored in `localStorage` as `glazerush.sessionToken`)
  - No backend work required for Glaze Rush

**API Endpoints Used:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | POST | Session auth (first name + password) |
| `/auth/me` | GET | Session validation |
| `/auth/logout` | POST | Logout |
| `/scores` | POST | Submit `{ levelKey, completionMs }` |
| `/leaderboard/:levelKey` | GET | Per-level leaderboard (top 15) |
| `/leaderboards/home` | GET | Aggregate donuts + sprinkle donuts |

**Level Key Format:**
```
glazerush.{difficulty}.{width}x{height}.{level_padded}
Examples: glazerush.glazed.5x5.01, glazerush.double_chocolate.25x25.12
```

**CORS:** `https://derpydonut.com` already in API's allowed origins. No changes needed.

## Data Storage

**Databases:**
- None in this repo - Shared API server stores data (JSON file store on Railway)

**File Storage:**
- Static puzzle files served from GitHub Pages (`assets/puzzles/**/*.json`)
- Pre-generated offline via `scripts/generate-catalog.mjs`

**Caching:**
- localStorage for client-side persistence (`src/storage.js`)
- Prefix: `glazerush.v1`
- Stores: puzzle progress, best times, last played puzzle, session token

## Authentication & Identity

**Auth Provider:**
- Shared DerpyDonut API session auth
- Implementation: `src/api.js` (copied from Shikaku, adapted keys)
- Token storage: localStorage (`glazerush.sessionToken`)
- Session management: Server-side sessions, token-based client tracking

**Known Users:**
- Seeded users: Dad, Mom, Stephen, Lydia, Emmy, Hazel (shared across games)
- Guest play supported (play without login, prompted to save score)

## Monitoring & Observability

**Error Tracking:**
- None (console errors only)

**Analytics:**
- None

**Logs:**
- Browser console only

## CI/CD & Deployment

**Hosting:**
- GitHub Pages - Frontend at `derpydonut.com/rush/`
- Deploy: Push to `main` branch, auto-deployed
- Configuration: Enable in repo settings (Source: Deploy from branch `main` / `/ (root)`)
- No CNAME file needed (custom domain configured on `shikaku-codex` org page)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/`) - if needed for deployment

## Environment Configuration

**Development:**
- No env vars required
- Local server: `python3 -m http.server 4173` (or `npm start`)
- API auto-detects: uses `http://localhost:3000` when not on prod hostname

**Production:**
- API base: `https://api.derpydonut.com` (auto-detected by hostname)
- All paths relative (critical for `/rush/` subpath)
- No secrets in client code

## Cross-Game Integration

**Shared Infrastructure:**
- Same API server for Glaze Rush and Shikaku
- Same user accounts across both games
- Home leaderboard aggregates stats from both games
- Score namespacing: `glazerush.*` vs `shikaku.*` levelKey prefixes

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-02-25*
*Update when adding/removing external services*
