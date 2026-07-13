# Repository Guidelines

> Practical guide for AI assistants working in the **Addawah** codebase. Read this before editing.

## Project Overview

Addawah (a.k.a. "Dawa") is a free Islamic web platform — **salah tracking, accountability, daily inspiration, spiritual check-ins (Ruhaniah), Truth reflections, and community**. Built per `ADDAWAH_BRD.md` (v4.27). Tagline: *"Pray Together. Grow Together. Inspire Each Other."*

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript (strict) · Prisma + PostgreSQL (Neon) · SWR · Zod · Framer Motion · Chart.js · bcryptjs · jose (JWT) · Pino · Resend · Vercel Blob · TanStack Virtual · Vitest.

## Architecture & Data Flow

**Three-layer auth** on every authenticated request:
1. `middleware.ts` — edge gate, `decodeJwt` (expiry-only, no DB) on `addawah-session` cookie → redirect `/login`.
2. API route — `apiRequireAuth()` from `lib/api-helpers.ts` runs full `getSessionUser()` (JWT verify → DB `Session` → 30s Redis cache).
3. `AppLayoutClient.tsx` — client `useEffect` redirect when `!loading && !user` (third defense).

**Request flow (client → server):**
- Pages are thin: server components export `metadata` + render a client feature component. **All page data fetching is client-side SWR** against `/api/*` — no RSC server fetches for page data.
- `AppProvider` (SWR on `/api/auth/me`) → feature `*DataProvider` (single SWR fetch via context) → consumers read `useDashboardData()` / `useRuhaniahData()`.
- API routes are **thin orchestrators**: `apiRequireAuth` → Zod parse → delegate to `lib/buildXxxPayload()` helpers → `jsonOk` / `jsonError`. Multi-write mutations use `prisma.$transaction([...])`.
- Background recompute is fire-and-forget via `triggerSync(task, userId)` → keepalive `fetch('/api/internal/sync')` with `x-sync-secret` header; `.catch(()=>{})`.

**Two precomputed tables** (derived — write on salah change, read for speed): `UserWaktSnapshot` (live wakt board), `UserSalahDayStat` (daily aggregates for analytics). Never treat them as source-of-truth.

**Ruhaniah verse engine** (`lib/ruhaniah-verse.ts`): `gatherSignals` (8 parallel Prisma queries → tags) → score 300-ayah pool (`public/data/ayah-pool.json`, KV-cached) by tag match (+3 primary / +1 secondary / −10 if shown in last 7d) → pick → persist to `RuhaniahVerse`.

## Key Directories

```
app/
  (public)/        # marketing + auth surface (landing, login, reset-password, handbook)
  (app)/           # authenticated shell: dashboard, friends, analytics, ruhaniah,
                   #   profile, settings, notifications, u/[username]
  api/             # REST routes — one folder per domain (auth, salah, friends, ruhaniah…)
components/         # feature-foldered: dashboard/, ruhaniah/, friends/, ui/, providers/, layout/…
hooks/              # useRuhaniah, useFieldAvailability, useSigninAvailability
lib/                # ~70 flat, kebab-case modules — all server logic lives here
prisma/             # schema.prisma + migrations/
public/data/        # ayah-pool.json (300), fahm-questions.json (320) — long-cached
assets/css/         # dawa-tokens.css + per-feature BEM stylesheets (import-ordered manifest in dawa.css)
tests/              # *.test.ts — pure-unit, node env
```

**`lib/` has NO subdirectories and NO barrel file** — import the specific module: `@/lib/salah-utils`. Cross-`lib` imports use relative `./xxx`; app imports use `@/lib/xxx`.

## Development Commands

Package manager is **npm** (lockfile `package-lock.json`). Runtime is **Node.js**.

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (`dev:clean` wipes `.next` first) |
| `npm run build` | **`prisma generate && next build`** — never run `next build` alone |
| `npm start` | Serve production build |
| `npm run lint` | `next lint` (NOT a direct eslint call) |
| `npm test` / `npm run test:watch` / `npm run test:coverage` | Vitest |
| `npm run db:migrate` | `prisma migrate dev` — create timestamped migration |
| `npm run db:push` | `prisma db push` — schema-sync, no history (prototyping) |
| `npm run db:studio` | Prisma Studio GUI |

`postinstall` runs `prisma generate`, so `npm install` regenerates the client. After editing `schema.prisma`, run `prisma generate` (or reinstall) before type-checking.

## Code Conventions & Common Patterns

### API route skeleton (canonical)
```ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { triggerSync } from '@/lib/internal-sync';

const schema = z.object({ /* field rules; .refine() for cross-field */ });

export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();      // 1. auth gate
  if (error) return error;

  const rl = await checkRateLimit(`rl:scope:${user!.id}`, 30, 60);  // 2. rate limit (fail-open)
  if (!rl.allowed) return jsonError('Too many requests. Please slow down.', 429);

  try {
    const body = schema.parse(await req.json());       // 3. Zod (catch z.ZodError first)
    // 4. delegate to lib/* ; prisma.$transaction([...]) for atomic multi-write
    triggerSync('refresh-snapshots', user!.id);        // 5. fire-and-forget bg work
    return jsonOk({ ok: true });                       // 6. envelope
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.errors[0]?.message ?? 'Invalid input');
    logger.error({ route: '/api/x', err: e }, 'Failed');
    return jsonError('Failed', 500);
  }
}
```

### Response envelope (project standard)
- **Success:** `jsonOk(payload)` → `200 { ...payload }` (bare object, **no `{ data }` wrapper**). Mutations often return `{ ok: true }`. Always carries `no-store` cache headers.
- **Error:** `jsonError(message, status=400)` → `{ error: "<human message>" }`.
- Status codes: `200` ok · `400` validation · `401` unauthorized · `403` ownership · `404` missing · `429` rate-limited · `500` fault.
- **Never hand-roll `NextResponse.json`** — always `jsonOk` / `jsonError`.

### Prisma
- Import the singleton: `import { prisma } from '@/lib/prisma'`. **Never `new PrismaClient()`** — the `globalThis` singleton is mandatory (survives dev hot-reload).
- **Always pass `select: {...}`** to limit columns; reuse exported selects (`SALAH_RECORD_STATS_SELECT`, `friendUserSelect`, `notificationListSelect`).
- Parallelize independent reads with `Promise.all([...])`.
- Reserve `$transaction([...])` for true atomicity (only password-reset uses it in `lib/`).
- Upserts use composite unique keys: `where: { userId_date: { userId, date } }`.
- Optional/cache queries wrap failures in `.catch(() => {})`.

### Dates — CRITICAL (top bug source)
Three coexisting key systems in `lib/salah-utils.ts` / `lib/prayer-times.ts`:
- `formatDateKey` / `dateFromKey` — **UTC** `YYYY-MM-DD`, for `@db.Date` columns.
- `formatDateKeyLocal` — **local wall-clock**, for UI week-grid.
- `formatDateKeyInTimezone(d, timeZone)` — user's **prayer timezone**, for lifetime tracking boundaries.

Mixing these is the #1 source of off-by-one bugs. Default city/country is `Dhaka`/`Bangladesh` when user fields are blank.

### Iman meter
Chain seeded at **68**; per-day deltas: on-time **+4.2**, kaza **−3.5**, missed **−6**; clamped 0–100 and rounded. Trend = `late3.avg − early3.avg` (±4 thresholds → `up`/`down`/`steady`).

### Wakt windows
Fajr `[Fajr, Sunrise)` · Isha `[Isha, 24:00)` · others `[this, next)`. Karāhah (forbidden-poke) windows via `buildForbiddenWindows`. `canMarkSalahCell` locks today's cell until wakt starts.

### Caching (KV = Upstash Redis)
**Optional and fail-safe.** `kv.ts` swallows all errors → `null`. Never make correctness depend on a KV write. In-memory caches (`analytics-data`, `prayer-times`) are per-instance, short-TTL (60s / 30min-today). Treat the 30s session Redis cache as eventual: avatar/theme edits lag up to 30s.

### SWR (client data fetching)
- Fetcher: `swrFetcher` from `@/lib/swr-fetcher` (throws on non-OK so errors aren't cached).
- **Keys are centralized** in `@/lib/swr-revalidate` (`DASHBOARD_KEY`, `STATS_KEY`, `RUHANIAH_KEY`, …) — never hardcode `'/api/...'` strings.
- Gate keys on auth: `useSWR(user && !loading ? KEY : null, swrFetcher)`.
- Revalidation helpers: `revalidateDashboardMetrics()`, `revalidateMoodAnalytics()`, `revalidateRuhaniah()`.
- Writes → optimistic `mutate(newData, { revalidate:false })` + rollback on error (`SalahTracker.toggle` is the reference).

### Styling & theming
- **BEM `dawa-*` classes** in the matching feature CSS file (`assets/css/dawa-<feature>.css`); import order matters (manifest in `dawa.css`).
- Theme via CSS custom properties on `<html data-theme data-color>` — **reference `var(--accent)` etc., never hardcode accent hex.** 6 colors (green/blue/gold/purple/silver/pink) × dark/light; gold = default.
- Theme changes flow through `useTheme()`; `ThemeSync` persists to profile — don't write `data-theme`/`data-color` directly.
- **Any new animation MUST add a `prefers-reduced-motion` fallback** (CSS block + JS `matchMedia`). Signature easing: `[0.22, 1, 0.36, 1]`.
- Loading → `<Shimmer variant="…"/>` (or `ChartShimmer`/`StatShimmer`/…); never inline skeleton markup.

### Components & hooks
- **PascalCase `.tsx`**, one named export per file. Co-located hooks keep `use*` camelCase.
- `'use client'` on anything touching SWR/`useState`/`useEffect`/Framer Motion/portals/`useSearchParams`. Server components are rare (`JsonLd`, `StarRating`, `BrandMark`).
- Heavy/chart components → `dynamic(() => import(...), { ssr:false, loading: () => <ChartShimmer/> })`.
- New shared payload consumed by many siblings → wrap in a `*DataProvider` context exposing `{ data, isLoading, mutate }`.
- Custom hooks → `'use client'`, raw SWR return object, export the payload `type`, debounce availability checks 300–450ms.

### Background sync & logging
- `triggerSync(task, userId, dateKey?)` — keepalive fetch to `/api/internal/sync`; failures silent. Throttle per-user with `throttlePerKey`.
- `/api/internal/*` routes are **not** session-authenticated — they validate `x-sync-secret` against `INTERNAL_SYNC_SECRET` via `isValidInternalSecret`.
- Log with `logger.error({ route, err }, 'msg')` (Pino) or named helpers (`logAuthEvent`, `logPerformance`) — **not `console.error`**.

## Important Files

| File | Role |
|---|---|
| `lib/prisma.ts` | Prisma singleton (`globalThis`) — always import from here |
| `lib/auth.ts` | JWT cookie sessions (`createSession` / `getSessionUser` / `destroySession`); 30-day `addawah-session` cookie, HS256 via `jose` |
| `lib/api-helpers.ts` | `apiRequireAuth`, `jsonOk`, `jsonError`, `PRIVATE_CACHE_HEADERS` — every route uses these |
| `lib/salah-utils.ts` | Date-key + week + grid + streak + lifetime tracking core |
| `lib/salah-day-stats.ts` | `UserSalahDayStat` materializer; iman chain |
| `lib/prayer-insights-internal.ts` | Low-level classifiers (`classifyPrayerForDay`, `classifySalahMark`, `clampIman`) — import types from `prayer-insights.ts` |
| `lib/ruhaniah-verse.ts` | Verse selection engine (signals → score → pick) |
| `lib/internal-sync.ts` | `triggerSync` fire-and-forget background recompute |
| `lib/swr-revalidate.ts` | SWR key constants + `revalidate*` helpers |
| `lib/swr-fetcher.ts` | `swrFetcher` (throws on non-OK) |
| `lib/constants.ts` | `PRAYERS`, `SUNNAH_SLOTS`, `THEME_COLORS`, asset paths, `DAILY_INSPIRATIONS` |
| `lib/rewards.ts` | Gold-coin economy + wakt-decay prayer rewards + badge tiers |
| `lib/kv.ts` | Upstash Redis REST client (all errors → `null`) |
| `lib/logger.ts` | Pino + `createRequestLogger` / `logAuthEvent` / `logPerformance` |
| `middleware.ts` | Edge auth gate (expiry-only JWT check) |
| `prisma/schema.prisma` | 18 models, 4 enums; provider postgres (Neon pooled `DATABASE_URL` + `DIRECT_URL` for migrations) |
| `app/(app)/AppLayoutClient.tsx` | Authenticated client shell (3rd auth layer) |
| `public/data/ayah-pool.json` | 300 tagged Quran ayahs (verse engine source) |
| `public/data/fahm-questions.json` | 320 Fahm questions — **canonical source the client reads** |

### Fahm contract (do not break)
`FahmResponse.questionId` stores static ids (`Q1`…) and **intentionally has no FK** to `FahmQuestion` (migration `20250701120000` dropped it). The client reads `public/data/fahm-questions.json`; the `FahmQuestion` table is secondary. Do not reintroduce that FK.

## Runtime / Tooling Preferences

- **npm only.** Never `bun`, `yarn`, `pnpm`, or `bunx`. Lockfile is `package-lock.json`.
- **Runtime is Node.js** — no Bun-only APIs (`Bun.*`).
- **Lint = `npm run lint`** (`next lint`), not a direct `eslint` call.
- **Path alias `@/*` → repo root** (mirrored in `tsconfig.json` and `vitest.config.ts`). Import shared code as `@/lib/…`, not deep relative paths.
- **TypeScript strict** — all new code must be strict-clean.
- **Build chain:** `postinstall: prisma generate` → `build: prisma generate && next build`.
- **`.claude/settings.local.json`** allow-lists `npm run *`, `npm test *`, `npx vitest *`, `npx tsc *`, `npx next *`, `npm install *` — other bash invocations will prompt.

### Required env vars
`DATABASE_URL` (Neon pooled, `-pooler` host) · `DIRECT_URL` (Neon direct, migrations only) · `AUTH_SECRET` (JWT) · `RESEND_API_KEY` (transactional email). Optional: `INTERNAL_SYNC_SECRET`, `NEXT_PUBLIC_SITE_URL`, `UPSTASH_REDIS_REST_*`, `BLOB_*` / `CLOUDINARY_*`.

## Testing & QA

- **Vitest 4**, `environment: 'node'`, `globals: true`, `setupFiles: ['./tests/setup.ts']`.
- Tests live in `tests/**/*.test.ts` — **pure-unit only, no DB harness**. `tests/setup.ts` is a stub (no Prisma client, no global mocks).
- Coverage: V8 provider, excludes `node_modules/` and `tests/`.
- Existing coverage: `tests/salah-utils.test.ts` (date/week/streak helpers), `tests/prayer-timing.test.ts` (`classifyPrayerForDay`, `classifySalahMark`, `isMarkWithinWakt` — fixed Dhaka times).
- **To test DB-backed code:** mock Prisma at the module boundary — there is no shared test DB.
- Run: `npm test` (once) · `npm run test:watch` · `npm run test:coverage`.

## Non-Obvious Rules (Quick Checklist)

1. `jsonOk` / `jsonError` / `apiRequireAuth` from `@/lib/api-helpers` — never raw `NextResponse.json`.
2. Prisma singleton from `@/lib/prisma` — never `new PrismaClient()`.
3. Three date-key systems — pick the right one (UTC `@db.Date` / local UI / prayer-timezone tracking).
4. SWR keys from `@/lib/swr-revalidate` + `swrFetcher` — never inline `'/api/...'`.
5. KV/Redis is optional & fail-open — `.catch(()=>{})`, never depend on it for correctness.
6. `<Shimmer>` for loading — never inline skeletons.
7. `var(--accent)` for color — never hardcoded hex; `prefers-reduced-motion` fallback on every animation.
8. `triggerSync` for background work; failures are silent.
9. Precomputed tables (`UserWaktSnapshot`, `UserSalahDayStat`) are derived — not source-of-truth.
10. `completedOnTime` on `SalahRecord` short-circuits day classification (set at toggle via `classifySalahMark`).
11. Records without `kind` are legacy fard (`isFardRecord`).
12. `FahmResponse.questionId` is a static id, not a FK — don't reintroduce the FK.
