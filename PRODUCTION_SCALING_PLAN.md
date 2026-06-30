# Addawah — Production Scaling Plan (Free-Tier Edition)

> **Last updated:** 2025-06-29
> **Constraint:** Everything must run on free-tier services (Vercel Hobby, Neon Free, Upstash Free, Resend Free). Zero budget.

---

## Table of Contents

- [Infrastructure Overview](#infrastructure-overview)
- [Phase 1 — Zero-Risk Quick Wins](#phase-1--zero-risk-quick-wins)
- [Phase 2 — API Fixes](#phase-2--api-fixes)
- [Phase 3 — Database Indexes](#phase-3--database-indexes)
- [Phase 4 — Structural Improvements](#phase-4--structural-improvements)
- [Phase 5 — Scale-Ready (When Growth Demands)](#phase-5--scale-ready-when-growth-demands)
- [Free-Tier Budget Tracker](#free-tier-budget-tracker)
- [Risk Matrix](#risk-matrix)

---

## Infrastructure Overview

| Service | Tier | Key Limits | Implication |
|---|---|---|---|
| **Vercel** | Hobby (Free) | 10s function timeout, no Cron Jobs, no `waitUntil` | Background work must be clever |
| **Neon PostgreSQL** | Free | 512MB storage, auto-suspend after 5min idle, ~10 concurrent connections | Cold starts ~500ms, must minimize queries |
| **Upstash Redis** | Free | 10,000 commands/day, 256MB | Cache carefully, every command counts |
| **Resend** | Free | 100 emails/day, 3,000/month | OTP and transactional only |
| **Vercel Blob** | Free | 500MB storage, 1GB bandwidth | Avatar storage only |
| **AlAdhan API** | Free | No hard limit, be respectful | Cache aggressively (already done) |

---

## Phase 1 — Zero-Risk Quick Wins

> **Timeline:** 1-2 days
> **Risk:** None — no DB changes, no schema changes, no new dependencies beyond small packages
> **Rollback:** Git revert

---

### 1.1 — Fix Fire-and-Forget Promises

**Problem:** `void somePromise()` in serverless gets killed when the function terminates. Snapshot refreshes and notification syncs silently fail.

**Free-Tier Solution:** On Vercel Hobby, `waitUntil` from `@vercel/functions` is **not available**. Instead:

- **Option A:** `await` the promises directly before sending the response. Adds ~50-200ms latency but guarantees completion.
- **Option B:** Use `setTimeout` to defer execution by 0ms — this keeps the function alive long enough for the microtask to start, but NOT guaranteed to complete. Unreliable.
- **Option C (Recommended):** Create a dedicated internal API route `/api/internal/sync-user` that handles the sync work. The main route calls it via `fetch()` with `keepalive: true`. The fetch completes independently of the calling function's lifecycle.

**Files to change:**
- `app/api/salah/route.ts` — lines ~129-130
- `app/api/auth/me/route.ts` — line ~9

**Performance gain:** Snapshot refreshes and notification syncs actually complete instead of silently failing.

---

### 1.2 — Fix Swallowed Errors

**Problem:** `catch {` with no error variable in 3 routes. Errors vanish silently.

**Solution:** Change to `catch (e) { console.error('[route-name]', e); ... }`

**Files to change:**
- `app/api/friends/route.ts` — PATCH handler (~line 180)
- `app/api/pokes/route.ts` — POST handler (~line 104)
- `app/api/mood/route.ts` — POST handler (~line 52)

**Performance gain:** Zero directly. But you'll actually know what's breaking in production instead of staring at silent 500s in Vercel logs.

---

### 1.3 — Add Security Headers

**Problem:** `next.config.js` is empty. No security headers at all.

**Solution:** Add `headers()` config:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**CSP note:** Do NOT add Content-Security-Policy yet. It will break your AlAdhan API calls, Cloudinary uploads, font loading, and Framer Motion. Test CSP in a preview deployment first.

**Performance gain:** None. Table stakes for production.

---

### 1.4 — Verify JWT in Middleware (Not Just Cookie Existence)

**Problem:** Middleware only checks if the cookie exists. Every expired/invalid cookie passes middleware, hits the API route, makes a DB call, and THEN fails.

**Solution:** In `middleware.ts`, decode the JWT payload using `jose.decodeJwt()` and check `exp`. This is CPU-only — no DB call, no network call. If expired, clear the cookie and redirect.

**Edge case:** If a token is valid but the session was deleted from DB, it passes middleware but fails at API (same as today). No behavior change.

**Performance gain:** Every request with an expired cookie currently wastes a DB query. At 100 concurrent users with stale sessions, this eliminates a meaningful chunk of unnecessary DB calls. On Neon free tier with ~10 connection limit, every saved query matters.

---

### 1.5 — Move In-Memory Caches to Redis

**Problem:** `Map` objects in `lib/auth.ts` and `lib/analytics-data.ts` are unbounded and per-instance. In serverless, each cold start gets an empty map (cache miss → DB query).

**Free-Tier Solution:** Upstash Free gives 10,000 commands/day. Budget carefully:

| Cache | TTL | Commands/Day (est.) | Worth it? |
|---|---|---|---|
| Session cache | 30s | ~2,000 (2 reads per request, ~1000 requests/day) | Yes — highest hit rate |
| Analytics cache | 60s | ~200 (analytics page is visited less) | Yes |
| Prayer times cache | 30min-24h | ~50 (already cached well in-memory) | Keep in-memory, it's bounded (400 max) |

**Strategy:**
- Move session cache to Redis: `SETEX session:{tokenHash} 30 {userData}` — use token hash (not full token) as key to save storage
- Move analytics cache to Redis: `SETEX analytics:{userId} 60 {payload}`
- Keep prayer times cache in-process (it already has a 400-entry cap and Redis as layer 2)
- Add LRU eviction to in-process caches if not moving them to Redis

**Commands budget:** ~2,200/day out of 10,000 limit. Leaves 7,800 for rate limiting and other uses.

**Performance gain:** Cache hit rate goes from 0% on cold start to ~90%+ across all instances. On Neon free tier, this is critical — every avoided query keeps you under the connection limit.

---

### 1.6 — Add HTTP Rate Limiting

**Problem:** No rate limiting on any endpoint. Login is brute-forceable. Username enumeration is trivial.

**Free-Tier Solution:** `@upstash/ratelimit` uses ~2 Redis commands per rate limit check (1 sliding window increment + 1 read). Budget:

| Endpoint | Limit | Redis Commands/Day (est.) |
|---|---|---|
| `POST /api/auth/login` | 5/min per IP | ~100 |
| `POST /api/auth/register` | 3/min per IP | ~30 |
| `POST /api/auth/reset-password/send-otp` | 3/min per IP | ~20 |
| `GET /api/auth/check-availability` | 10/min per IP | ~200 |
| `POST /api/pokes` | 20/min per user | ~100 |
| All other `POST/PATCH/DELETE` | 60/min per user | ~500 |

**Total:** ~950 commands/day for rate limiting. Combined with caching (~2,200), total Redis usage is ~3,150/day out of 10,000. Comfortable.

**Implementation:** Create `lib/rate-limit.ts` using `@upstash/ratelimit` with sliding window algorithm. Call at the top of each protected route. Return `429 Too Many Requests` with `Retry-After` header.

**Risk:** Very low. Start generous, tighten later. The only risk is blocking legitimate users, but the limits above are very permissive.

**Performance gain:** Directly prevents abuse. A single attacker can exhaust your Neon connection pool with rapid login attempts. Rate limiting is the single most important production hardening step.

---

## Phase 2 — API Fixes

> **Timeline:** 2-3 days
> **Risk:** Low — application logic changes only, no schema changes
> **Rollback:** Git revert
> **Testing:** Test each endpoint manually with known data before deploying

---

### 2.1 — Fix `GET /api/friends/suggestions` (CRITICAL)

**Problem:** Fetches ALL users + ALL friendships into memory. At 10K users, this OOMs your serverless function.

**Solution:** Push exclusion logic into SQL.

**Step 1:** Fetch existing connection IDs for current user:
```sql
SELECT "friendId" FROM "Friendship" WHERE "userId" = :uid AND status IN ('PENDING','ACCEPTED')
UNION
SELECT "userId" FROM "Friendship" WHERE "friendId" = :uid AND status IN ('PENDING','ACCEPTED')
```

**Step 2:** Fetch candidates with DB-level pagination:
```sql
SELECT id, name, username, "avatarColor", "avatarUrl"
FROM "User"
WHERE id NOT IN (:existingIds) AND id != :uid
ORDER BY "createdAt" DESC
LIMIT :take OFFSET :skip
```

**Safety notes:**
- If user has zero connections, `NOT IN (empty set)` matches all users — correct behavior
- Test with known user IDs to verify same suggestions appear before/after
- Add a `take` limit (default 20, max 50)

**Cache:** Store result in Redis for 10 minutes per user. Invalidate when friend request is sent/accepted/disconnected.

**Performance gain:** At 10K users, memory usage drops from hundreds of MB to a few KB. Response time goes from seconds (or OOM) to <50ms.

---

### 2.2 — Fix `GET /api/users/[username]` — Cap Salah Records

**Problem:** Fetches ALL lifetime `SalahRecord` rows. Active user after 1 year = ~5,475 records per profile view.

**Solution:** Use the precomputed `UserSalahDayStat` table instead of raw records.

- For public profile: fetch last 90 days of `UserSalahDayStat` rows (90 rows vs thousands)
- For chart data: `UserSalahDayStat` already has `onTime`, `kaza`, `missed`, `iman` per day
- Fallback: if no day stats exist for a user, fall back to raw query with 30-day cap

**Safety notes:**
- `UserSalahDayStat` is already populated by `refreshSalahDayStatForUser`
- Verify the stat values match raw record counts for a few test users before deploying
- The profile page UI may need minor adjustments if it currently renders per-prayer detail from raw records

**Performance gain:** 90 rows instead of potentially thousands. Profile page load drops from 500ms+ to <50ms.

---

### 2.3 — Fix `GET /api/friends/connections` — Add Pagination

**Problem:** Four unbounded `findMany` calls. A user with 500 friends = 2000 rows with full user profiles.

**Solution:** Add cursor-based pagination (same pattern as `/api/friends/hub`).

- Accept `cursor` and `limit` query params (default 20, max 50)
- Use Prisma `cursor` + `skip: 1`
- Return `nextCursor` in response
- Frontend: add "Load More" button or infinite scroll

**Backward compatible:** If no cursor passed, return first page with default limit.

**Performance gain:** 80 rows instead of 2000. Page load goes from 200ms-2s to <50ms.

---

### 2.4 — Batch Notification Sync Operations

**Problem:** `syncPokeNotifications` and `syncConnectionRequestNotifications` iterate sequentially with individual upserts. 20 pokes = 20 serial DB round trips.

**Solution:** Collect all notification data first, then use `Promise.all()` for parallel execution.

**Safety notes:**
- Each upsert targets a unique `(userId, type, entityId)` combination — no conflicts
- `Promise.all` is safe here because each upsert is independent
- If any single upsert fails, the others still succeed (unlike `$transaction` which would roll back all)

**Performance gain:** 20 serial upserts at ~5ms each = 100ms → 20 parallel upserts = ~5-10ms. 10-20x faster.

---

### 2.5 — Add Caching to Expensive Endpoints

**Problem:** Expensive endpoints recompute on every request with no caching.

**Free-Tier Solution:** Cache in Redis with careful TTLs:

| Endpoint | Cache Key | TTL | Redis Commands/Day (est.) |
|---|---|---|---|
| Suggestions (after 2.1 fix) | `suggest:{userId}:{page}` | 10 min | ~100 |
| Connections | `conn:{userId}:{cursor}` | 2 min | ~300 |
| Stats | `stats:{userId}` | 60s | ~200 |

**Invalidation rules:**
- Friend request sent → clear suggestions cache for both users
- Friend request accepted/disconnected → clear suggestions + connections cache for both
- Prayer marked → clear stats cache for user

**Total additional Redis commands:** ~600/day. Combined total: ~3,750/day out of 10,000.

**Performance gain:** Repeat visits within TTL are instant (Redis ~2ms vs DB ~50ms). Reduces DB load significantly.

---

## Phase 3 — Database Indexes

> **Timeline:** 1 day (including testing)
> **Risk:** Low — only ADD indexes, no data changes, no column changes
> **Rollback:** `DROP INDEX` (instant)
> **Downtime:** None — `CREATE INDEX` does not lock reads in PostgreSQL

---

### 3.1 — Composite Index for Friendship Lookups

```sql
CREATE INDEX "Friendship_userId_friendId_status_idx"
  ON "Friendship"("userId", "friendId", "status");
```

**Why:** The friend request check in `POST /api/friends` does `findFirst` with `OR` on both directions. Current single-column indexes can't serve this query efficiently.

**Performance gain:** Friend existence check goes from two index scans + merge to a single index scan.

**Neon free tier note:** Index storage counts toward the 512MB limit. This index adds ~1-2MB for 100K friendships. Acceptable.

---

### 3.2 — Index for FARD-Only Queries

```sql
CREATE INDEX "SalahRecord_userId_kind_date_idx"
  ON "SalahRecord"("userId", "kind", "date");
```

**Why:** Analytics, insights, and friends hub all filter `kind = 'FARD'`. Current index starts with `(userId, date, ...)` so filtering on `kind` requires scanning all date rows.

**Performance gain:** For a user with 15 records/day (5 prayers × 3 kinds), FARD queries scan 5 rows instead of 15. 3x improvement on every analytics/insights query.

---

### 3.3 — Trigram Index for Username Search

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "User_username_trgm_idx"
  ON "User" USING gin ("username" gin_trgm_ops);
```

**Why:** Friend search uses `contains` with `mode: 'insensitive'`. Without trigram, PostgreSQL does a sequential scan with `ILIKE '%query%'`.

**Neon free tier note:** `pg_trgm` is a built-in PostgreSQL extension. Neon free tier supports it. The GIN index adds ~5-10MB for 100K users.

**Performance gain:** Username search goes from ~200ms (sequential scan) to <10ms (index scan) at 10K users.

---

### 3.4 — Optional: Partial Index for Active Sessions

```sql
CREATE INDEX "Session_expiresAt_active_idx"
  ON "Session"("expiresAt")
  WHERE "expiresAt" > NOW();
```

**Why:** Session cleanup and lookup only care about non-expired sessions. A partial index is smaller and faster.

**Note:** You already have `Session(expiresAt)` index. This replaces it with a partial version. Run `DROP INDEX "Session_expiresAt_idx"` first if you add this.

---

## Phase 4 — Structural Improvements

> **Timeline:** 3-5 days
> **Risk:** Low-medium — new features, no changes to existing behavior
> **Rollback:** Git revert + remove new files

---

### 4.1 — Structured Logging

**Problem:** Only `console.error` and `console.warn`. No request IDs, no performance timing, no audit trail.

**Solution:** Install `pino` (~10KB, zero dependencies).

Create `lib/logger.ts`:
- JSON output in production (parseable by Vercel logs)
- Pretty output in development
- Include: request ID, user ID, route name, duration
- Log all auth events at `info` level (login, register, password reset, account deletion)
- Log all errors at `error` level with stack traces

**Free-Tier Note:** Vercel Hobby provides basic log streaming. JSON logs work with `vercel log` CLI. No external log aggregator needed.

**Cost:** Zero. `pino` is free. Vercel logs are included.

---

### 4.2 — Test Coverage

**Problem:** Zero tests. Any refactor could silently break something.

**Solution:** Set up Vitest + write integration tests for critical paths.

**Setup:**
1. Install `vitest` (free, fast)
2. Create test database — use Neon branching (free tier: 1 branch) or local PostgreSQL
3. Write a `prisma.test.ts` helper that resets the test DB between tests

**Priority tests (in order):**
1. Auth flow: register → login → me → logout
2. Salah marking: mark → verify → streak calculation
3. Friend request: send → accept → board
4. Suggestions: verify no full table scan behavior
5. Rate limiting: verify 429 responses

**CI (optional):** GitHub Actions free tier gives 2,000 minutes/month. A Vitest suite runs in ~30 seconds. You can run tests on every PR for free.

**Cost:** Zero. Vitest is free. GitHub Actions free tier is more than enough.

---

### 4.3 — Background Job Processing

**Problem:** Fire-and-forget `void` promises may not complete in serverless. Vercel Hobby has 10s timeout.

**Free-Tier Solution:** Vercel Hobby does NOT support Cron Jobs. Instead:

**Option A — Internal Sync Route (Recommended):**
- Create `POST /api/internal/sync` that accepts `{ userId, task }` and performs the sync work
- Protected by a secret header (`x-sync-secret: ${INTERNAL_SECRET}`)
- The main API routes call this via `fetch()` with `keepalive: true` after sending the response
- The sync route runs independently with its own 10s timeout

**Option B — Client-Triggered Sync:**
- Add a lightweight `/api/sync-status` endpoint that returns pending sync tasks
- The SWR auth hook (`/api/auth/me`) checks for pending syncs and triggers them
- This piggybacks on existing polling, no extra infrastructure

**Option C — Deferred Computation:**
- Instead of computing snapshots/stats on every prayer mark, compute them lazily when requested
- Add a `lastSyncedAt` field to `UserWaktSnapshot` and `UserSalahDayStat`
- When the board/dashboard requests data, check if it's stale (>5min) and refresh inline
- This eliminates background work entirely at the cost of slightly slower reads

**Recommended:** Option A for now. Option C as a longer-term refactor.

**Cost:** Zero. All options use existing infrastructure.

---

### 4.4 — Connection Pool Tuning

**Problem:** Neon free tier has ~10 concurrent connections. Each serverless function creates its own Prisma client.

**Solution:**
1. Add `?connection_limit=3&pool_timeout=10` to `DATABASE_URL`
   - `connection_limit=3` because Neon free has ~10 total, and you want headroom
   - `pool_timeout=10` so queries wait up to 10s for a connection instead of failing immediately
2. Ensure the Prisma singleton pattern is working (it is — `lib/prisma.ts` uses `globalThis`)
3. Monitor connection usage in Neon dashboard

**Free-Tier Note:** Neon free tier auto-suspends after 5 minutes of inactivity. First query after idle takes ~500ms-1s (cold start). This is unavoidable on free tier — Redis caching (Phase 1.5) helps minimize cold starts by reducing query frequency.

**Performance gain:** Prevents connection pool exhaustion under concurrent load. Without explicit limits, concurrent functions may try to open unlimited connections, hitting Neon's cap and getting errors.

---

## Phase 5 — Scale-Ready (When Growth Demands)

> **Timeline:** When you have 5K+ daily active users
> **These require either paid tiers or significant architectural changes**

---

### 5.1 — Replace Polling with Server-Sent Events

**Problem:** Notification polling = N requests/minute (one per active user). At 1000 users, that's ~17 DB-hitting requests/second.

**Free-Tier Constraint:** Vercel Hobby has 10s function timeout. SSE connections are long-lived. **This does NOT work on Vercel Hobby.**

**Free Alternative:** Reduce polling frequency. Instead of 60s, poll every 5 minutes and use the `stale-while-revalidate` pattern — show cached data instantly, refresh in background. This cuts notification endpoint load by 5x.

**When to upgrade:** If you reach 5K+ DAU and notifications are a bottleneck, upgrade to Vercel Pro ($20/month) and implement SSE.

---

### 5.2 — Read Replicas

**Problem:** Read-heavy endpoints (dashboard, analytics, board) compete with writes (prayer marking, friend requests) for connection slots.

**Free-Tier Constraint:** Neon free tier does NOT support read replicas.

**Free Alternative:** Aggressive caching (Phase 1.5 + 2.5) reduces read query frequency by 80-90%. This is sufficient for moderate scale.

**When to upgrade:** If you exceed Neon free's 512MB storage or need more concurrent connections, upgrade to Neon Pro ($19/month) for read replicas.

---

### 5.3 — Dedicated Background Worker

**Problem:** All computation happens in API request handlers. Heavy work (analytics, snapshot refresh) adds latency to user-facing requests.

**Free-Tier Constraint:** No free service provides persistent background workers.

**Free Alternative:** Option C from Phase 4.3 (lazy computation) — compute on read, cache aggressively. This trades slight read latency for zero background infrastructure.

**When to upgrade:** If you need real-time updates (friend marks prayer → board updates instantly), consider a paid queue service (Upstash QStash at $1/month, or Inngest free tier with 50K invocations/month).

---

## Free-Tier Budget Tracker

### Upstash Redis — 10,000 commands/day

| Usage | Commands/Day | % of Budget |
|---|---|---|
| Session cache (Phase 1.5) | ~2,000 | 20% |
| Analytics cache (Phase 1.5) | ~200 | 2% |
| Rate limiting (Phase 1.6) | ~950 | 9.5% |
| Suggestions cache (Phase 2.5) | ~100 | 1% |
| Connections cache (Phase 2.5) | ~300 | 3% |
| Stats cache (Phase 2.5) | ~200 | 2% |
| **Total** | **~3,750** | **37.5%** |
| **Remaining** | **~6,250** | **62.5%** |

Buffer: 6,250 commands/day for traffic spikes, debugging, and future features.

### Neon PostgreSQL — 512MB storage

| Data | Estimated Size (10K users) |
|---|---|
| User table (10K rows) | ~5MB |
| SalahRecord (10K × 365 × 15) | ~150MB |
| Friendship (10K × 50 avg) | ~5MB |
| Notification (10K × 100 avg) | ~10MB |
| Session (10K × 1 active) | ~1MB |
| Indexes (all) | ~20MB |
| **Total** | **~191MB** |
| **Remaining** | **~320MB** |

Comfortable for 10K users. At 25K+ users, you'll need to either archive old data or upgrade.

### Vercel Hobby — Function Limits

| Metric | Limit | Current Usage (est.) |
|---|---|---|
| Function timeout | 10s | Most routes <1s, analytics ~2-3s |
| Bandwidth | 100GB/month | ~5GB at 1K users |
| Serverless invocations | 100K/month | ~30K at 1K users (30 requests/user/day) |

Comfortable for moderate scale. The 10s timeout is the main constraint — analytics endpoint is the riskiest.

---

## Risk Matrix

| Change | Risk | Impact if Wrong | Mitigation |
|---|---|---|---|
| 1.1 Fix fire-and-forget | None | N/A | Same logic, just guaranteed |
| 1.2 Fix catch blocks | None | N/A | Additive logging only |
| 1.3 Security headers | None | N/A | Server config, no runtime |
| 1.4 JWT in middleware | Very Low | Stale token passes middleware (same as today) | Fall through to API auth |
| 1.5 Redis caches | Low | Slightly slower if Redis down (fall through to DB) | Graceful fallback |
| 1.6 Rate limiting | Low | Legitimate user gets 429 (rare) | Start generous |
| 2.1 Fix suggestions | Low | Different suggestion results | Test with known users |
| 2.2 Cap salah records | Low | Missing old data on profile | Fallback to raw query |
| 2.3 Connections pagination | Low | Frontend needs update | Backward compatible API |
| 2.4 Batch notifications | Very Low | Same logic, parallel | Each upsert independent |
| 2.5 Endpoint caching | Low | Stale data for TTL duration | Short TTLs, cache invalidation |
| 3.1-3.3 Indexes | Very Low | Slightly more disk usage | `DROP INDEX` to revert |
| 4.1 Structured logging | None | N/A | Additive, no behavior change |
| 4.2 Tests | None | N/A | Separate test DB |
| 4.3 Background jobs | Low | Sync may still be slow | Fallback to lazy computation |

---

## Implementation Order

```
Day 1-2:  Phase 1 (all 6 items)         — Zero risk, immediate hardening
Day 3-4:  Phase 2.1 + 2.2 + 2.4        — Fix the critical queries
Day 5:    Phase 2.3 + 2.5               — Pagination + caching
Day 6:    Phase 3 (all indexes)          — One migration, test with EXPLAIN
Day 7-8:  Phase 4.1 + 4.2               — Logging + test setup
Day 9-10: Phase 4.3 + 4.4               — Background jobs + pool tuning
```

**Total: ~10 working days for a solo developer.**

After this, you'll have a production-hardened app that can handle 10K+ daily active users on zero budget. The next upgrade (Vercel Pro + Neon Pro) unlocks 10x more headroom for ~$40/month.
