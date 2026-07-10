# Addawah (Dawa)

**Pray Together. Grow Together. Inspire Each Other.**

Free Islamic web platform for salah tracking, accountability, daily inspiration, spiritual growth, and community support — built per the ADDAWAH BRD v4.23.

## Features

### Core
- Public landing page with mission, tutorial video & people feedback
- **Handbook page** — PDF reader with thumbnail preview, fullscreen viewer, and download
- Authentication (email + password sessions)
- Password reset via OTP (email-based)
- Account deletion with OTP verification
- Weekly Salah tracker with ornate arch frame background
- Hero statistics card (today, week, streak, lifetime, sunnah prayed, perfect days)
- Hijri calendar display
- Lifetime analytics charts
- Friend system with gentle reminder (poke)
- Live wakt board with virtual scrolling & compact mobile layout
- Daily Islamic inspiration
- 6 theme colors (Green, Blue, Gold, Purple, Silver, Pink)
- Dark & Light modes
- Framer Motion animations throughout
- SEO: JSON-LD, sitemap, robots.txt, Open Graph metadata

### Salah Tracking
- 5 prayers × 7 days with Fard, Sunnah before, Sunnah after
- On-time vs kaza vs missed classification
- Iman meter calculation (on-time boost, kaza/missed lower)
- Prayer time awareness (prevents marking before wakt starts)
- Missed fard bead visualization (33 beads)
- Celebration confetti on completion
- Sun path arc showing prayer times visually
- Prayer insights with trend analysis & coaching tips
- Precomputed per-day stats (`UserSalahDayStat`) for fast analytics

### Friends & Brotherhood
- Friend system with connection requests & suggestions
- Wakt board — live salah status of friends (virtualized list)
- Precomputed wakt snapshots (`UserWaktSnapshot`) for fast board reads
- Gentle reminder (poke) system with cooldown
- Gold coin economy — earn coins for wakt salah & dawah
- Badge tiers (Seedling → Scholar) based on coin balance
- Username search with availability checking
- Public user profiles (`/u/[username]`) with prayer charts & insights
- Friend week rate & privacy controls

### Ruhaniah (Spiritual Check-in)
- **Taqwa Pulse** — daily self-assessment slider (Ghaflah → Ihsan)
- **Fahm Test** — psychometric exam with 320 questions across 8 categories
- **Barakah Meter** — rate barakah in Time, Rizq, Health, Heart
- **Dua Log** — track and manage personal duas with categories & status
- **Quran Verse Selection** — 300 tagged verses matched to user's spiritual state
- **Insights Dashboard** — Fahm Radar, Taqwa Trend, Barakah Trend, Dua Timeline
- **Spiritual Weakness Analysis** — severity-ranked areas needing attention (critical/high/moderate)

### Analytics
- KPI cards (Iman meter, streak, week rate, lifetime rate)
- Iman meter line chart (14-day trend)
- Missed salah area chart (14-day overview)
- Wakt breakdown doughnut (on-time vs kaza vs missed)
- On-time bar chart (weekly)
- Mood history tracking
- Personal coaching tips
- **Daily Challenge** — 5 rotating tasks with deed tracking + iman integration
- Calendar sunnah deeds integrated into week completion chart

### Islamic Calendar (Hijri)
- **Month grid** — Gregorian calendar with Hijri date annotations and event significance dots
- **Today's events** — automatic detection of special Islamic days (Ashura, Mawlid, Ramadan, Eid, etc.)
- **Sunnah checklist** — per-event action items with gold coin rewards (5–15 coins per action)
- **Countdown** — days until next sacred day with Hijri date target
- **Story of the day** — significance and history of each event with Quran references
- **Consistency tracking** — 14-day rolling completion rate feeds Ruhaniah weakness analysis
- Weekly Jumu'ah recurring events; static event data in `public/data/islamic-events.json` (zero DB queries)
- Mobile: replaces notifications in bottom navbar; notifications moved to avatar menu

### Notifications
- Real-time notification panel with unread count badge
- Notification types: connection requests, pokes, reminders, wakt reminders, ruhaniah reminders
- Mark as read / mark all read
- Deduplication via `dedupeKey`

### UX Polish
- **Shimmer/Skeleton Loading** — smooth loading placeholders across all data-fetching components
- Consistent gradient animation system with `prefers-reduced-motion` support
- Loading states for: stats, charts, notifications, connections, profiles, search results
- App preloader animation on first visit
- Wakt countdown clock in header
- Notification bell with live unread count

## Stack

- Next.js 14 + React + TypeScript
- Hand-written BEM `dawa-*` CSS + custom Islamic gold theme
- Framer Motion
- Prisma + PostgreSQL (Neon recommended)
- Session auth (JWT cookie)
- Chart.js (via react-chartjs-2)
- SWR for data fetching
- Zod for validation
- Pino for logging
- Resend for transactional email
- Vercel Blob for avatar storage
- TanStack Virtual for virtualized lists

## Setup

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment**

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="your-long-random-secret"
```

For local dev, [Neon](https://neon.tech) free tier works well.

3. **Push database schema**

```bash
npm run db:push
```

4. **Run dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Connect repo to Vercel
2. Set `DATABASE_URL` and `AUTH_SECRET` env vars
3. Deploy — run `prisma db push` against production DB once

## Project Structure

```
app/
  (app)/              # Authenticated shell
    dashboard/        # Salah tracker + stats + Hijri + inspiration
    friends/          # Friends + pokes + connections
    analytics/        # Lifetime charts + KPIs
    profile/          # User profile + privacy settings
    ruhaniah/         # Spiritual check-in flow
    calendar/         # Islamic Hijri calendar + sunnah checklist
    notifications/    # Notification panel
    settings/         # Themes + account deletion
    u/[username]/     # Public user profile
  (public)/           # Unauthenticated pages
    page.tsx          # Landing page
    login/            # Auth page
    handbook/         # Handbook PDF reader page
    reset-password/   # Password reset flow
  api/                # REST endpoints
    auth/             # Login, register, logout, me, reset-password, check-availability
    salah/            # Salah record CRUD
    stats/            # Dashboard stats
    dashboard/        # Dashboard aggregated data
    analytics/        # Analytics summary
    calendar/         # Calendar payload + sunnah action toggle
    challenge/        # Daily rotating challenge tasks
    friends/          # Friend system, board, hub, search, suggestions, connections
    pokes/            # Poke system
    notifications/    # Notifications + count
    ruhaniah/         # Ruhaniah flow + duas + history
    insights/         # Prayer insights
    prayer-times/     # Prayer times API
    profile/          # Profile + avatar
    users/[username]/ # Public user profile + insights
    avatars/          # Avatar serving
    rewards/          # Gold coin rewards
    mood/             # Mood check-in
    account/          # Account deletion
    internal/         # Internal sync + ruhaniah verse
components/
  dashboard/          # HeroStats, SalahTracker, PrayerInsights, SunPathArc, MoodCheckIn, HijriCalendar
  calendar/           # IslamicCalendar (month grid, sunnah checklist, countdown, stories)
  analytics/          # AnalyticsHub, AnalyticsChartsGrid
  friends/            # FriendsHub, WaktBoardVirtual, UsernameSearch, ManageConnections, PublicUserProfile
  landing/            # LandingPage, PeopleFeedback, DeveloperCredit, PublicShell, LandingBackdrop
  ruhaniah/           # RuhaniahFlow, TaqwaPulse, FahmTest, BarakahMeter, DuaLog, Insights,
                      # RuhaniahVerse, SpiritualWeakness, FahmRadar, TaqwaTrend, BarakahTrend, DuaTimeline
  notifications/      # NotificationPanel, useNotifications
  profile/            # UserAvatar, ProfilePrayerCharts, ProfilePrivacyMatrix
  layout/             # AppHeader, PageHeader, WaktCountdownClock, NotificationBell, LiveClock, UserMenu
  ui/                 # Shimmer, GoldCoin, ConfirmModal, Modal, StarRating, ThemeSwitcher
  auth/               # LoginPageClient, PhoneInput, ValidatedField, PasswordField, OtpField
  providers/          # AppProvider, ThemeProvider, ThemeSync
  preloader/          # Addawah preloader animation
  seo/                # JsonLd
  location/           # LocationPicker, LocationPrompt
  settings/           # DeleteAccountSection
lib/                  # Auth, prisma, salah utils, ruhaniah logic, islamic calendar, chart theme, wakt snapshot, rewards
assets/css/           # BEM stylesheets (dawa-*.css) — hand-written, custom-property themed
prisma/               # Database schema
public/
  data/               # ayah-pool.json (300 verses), fahm-questions.json (320 questions)
  assets/             # Images, PDFs, videos, icons
  fonts/              # Islamic fonts (Amiri, Cormorant Garamond, DM Sans)
  uploads/            # User avatar uploads (gitignored runtime data, auto-created)
```

## Key Data Files

| File | Content | Purpose |
|------|---------|---------|
| `public/data/ayah-pool.json` | 300 Quran verses | Verse selection engine for Ruhaniah |
| `public/data/fahm-questions.json` | 320 questions | Fahm psychometric test (40 per category × 8) |
| `public/data/islamic-events.json` | 19 Islamic events | Hijri calendar events with sunnah actions & Quran refs |
| `docs/FAHM_QUESTION_BANK.md` | Human-readable question bank | Reference for Fahm test categories & scoring |

## Verse Selection Engine

The Ruhaniah system gathers spiritual signals from 8 sources and converts them to semantic tags:

1. **Salah completion** — `obedient`, `neglectful`, `needs_reminder`
2. **Jamat/Awal Wakt sincerity** — `sincere`, `devoted`, `jamat_strong`, `needs_jamat`
3. **Taqwa score** — `heedless`, `distracted`, `conscious`, `present`
4. **Fahm weakest category** — `anxious`, `shy_deen`, `impatient`, `dunya_focused`
5. **Barakah scores** — `time_restricted`, `restless_heart`, `health_struggling`
6. **Active duas** — `waiting_many`, `needs_sabr`, `answered_dua`
7. **Mood** — `anxious`, `grateful`, `sad`
8. **Prayer streak** — `strong_streak`, `relapse`, `needs_hope`

Verses are scored against tags (primary +3, secondary +1) and the best match is selected.

## Database Models

| Model | Purpose |
|-------|---------|
| `User` | User account with profile, theme, coins, privacy |
| `Session` | JWT session tokens |
| `SalahRecord` | Individual prayer records (Fard/Sunnah, on-time/kaza) |
| `UserSalahDayStat` | Precomputed daily stats for fast analytics |
| `UserWaktSnapshot` | Precomputed live wakt status for friends board |
| `Friendship` | Friend connections (pending/accepted) |
| `Poke` | Gentle reminders between friends |
| `Notification` | All notification types |
| `MoodCheckIn` | Daily mood tracking |
| `TaqwaPulse` | Daily spiritual self-assessment |
| `FahmResponse` | Fahm test answers |
| `UserFahmProfile` | Aggregated Fahm scores & trends |
| `BarakahLog` | Daily barakah ratings |
| `DuaEntry` | Personal duas with status tracking |
| `RuhaniahVerse` | Daily personalized Quran verse |
| `DailyChallenge` | Daily rotating challenge tasks with bitmap mask |
| `CalendarTaskCompletion` | Islamic calendar sunnah action completions (bitmap mask per day) |

## License

Built for the ummah — free to use.
