# Addawah — Flutter Mobile App BRD & Technical Conversion Guide

> Version 1.4 · Target: pixel-faithful native mobile port of the **authenticated mobile web shell** (Next.js) using **Flutter**, backed by the **existing Next.js REST API** as a headless backend.
>
> **v1.3 corrects the porting contract:** §37 records the remaining source, asset, visual-QA, behavior, and backend requirements that must be completed before this becomes a self-contained carbon-copy package. The 23 verbatim stylesheets live in `docs/flutter-qa/reference-css/`.
>
> **v1.4 inlines the previously external textual pieces** so the behavior no longer needs to be reverse-engineered from `.tsx`: §38 gives the exact font-family/weight map (from `fonts.css`), §39 ports every §37.2 interaction as language-neutral algorithms (from the real components), and §40 is the file-attachment manifest for assembling a one-shot carbon-copy prompt. Binary assets, the 23 CSS files, and golden screenshots still ship as attachments (§40) — they cannot live inside this Markdown.
>
> Tagline: *Pray Together. Grow Together. Inspire Each Other.*

---

## 1. Goal & Approach

Build a native iOS + Android app in Flutter that reproduces the **signed-in mobile web experience** — same accent colors, typography, radii, motion feel, dark/light modes, 6 theme palettes, tab bar, and user-menu routes — while consuming the current `/api/*` endpoints so we do **not** rebuild business logic on the client.

**Mobile-view scope (what to match)**
- Match the **authenticated app shell** at mobile breakpoints: `AppHeader` + `MobileTabBar` + `dawa-main` content.
- **Do not** port the public landing video hero, marketing scroll sections, or desktop-only header nav as primary flows (optional: Handbook PDF viewer, public Truth without video).
- **Truth** on mobile lives in the **user menu**, not the tab bar (same as web `UserMenu` `mobileOnly: true`).
- **Settings** on mobile lives in the **user menu**, not the tab bar (removed from desktop header nav on web too).

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
| POST | `/friends` | send a request: `{ username? \| email? \| userId? }` (at least one required) |
| PATCH | `/friends` | manage existing request: `{ friendshipId, action: 'accept' \| 'decline' \| 'cancel' \| 'disconnect' }` |
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
| PATCH | `/notifications` | `{ action: 'read_all' }` or `{ action: 'read', notificationId }`; returns refreshed list |
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

> **Full mobile screen inventory, payload shapes, assets, and SWR keys:** see **§20–§31** (added in v1.1 from live web codebase).

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
| **0. Foundation** | Theme system (6×2 palettes), networking layer, auth (cookie jar → token), go_router with auth redirect (§20), shared widgets (button/card/shimmer/states per §24). |
| **1. Core loop** | Login/register (§27), dashboard shell (§21.1), salah tracker + mark modal, hero stats, prayer times, location prompt. |
| **2. Growth** | Analytics charts (§21.4, §29), Ummah hub + wakt board + pokes (§21.3), notifications (poll → FCM §11). |
| **3. Depth** | Ruhaniah full flow (§21.2, §28), Hijri calendar page, daily challenge on dashboard, rewards/badges (§30). |
| **4. Content & polish** | Truth (passages bundle §25), settings/profile/privacy (§21.6–7), public profile `/u/[username]`, Arabic RTL, offline cache, golden tests. |

---

## 19. Quick Start Checklist

- [ ] Backend: add Bearer-token login + `Authorization` support + CORS (Option B) — or start with cookie jar.
- [ ] `flutter create` with `dev`/`prod` flavors + `--dart-define` base URL.
- [ ] Add fonts (Cormorant Garamond, DM Sans, Amiri) to `pubspec.yaml`.
- [ ] Port `dawa_tokens.dart` from §4 (verbatim hexes).
- [ ] Build `dio` client + `ApiResult` + auth/retry interceptors.
- [ ] Implement mobile shell: header (76px) + bottom tab bar (68px) per §20.
- [ ] `go_router` with unauth → `/login` redirect (mirror `middleware.ts` §20.2).
- [ ] Bundle static JSON/assets per §25–§26.
- [ ] Capture live JSON fixtures per §23 → generate `freezed` DTOs.
- [ ] Ship Phase 1, validate salah mark → stats loop end-to-end.

---

## 20. Mobile Navigation & Route Map (from web)

### 20.1 Bottom tab bar (`MobileTabBar` — always visible when signed in)

| Tab | Route | Icon | Notes |
|-----|-------|------|-------|
| Home | `/dashboard` | home | Default after login |
| Ruhaniah | `/ruhaniah` | ruhaniah | Nightly check-in |
| Ummah | `/friends` | friends | Wakt board + connections |
| Analytics | `/analytics` | analytics | Charts + KPIs |
| Calendar | `/calendar` | calendar | Hijri month + sunnah actions |

**Not in tab bar (mobile):** Truth, Settings, Profile, Notifications — accessed via **user menu** (avatar dropdown).

### 20.2 User menu (`UserMenu` panel)

| Item | Route | Mobile-only? |
|------|-------|--------------|
| Profile | `/profile` | no |
| Settings | `/settings` | no |
| Truth | `/truth` | **yes** (`mobileOnly` — hidden on desktop menu duplicate; desktop has Truth in header nav) |
| Analytics | `/analytics` | no (duplicate shortcut) |
| Notifications | `/notifications` | no |
| Sign out | `POST /api/auth/logout` | action |

### 20.3 Header chrome (`AppHeader` — mobile)

- Brand mark (links to `/dashboard`)
- `ThemeModeToggle` (compact)
- `ThemeSwitcher` (compact palette)
- `NotificationBell` (unread badge; links to `/notifications`)
- `UserMenu` (avatar trigger)
- Optional: `WaktCountdownClock` uses `GET /api/prayer-times` (poll/refetch)

### 20.4 Full route table

| Route | Auth | In Flutter app? | Web source |
|-------|------|-----------------|------------|
| `/login` | public | **yes** | `LoginPageClient` (sign-in + register tabs) |
| `/reset-password` | public | **yes** | OTP request |
| `/reset-password/set` | public | **yes** | New password after OTP |
| `/dashboard` | protected | **yes** | Home tab |
| `/ruhaniah` | protected | **yes** | Ruhaniah tab |
| `/friends` | protected | **yes** | Ummah tab |
| `/friends/connections` | protected | **yes** | Manage connections (linked from Ummah) |
| `/analytics` | protected | **yes** | Analytics tab |
| `/calendar` | protected | **yes** | Calendar tab |
| `/notifications` | protected | **yes** | User menu |
| `/profile` | protected | **yes** | User menu |
| `/settings` | protected | **yes** | User menu |
| `/truth` | public or app | **yes** | User menu; signed-in = app shell (no landing video) |
| `/u/[username]` | protected | **yes** | Public friend profile |
| `/` (landing) | public | **skip/simplify** | Marketing — optional splash only |
| `/handbook` | public | **optional** | PDF viewer (`Dua.pdf`) — not in app shell |

### 20.5 Auth redirect (mirror `middleware.ts`)

Protected prefixes: `/dashboard`, `/friends`, `/analytics`, `/settings`, `/profile`, `/notifications`, `/u`, `/ruhaniah`, `/in` (internal Truth rewrite).

Flutter `go_router` redirect: if no valid session → `/login`. On `401` from any API → clear session → `/login`.

### 20.6 App shell layout constants

```
┌─────────────────────────────────┐
│ AppHeader          height 76px  │
├─────────────────────────────────┤
│ dawa-main (scrollable content)  │
│   max-width 1200px; width 100%  │
│   padding 28px 20px 96px        │
├─────────────────────────────────┤
│ MobileTabBar       height 68px  │
└─────────────────────────────────┘
```

Background: `IslamicBackdrop` (subtle pattern — port as static asset or `CustomPainter`).
Confetti: optional `confetti.js` equivalent on milestone events (coin earn, perfect day).

---

## 21. Screen-by-Screen Inventory (mobile web parity)

### 21.1 Dashboard (`/dashboard`)

**Page header:** `PageHeader` variant `home` — Arabic greeting `السَّلَامُ عَلَيْكُمْ`, full `user.name`, avatar link to profile, live wakt countdown, and `SunPathArc`.

**Sections (top → bottom):**

| # | Component | Data source | Interaction |
|---|-----------|-------------|-------------|
| 1 | `LocationPrompt` | `SessionUser` city/country | Prompt if location unset; opens `LocationPicker` |
| 2 | `HeroStats` | `DashboardPayload.stats` or `GET /api/stats` | Week %, streak, lifetime rate, 33-bead missed preview, sunnah counts |
| 3 | `SalahTracker` | `DashboardPayload.grid` + `GET /api/prayer-times` + `GET/POST /api/salah` | Mihrab arch frame; week grid; optimistic toggle; wakt lock |
| 4 | `DailyChallenge` | `DashboardPayload.challenge` + `POST /api/challenge` | 5 daily deeds (bitmap tasks); coin toast |
| 5 | `HijriCalendar` (compact) | `GET /api/calendar` | Mini month + today highlight |
| 6 | `InspirationCard` | `DAILY_INSPIRATIONS` (client constant, day-of-year rotation) | Quote + ref — no API |

**Provider:** `DashboardDataProvider` → `GET /api/dashboard`, refresh 60s.

**Shimmer:** `AppLayoutClient` dashboard-style shimmer (stat-value + 4 metric columns + card) while `useApp` loading. Truth page skips this shimmer.

**Salah mark modal (`SalahMarkModal`):** optional `inJamat` toggle on fard mark (males); females use Awal Wakt copy; posts to `/api/salah`.

### 21.2 Ruhaniah (`/ruhaniah`)

**Provider:** `RuhaniahDataProvider` → `GET /api/ruhaniah`, deduping 300s.

**Incomplete flow (single scrollable page):**

1. `RuhaniahHeader`
2. `TaqwaPulse` — slider 1–10
3. `FahmTest` — 3 questions/day from bundled `fahm-questions.json` (`pickTodaysQuestions`)
4. `BarakahMeter` — 4 sliders (time, rizq, health, heart), default 3 each
5. `DuaLog` — existing duas from `GET /api/ruhaniah/duas` + add new locally
6. Submit button → `POST /api/ruhaniah` with `{ taqwaScore, fahmResponses[], barakahScores, duaEntries[] }`

**Completed state (`data.completed === true`):**

1. `RuhaniahVerse` (ayah card)
2. `SpiritualWeakness` (if weaknesses returned)
3. `RuhaniahInsights` (Fahm radar, taqwa/barakah history, dua stats)

**Shimmer:** `RuhaniahShimmer` while loading and completion unknown.

### 21.3 Ummah / Friends (`/friends`)

**Primary SWR:** `GET /api/friends/hub?cursor=0&limit=20`

**Hub response shape (`HubResponse`):**
- `me: { goldCoins, badge }`
- `requests: Friend[]` (pending incoming)
- `friends: Friend[]`
- `board: BoardRow[]` (live wakt rows)
- `page: { cursor, nextCursor, hasMore, limit, totalFriends }`
- `summary: { activeInWakt, pokeable, totalFriends, revision }`

**Sections:**
- Page header (Ummah)
- Username search → `GET /api/friends/search?q=`
- Send request → `POST /api/friends` with username/email/userId; accept/decline/cancel/disconnect → `PATCH /api/friends` with `friendshipId` + action
- Suggestions carousel → `GET /api/friends/suggestions?cursor=&limit=8`
- `WaktBoardVirtual` — virtualized list (`ROW_HEIGHT = 76`), live countdown per row, poke → `POST /api/pokes`
- Friends list with week rate, gold coins, badge
- Load more → `GET /api/friends/hub?cursor={nextCursor}&limit=20`
- Board summary poll → `GET /api/friends/board/summary` (refresh board)

**Sub-route:** `/friends/connections` — `ManageConnections` → `GET /api/friends/connections`

**BoardRow wakt phases:** `upcoming | active | completed | private` — render countdown, salah status, poke cooldown.

### 21.4 Analytics (`/analytics`)

**Two-step load (match web):**
1. `GET /api/analytics/summary` — KPIs + coaching tips (fast)
2. `GET /api/analytics` — full charts (after summary arrives)

**KPI hero:** the web's primary hero shows four values: iman, streak, week rate, and lifetime rate. Perfect days, Fajr missed, sunnah, and jamat are supporting analytics data, not additional hero tiles.

**Coaching:** render the `coaching: CoachingTip[]` section returned by the API as “Personal guidance”.

**`PrayerInsights`:** 14-day iman line + missed breakdown (also available via `GET /api/insights`).

**Charts grid (`AnalyticsChartsGrid`) — map 1:1 to `fl_chart`:**

| Card title | Chart type | Data fields |
|------------|------------|-------------|
| Prayer strength radar | Radar | `byPrayer[].rate` |
| Horizontal rates | Horizontal bar | `byPrayer[]` |
| Wakt breakdown · 7 days | Stacked bar | `stackedWeek[]` onTime/kaza/missed |
| Polar balance | Polar area | `insights.totals` |
| Week completion | Multi-line | `weekDays`, `weekDeeds`, `weekCalendarDeeds` |
| Distribution ring | Doughnut | `byPrayer[].completed` |
| Iman vs mood | Combo line+bar | `imanMoodSeries[]` |

**Shimmer:** `KpiSkeleton` + `ChartShimmer` while loading.

### 21.5 Calendar (`/calendar`)

**SWR:** `GET /api/calendar` (`CALENDAR_KEY`)

**Payload (`CalendarPayload`):** `today`, `monthGrid`, `eventsById`, `historyById`, `nextEvent` countdown, `weekCompletions`, `consistency`, `view` (month nav).

**Static server data:** `public/data/islamic-events.json` — bundle in app for offline labels; API still authoritative for toggles.

**Actions:** `POST /api/calendar/toggle` — sunnah checklist per day; gold coin reward on completion.

### 21.6 Profile (`/profile`)

**SWR:** `GET /api/profile` → `{ profile }`

**Fields:** name, email, mobile (`PhoneInput`), username, gender (`GenderPicker`), location (`LocationPicker` → lat/lng/timeZone/city/country), avatar color (`AVATAR_COLORS`), avatar upload (`POST /api/profile/avatar` multipart), `profilePrivacy` matrix (public vs connections tiers).

**Availability checks:** `GET /api/auth/check-availability?field=&value=` debounced 300–450ms.

**Charts:** `ProfilePrayerCharts` — user's own analytics preview.

**Link:** public profile `userProfilePath(username)` → `/u/[username]`

### 21.7 Settings (`/settings`)

- Link to Profile editor
- Theme mode toggle + 6 palette swatches (`THEME_COLOR_LABELS`)
- Save → `PATCH /api/profile` `{ themeColor, themeMode }` (web also has `ThemeSync` on change)
- `DeleteAccountSection` → OTP `POST /api/account/delete/send-otp` then `POST /api/account/delete`

### 21.8 Notifications (`/notifications`)

**SWR:** `GET /api/notifications`, `GET /api/notifications/count` (poll 60s; badge on bell)

**Actions:** mark one read → `PATCH /api/notifications` `{ action: 'read', notificationId }`; mark all read → `{ action: 'read_all' }`.

### 21.9 Truth (`/truth` — app shell variant)

**No `PublicNav`, no landing video** when signed in (`dawa-truth--app`).

**Sections:** hero + scroll-expand rings, passage grid + feature banners, Salah story timeline (`PRAYER_STORY`), founder block, Let's talk form.

**Passages:** 16 numbered entries in `PASSAGES` (ids 1–13, 15–17; id 14 = prayer story only). Feature passages (ids 4, 8, 12, 17): full-bleed banner. Others: grid cards.

**Modal:** Learn more → full body paragraphs; optional `modalFigure` at bottom (passage 4 uses `fig04.webp`).

**Contact:** `POST /api/truth/contact` — name (letters only), email, message; green/red field ticks.

**Bundle:** port `components/truth/truthContent.ts` + all `/public/assets/images/truth/*.webp` into Flutter assets.

### 21.10 Public profile (`/u/[username]`)

**API:** `GET /api/users/[username]`, `GET /api/users/[username]/insights`

Respects `profilePrivacy` tiers from owner's settings.

---

## 22. SWR Cache Keys & Refresh Intervals

Centralize in `lib/core/cache/cache_keys.dart` (mirror `lib/swr-revalidate.ts`):

| Key | Endpoint | Refresh / TTL |
|-----|----------|---------------|
| `AUTH_ME` | `/api/auth/me` | on app start + after login |
| `DASHBOARD` | `/api/dashboard` | 60s |
| `STATS` | `/api/stats` | 60s (KV server cache 5s) |
| `SALAH_GRID` | `/api/salah?week=` | on mutate after toggle |
| `PRAYER_TIMES` | `/api/prayer-times` | ~30min today |
| `ANALYTICS_SUMMARY` | `/api/analytics/summary` | 300s |
| `ANALYTICS` | `/api/analytics` | 300s; server cache 60s |
| `INSIGHTS` | `/api/insights` | with dashboard revalidate |
| `MOOD` | `/api/mood` | on check-in |
| `CHALLENGE` | `/api/challenge` | with dashboard |
| `RUHANIAH` | `/api/ruhaniah` | 300s dedupe |
| `RUHANIAH_HISTORY` | `/api/ruhaniah/history` | on ruhaniah submit |
| `RUHANIAH_DUAS` | `/api/ruhaniah/duas` | on dua change |
| `CALENDAR` | `/api/calendar` | on toggle |
| `FRIENDS_HUB` | `/api/friends/hub?cursor&limit` | on focus + board poll |
| `FRIENDS_SUGGESTIONS` | `/api/friends/suggestions` | manual |
| `FRIENDS_CONNECTIONS` | `/api/friends/connections` | manual |
| `NOTIFICATIONS` | `/api/notifications` | manual |
| `NOTIFICATIONS_COUNT` | `/api/notifications/count` | 60s poll |
| `PROFILE` | `/api/profile` | on save |

**Revalidate helpers (call after mutations):**
- Salah toggle → dashboard, stats, analytics, analytics/summary, insights
- Mood check-in → mood, dashboard, analytics
- Ruhaniah submit → ruhaniah, history, duas

---

## 23. API Payload Shapes (generate DTOs from these)

Capture live JSON in dev, then `freezed` codegen. Types below are from `lib/*.ts` — authoritative field names.

### `SessionUser` (`lib/auth.ts`)
`id, name, username?, email, mobile?, gender?, avatarColor, avatarUrl?, themeColor, themeMode, city?, country?, latitude?, longitude?, timeZone?`

### `DashboardPayload` (`lib/dashboard-data.ts`)
```ts
{
  stats: StatsPayload,
  mood: { today: { moodId, label?, date } | null },
  grid: SalahGrid,       // Record<dateKey, Partial<Record<Prayer, SalahCell>>>
  weekKey: string,
  challenge: DailyChallengeState
}
```

### `SalahCell` (`lib/salah-utils.ts`)
`{ fard: bool, inJamat: bool, sunnahBefore: bool[], sunnahAfter: bool[] }`

### `StatsPayload` (`lib/stats-data.ts`)
`weekCompleted, weekTotal, weekDays[], streak, lifetimeRate, todayCompleted, lifetimePrayed, lifetimeMissed, lifetimeExpected, lifetimeJamat, activeDays, perfectDays, daysOnApp, sunnahPrayed, sunnahTotal, bestPrayer?, loggedCompleted, trackingSince?, missedBreakdown[]`

### `AnalyticsPayload` (`lib/analytics-data.ts`)
`kpis, insights (PrayerInsightsPayload), byPrayer[], stackedWeek[], weekDays[], weekDeeds[], weekCalendarDeeds[], weekLabels[], moodHistory[], imanMoodSeries[], imanMoodCorrelation?, coaching[], totals, trend, revision`

### `PrayerInsightsPayload` (`lib/prayer-insights.ts`)
`days[] (iman, onTime, kaza, missed, pending, jamat), currentIman, trend, totals`

### `RuhaniahPayload` (`components/ruhaniah/RuhaniahDataProvider.tsx`)
`completed, taqwaScore?, barakahScores?, verse?, fahmProfile?, insights?, weaknesses[]`

### `CalendarPayload` (`lib/islamic-calendar.ts`)
`today, todayHistoryIds[], monthGrid[], eventsById{}, historyById{}, nextEvent?, weekCompletions[], consistency, view`

### `HubResponse` (`components/friends/FriendsHub.tsx`)
See §21.3.

### `BoardRow` (`components/friends/WaktBoardVirtual.tsx`)
See §21.3 wakt sub-object.

### `POST /api/salah` response
`{ ok, coinsEarned?, timing?: 'on-time'|'kaza', stats? }`

### `Profile` (`app/(app)/profile/page.tsx`)
`id, name, username?, email, mobile?, avatarColor, gender?, avatarUrl?, city?, country, latitude?, longitude?, timeZone?, profilePrivacy`

---

## 24. Shimmer / Loading Variants

Mirror `components/ui/Shimmer.tsx` variants in `skeletonizer` theme:

| Variant | Size (web) | Use on |
|---------|------------|--------|
| `text` | 100% × 16px | body lines |
| `text-sm` | 80px × 12px | labels |
| `text-lg` | 200px × 20px | titles |
| `circle` | 48×48 | icons |
| `card` | 100% × 160px | panels |
| `avatar` | 44×44 | user rows |
| `button` | 100×36 | CTAs |
| `chart` | 100% × 200px | analytics |
| `stat-value` | 64×32 | hero numbers |
| `stat-label` | 80×12 | metric labels |

**Composite loaders:** `StatShimmer`, `ConnectionShimmer`, `ChartShimmer`, `RuhaniahShimmer` — port as dedicated Flutter widgets per screen.

---

## 25. Static Content to Bundle in the App

| Asset path | Purpose | Bundle strategy |
|------------|---------|-----------------|
| `public/data/fahm-questions.json` | 320 Fahm questions — **canonical client source** | `assets/data/fahm-questions.json` |
| `public/data/ayah-pool.json` | 300 tagged ayahs (server verse engine; optional client read) | ship for offline display only |
| `public/data/islamic-events.json` | Calendar events/history | `assets/data/islamic-events.json` |
| `public/data/cities.json` | Location picker search | `assets/data/cities.json` |
| `components/truth/truthContent.ts` | Truth passages + `PRAYER_STORY` | convert to `assets/data/truth-passages.json` at build time |
| `lib/constants.ts` → `DAILY_INSPIRATIONS` | Dashboard inspiration card | Dart constant (7 entries) |
| `lib/challenge-data.ts` → `CHALLENGE_TASKS` | 5 daily challenge tasks | Dart constant |
| `lib/moods.ts` → `MOOD_OPTIONS` | 6 mood ids/colors | Dart constant |
| `lib/rewards.ts` → `BADGE_TIERS` | 6 badge tiers | Dart constant |

**Fahm contract (do not break):** `FahmResponse.questionId` stores static ids (`Q1`…) — no DB FK. Client reads JSON only.

---

## 26. Visual Assets Manifest

Copy into `assets/images/` (preserve paths for mental mapping):

| Path | Used by |
|------|---------|
| `assets/images/Logo.webp` | Brand mark |
| `assets/images/gold.webp` | `GoldCoin` icon |
| `assets/images/Gate.webp` | Auth aside arch (`AuthAside`), if the auth screens are ported |
| `assets/images/tracker-card.svg` | Salah tracker mihrab mask/frame (the actual tracker arch asset) |
| `assets/images/truth/01.webp` … `17.webp` | Passage art |
| `assets/images/truth/fig04.webp` | Passage 4 modal figure |
| `assets/images/truth/founder.webp` | Truth founder section |
| `assets/images/shimanto.jpg` | Legacy developer photo reference; current Truth founder art is `truth/founder.webp` |
| `assets/pdfs/Dua.pdf` | Handbook (optional feature) |
| `assets/images/thumbnail.webp` | Handbook thumb |
| `assets/scripts/confetti.js` | → Flutter confetti package equivalent |

**Repository availability at v1.3:** `tracker-card.svg`, `gold.webp`, `thumbnail.webp`, Truth assets, and the static JSON/PDF files exist. `Logo.webp`, `Gate.webp`, `shimanto.jpg`, and the 11 web font binaries referenced by `fonts.css` are currently absent from the repository; add them before claiming a binary-complete port, or use the documented Google Fonts equivalents where visual comparison confirms parity.

**Not needed in core app:** `landing.webp`, `landing.mp4/webm`, readme screenshots.

**Avatars:** `GET /api/avatars/[userId]` — network cached; fallback to initials + `avatarColor`.

---

## 27. Auth & Registration (mobile forms)

### Sign in
- Methods: `identifier` (email or username) + password, OR `mobile` + password
- `POST /api/auth/login` rate limit 5/min/IP
- Green tick: `useSigninAvailability` → account exists check

### Register
- Fields: name (2–80, letters), username (3–30, unique), email, mobile (`PhoneInput` + `normalizeMobile`), password (6–100), gender (`MALE`|`FEMALE`), location (`LocationPicker` → `{ latitude, longitude, timeZone, city, country, countryCode? }`)
- Availability: username/email/mobile debounced checks
- `POST /api/auth/register` rate limit 3/min/IP
- Welcome email server-side (Resend)

### Password reset
1. `POST /api/auth/reset-password/send-otp` `{ email }`
2. `POST /api/auth/reset-password/verify-otp` `{ email, code }`
3. `POST /api/auth/reset-password/confirm` `{ …, password }`

### Validation rules (`lib/validation.ts`)
- Name: letters/spaces/`'`.`-` only, no digits, 2–80 chars
- Email: standard format
- Username: `sanitizeUsername` + `validateUsername`

---

## 28. Ruhaniah & Fahm Details

**Fahm daily pick:** `pickTodaysQuestions(pool)` — 3 questions from 320 based on date seed.

**POST body schema** (`lib/ruhaniah-validation.ts`):
- `taqwaScore`: 1–10
- `fahmResponses[]`: `{ questionId, answerIndex, weight }`
- `barakahScores`: `{ timeScore, rizqScore, healthScore, heartScore }` each 1–5
- `duaEntries[]`: optional new duas

**Verse engine:** server-only (`lib/ruhaniah-verse.ts`) — client displays result; never reimplement scoring.

**Weakness cards:** `severity: critical | high | moderate` + icon + advice text.

---

## 29. Analytics Chart Theme Tokens

Charts use CSS-variable-aware theme from `chartTheme()` — port to Flutter:

- `accent`, `accentSoft`, `accentGlow` for primary series
- `success` (#3ecf8e), `warn` (kaza), `danger` (#e85d5d)
- `grid`, `text` for axes
- `categorical[5]` for per-prayer colors in doughnut/bar

**Iman mood correlation copy:** `describeImanMoodCorrelation(r)` — port strings for r values.

---

## 30. Rewards, Badges & Gold Coins

**Badge tiers** (`BADGE_TIERS`):
| id | name | minCoins |
|----|------|----------|
| seedling | Seedling | 0 |
| guardian | Wakt Guardian | 1,000 |
| lighthouse | Lighthouse | 5,000 |
| mentor | Dawah Mentor | 10,000 |
| crescent | Crescent Scholar | 20,000 |
| golden | Golden Mu'min | 50,000 |

**Prayer coins:** wakt-decay reward `PRAYER_REWARD` MAX 25 → MIN 5; `JAMAT_BONUS_COINS` +5.

**UI:** `GoldCoin` / `GoldCoinAmount` widgets wherever coins appear (dashboard toggle response, friends hub, profile).

---

## 31. CSS Module Reference (visual parity)

When implementing a screen, open the matching stylesheet for spacing/class names:

| CSS file | Screens |
|----------|---------|
| `dawa-tokens.css` / `dawa-theme.css` | Global tokens §4 |
| `dawa-chrome.css` | Header, tab bar, user menu |
| `dawa-dashboard.css` | Dashboard, hero stats, salah grid |
| `dawa-salah-modal.css` | Mark prayer modal |
| `dawa-page-header.css` | Page headers |
| `dawa-mood-analytics.css` | Analytics bento grid |
| `dawa-friends.css` | Ummah hub, wakt board |
| `dawa-ruhaniah.css` | Ruhaniah flow |
| `dawa-calendar.css` | Calendar page |
| `dawa-notifications.css` | Notifications list |
| `dawa-profile.css` | Profile + public profile |
| `dawa-auth.css` | Login/register |
| `dawa-truth.css` | Truth page + modal |
| `dawa-shimmer.css` | All skeleton states |
| `dawa-location.css` / `dawa-gender.css` | Pickers |
| `dawa-challenge.css` | Daily challenge |
| `dawa-modals.css` | Shared modals |

Import order is fixed in `assets/css/dawa.css` — tokens before feature CSS.

---

## 32. Backend Gaps (not yet in web — needed for production app)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/token` or login `?mode=token` | Return JWT in body for Bearer auth |
| `Authorization: Bearer` in `getSessionUser()` | Mobile auth without cookies |
| CORS + `OPTIONS` handling | Required if the mobile app calls a separate API origin |
| `POST /api/notifications/device` | Register FCM token per user |
| `GET /api/config` (optional) | Feature flags, min app version |

---

## 33. Visual QA Companion (required before pixel-parity sign-off)

Capture **mobile-width screenshots** (390×844 or your target) for:

1. Dashboard (loaded + salah grid)
2. Salah mark modal
3. Ruhaniah (form + completed verse)
4. Ummah wakt board row states
5. Analytics KPI + one chart card
6. Calendar month grid
7. Profile + privacy matrix
8. Settings theme picker
9. Truth passage card + feature banner + modal
10. Login register flow

**Current status:** these fixtures have not been captured; `docs/flutter-qa/` currently contains only `reference-css/`. Capture the listed states at one locked target viewport (start at **390×844**) and store them in `docs/flutter-qa/screenshots/` before Flutter golden-test sign-off. README images are marketing screenshots, not golden fixtures.

---

## 34. Exact Layout Specs (pixel source of truth)

> **Canonical CSS source:** the complete, unmodified stylesheets are bundled at **`docs/flutter-qa/reference-css/`** (**23 files**, ~11.7k lines, copied verbatim from `assets/css/`). CSS is authoritative for static styling only; the behavior-source map in §37 is authoritative for interactions. Values use the tokens from §4 (`--accent`, `--radius`, etc.). **Mobile shell breakpoint = `≤960px`** (bottom tab bar shows, desktop header nav hides); `≤640px` is one of several smaller-layout breakpoints.

All numbers below are the real values from those files. Reproduce them 1:1 in Flutter.

### 34.1 App shell (`dawa-chrome.css`)

**Header** (`.dawa-header` / `.dawa-header__inner`)
- Height `76px` (`--header-h`); sticky top; `background: var(--surface)`; bottom border `1px var(--border-soft)`
- Inner: horizontal padding `20px`, `align-items: center`, `gap: 20px`
- Ornament strip under header: `height 3px`, gradient `transparent → var(--accent) → transparent`, opacity `0.7`
- Brand: logo `40×40`, gap `12px`; name `font-display 22px/700`, line-height 1.1
- Actions cluster: `gap 12px`, pushed right (`margin-left:auto`)

**Main content** (`.dawa-main`)
- `max-width 1200px` (but mobile fills width); padding `28px 20px calc(68px + 28px)` (bottom clears tab bar)

**Bottom tab bar** (`.dawa-tabbar`) — shown `≤960px`
- Height `68px` (`--tabbar-h`); fixed bottom; `background var(--surface)`; top border `1px var(--border)`; respects `env(safe-area-inset-bottom)`
- Each link: flex column, `gap 5px`, padding `8px 4px`, color `var(--text-dim)`, active `var(--accent-bright)`
- Icon box `22×22` (svg `20×20`), active opacity 1 / idle 0.85
- Label: `10px/600`, letter-spacing `0.01em`
- Notifications are represented by `NotificationBell` in the header, with its unread badge; there is no notifications item in the five-item mobile tab bar.

**User menu dropdown** (`.dawa-user-menu__panel`)
- Portal, `position: fixed`, width `220px`, `z-index 1000`
- Radius `calc(var(--radius) + 2px)` = `20px`; border `1px var(--popover-border)`; `var(--popover-shadow)`
- Head: padding `14px 16px 12px`, bottom border, `var(--popover-head-bg)`; name `14px/700`, email `11px` `--text-soft`
- Item: padding `10px 12px`, `gap 10px`, radius `--radius-sm` (10), font `13px/600`, hover `var(--popover-item-hover)`
- Item icon chip: `28×28`, radius `8px`, `background accent-soft@65%`, color `var(--accent)`
- Danger item (Sign out): color/icon use `var(--danger)`
- Trigger (avatar): circular, `2px` padding, `1px var(--border)`, hover ring `0 0 0 3px var(--accent-soft)`

**Avatar** (`.dawa-avatar`): circle, `font-weight 700`, `color var(--accent-text)`; photo variant border `1px var(--border)`; initials variant softer border; silhouette variant muted bg.

### 34.2 Page header (`dawa-page-header.css`)

**Home variant** (`.dawa-sky` — dashboard): no card bg; `margin-bottom clamp(20px,3vw,28px)`
- Top row: salam (`font-arabic 15px` `--accent`) + name (`font-display clamp(22px,4vw,28px)/700`) on left; clock on right
- Clock digits `17px/600` tabular-nums; seconds in `--accent-bright`; date `11px` `--text-dim`
- Sun-path arc SVG: `max-width 580px` (mobile) / `700px` (≥721px), `aspect-ratio 704/298`

**Page variant** (`.dawa-intro--page` / `.dawa-intro__sheet`)
- Sheet: grid, padding `clamp(18px,3vw,24px)`, border `1px var(--border-soft)`, radius `--radius` (18), gradient bg `accent-soft → transparent 42%`
- Title (`.dawa-intro__name`): `font-display clamp(32px,6vw,44px)/700`, letter-spacing `-0.025em`, page variant color `--accent-bright`
- Arabic ghost label: `clamp(28px,5vw,36px)`, opacity 0.35
- Supporting line: `13px`, `--text-soft`, `max-width 36ch`

### 34.3 Dashboard hero metrics (`dawa-dashboard.css` `.dawa-metrics`)

- Section `margin-bottom clamp(28px,5vw,40px)`
- Hero number (`.dawa-metrics__hero`): `font-display clamp(48px,11vw,76px)/700`, line-height 0.95, letter-spacing `-0.03em`, color `--accent-bright`
- Headline `clamp(15px,2.8vw,18px)/500`; sub `clamp(12px,2.2vw,13px)` `--text-soft`
- Stat stream (inline list): items separated by `·`; value `font-display clamp(20px,4vw,26px)/700`
- 33-bead strand: bead `7×7` circle, `gap 7px 9px`; lit = `--accent-bright` + glow; missed = `--danger` + glow
- Progress bar: `height 5px`, radius 999px, fill gradient `accent-dim → accent-bright`, transition `width 0.75s var(--ease)`
- Missed panel: padding `12px 14px`, radius `--radius-sm`, `<summary>` `12px/600` `--accent-bright`

### 34.4 Prayer insights cards (`.dawa-insights`)

- Grid: 2 columns (`repeat(2, minmax(0,1fr))`), `gap clamp(14px,2.5vw,20px)` — on narrow mobile stack to 1
- Card: padding `clamp(18px,3vw,24px)`, radius `--radius`, border `1px var(--border-soft)`, gradient bg
- Title `font-display clamp(18px,3vw,22px)/700`; eyebrow `10px/700` uppercase `--accent` letter-spacing `0.12em`
- Iman gauge: value `font-display 32px/700` `--accent-bright`, unit `14px/600` `--text-dim`
- Missed total: value `font-display 28px/700` `--danger`
- Chart area: `height clamp(180px,28vw,200px)` (line) / `clamp(200px,32vw,240px)` (area)

### 34.5 Salah tracker (`.dawa-salah`)

- Card: radius `--radius`, `background var(--surface)`, border `1px var(--border)`
- **Arch banner**: `aspect-ratio 1440/449`, gradient `accent-soft → transparent`; mihrab mask = `tracker-card.svg` filled `var(--accent)` at opacity `0.42`, mask-size `100% auto`, top-center. **In Flutter:** use the SVG as a mask/overlay over an accent fill.
- Title `font-display 26px/700` `--accent-bright`; subtitle `font-arabic 18px` `--text-soft`
- Nav buttons: `36×36` circle, `1px var(--border)`, hover accent
- Week label `13px/600`, min-width 150px
- Table: `table-layout: fixed`; first col `72px`; th `9px/700` uppercase `--text-dim`
- **Cell** (`.dawa-salah-cell`): inline-grid `38px 34px 38px`, column-gap `5px`, min-height 38px
- **Fard button** (`.dawa-salah-prayer`): `34×34` circle, border `1.5px var(--border)`, `font 13px`; done = gradient `accent-bright → accent-dim` + border accent + shadow `0 4px 16px var(--accent-glow)`; locked = opacity 0.35
- **Sunnah dot** (`.dawa-salah-sunnah`): `15×15` circle, `font 8px`; done = `accent@55%` fill
- Day pill (`.dawa-salah-day`): `28×28` circle; today = accent bg + glow
- Row label EN `11px/700` `--text-soft`; AR `font-arabic 14px` `--accent`
- Jamat inline toggle: hidden `≤960px` (mobile uses modal checkbox)

### 34.6 Salah mark modal (`dawa-salah-modal.css`) — **mobile only** (`≤960px`; hidden `≥961px`)

- Panel: `width min(340px, 100%-28px)`, `max-height min(100vh-80px, 400px)`, radius `18px`, glass `rgba(12,16,24,0.85)` + `blur(20px) saturate(1.5)` (light: `rgba(255,255,255,0.72)` + `blur(28px)`)
- Entrance: `scale(0.92) translateY(12px) → 1`, `0.35s var(--ease)`
- Header: padding `24px 24px 16px`, centered; close btn `32×32` circle top-right `16px`
- Prayer icon `36×36`; name `font-display 24px/700`; arabic `font-arabic 20px` `--accent`; date `12px/600` `--text-dim`
- Meter dots: `7×7`, gap 6px; on = gradient + `scale(1.15)` + glow
- **Bead strand**: CSS vars — sunnah bead `36px`, fard bead `48px`, track height `52px`, gap `12px`; rail `2px` gradient line behind beads
- Bead core: circle, border `1.5px` (fard `2px`); on = gradient `accent-bright → accent-dim` + ring `0 0 0 3px accent@16%` + `0 4px 16px glow`; sunnah-off = dashed border
- Caption: kind `8px/700` uppercase; rakats `9px/600`
- Confirm button: `max-width 220px`, `height 38px`, radius 999px, `font-display 13px/700` uppercase; hover = gradient fill
- Jamat checkbox: `15×15`, radius 5px, custom check; label `12px/600`

### 34.7 Ummah / Friends (`dawa-friends.css`)

- Glass card (`.dawa-glass`): `background var(--surface)`, border `1px var(--border-soft)`, radius `--radius`, shadow `0 8px 32px arch-shadow@45%`
- Social stack gap `clamp(14px,2.5vw,18px)`
- Hero (`.dawa-social__hero`): space-between, padding `clamp(12px,2.5vw,16px) clamp(14px,3vw,18px)`; value `font-display clamp(17px,4.2vw,25px)/700`; gold value `#d4a017`; label `clamp(9px,2.2vw,10px)/600` uppercase; center divider `1px` gradient bridge with diamond
- Gold coin: `drop-shadow` gold glow (light mode softer)
- Toast: fixed `bottom calc(68px + 16px)`, centered pill, `padding 10px 18px`, radius 999px, `13px/600`
- **Wakt board row** (`.dawa-social-board__row`):
  - Desktop grid: `minmax(160px,1.65fr) minmax(56px,0.5fr) minmax(112px,1fr) 92px`, gap 12px, min-width 540px
  - Padding `12px 12px 14px`, radius `--radius-sm`, bg `surface-2@48%`, border `1px var(--border-soft)`
  - **Mobile (`≤640px`):** switches to `display:flex`, gap 8px, padding `10px 10px 10px 8px`; column headers hidden
  - Row height ≈ `76px` (matches virtualizer `ROW_HEIGHT`)
  - Skeleton row min-height `58px`, shimmer gradient
  - Poke button (mobile): padding `5px 10px`, `font 11px`
- Username search: input borderless `padding 12px 0`; spinner `16×16` accent; results row `padding 10px 12px`, `gap 10px`, bottom border; name `14px/700`, username `12px` `--text-soft`

### 34.8 Ruhaniah (`dawa-ruhaniah.css`)

- Container: `max-width 680px`, centered, padding `0 4px`
- Intro: centered; moon emoji `40px` with glow; title `font-display clamp(28px,6vw,38px)/700` `--accent-bright`; arabic `clamp(22px,5vw,30px)` `--accent` rtl; tagline `14px` italic `--text-soft`
- Sections stack: flex column, `gap 16px`
- Step card (`.dawa-step-card`): `background var(--surface)`, border `1px var(--border)`, radius `--radius`, padding `clamp(20px,3vw,28px)`, top accent stripe via `::before`

### 34.9 Daily challenge (`dawa-challenge.css`)

- Section: `margin-bottom clamp(22px,3.5vw,32px)`, bottom border `1px var(--border-soft)`
- Head: flex, `gap 12px`; title `13px/600` uppercase `--text-dim`
- Rainbow meter: `height 7px`, seg `gap 2px`, radius 1px; **14-step red→green ramp** lit colors: `#ef4444, #f05236, #f26928, #f5821a, #f59e0b, #eab308, #d4c20a, #b8c80c, #9ccc0e …` (see file for full 14); lit seg gets glow

### 34.10 Analytics (`dawa-mood-analytics.css`)

- Bento grid: `≤960px` → 2 columns; `≤640px` → 1 column; `.span-2` cards collapse to span 1 on small
- Card: `.dawa-analytics__card dawa-glass` (glass spec §34.7)
- Chart heights ~`300px`/`400px` (radar/combo) — see `ChartShimmer` heights in §21.4

### 34.11 Auth (`dawa-auth.css`)

- Wrapper: full-height centered, padding `88px 24px 32px`, glass vars per theme (`--glass-bg`, `--glass-blur 16px`, `saturate 1.45`)
- Layout: 2-col grid (`1fr 1fr`), `max-width 920px`, gap 20px — **stacks to 1 col on mobile** (see media queries in file)
- Aside: glass card, arch image `min(220px,70%)` `aspect-ratio 3/4`, drop-shadow
- Theme bar: fixed top-right `20px`, gap 8px

### 34.12 Calendar (`dawa-calendar.css`)

- Container: flex column, `gap clamp(16px,2.5vw,24px)`, full width
- Grid: 1 column on mobile; **`≥1024px`** → `minmax(360px,440px) 1fr` two-column
- Month cells: dual date (Gregorian large + Hijri small); significance tiers (Sacred/Notable/Voluntary) — colors per file

### 34.13 Shimmer (`dawa-shimmer.css`) & modals (`dawa-modals.css`)

- Shimmer keyframe: `background-size 200% 100%`, slide `1.2s ease-in-out infinite`
- Base gradient: `surface 80% → surface 55%(+text-dim) → surface 80%`
- Privacy matrix: grid → 1 column on `≤640px`
- Profile charts shimmer: 1 column `≤640px`

### 34.14 Global animation & motion

- Signature easing everywhere: `cubic-bezier(0.22, 1, 0.36, 1)` = Flutter `Cubic(0.22, 1, 0.36, 1)`
- Common durations: micro `0.15–0.25s`, entrance `0.35–0.55s`, progress fill `0.75s`
- Pulse (active wakt segment): `2.4s ease-in-out infinite` glow
- Sun spin: `24s linear infinite`
- **Every animation needs a reduce-motion fallback** (mirror web `prefers-reduced-motion`; gate `flutter_animate` on `MediaQuery.disableAnimations`)

---

## 35. Using the Bundled CSS for Carbon-Copy Fidelity

The `docs/flutter-qa/reference-css/` folder is the **single source of pixel truth**. Recommended workflow per screen:

1. Open the matching CSS file (map in §31) alongside the Flutter widget.
2. Translate tokens: `var(--accent)` → `DawaTokens.accent`, `--radius` → `18`, `--radius-sm` → `10`, `clamp(a, vw, b)` → `MediaQuery`-based interpolation or a fixed mid value at your target width.
3. `color-mix(in srgb, X n%, Y)` → `Color.lerp(X, Y, 1 - n/100)` (or `X.withOpacity` when mixing with transparent).
4. `box-shadow` → `BoxShadow`; `backdrop-filter: blur()` → `BackdropFilter(ImageFilter.blur())`.
5. `aspect-ratio` → `AspectRatio`; CSS grid → `GridView`/`Row`/`Column` with `Flexible` flex ratios matching the `fr` units.
6. Verify against a mobile screenshot (§33) at your device width.

**Token quick-map (from §4 + measured):**

| CSS | Flutter |
|-----|---------|
| `--radius-arch` | `28.0` |
| `--radius` | `18.0` |
| `--radius-sm` | `10.0` |
| `--header-h` | `76.0` |
| `--tabbar-h` | `68.0` |
| `--ease` | `Cubic(0.22, 1, 0.36, 1)` |
| body font size | `15` / line-height `1.65` |
| `--accent-text` (gold, default) | `#1a1204` |
| `--accent-text` (green/blue/purple/silver/pink) | `#042f2e` / `#082f49` / `#2e1065` / `#0f172a` / `#500724` |

---

## 36. Full Nested Payload Field Reference

Exact nested shapes (from `lib/*.ts`) so DTOs need no guessing. Optional = `?`.

### `StatsPayload`
```
weekCompleted:int, weekTotal:int, weekDays:int[7], streak:int, lifetimeRate:num,
todayCompleted:int, lifetimePrayed:int, lifetimeMissed:int, lifetimeExpected:int,
lifetimeJamat:int, activeDays:int, perfectDays:int, daysOnApp:int,
sunnahPrayed:int, sunnahTotal:int,
bestPrayer: { prayer:Prayer, label:str, rate:num } | null,
loggedCompleted:int, trackingSince:str|null,
missedBreakdown: { date:str, prayer:Prayer, label:str }[]
```

### `SalahGrid` / `SalahCell`
```
SalahGrid = Map<dateKey "YYYY-MM-DD", Map<Prayer, SalahCell>>
SalahCell = { fard:bool, inJamat:bool, sunnahBefore:bool[], sunnahAfter:bool[] }
```
Sunnah slot counts: Fajr before1/after0, Dhuhr before2/after1, Asr 0/0, Maghrib 0/after1, Isha 0/after1.

### `DailyChallengeState` (`lib/challenge-data.ts`)
```
{ date:str, mask:int (bit i = task i done), completedCount:int, tasks: ChallengeTask[5] }
ChallengeTask = { index:0..4, emoji:str, title:str, subtitle:str, hadith:str, fahm:Dim[] }
```

### `AnalyticsKpis`
```
iman:num, streak:int, weekRate:num, lifetimeRate:num, perfectDays:int,
fajrMissed:int, sunnahPrayed:int, sunnahTotal:int, totalCompleted:int, lifetimeJamat:int
```

### `AnalyticsPayload` (adds to kpis)
```
insights:PrayerInsightsPayload,
byPrayer: { prayer:Prayer, label:str, completed:int, total:int, rate:num }[],
stackedWeek: { label:str, onTime:int, kaza:int, missed:int, jamat:int }[],
weekDays:int[], weekDeeds:(int|null)[], weekCalendarDeeds:(int|null)[], weekLabels:str[],
moodHistory: { date:str, moodId:str, label:str, iman:num|null }[],
imanMoodSeries: ImanMoodDay[], imanMoodCorrelation:num|null,
coaching: CoachingTip[], totals, trend:'up'|'down'|'steady', revision:str
```

### `CoachingTip`
```
{ id:str, priority:'high'|'medium'|'low', icon:str, title:str, body:str, action:str }
```

### Iman / mood correlation labels
```
null       → "Log more moods and prayers to reveal a pattern."
|r| >= .7 → "Strong positive link" | "Strong inverse link"
|r| >= .4 → "Moderate positive link" | "Moderate inverse link"
|r| >= .2 → "Mild pattern emerging"
otherwise → "No clear link yet — keep checking in"
```

### `PrayerInsightsPayload`
```
days: { date:str, label:str, iman:num, onTime:int, kaza:int, missed:int, pending:int,
        jamat:int, missedPrayers:Prayer[] }[],
currentIman:num, trend:'up'|'down'|'steady',
totals: { onTime:int, kaza:int, missed:int, jamat:int }
```

### `RuhaniahPayload`
```
completed:bool, taqwaScore:num|null,
barakahScores: { timeScore, rizqScore, healthScore, heartScore } | null,
verse: { ayahRef, arabic, translation, tafsir, reflectionText, dawahText, signals } | null,
fahmProfile: { totalQuestions:int, categoryScores:Map<str,num>, overallQAS:num,
               strongest:str|null, weakest:str|null, trend:str } | null,
insights: { taqwaHistory:[{date,score}], barakahHistory:[{date,timeScore,rizqScore,healthScore,heartScore}],
            duaStats:{total,answered,waiting,stored}, duaTimeline:[...], duaList:[...] } | null,
weaknesses: { id, title, arabicTitle, description, advice,
              severity:'critical'|'high'|'moderate', icon }[]
```

### `CalendarPayload`
```
today:CalendarDayState, todayHistoryIds:str[],
monthGrid: (CalendarDayCell|null)[],
eventsById: Map<str,IslamicEvent>, historyById: Map<str,IslamicHistoricalEvent>,
nextEvent: { eventTitle, eventArabicTitle, daysUntil:int, hijriDateTarget } | null,
weekCompletions: { date:str, completed:int, total:int }[],
consistency:num (0..1),
view: { gregorianYear, gregorianMonth(0-11), gregorianMonthName, hijriMonthName,
        hijriYear, canGoPrev:bool, canGoNext:bool }
CalendarDayCell = { gregorianDay, hijriDay, hijriMonth, hijriMonthName, dateKey,
                    isToday, isSelected, hasEvent, significance, eventRefs[], historyRefs[] }
```

### `HubResponse`
```
me: { goldCoins:int, badge:Badge },
requests: Friend[], friends: Friend[], board: BoardRow[],
page: { cursor:int, nextCursor:str|null, hasMore:bool, limit:int, totalFriends:int },
summary: { activeInWakt:int, pokeable:int, totalFriends:int, revision:str }
Friend = { id, name, username?, email, avatarColor, avatarUrl?, weekRate:num|null,
           weekRateHidden?, friendshipId, goldCoins:int, goldCoinsHidden?, badge:Badge|null }
Badge = { id, name, minCoins:int, icon, blurb }
```

### `BoardRow`
```
{ id, name, username?, avatarColor, avatarUrl?, goldCoins:int, goldCoinsHidden?, badge:Badge|null,
  wakt: { prayer:Prayer|null, prayerLabel, phase:'upcoming'|'active'|'completed'|'private',
          salahStatus:str, waktStartedAt:str|null, waktEndsAt:str|null, waktEndLabel:str|null,
          canPoke:bool, pokeCooldownUntil?:str|null, pokeCooldownSeconds?:int,
          forbiddenNow:bool, elapsedMinutes:int, remainingMinutes:int,
          elapsedSeconds:int, remainingSeconds:int, isPrivate?:bool } }
```

### `Profile` + `ProfilePrivacy`
```
Profile = { id, name, username?, email, mobile?, avatarColor, gender?, avatarUrl?,
            city?, country, latitude?, longitude?, timeZone?, profilePrivacy }
ProfilePrivacy = { public: ProfilePrivacyTier, connections: ProfilePrivacyTier }
ProfilePrivacyTier = { showLocation, showSalahStats, showGoldCoins, showBadge,
                       showWaktStatus, showMemberSince, showAvatarPhoto } // all bool
```

### `MOOD_OPTIONS` (6, ordered high→low)
```
ecstatic #2d8a4e · happy #5cb85c · good #9ccc65 · neutral #e8c547 · sad #f0a030 · angry(Upset) #c0392b
```

### `AVATAR_COLORS`
```
#d4af37 #2eb88a #3b9eff #9b7bf7 #b8c5d6 #f06bab #e85d5d #3ecf8e
```

---

## 37. Carbon-Copy Readiness: Required Missing Work and Known Constraints

This section is intentionally explicit: **the BRD plus the copied CSS are a high-fidelity build guide, not yet a self-contained pixel/behavior-port package.** Complete every P0 item before calling the Flutter app an exact carbon copy.

### 37.1 P0 — prerequisites before pixel-parity sign-off

| Status | Required work | Evidence / owner |
|--------|---------------|------------------|
| Missing | Capture the §33 golden screenshots at 390×844 for every listed loaded, empty, error, modal, and interaction state. | Store under `docs/flutter-qa/screenshots/`; current folder has no screenshots. |
| Missing | Provide the same font binaries in Flutter-compatible form and verify text metrics against the web. | `fonts.css` references 11 unavailable `/fonts/*.woff2` files: Amiri 400/700 Arabic+Latin, Cormorant Garamond 500/600/700, DM Sans 400/500/600/700. Use matching TTF/OTF assets or verified Google Fonts equivalents. |
| Missing | Add or deliberately replace missing brand/auth images. | `Logo.webp`, `Gate.webp`, and `shimanto.jpg` are referenced but absent. `Gate.webp` is only for the auth aside; the Salah arch is `tracker-card.svg`. |
| Missing | Implement a production native-auth path. | Add Bearer-token auth, token issuance, and CORS/OPTIONS as specified in §2 and §32. Cookie-jar auth is only a development/MVP bridge. |
| Required | Port interaction behavior, not only CSS. | Use the source map in §37.2 and the **inlined algorithms in §39**; CSS has no modal state, optimistic update, scroll behavior, countdown, chart rendering, or portal logic. |

### 37.2 Behavior source map (port these TypeScript behaviors)

> Each row's algorithm is now written out language-neutrally in **§39** — port from there and treat the listed source file as the tie-breaker if anything is ambiguous.

| Flutter feature | Canonical web behavior source | Flutter parity requirement |
|-----------------|-------------------------------|----------------------------|
| Mobile Salah interaction | `components/dashboard/SalahTracker.tsx`, `SalahMarkModal.tsx`, `lib/salah-mark-rules.ts` | At `≤960px`, open the modal for fard marking; retain sunnah/fard/jamat state, optimistic mutation, rollback, timing lock, and gender-specific Jamat/Awal Wakt copy. |
| Salah rewards and completion feedback | `lib/rewards.ts`, `lib/confetti.ts`, `public/assets/scripts/confetti.js` | Match coin updates, completion feedback, and confetti trigger timing; CSS only defines the canvas z-index. |
| Home header and prayer arc | `components/layout/PageHeader.tsx`, `SunPathArc.tsx`, `WaktCountdownClock.tsx` | Render full name/avatar, live countdown, prayer-time arc, active/forbidden states, and its periodic updates. |
| Ummah live board | `components/friends/WaktBoardVirtual.tsx` | Preserve virtualized list behavior, fixed `ROW_HEIGHT = 76`, live countdown tick, poke cooldown, cursor pagination, and board-summary refresh. |
| Header account menu | `components/layout/UserMenu.tsx` | Reproduce overlay position from trigger bounds, dismiss rules, resize behavior, focus handling, and entrance motion; CSS only styles the panel. |
| Analytics charts | `components/analytics/AnalyticsChartsGrid.tsx`, `lib/chart-theme.ts` | Port datasets, labels, tooltips, chart options, and live theme-derived colors—not just the chart card shell. |
| Truth effects and modal | `components/truth/TruthPage.tsx`, `useGradientExpand.ts` | Port the scroll-driven expand/radius effect, passage modal, body copy, figure placement, and reduced-motion behavior. |
| Ruhaniah flow | `components/ruhaniah/**`, `lib/ruhaniah-validation.ts` | Preserve ordered incomplete/completed states, validation, local dua staging, and successful-submit transition. |
| Loading UI | `components/ui/Shimmer.tsx`, `app/(app)/AppLayoutClient.tsx` | Port the variant sizing and app-shell loading layout; not all sizes are in CSS. |

### 37.3 Responsive rules to centralize in Flutter

Do not treat `960px` as the only breakpoint. Create `DawaBreakpoints` and test the mobile target widths against the original CSS:

| Width rule | Current web use |
|------------|-----------------|
| `≤400px` | Ruhaniah narrow-device adjustments |
| `≤480px` | Ruhaniah, location, handbook adjustments |
| `≤520px` | Ummah/social adjustments |
| `≤640px` | Ummah board, analytics, shimmer, shared modal adjustments |
| `≤720px` | Friends, shared modals, Truth adjustments |
| `≥721px` | Prayer sun-arc scale changes |
| `≤768px` | Auth and handbook stacks |
| `≤820px` | Profile layout |
| `≤840px` / `≤960px` | Analytics grid / mobile app shell |
| `≥1024px` | Calendar two-column layout (tablet/desktop only) |

The shell visibility rule (`.dawa-header__nav { display:none }`, `.dawa-tabbar { display:block }` at `≤960px`) currently resides in **`dawa-friends.css`**, not `dawa-chrome.css`; preserve it centrally in Flutter rather than depending on that accidental CSS location.

### 37.4 Non-CSS dependency manifest

The `docs/flutter-qa/reference-css/` folder contains CSS only. A Flutter implementation must additionally inspect/bundle:

- `public/assets/**` and `public/data/**` for raster/SVG/PDF/JSON assets; see §25–26.
- `assets/css/fonts.css` for exact web font-family/weight mapping.
- `components/**` for runtime layout via inline styles and interaction state.
- `lib/chart-theme.ts`, `lib/confetti.ts`, `lib/salah-mark-rules.ts`, `lib/salah-utils.ts`, and `lib/validation.ts` for client-visible behavior.
- `components/landing/**` only if public landing/marketing pages are added later; they are out of the authenticated-app carbon-copy scope.

### 37.5 Accuracy corrections applied in v1.3

- The reference bundle contains **23**, not 22, CSS files.
- Analytics styles are in `dawa-mood-analytics.css`; `dawa-analytics.css` does not exist.
- Mobile notifications are shown by header `NotificationBell`; the five-item tab bar has no notifications destination.
- The web content container is `max-width: 1200px`, not ~600px.
- The dashboard home heading uses full `user.name`, with avatar/countdown/SunPathArc.
- The Analytics hero has four primary metrics; `coaching` is a separate Personal guidance section.
- Friend request creation is `POST /api/friends`; accept/decline/cancel/disconnect is `PATCH /api/friends`.
- Notification read mutations have the exact request bodies in §7 and §21.8.
- The Salah arch uses `tracker-card.svg`; `Gate.webp` is an auth-only asset.

### 37.6 Carbon-copy acceptance checklist

Only mark the port complete when all are true:

- [ ] Each §33 fixture has a Flutter golden test at the same viewport and theme/palette.
- [ ] Golden diffs are reviewed manually; any intentional difference has a documented reason.
- [ ] All P0 assets/fonts are bundled and rendering matches reference screenshots.
- [ ] All §37.2 interactions work with API success, optimistic state, failure rollback, loading, and offline/error states.
- [ ] Dark/light and all six accent palettes pass visual QA.
- [ ] Text scaling, RTL Arabic, safe areas, keyboard behavior, and reduced-motion mode are tested.
- [ ] Native authentication uses the production Bearer-token design (not a browser-cookie assumption).

---

## 38. Exact Font Mapping (from `assets/css/fonts.css`)

The web ships **11 self-hosted `.woff2` files** under `/fonts/`, all `font-style: normal`, `font-display: swap`. Reproduce the exact family/weight set below. These binaries are **not** in the repo — either add the same weights as TTF/OTF Flutter assets, or use the pinned Google Fonts equivalents (same families, identical metrics).

| Family | Weights shipped | Script coverage | Flutter usage |
|--------|-----------------|-----------------|---------------|
| **Amiri** (serif) | 400, 700 | Arabic **and** Latin subset per weight (two files each) | Arabic prayer names + ayah text (`dawa_text.dart` → `arabic`) |
| **Cormorant Garamond** (serif) | 500, 600, 700 | Latin | Display headings + hero numbers (`display`) |
| **DM Sans** (sans) | 400, 500, 600, 700 | Latin | Body + everything else (`body`, base 15px / line-height 1.65) |

**Exact `@font-face` inventory (11 files):**
```
amiri-arabic-400-normal.woff2            Amiri / 400 / Arabic unicode-range
amiri-latin-400-normal.woff2             Amiri / 400 / Latin unicode-range
amiri-arabic-700-normal.woff2            Amiri / 700 / Arabic unicode-range
amiri-latin-700-normal.woff2             Amiri / 700 / Latin unicode-range
cormorant-garamond-latin-500-normal.woff2  Cormorant Garamond / 500
cormorant-garamond-latin-600-normal.woff2  Cormorant Garamond / 600
cormorant-garamond-latin-700-normal.woff2  Cormorant Garamond / 700
dm-sans-latin-400-normal.woff2           DM Sans / 400
dm-sans-latin-500-normal.woff2           DM Sans / 500
dm-sans-latin-600-normal.woff2           DM Sans / 600
dm-sans-latin-700-normal.woff2           DM Sans / 700
```

**`pubspec.yaml` (self-hosted route):**
```yaml
fonts:
  - family: Amiri
    fonts:
      - { asset: assets/fonts/Amiri-Regular.ttf, weight: 400 }
      - { asset: assets/fonts/Amiri-Bold.ttf,    weight: 700 }
  - family: Cormorant Garamond
    fonts:
      - { asset: assets/fonts/CormorantGaramond-Medium.ttf,   weight: 500 }
      - { asset: assets/fonts/CormorantGaramond-SemiBold.ttf, weight: 600 }
      - { asset: assets/fonts/CormorantGaramond-Bold.ttf,     weight: 700 }
  - family: DM Sans
    fonts:
      - { asset: assets/fonts/DMSans-Regular.ttf,  weight: 400 }
      - { asset: assets/fonts/DMSans-Medium.ttf,   weight: 500 }
      - { asset: assets/fonts/DMSans-SemiBold.ttf, weight: 600 }
      - { asset: assets/fonts/DMSans-Bold.ttf,     weight: 700 }
```

**`google_fonts` route (no binaries):** `GoogleFonts.amiri`, `GoogleFonts.cormorantGaramond`, `GoogleFonts.dmSans`. Only load the weights above. `DM Sans` numbers use `fontFeatures: [FontFeature.tabularFigures()]` wherever the web uses `.dawa-num` / tabular-nums (clocks, hero stats, countdowns).

---

## 39. Ported Interaction Behavior (language-neutral algorithms)

CSS defines none of the logic below. These are transcribed from the real web components (source file in each heading) so a Flutter/Dart implementation needs no reverse-engineering. Server owns all salah/iman math — these are **client feel only**.

### 39.1 Wakt lock — can this cell be marked? (`lib/salah-mark-rules.ts`)

```
canMark(prayerDateKey, todayKey, prayer, prayerTimes, now):
  if prayerDateKey > todayKey: return BLOCKED ("future")
  if prayerDateKey < todayKey: return ALLOWED           # past days always editable
  if prayerTimes missing/invalid: return BLOCKED         # today needs times to know wakt
  mins = minutes-since-midnight of `now` in prayerTimes.timeZone   # NOT device tz
  start = waktWindow(prayer, prayerTimes).start
  return mins >= start ? ALLOWED : BLOCKED ("wakt-not-started")
```
- `todayKey` and `mins` are computed in the user's **prayer timezone**, never the device timezone (§10).
- A locked fard button renders at opacity 0.35 and is non-interactive; tooltip = `"Wakt has not started yet"` on today, `"Future day"` on a future date.

### 39.2 Salah tracker — desktop vs mobile branch + optimistic toggle (`components/dashboard/SalahTracker.tsx`)

**Fard tap dispatch (the key mobile rule):**
```
onFardTap(dateKey, prayer):
  if viewport width <= 960px:  open SalahMarkModal(dateKey, prayer, cell)   # mobile
  else:                        toggle(FARD) immediately                      # desktop inline
```
Sunnah dots and the inline Jamat toggle always fire their mutation directly (no modal), on every breakpoint.

**Single optimistic toggle (sunnah dots, desktop fard, jamat):**
```
toggle({dateKey, prayer, kind, unit=0, inJamat=false}):
  if a toggle is already in flight: return          # single-flight guard (toggleBusyRef)
  markingComplete = NOT current state of that unit
  nextCell = clone(cell)
  if kind == FARD:  nextCell.fard = markingComplete; nextCell.inJamat = markingComplete ? inJamat : false
  elif SUNNAH_BEFORE: nextCell.sunnahBefore[unit] = markingComplete
  else:               nextCell.sunnahAfter[unit]  = markingComplete

  mutate(gridWith(nextCell), revalidate:false)      # 1. optimistic paint
  try:
    POST /api/salah { date, prayer, kind, unit, completed:markingComplete,
                      inJamat: kind==FARD ? (markingComplete?inJamat:false) : false }
    if !res.ok || !body.ok: throw body.error
    if markingComplete && kind==FARD: fireCelebrationConfetti()   # confetti only on fard-complete
    refetch GET /api/salah?week=... ; mutate(fresh, revalidate:false)   # 2. reconcile
    patch dashboard cache in place (also copy body.stats when kind==FARD)
  catch:
    mutate(undefined, revalidate:true)              # 3. rollback → server truth
    restore previous dashboard snapshot
  finally: clear busy guard
```

**Modal batch confirm (mobile, `handleBatchConfirm`):** diff modal state vs original cell → array of `{kind, unit, completed, inJamat?}`; build one optimistic cell applying all; `POST /api/salah` for each update **in parallel** (`Promise.all`); refetch week once; on any failure rollback grid + dashboard and rethrow. Confetti fires inside the modal (§39.3) when any update completes.

**Jamat toggle:** only allowed once `cell.fard` is true; posts `FARD, completed:true, inJamat:!current`. Inline jamat control is hidden ≤960px (mobile sets Jamat via the modal checkbox).

**Week nav:** `‹`/`›` step ±7 days on the week-start key; the `›` (next) button is disabled once `weekStartKey >= currentWeekStartKey` (can't browse future weeks). Default `weekStartKey = rollingWeekStartKey(timeZone)`. Prayer-times SWR refreshes every 60s.

### 39.3 Salah mark modal (`components/dashboard/SalahMarkModal.tsx`)

- On open: seed local `sunnahBefore[] / sunnahAfter[] / fard / inJamat` from the passed `cell`; render nothing until seeded.
- Layout zones: **Before** (sunnah beads) · **Fard** (single big bead) · **After** (sunnah beads), only rendering a zone when its slot count > 0. Bead counts from `SUNNAH_SLOTS[prayer]`; rakats from `FARD_RAKATS[prayer]` and `SUNNAH_UNIT_RAKATS` (2).
- Meter dots at top = `totalUnits = before + 1 + after`; lit count = number currently checked (`doneCount`).
- **Jamat checkbox appears only when `fard` is checked.** Label = `"Prayed in Jamat"` for `MALE`, `"Prayed in Awal Wakt"` for `FEMALE`.
- Confirm button: disabled while busy; text `"Mark"` → `"Marking…"`. On confirm → call `onConfirm(diffUpdates)`; if any update `completed === true`, call `fireCelebrationConfetti()`; then close. Swallow errors (parent handles rollback).

### 39.4 Celebration confetti (`lib/confetti.ts`)

Dual symmetric burst from the two bottom corners (no-op if no confetti engine present):
```
burst A: particleCount 300, angle 60,  spread 100, startVelocity 90, origin (x:-0.1, y:1.1)
burst B: particleCount 300, angle 120, spread 100, startVelocity 90, origin (x: 1.1, y:1.1)
```
Fires on: fard marked complete (tracker + modal), and other milestone events. Gate behind reduce-motion.

### 39.5 User menu overlay (`components/layout/UserMenu.tsx`)

- Panel is a **portal** (`position: fixed`), width `min(220, viewportW − 24)`, gap `10px` below the trigger, min `12px` viewport padding on every side.
- Position from trigger bounds each open/scroll/resize:
```
left = clamp(triggerRight - width, PAD, viewportW - width - PAD)
top  = triggerBottom + 10
if top + panelHeight > viewportH - PAD:  top = triggerTop - panelHeight - 10   # flip above
top  = clamp(top, PAD, viewportH - panelHeight - PAD)
```
- Recompute on: open, one `requestAnimationFrame` after open, panel resize (ResizeObserver), window `resize`, and window `scroll` (capture phase).
- Dismiss on: outside `mousedown` (ignore clicks inside trigger or panel) and `Escape`.
- Entrance/exit motion: `opacity 0→1`, `y -6→0`, `scale 0.98→1`, `0.18s`, ease `Cubic(0.22,1,0.36,1)`.
- Items in order: Profile, Settings, **Truth (mobile-only)**, Analytics, Notifications, Sign out (danger styling). Selecting any item closes the menu first.

### 39.6 Truth scroll-expand effect (`components/truth/useGradientExpand.ts`)

A wrap grows from `baseMaxWidth` (1152) toward full viewport width while its inner box's border-radius shrinks from `baseRadius` (28) to 0, driven by scroll position:
```
elTop       = element top in document coords
startScroll = max(0, elTop - viewportH)     # element just entering from below
endScroll   = elTop                          # element reaches viewport top
progress    = clamp((scrollY - startScroll) / (endScroll - startScroll), 0, 1)
maxWidth    = baseMaxWidth + (viewportW - baseMaxWidth) * progress
radius      = (1 - progress) * baseRadius
```
- Batch all reads before all writes each frame (one `requestAnimationFrame`) to avoid layout thrash.
- **Disable entirely under reduce-motion** (leave element at its base width/radius).
- In Flutter: drive `maxWidth`/`radius` from a scroll controller offset with the same formula.

### 39.7 Ummah wakt board (`components/friends/WaktBoardVirtual.tsx`)

- **Virtualized** list, fixed `ROW_HEIGHT = 76`, overscan 6. Header row: `Brother / Sister · Prayer · Status · Action`.
- Loading (no rows yet) → 3 skeleton rows. Empty → `"Connect with friends to see live salah status here."`
- **Per-row live countdown**, own 1s interval:
  - phase `upcoming`: counts down to `waktStartedAt` (time until wakt starts).
  - phase `active`: counts down to `waktEndsAt`.
  - otherwise: static `remainingSeconds`.
  - `remaining <= 5min` adds the danger style.
- **Status cell precedence:** private → `"Private"`; prayed/on-time → `"✓ Prayed"`; passed/missed → `"Wakt passed"`; upcoming → countdown + `"until <label>"`; forbidden → countdown + `"Forbidden time"`; else active → countdown + `"left · ends <label>"`.
- **Poke cell precedence:** `canPoke` → **Poke 🤲** button (disabled while that row's poke is in flight, shows `…`); else cooldown seconds remaining → `HH:MM:SS`; else forbidden+active+pending → `"Wait"`; else prayed → `"Prayed ✓"`; else `—`. Cooldown has its own 1s interval and fires `onCooldownEnd` when it hits 0.
- **Board summary poll** (`useBoardSummaryPoll`): `GET /api/friends/board/summary` immediately + every 60s; if the returned `revision` changes from the last seen value, trigger a board refresh.
- Countdown formatting = `formatCountdownHms` (`H:MM:SS` / `MM:SS`), tabular-nums.

### 39.8 Analytics chart theme derivation (`lib/chart-theme.ts`)

Charts read **live theme values** (Flutter: read from the active `DawaTokens`, not hardcoded):
```
accent      = --accent-bright   (fallback #e8c547)
accentSoft  = --accent-soft     (fallback rgba(232,197,71,0.12))
accentGlow  = --accent-glow     (fallback rgba(232,197,71,0.35))
surface     = --surface-2       (fallback #121824)
text        = --text-dim        (fallback #8a8070)   # axis labels
grid        = rgba(128,128,128,0.14)                  # constant
success     = --success         (#3ecf8e)
warn        = #e8b923                                  # kaza (constant)
danger      = --danger          (#e05252)
categorical = [accent, #3ecf8e, #3b9eff, #9b7bf7, #f06bab]   # slot 0 tracks accent
```
`accentRgba(alpha)` builds `rgba(<accent rgb>, alpha)` for fills/gradients. Re-derive on theme/palette change so charts recolor instantly.

### 39.9 Form validation (`lib/validation.ts`)

- **Name** — live input strips anything that is not a letter (any script), space, `'`, `.`, `-`, and collapses runs of spaces. Valid when: 2–80 chars, contains ≥1 letter, no digits, only the allowed chars.
- **Username** — sanitize to `[a-z0-9._]` (lowercased). Valid when: 3–30 chars, no consecutive `..`, matches `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$` (can't start/end with `.`/`_`). Messages: too short/long, no consecutive periods, else "Letters, numbers, periods, and underscores only".
- **Email** — trim + lowercase; validate with a standard email check.
- Availability ticks (`check-availability`) are debounced 300–450ms (§27).

---

## 40. Carbon-Copy Prompt Bundle Manifest

This Markdown is the **spec**; a true one-shot carbon-copy prompt must attach the files below (they are binary/large and cannot be embedded here). Attach the whole list alongside this `.md` and the model has everything.

### 40.1 Attach for a complete build (present in this repo today)

| Bundle | Path(s) | Why |
|--------|---------|-----|
| This BRD | `docs/FLUTTER_APP_BRD.md` | Spec + inlined behavior (§39) + tokens (§4) |
| Pixel-truth CSS (23 files) | `docs/flutter-qa/reference-css/**` | Exact spacing/media-queries/shadows (§34–35) |
| Static data JSON | `public/data/fahm-questions.json`, `ayah-pool.json`, `islamic-events.json`, `cities.json` | Bundle to `assets/data/` (§25) |
| Salah tracker frame | `public/assets/images/tracker-card.svg` | Mihrab arch mask (§34.5) |
| Coin / handbook art | `public/assets/images/gold.webp`, `thumbnail.webp` | GoldCoin + handbook |
| Truth art | `public/assets/images/truth/01–17.webp`, `fig04.webp`, `founder.webp` | Passage grid + modal (§21.9) |
| Truth copy | `components/truth/truthContent.ts` | Convert to `assets/data/truth-passages.json` (§25) |
| Dart-constant sources | `lib/constants.ts` (`DAILY_INSPIRATIONS`, `PRAYERS`, `SUNNAH_SLOTS`), `lib/challenge-data.ts`, `lib/moods.ts`, `lib/rewards.ts` | Port to Dart constants (§25, §30, §36) |

### 40.2 Must be produced/added before "carbon copy" is truthful (missing today)

| Gap | Action | Ref |
|-----|--------|-----|
| **Golden screenshots** | Capture the 10 §33 states at 390×844 (loaded/empty/error/modal) → `docs/flutter-qa/screenshots/` | §33, §37.1 |
| **Font binaries** | Add the 11 weights (§38) as TTF/OTF, or commit to the Google Fonts route | §38 |
| **Brand/auth images** | Add `Logo.webp`, `Gate.webp` (auth aside), `shimanto.jpg` — or explicitly substitute | §26, §37.1 |
| **Native auth backend** | Bearer token issuance + `Authorization` support + CORS/OPTIONS | §2, §32 |
| **FCM endpoint** | `POST /api/notifications/device` | §11, §32 |

### 40.3 Optional supporting sources (raise fidelity; not strictly required)

`components/dashboard/SalahTracker.tsx`, `SalahMarkModal.tsx`, `components/friends/WaktBoardVirtual.tsx`, `components/layout/UserMenu.tsx`, `PageHeader.tsx`, `SunPathArc.tsx`, `WaktCountdownClock.tsx`, `components/analytics/AnalyticsChartsGrid.tsx`, `components/truth/TruthPage.tsx`, `useGradientExpand.ts`, `components/ui/Shimmer.tsx`, and `lib/{salah-mark-rules,chart-theme,confetti,salah-utils,validation}.ts`. §39 already distills these; attach them only if you want the exact source as a tie-breaker.

### 40.4 Suggested prompt preamble

> "Build a Flutter (iOS+Android) app that is a pixel-faithful port of the authenticated mobile web shell described in `FLUTTER_APP_BRD.md`. Treat §4 (tokens), §34 (layout specs) + the attached `reference-css/` as the pixel source of truth, §39 as the behavior source of truth, and §7/§23/§36 as the API contract. Bundle the attached data JSON and images. Server owns all salah/iman/verse math — never reimplement it. Deliver feature-first per §5, four async states everywhere (§9), all 6 palettes × dark/light, RTL-ready, reduced-motion fallbacks. Match the attached 390×844 golden screenshots."

---

*End of Addawah Flutter Mobile App BRD v1.4 — exact layout specs, copied CSS, inlined font map + behavior algorithms, and the carbon-copy prompt bundle manifest*
