# DAWA — Business Requirements Document (BRD)

## Version 4.0 (Free Infrastructure Edition)

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

The MVP is designed to run entirely on free-tier infrastructure.

## Recommended Free Stack

- **Frontend:** Next.js + React + TypeScript
- **UI:** Tailwind CSS + custom Islamic gold theme + Framer Motion
- **Backend:** Next.js API Routes + Server Actions
- **ORM:** Prisma
- **Database:** Neon PostgreSQL (Free)
- **Authentication:** Session auth (JWT cookie)
- **Storage:** Cloudinary Free
- **Email:** Resend Free
- **Hosting:** Vercel
- **Cron Jobs:** Vercel Cron
- **Charts:** Chart.js (react-chartjs-2)
- **Data Fetching:** SWR

## Core Features

### 1. Authentication & Profile
- Email + password registration and login
- Session-based auth with JWT cookies
- User profile with avatar, bio, location
- Profile privacy controls (what others can see)
- Username-based public profiles

### 2. Salah Tracking
- Weekly salah tracker with 5 prayers × 7 days
- Fard, Sunnah before, Sunnah after tracking
- On-time vs kaza vs missed classification
- Iman meter calculation (on-time prayers boost, kaza/missed lower)
- Prayer time awareness (prevents marking before wakt starts)
- Celebration confetti on completion

### 3. Dashboard & Statistics
- Hero statistics card (today, week, streak, lifetime)
- Missed fard count with bead visualization
- Progress bar with lifetime completion rate
- Hijri calendar display
- Daily Islamic inspiration quotes
- Sun path arc showing prayer times visually
- Prayer insights with trend analysis

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
- Wakt board — live salah status of friends
- Gentle reminder (poke) system with dawah coins
- Gold coin economy for wakt salah and dawah
- Badge tiers (Seedling → Scholar)
- Friend suggestions
- Username search

### 6. Notifications
- Real-time notification panel
- Notification types: connection requests, pokes, reminders
- Mark as read / mark all read
- Unread count badge

### 7. Ruhaniah (Spiritual Check-in)
Nightly spiritual check-in system with 4 input steps and 2 output sections.

#### Inputs:
- **Taqwa Pulse** — self-assessment slider (1-5: Ghaflah → Ihsan)
- **Fahm Test** — 3 random questions from 320-question bank (8 categories × 40 questions)
- **Barakah Meter** — rate 4 areas (Time, Rizq, Health, Heart) on 1-5 scale
- **Dua Log** — add new duas with categories

#### Outputs:
- **Quran Verse** — personalized verse from 300-verse pool, selected based on spiritual signals
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

### 8. Theming & UX
- 6 theme colors (Green, Blue, Gold, Purple, Silver, Pink)
- Dark & Light modes
- Framer Motion animations throughout
- Shimmer/skeleton loading states for all data-fetching components
- Responsive design (mobile-first)
- Accessibility: `prefers-reduced-motion` support, ARIA labels, screen reader text

### 9. Settings
- Theme selection
- Account deletion
- Profile privacy matrix

## Data Files

| File | Content | Purpose |
|------|---------|---------|
| `public/data/ayah-pool.json` | 300 Quran verses | Verse selection for Ruhaniah |
| `public/data/fahm-questions.json` | 320 questions | Fahm psychometric test |

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

## Long-term Vision

- Flutter mobile app
- Family circles
- Qibla finder
- Mosque locator
- Zakat calculator
- Study groups
- AI-powered Islamic assistant with references
