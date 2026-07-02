# Addawah (Dawa)

**Pray Together. Grow Together. Inspire Each Other.**

Free Islamic web platform for salah tracking, accountability, daily inspiration, spiritual growth, and community support — built per the ADDAWAH BRD v4.0.

## Features

### Core
- Public landing page with mission & tutorial
- Authentication (email + password sessions)
- Weekly Salah tracker with ornate arch frame background
- Hero statistics card (today, week, streak, lifetime)
- Hijri calendar display
- Lifetime analytics charts
- Friend system with gentle reminder (poke)
- Daily Islamic inspiration
- 6 theme colors (Green, Blue, Gold, Purple, Silver, Pink)
- Dark & Light modes
- Framer Motion animations throughout

### Ruhaniah (Spiritual Check-in)
- **Taqwa Pulse** — daily self-assessment slider (Ghaflah → Ihsan)
- **Fahm Test** — psychometric exam with 320 questions across 8 categories (Qadr, Truth, Dawah, Nafs, Akhirah, Sabr/Shukr, Ilm, Social)
- **Barakah Meter** — rate barakah in Time, Rizq, Health, Heart
- **Dua Log** — track and manage personal duas
- **Quran Verse Selection** — 300 tagged verses matched to user's spiritual state
- **Insights Dashboard** — Fahm Radar, Taqwa Trend, Barakah Trend, Dua Timeline

### UX Polish
- **Shimmer/Skeleton Loading** — smooth loading placeholders across all data-fetching components
- Consistent gradient animation system with `prefers-reduced-motion` support
- Loading states for: stats, charts, notifications, connections, profiles, search results

## Stack

- Next.js 14 + React + TypeScript
- Tailwind CSS + custom Islamic gold theme
- Framer Motion
- Prisma + PostgreSQL (Neon recommended)
- Session auth (JWT cookie)
- Chart.js (via react-chartjs-2)
- SWR for data fetching

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

4. **Add gate arch image**

Place your ornate arch PNG at:

```
public/images/gate-arch.png
```

This is used as the Salah tracker card background.

5. **Run dev server**

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
    notifications/    # Notification panel
    settings/         # Themes + account
  api/                # REST endpoints
  login/              # Auth page
  page.tsx            # Landing page
components/
  dashboard/          # HeroStats, SalahTracker, PrayerInsights, SunPathArc, MoodCheckIn
  analytics/          # AnalyticsHub, AnalyticsChartsGrid
  friends/            # FriendsHub, WaktBoard, UsernameSearch, ManageConnections
  ruhaniah/           # RuhaniahFlow, TaqwaPulse, FahmTest, BarakahMeter, DuaLog, Insights
  notifications/      # NotificationPanel, useNotifications
  profile/            # UserAvatar, ProfilePrayerCharts, ProfilePrivacyMatrix
  layout/             # AppHeader, PageHeader, WaktCountdownClock, NotificationBell
  ui/                 # Shimmer, GoldCoin, ConfirmModal, Modal, StarRating
  auth/               # LoginPageClient, PhoneInput, ValidatedField, PasswordField
  providers/          # AppProvider, ThemeProvider, ThemeSync
lib/                  # Auth, prisma, salah utils, ruhaniah logic, chart theme
prisma/               # Database schema
public/
  data/               # ayah-pool.json (300 verses), fahm-questions.json (320 questions)
  assets/             # Images, icons
  fonts/              # Islamic fonts
```

## Key Data Files

| File | Content | Purpose |
|------|---------|---------|
| `public/data/ayah-pool.json` | 300 Quran verses | Verse selection engine for Ruhaniah |
| `public/data/fahm-questions.json` | 320 questions | Fahm psychometric test (40 per category × 8) |

## Verse Selection Engine

The Ruhaniah system gathers spiritual signals from 7 sources and converts them to semantic tags:

1. **Salah completion** — `obedient`, `neglectful`, `needs_reminder`
2. **Taqwa score** — `heedless`, `distracted`, `conscious`, `present`
3. **Fahm weakest category** — `anxious`, `shy_deen`, `impatient`, `dunya_focused`
4. **Barakah scores** — `time_restricted`, `restless_heart`, `health_struggling`
5. **Active duas** — `waiting_many`, `needs_sabr`, `answered_dua`
6. **Mood** — `anxious`, `grateful`, `sad`
7. **Prayer streak** — `strong_streak`, `relapse`, `needs_hope`

Verses are scored against tags (primary +3, secondary +1) and the best match is selected.

## License

Built for the ummah — free to use.
