# User wakt snapshot

Precomputed per-user wakt status so the friends board avoids prayer-times API calls and per-friend classification on every read.

## Model

`UserWaktSnapshot` — one row per user (`userId` PK), keyed by `dateKey` (calendar day in the user’s timezone).

Fields mirror `FriendWaktRow` enough for board rendering and summary counts (`phase`, `canPoke`, `remainingSeconds`, etc.).

## Refresh triggers

1. **Salah POST** — when a user marks/unmarks fard, refresh their snapshot immediately.
2. **Board / summary read** — if `refreshedAt` is older than `WAKT_SNAPSHOT_MAX_AGE_MS` (60s) or `dateKey` ≠ today, recompute in batch for visible/stale friends only.
3. **Future** — Vercel cron every 5–10 min for active users (optional).

## Read path

1. Load accepted friendships (paginated slice for board/circle).
2. `findMany` snapshots for friend IDs on current page.
3. Batch-refresh stale/missing snapshots (batched salah + prayer times via KV).
4. Map snapshots → board rows; apply privacy + poke cooldown on the viewer side.

## Summary endpoint

`GET /api/friends/board/summary` loads snapshots for **all** friend IDs (cheap single query), counts `phase === 'active'` and `canPoke`, returns `revision` = max `refreshedAt`. Client polls ~60s; refetches full hub when revision changes.

## Prayer times KV

Optional Upstash/Vercel KV (`KV_REST_API_URL`, `KV_REST_API_TOKEN`). Keys: `prayer:{city}|{country}|{date}`. Falls back to in-process cache when KV is unset.

## Pagination

`GET /api/friends/hub?cursor=0&limit=20` — one friendships query, sorted peers by name, slice for circle + board. `nextCursor` is numeric offset string.

## Scaling notes

- 50–200 friends: snapshot + paginated hub is sufficient.
- 500+: add denormalized `friend_list` edges and rank/filter (“in wakt now”) before pagination.
