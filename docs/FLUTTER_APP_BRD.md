# Addawah — Flutter Mobile App BRD & Technical Conversion Guide

> Version 1.0 · Target: pixel-faithful native mobile port of the Addawah web app (Next.js) using **Flutter**, backed by the **existing Next.js REST API** as a headless backend.
>
> Tagline: *Pray Together. Grow Together. Inspire Each Other.*

---

## 1. Goal & Approach

Build a native iOS + Android app in Flutter that reproduces the web experience **exactly** — same accent colors, typography, radii, motion feel, dark/light modes, and 6 theme palettes — while consuming the current `/api/*` endpoints so we do **not** rebuild business logic on the client.

**Division of work**
- **You:** Flutter frontend (UI, state, navigation, theming, offline UX).
- **Backend (already built):** Next.js API routes are the single source of truth for salah logic, iman meter, ruhaniah verse engine, wakt classification, rewards, analytics aggregation, etc. The app is a thin, well-cached client.

**Guiding principles (so scaling never hurts):**
1. **Feature-first, layered architecture** — every feature is self-contained (`data / domain / presentation`). New features never touch old ones.
2. **API is contract, not coupling** — one typed networking layer; screens never call `http` directly.
3. **Design tokens, not hardcoded colors** — mirror the web's CSS-variable system in a single Dart theme source. Changing a palette = one place.
4. **Server owns truth; client owns feel** — no duplicated salah/iman math on the client.
5. **Everything async has 4 states** — loading (skeleton), data, empty, error. Always.

---

## 2. Required Backend Adjustments (do these first)

The web app authenticates with an **httpOnly cookie** (`addawah-session`, JWT HS256, 30-day) and redirects unauthenticated users at the edge (`middleware.ts`). That is browser-centric. Two options for mobile:

| Option | Effort | Recommendation |
|--------|--------|----------------|
| **A. Cookie jar on device** — Flutter stores the `Set-Cookie` from `/api/auth/login` and replays it. Zero backend change. | Low | OK for MVP / fastest start |
| **B. Bearer token** — add `Authorization: Bearer <jwt>` support + a `/api/auth/token` login that returns the JWT in the body. | Small backend change | **Recommended for scale** |

**Recommended backend additions (Option B):**
1. `getSessionUser()` in `lib/auth.ts` should also accept the token from the `Authorization` header (fallback when there is no cookie). One extra read of `req.headers.authorization`.
2. Add `POST /api/auth/token` (or extend `/api/auth/login` with `?mode=token`) returning `{ token, user }` in the JSON body instead of only setting a cookie.
3. Add CORS headers for the mobile origin (or keep same-origin via reverse proxy). Mobile has no `Origin` restriction but preflight/`OPTIONS` should 204.
4. (Optional but ideal) A **refresh** strategy: short-lived access token + long-lived refresh token, or simply keep the 30-day JWT and silently re-login. Document `401 → route to /login`.
5. Version the API surface: prefix future breaking changes with `/api/v2/*`; keep `/api/*` stable for the current web + app.

> Until Option B ships, build the Flutter networking layer with a **cookie jar** (`dio_cookie_manager` + `cookie_jar`) so nothing blocks frontend work. The swap to Bearer later is a one-file change in the auth interceptor.

---

## 3. Recommended Flutter Stack

| Concern | Package | Why |
|---------|---------|-----|
| Language | Dart 3.x / Flutter 3.2+ (stable) | Null safety, records, patterns |
| State management | **Riverpod 2 (`flutter_riverpod` + `riverpod_generator`)** | Compile-safe DI, testable, no BuildContext coupling, great async (`AsyncValue` = loading/data/error for free) |
| Networking | **`dio`** + `dio_cookie_manager` + `cookie_jar` | Interceptors, retry, cancel tokens, cookie jar for Option A |
| Routing | **`go_router`** | Declarative, deep links, auth redirects (mirrors `middleware.ts`) |
| Immutable models | **`freezed`** + `json_serializable` | Typed API models, copyWith, unions for states |
| Secure storage | **`flutter_secure_storage`** | JWT / refresh token in Keychain / Keystore |
| Local cache | **`hive_ce`** or `drift` | Offline read of dashboard/stats; SWR-like stale-while-revalidate |
| Charts | **`fl_chart`** | Replaces Chart.js (iman line, missed area, wakt doughnut, on-time bars, Fahm radar) |
| Skeletons | **`skeletonizer`** | Mirrors the web `<Shimmer>` system |
| Motion | built-in `Animated*` + **`flutter_animate`** | Reproduce the `cubic-bezier(0.22, 1, 0.36, 1)` signature ease |
| Push | **`firebase_messaging`** + `flutter_local_notifications` | Wakt/poke/ruhaniah reminders |
| Env/flavors | **`flutter_dotenv`** or `--dart-define` | dev / prod base URLs |
| i18n | **`flutter_localizations` + `intl`** | Arabic (RTL) ready from day one |
| Prayer times (optional local) | **`adhan`** (Dart port of adhan-js) | Offline fallback if the API is unreachable |

> Keep the dependency list lean. Every package is a scaling liability; prefer built-in Flutter widgets where possible.

---

## 4. Design System — Exact Port

The web theme is driven by CSS custom properties on `<html data-theme="dark|light" data-color="gold|green|blue|purple|silver|pink">`. Reproduce this as **one Dart source of truth** (`lib/theme/dawa_tokens.dart`) that builds a `ThemeData` from `(mode, color)`.

### 4.1 Non-color tokens

```dart
// radii
const radiusArch = 28.0;   // --radius-arch
const radius     = 18.0;   // --radius
const radiusSm   = 10.0;   // --radius-sm

// layout
const headerHeight = 76.0; // --header-h
const tabbarHeight = 68.0; // --tabbar-h

// motion — the signature easing used everywhere
const dawaEase = Cubic(0.22, 1.0, 0.36, 1.0); // var(--ease)

// fonts (add these to pubspec + assets, or via google_fonts)
// display: Cormorant Garamond (serif)  — headings, hero numbers
// body:    DM Sans (sans-serif)         — everything
// arabic:  Amiri (serif)                — Arabic prayer names, ayah text
// base body: 15px, line-height 1.65
```

### 4.2 Color tokens (copy verbatim)

**Dark mode — shared base (`gold` also defines the base):**

```
bg          #050608
bg-soft     #0a0d12
surface     rgba(12,16,24,0.92)
surface-2   rgba(18,24,36,0.95)
text        #f4efe4
text-soft   #b8ad98
text-dim    #6e6658
success     #3ecf8e
danger      #e85d5d
```

**Dark accents per palette** — `accent / accent-bright / accent-dim`:

| Palette | accent | accent-bright | accent-dim |
|---------|--------|---------------|------------|
| gold (default) | `#c9a227` | `#e8c547` | `#8a7020` |
| green (Emerald) | `#2eb88a` | `#5eead4` | `#0f766e` |
| blue (Sapphire) | `#3b9eff` | `#7dd3fc` | `#0369a1` |
| purple (Amethyst) | `#9b7bf7` | `#c4b5fd` | `#6d28d9` |
| silver (Silver) | `#b8c5d6` | `#e2e8f0` | `#64748b` |
| pink (Rose) | `#f06bab` | `#f9a8d4` | `#be185d` |

**Light mode — shared base:**

```
surface   #ffffff (rgba 0.96)
surface-2 #ffffff
text      #0f172a
text-soft #475569
text-dim  #94a3b8
```

**Light per palette** — `bg / bg-soft / accent / accent-bright / accent-dim / text`:

| Palette | bg | bg-soft | accent | accent-bright | accent-dim | text |
|---------|-----|---------|--------|---------------|------------|------|
| gold | `#faf6ee` | `#f0ebe0` | `#9a7b15` | `#b8941f` | `#6b5410` | `#1c1608` |
| green | `#f0fdf9` | `#ecfdf5` | `#0d9488` | `#14b8a6` | `#0f766e` | `#042f2e` |
| blue | `#f0f9ff` | `#e0f2fe` | `#0284c7` | `#0ea5e9` | `#0369a1` | `#082f49` |
| purple | `#faf5ff` | `#f3e8ff` | `#7c3aed` | `#8b5cf6` | `#6d28d9` | `#2e1065` |
| silver | `#f8fafc` | `#f1f5f9` | `#475569` | `#64748b` | `#334155` | `#0f172a` |
| pink | `#fdf2f8` | `#fce7f3` | `#db2777` | `#ec4899` | `#be185d` | `#500724` |

> `accent-soft` = accent at ~10–12% opacity; `accent-glow` = accent at ~20–35% opacity. Derive these in Dart with `accent.withOpacity(...)` instead of storing them.

### 4.3 Theme model in Dart

```dart
enum DawaMode { dark, light }
enum DawaPalette { gold, green, blue, purple, silver, pink }

class DawaTokens {
  final Color bg, bgSoft, surface, surface2, border;
  final Color accent, accentBright, accentDim, text, textSoft, textDim, success, danger;
  Color get accentSoft => accent.withOpacity(0.12);
  Color get accentGlow => accent.withOpacity(0.30);
  // ...build from (mode, palette) lookup tables above
}

ThemeData buildDawaTheme(DawaMode mode, DawaPalette palette) { /* map tokens → ColorScheme + text theme */ }
```

- Persist the user's `themeMode` + `themeColor` from `/api/auth/me` and echo edits back via `PATCH /api/profile` (same as web `ThemeSync`).
- Expose `themeProvider` (Riverpod) so switching palette/mode rebuilds instantly.
- Honour `MediaQuery.disableAnimations` / reduce-motion: gate `flutter_animate` effects behind it (mirrors the web's `prefers-reduced-motion` rule).

### 4.4 Buttons (match `dawa-btn`)

- **Primary:** filled `accent` background, text color = `accent-text` (dark: near-black `#1a1204`; light: white), radius `radius-sm` (10), bold DM Sans.
- **Outline:** transparent fill, `1px` `border` (accent @ ~20%), text `text`, glass on colored backgrounds.
- Pressed/hover → subtle lift + `accent-glow` shadow.

---

## 5. App Architecture & Folder Structure

Feature-first + clean layering. Each feature owns its data/domain/presentation.

```
lib/
  main.dart
  app.dart                      # MaterialApp.router + theme + go_router
  core/
    env/                        # base URL, flavors (dev/prod)
    network/
      dio_client.dart           # dio + interceptors (auth, retry, logging)
      api_result.dart           # sealed Ok/Err<T>, maps { error } envelope
      endpoints.dart            # single list of all /api/* paths
    theme/
      dawa_tokens.dart          # §4 tokens
      dawa_theme.dart           # buildDawaTheme()
      dawa_text.dart            # Cormorant / DM Sans / Amiri styles
    storage/
      secure_store.dart         # token
      cache_store.dart          # hive boxes (SWR)
    router/
      app_router.dart           # go_router + auth redirect (mirrors middleware.ts)
    widgets/                    # shared: DawaButton, DawaCard, Shimmer, GoldCoin, EmptyState, ErrorState
  features/
    auth/         { data, domain, presentation }
    dashboard/    # salah tracker + hero stats + hijri + inspiration
    salah/        # mark/unmark logic client (calls /api/salah)
    analytics/
    friends/      # ummah, wakt board, pokes, connections, search, public profile
    ruhaniah/     # taqwa, fahm, barakah, dua, verse, insights, weakness
    calendar/     # hijri calendar + sunnah checklist
    challenge/
    notifications/
    profile/
    settings/
    truth/        # passages, salah story, let's talk contact form
  l10n/           # en + ar (RTL)
```

**Layer rules**
- `presentation` (widgets + Riverpod notifiers) → calls `domain` (repositories/usecases) → calls `data` (dio DTOs).
- DTOs (`freezed` + `json_serializable`) live in `data`; domain entities are plain. Keep them separate so an API shape change never ripples into UI.

---

## 6. Networking Layer

### 6.1 Response envelope (from `lib/api-helpers.ts`)
- **Success:** bare JSON object, HTTP 200 (no `{ data }` wrapper). Mutations often return `{ "ok": true }`.
- **Error:** `{ "error": "<human message>" }` with status `400 / 401 / 403 / 404 / 429 / 500`.
- All authenticated responses carry `Cache-Control: no-store`.

Model this as:

```dart
sealed class ApiResult<T> {}
class Ok<T>  extends ApiResult<T> { final T data; }
class Err<T> extends ApiResult<T> { final int status; final String message; } // message = json['error']
```

### 6.2 Interceptors
1. **Auth interceptor** — attach cookie (Option A) or `Authorization: Bearer` (Option B). On `401` → clear session, redirect to `/login`.
2. **Retry interceptor** — retry idempotent GETs on network errors with backoff (max 2). Never retry mutations blindly.
3. **Rate-limit awareness** — `429` → surface the server message ("Too many requests…"); optionally respect a short cooldown.
4. **Logging** — dev only (`kDebugMode`).

### 6.3 SWR-like caching (mirror the web's SWR)
- On screen open: emit cached value immediately (if fresh enough) → fire network → update. Use Hive box per key.
- Keys mirror the web SWR keys: `dashboard`, `stats`, `analytics`, `ruhaniah`, `friends/board`, `notifications/count`, etc.
- Cache TTLs: dashboard/stats short (~30–60s), analytics ~60s, notification count ~60s. Treat theme/avatar as eventually-consistent (~30s, matches server session cache).

---

## 7. Full API Reference

Base: `${BASE_URL}/api`. All non-auth routes require a valid session. Envelope per §6.1.

### Auth & account
| Method | Path | Body | Returns | Notes |
|--------|------|------|---------|-------|
| POST | `/auth/login` | `{ identifier?, email?, mobile?, password }` | `{ ok:true }` (+ cookie) | `identifier` = email or username. Rate-limited 5/min/IP. **Add token variant for mobile.** |
| POST | `/auth/register` | `{ name, username, email, mobile, password, gender, location }` | `{ ok:true }` (+ cookie) | `location = { latitude, longitude, timeZone, city, country, countryCode? }`. 3/min/IP. |
| POST | `/auth/logout` | — | `{ ok:true }` | Clears session. |
| GET | `/auth/me` | — | `{ user: SessionUser \| null }` | Primary session bootstrap. |
| GET | `/auth/check-availability?field=username\|email\|mobile&value=…` | — | `{ available, ... }` | Debounce 300–450ms (matches web). |
| POST | `/auth/reset-password/send-otp` | `{ email }` | `{ ok:true }` | Email OTP. |
| POST | `/auth/reset-password/verify-otp` | `{ email, code }` | session/verify payload | |
| POST | `/auth/reset-password/confirm` | `{ …, password }` | `{ ok:true }` | |
| POST | `/account/delete/send-otp` | — | `{ ok:true }` | Authed. |
| POST | `/account/delete` | `{ code }` | `{ ok:true }` | Authed + OTP. |

### Salah & dashboard
| Method | Path | Body / Query | Returns | Notes |
|--------|------|--------------|---------|-------|
| GET | `/salah?week=YYYY-MM-DD` | — | `{ grid }` | Week grid; omit `week` for current rolling week. |
| POST | `/salah` | `{ date, prayer, kind, unit, completed, inJamat? }` | `{ ok:true, coinsEarned, timing, stats }` | `prayer∈FAJR..ISHA`, `kind∈FARD/SUNNAH_BEFORE/SUNNAH_AFTER`, `unit 0–3`. `timing∈on-time/kaza` for fard. Cannot mark before wakt or in future. |
| GET | `/dashboard` | — | dashboard payload | Aggregated home data. |
| GET | `/stats` | — | stats payload | Hero metrics (today/week/streak/lifetime/sunnah/perfect). |
| GET | `/insights` | — | prayer insights | 14-day iman/kaza/missed + trend + tips. |
| GET | `/prayer-times?...` | coords/city | prayer times | Times + wakt windows + forbidden windows. |
| GET | `/mood` / POST `/mood` | `{ moodId, date }` | mood payload | Daily mood check-in. |

### Analytics
| Method | Path | Returns |
|--------|------|---------|
| GET | `/analytics` | full analytics (charts + insights + lifetime) |
| GET | `/analytics/summary` | fast KPI-only path (skips mood) |

### Friends / Ummah
| Method | Path | Returns / Body |
|--------|------|----------------|
| GET | `/friends/hub` | hub aggregate |
| GET | `/friends/board` | live wakt board rows |
| GET | `/friends/board/summary` | counts (active/pokeable/revision) |
| GET | `/friends/connections` | accepted + pending |
| GET | `/friends/suggestions` | suggested users |
| GET | `/friends/search?q=` | username search |
| POST | `/friends` | `{ …connect/accept/remove }` |
| POST | `/pokes` | `{ toUserId, prayer? }` gentle reminder |

### Ruhaniah
| Method | Path | Returns / Body |
|--------|------|----------------|
| GET | `/ruhaniah` | full check-in payload (taqwa, fahm Qs, barakah, verse, insights, weakness) |
| POST | `/ruhaniah` | submit taqwa / fahm answers / barakah |
| GET | `/ruhaniah/history` | trends history |
| GET / POST | `/ruhaniah/duas` | list / add dua (status updates) |

### Calendar & challenge
| Method | Path | Returns / Body |
|--------|------|----------------|
| GET | `/calendar` | month grid + today events + countdown + stories |
| POST | `/calendar/toggle` | `{ eventId, actionId, date }` sunnah action toggle |
| GET / POST | `/challenge` | daily 5 tasks / toggle task |

### Profile / notifications / misc
| Method | Path | Returns / Body |
|--------|------|----------------|
| GET / PATCH | `/profile` | profile; PATCH `{ name?, email?, themeColor?, themeMode?, city?, … }` |
| POST | `/profile/avatar` | multipart avatar upload |
| GET | `/avatars/[userId]` | avatar image bytes |
| GET | `/users/[username]` | public profile |
| GET | `/users/[username]/insights` | public prayer charts |
| GET | `/notifications` | list |
| GET | `/notifications/count` | `{ unreadCount }` (poll ~60s) |
| GET | `/rewards` | gold coins + badge tier |
| POST | `/truth/contact` | `{ name, email, message }` → founder email. 5/hour/IP. Validate name (letters only) + email. |

> `/api/internal/*` are server-to-server (secret header) — **not** for the app.

---

## 8. Core Data Models (Dart)

Start with the session user (from `lib/auth.ts`), then add per-feature DTOs.

```dart
@freezed
class SessionUser with _$SessionUser {
  const factory SessionUser({
    required String id,
    required String name,
    String? username,
    required String email,
    String? mobile,
    String? gender,            // MALE | FEMALE
    required String avatarColor,
    String? avatarUrl,
    required String themeColor, // gold|green|blue|purple|silver|pink
    required String themeMode,  // dark|light
    String? city,
    String? country,
    double? latitude,
    double? longitude,
    String? timeZone,
  }) = _SessionUser;
  factory SessionUser.fromJson(Map<String, dynamic> j) => _$SessionUserFromJson(j);
}
```

**Salah domain constants (from `lib/constants.ts`) — hardcode client-side (stable):**
- Prayers: `FAJR, DHUHR, ASR, MAGHRIB, ISHA` (+ Arabic labels الفجر/الظهر/العصر/المغرب/العشاء).
- Fard rak'ah: Fajr 2, Dhuhr 4, Asr 4, Maghrib 3, Isha 4.
- Sunnah units: Fajr before 1; Dhuhr before 2 / after 1; Maghrib after 1; Isha after 1 (2 rak'ah each).
- Iman meter (for display copy only — server computes): seed 68; on-time +4.2, kaza −3.5, missed −6; clamp 0–100.
- **Sticky on-time:** once a fard is marked inside its wakt, `completedOnTime` stays on-time even after uncheck/remark. First mark outside wakt = kaza. (Server-enforced; UI just renders `timing`.)

Generate the remaining DTOs from live responses of `/dashboard`, `/stats`, `/analytics`, `/ruhaniah`, `/calendar`, `/friends/board` (capture JSON in dev, paste into `quicktype`/`freezed`).

---

## 9. Feature → Flutter Mapping

| Web feature | Flutter build notes |
|-------------|---------------------|
| **Salah tracker (arch frame)** | Custom `CustomPainter`/SVG (`flutter_svg`) for the mihrab gate; grid of tappable cells; optimistic toggle → `POST /salah`, rollback on `Err`. Lock today's cell until wakt starts (use `/prayer-times`). |
| **Hero stats** | Big tabular-nums number (DM Sans), `flutter_animate` count-up, 33-bead missed viz as a `Wrap` of dots. |
| **Analytics charts** | `fl_chart`: iman `LineChart`, missed `AreaChart`, wakt `PieChart` (doughnut), on-time `BarChart`, Fahm `RadarChart`. Feed from `/analytics`. |
| **Ummah wakt board** | `ListView.builder` (already virtualized server-side); pull-to-refresh; poke button with cooldown; poll board summary. |
| **Ruhaniah flow** | Multi-step `PageView`: Taqwa slider, 3 Fahm questions, Barakah 4 sliders, Dua add → results (verse card + radar + weakness). |
| **Hijri calendar** | Month grid `GridView`; event dots; sunnah checklist with gold-coin reward toast; countdown. Static event data can be bundled as an asset JSON to save a request. |
| **Daily challenge** | 5 task tiles, toggle → `/challenge`, coin animation. |
| **Notifications** | List + unread badge on tab; poll `/notifications/count`; later replace polling with FCM push. |
| **Truth** | Passage cards + expandable detail sheet; scroll-driven hero (Flutter `AnimatedBuilder` on scroll offset ≈ the web gradient-expand); **Let's talk** form with the same name/email validation (letters-only name, email format) → `POST /truth/contact`. |
| **Settings** | Theme palette picker (6 swatches) + mode toggle → `PATCH /profile`; account delete with OTP. |
| **Auth** | Login (identifier+password), register with location picker (device GPS via `geolocator` → reverse geocode), OTP reset. |

**Loading/empty/error:** wrap every async in `AsyncValue.when(loading: Skeletonizer, error: ErrorState, data: …)`; empty lists get an `EmptyState`. This is the single biggest UX-consistency lever.

---

## 10. Prayer Times, Dates & Timezone (critical)

The backend classifies salah in the **user's prayer timezone** (default Dhaka/Bangladesh when unset). To avoid off-by-one bugs on device:
- Never classify on-time/kaza on the client — send the mark, render server `timing`.
- For "is this wakt open?" gating, use `/prayer-times` windows (Fajr `[Fajr, Sunrise)`, Isha `[Isha, 24:00)`, others `[this, next)`), computed in the user's `timeZone`, not the device timezone.
- Store dates as `YYYY-MM-DD` keys exactly as the API expects.
- Optional offline fallback: `adhan` Dart package with the user's coords + method, but treat server as authoritative when online.

---

## 11. Notifications (Push)

1. Add FCM (`firebase_messaging`) + `flutter_local_notifications`.
2. Register device token → new endpoint `POST /api/notifications/device` (backend addition) storing token per user.
3. Server sends wakt reminders / pokes / ruhaniah nudges via FCM (replaces web's polling for real-time).
4. Foreground: show local notification; tap → deep link via `go_router` (e.g. `/friends`, `/dashboard`).
5. Keep the `/notifications/count` poll as a fallback for unread badge.

---

## 12. Offline & Resilience

- **Read offline:** last dashboard/stats/analytics from Hive; show a subtle "offline" banner.
- **Write offline (optional, phase 2):** queue salah marks in a Hive box; flush on reconnect (`connectivity_plus`). Because marks are idempotent upserts keyed by `(date,prayer,kind,unit)`, replay is safe.
- **Never** block the UI on a failed background sync — mirror the web's fire-and-forget `triggerSync`.

---

## 13. Environments & Flavors

```
--dart-define=BASE_URL=https://addawah.example.com   # prod
--dart-define=BASE_URL=http://10.0.2.2:3000          # android emulator → local next
```
- Two flavors: `dev`, `prod` (separate app ids/icons so both install side by side).
- No secrets in the app. `AUTH_SECRET`, DB, Resend keys stay server-side only.

---

## 14. Accessibility & Internationalization

- Ship `en` now, scaffold `ar` (RTL) from day one via `flutter_localizations` — Arabic prayer names and ayah text already appear.
- Respect reduce-motion, large text (`textScaleFactor`), and min 44px tap targets.
- Semantic labels on icon buttons (poke, mark, theme swatches).

---

## 15. Testing & Quality

- **Unit:** repositories + JSON parsing (golden JSON fixtures captured from real API).
- **Widget:** each screen's 4 states (loading/data/empty/error).
- **Integration:** login → mark salah → see stats update (`integration_test`).
- **Golden tests:** the 6 palettes × 2 modes on key screens to guarantee pixel fidelity.
- Lints: `flutter_lints` + `custom_lint` for Riverpod.

---

## 16. CI/CD & Release

- GitHub Actions: analyze → test → build (`flutter build apk/ipa`).
- Distribute betas via Firebase App Distribution / TestFlight.
- Version from a single `pubspec.yaml`; adopt semantic versioning aligned with API versions.

---

## 17. Scaling Guardrails (why this won't hurt later)

1. **Feature isolation** — adding "Zakat calculator" or "Family circles" = a new folder under `features/`, a new provider, a new route. Nothing else changes.
2. **Typed API layer** — a backend field rename breaks one DTO, caught at compile time, not across 30 screens.
3. **Design tokens** — rebrand or a 7th palette = edit `dawa_tokens.dart` only.
4. **API versioning** — `/api/v2` path for breaking changes; app pins a version.
5. **Pagination-ready** — friends/notifications use cursor pagination server-side; build lists with `ListView.builder` + infinite scroll from the start.
6. **Feature flags** — a tiny `/api/config` (or Remote Config) lets you dark-launch features without shipping a new build.
7. **Observability** — add `sentry_flutter` for crash/error reporting early; log API failures with route + status.
8. **No business logic on client** — salah/iman/verse logic stays server-side, so rules change once and every client benefits.

---

## 18. Suggested Delivery Phases

| Phase | Scope |
|-------|-------|
| **0. Foundation** | Theme system (6×2 palettes), networking layer, auth (cookie jar → token), go_router with auth redirect, shared widgets (button/card/shimmer/states). |
| **1. Core loop** | Login/register, dashboard, salah tracker (mark/unmark), hero stats, prayer times. |
| **2. Growth** | Analytics (fl_chart), Ummah/wakt board, pokes, notifications (poll → FCM). |
| **3. Depth** | Ruhaniah full flow, Hijri calendar, daily challenge, rewards. |
| **4. Content & polish** | Truth (passages + Let's talk), settings, profile/avatar, Arabic RTL, offline cache, golden tests. |

---

## 19. Quick Start Checklist

- [ ] Backend: add Bearer-token login + `Authorization` support + CORS (Option B) — or start with cookie jar.
- [ ] `flutter create` with `dev`/`prod` flavors + `--dart-define` base URL.
- [ ] Add fonts (Cormorant Garamond, DM Sans, Amiri) to `pubspec.yaml`.
- [ ] Port `dawa_tokens.dart` from §4 (verbatim hexes).
- [ ] Build `dio` client + `ApiResult` + auth/retry interceptors.
- [ ] `go_router` with unauth → `/login` redirect (mirror `middleware.ts`).
- [ ] Capture live JSON from `/auth/me`, `/dashboard`, `/stats` → generate freezed DTOs.
- [ ] Ship Phase 1, validate salah mark → stats loop end-to-end.
```
