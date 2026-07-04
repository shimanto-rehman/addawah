# DAWA — Business Requirements Document (BRD)

## Version 4.23

**Tagline:** Pray Together. Grow Together. Inspire Each Other.

## Overview

Dawa is a free Islamic web platform focused on:
- Salah Tracking
- Accountability
- Daily Islamic Inspiration
- Community Support
- Habit Building
- Worship Analytics
- Spiritual Growth (Ruhaniah)

The MVP runs entirely on free-tier infrastructure.

## Recommended Free Stack

- **Frontend:** Next.js 14 + React + TypeScript
- **UI:** Tailwind CSS + custom Islamic gold theme + Framer Motion
- **Backend:** Next.js API Routes + Server Actions
- **ORM:** Prisma
- **Database:** Neon PostgreSQL (Free)
- **Authentication:** Session auth (JWT cookie)
- **Storage:** Vercel Blob (Free) — avatar uploads
- **Email:** Resend Free — OTP & transactional
- **Hosting:** Vercel
- **Charts:** Chart.js (react-chartjs-2)
- **Data Fetching:** SWR
- **Validation:** Zod
- **Logging:** Pino
- **Virtualization:** TanStack Virtual

## Core Features

### 1. Authentication & Profile
- Email + password registration and login
- Session-based auth with JWT cookies
- User profile with avatar, bio, location (city/country)
- Profile privacy controls (what others can see)
- Username-based public profiles (`/u/[username]`)
- Username availability checking
- Password reset via OTP (email-based)
- Account deletion with OTP verification
- Avatar upload & color-based fallback

### 2. Salah Tracking
- Weekly salah tracker with 5 prayers × 7 days
- Fard, Sunnah before, Sunnah after tracking
- On-time vs kaza vs missed classification
- Iman meter calculation (on-time prayers boost, kaza/missed lower)
- Prayer time awareness (prevents marking before wakt starts)
- Celebration confetti on completion
- Missed fard bead visualization (33 beads)
- Precomputed per-day stats (`UserSalahDayStat`) for fast reads
- Optimistic UI updates with cache invalidation

### 3. Dashboard & Statistics
- Hero statistics card (today, week, streak, lifetime, sunnah prayed, perfect days)
- Missed fard count with bead visualization
- Progress bar with lifetime completion rate
- Hijri calendar display
- Daily Islamic inspiration quotes
- Sun path arc showing prayer times visually
- Prayer insights with trend analysis & coaching tips
- Mood check-in tracking
- Wakt countdown clock in header

### 4. Analytics
- KPI cards (Iman meter, streak, week rate, lifetime rate)
- Iman meter line chart (14-day trend)
- Missed salah area chart (14-day overview)
- Wakt breakdown doughnut (on-time vs kaza vs missed)
- On-time bar chart (weekly)
- Mood history tracking
- Personal coaching tips

### 5. Friends & Brotherhood
- Friend system with connection requests
- Friend suggestions based on mutual connections
- Wakt board — live salah status of friends
- Virtualized friend list (TanStack Virtual) for smooth scrolling
- Precomputed wakt snapshots (`UserWaktSnapshot`) for fast board reads
- Snapshot refresh on salah change + stale-while-revalidate on read
- Gentle reminder (poke) system with cooldown
- Gold coin economy for wakt salah and dawah
- Badge tiers (Seedling → Scholar) based on coin balance
- Friend suggestions
- Username search with availability checking
- Public user profiles with prayer charts & insights

### 6. Notifications
- Real-time notification panel with unread count badge
- Notification types: connection requests, pokes, dawah reminders, wakt reminders, ruhaniah reminders
- Mark as read / mark all read
- Deduplication via `dedupeKey`

### 7. Ruhaniah (Spiritual Check-in)
Nightly spiritual check-in system with 4 input steps and 3 output sections.

#### Inputs:
- **Taqwa Pulse** — self-assessment slider (1-5: Ghaflah → Ihsan)
- **Fahm Test** — 3 random questions from 320-question bank (8 categories × 40 questions)
- **Barakah Meter** — rate 4 areas (Time, Rizq, Health, Heart) on 1-5 scale
- **Dua Log** — add new duas with categories (Rizq, Health, Relationships, Guidance, Forgiveness, Jannah, Dunya, Custom)

#### Outputs:
- **Quran Verse** — personalized verse from 300-verse pool, selected based on spiritual signals
- **Spiritual Weakness Analysis** — severity-ranked areas (critical/high/moderate) needing attention
- **Insights Dashboard** — Fahm Radar (8-axis), Taqwa Trend (30-day line), Barakah Trend (4-line), Dua Timeline

#### Fahm Categories:
| Category | Measures |
|----------|----------|
| QADR | Trust in destiny |
| TRUTH | Honesty & integrity |
| DAWAH | Sharing deen with others |
| NAFS | Self-control & desires |
| AKHIRAH | Focus on afterlife vs dunya |
| SABR_SHUKR | Patience & gratitude |
| ILM | Seeking Islamic knowledge |
| SOCIAL | Treating people well |

#### Verse Selection Engine:
Gathers spiritual signals from 7 sources → converts to semantic tags → scores 300 verses → selects best match.

**Signal Sources:**
1. Salah completion — `obedient`, `neglectful`, `needs_reminder`
2. Taqwa score — `heedless`, `distracted`, `conscious`, `present`
3. Fahm weakest category — `anxious`, `shy_deen`, `impatient`, `dunya_focused`
4. Barakah scores — `time_restricted`, `restless_heart`, `health_struggling`
5. Active duas — `waiting_many`, `needs_sabr`, `answered_dua`
6. Mood — `anxious`, `grateful`, `sad`
7. Prayer streak — `strong_streak`, `relapse`, `needs_hope`

### 8. Theming & UX
- 6 theme colors (Green, Blue, Gold, Purple, Silver, Pink)
- Dark & Light modes
- Framer Motion animations throughout
- Shimmer/skeleton loading states for all data-fetching components
- App preloader animation on first visit
- Responsive design (mobile-first)
- Accessibility: `prefers-reduced-motion` support, ARIA labels, screen reader text

### 9. SEO & Metadata
- JSON-LD structured data
- Dynamic sitemap
- Robots.txt
- Open Graph metadata
- PWA manifest

### 10. Settings
- Theme selection
- Account deletion (with OTP verification)
- Profile privacy matrix

## Data Files

| File | Content | Purpose |
|------|---------|---------|
| `public/data/ayah-pool.json` | 300 Quran verses | Verse selection for Ruhaniah |
| `public/data/fahm-questions.json` | 320 questions | Fahm psychometric test |
| `docs/FAHM_QUESTION_BANK.md` | Human-readable question bank | Reference for categories & scoring |

## Verse Pool Coverage (30 Tags)

The 300 verses cover 30 spiritual state tags:

```
answered_dua, anxious, conscious, consistent, control_seeking,
distracted, dunya_focused, grateful, health_struggling, heedless,
impatient, nafs_weak, needs_comfort, needs_courage, needs_hope,
needs_reminder, needs_sabr, needs_shukr, neglectful, obedient,
present, relapse, restless_heart, rizq_blessed, sad, shy_deen,
social_deen_weak, strong_streak, time_restricted, waiting_many
```

Each verse has:
- Arabic text
- English translation (Sahih International — public domain)
- Tafsir (explanation)
- Reflection template (personalized with user data)
- Dawah template (for sharing with others)
- Primary tags (worth 3 points in scoring)
- Secondary tags (worth 1 point in scoring)

## Database Schema

### Core Models
| Model | Purpose |
|-------|---------|
| `User` | Account with profile, theme, coins, privacy |
| `Session` | JWT session tokens |
| `SalahRecord` | Individual prayer records (Fard/Sunnah, on-time/kaza) |
| `UserSalahDayStat` | Precomputed daily stats for fast analytics |
| `UserWaktSnapshot` | Precomputed live wakt status for friends board |

### Social Models
| Model | Purpose |
|-------|---------|
| `Friendship` | Friend connections (pending/accepted) |
| `Poke` | Gentle reminders between friends |
| `Notification` | All notification types (with dedup) |

### Ruhaniah Models
| Model | Purpose |
|-------|---------|
| `TaqwaPulse` | Daily spiritual self-assessment (1-5) |
| `FahmQuestion` | Question bank (320 questions, 8 categories) |
| `FahmResponse` | User's Fahm test answers |
| `UserFahmProfile` | Aggregated Fahm scores, trends, strongest/weakest |
| `BarakahLog` | Daily barakah ratings (Time, Rizq, Health, Heart) |
| `DuaEntry` | Personal duas with status (Waiting, Answered, Stored) |
| `RuhaniahVerse` | Daily personalized Quran verse & reflection |

### Other Models
| Model | Purpose |
|-------|---------|
| `MoodCheckIn` | Daily mood tracking |
| `AccountDeletionOtp` | OTP for account deletion |
| `PasswordResetOtp` | OTP for password reset |

## Shimmer Loading System

All data-fetching components use skeleton placeholders while loading:

| Component | Shimmer Type |
|-----------|-------------|
| HeroStats | Hero number, subtitle, stream values, beads, progress bar |
| PrayerInsights | Chart placeholders, gauge value |
| SalahTracker | Table grid with prayer rows |
| ProfilePrayerCharts | All 4 chart types |
| AnalyticsHub | KPI cards, dynamic import fallbacks |
| NotificationPanel | Notification list items |
| ManageConnections | Connection list items |
| FriendsHub | Hero section, friends list |
| PublicUserProfile | Profile card, stat grid |
| UsernameSearch | Search result rows |
| AppLayoutClient | Full page skeleton |

## Performance Optimizations

- Precomputed `UserSalahDayStat` — avoids recalculation on every analytics read
- Precomputed `UserWaktSnapshot` — avoids prayer-time API calls per friend on board read
- Optimistic UI updates for salah marking
- Parallel database operations where possible
- SWR cache invalidation on mutations
- Virtualized lists for large friend lists (TanStack Virtual)
- Batched friend queries with pagination (cursor-based)

## Long-term Vision

- Flutter mobile app
- Family circles
- Qibla finder
- Mosque locator
- Zakat calculator
- Study groups
- AI-powered Islamic assistant with references
