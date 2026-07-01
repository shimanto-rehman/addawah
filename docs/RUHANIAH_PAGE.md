# Ruhaniah — The Inner Deen Suite

**Page Name:** Ruhaniah (روحانية) — meaning "Spirituality / Inner Dimensions of Deen"

**Tagline:** *"Five minutes with your soul. Every night."*

**Route:** `/ruhaniah`

---

## Purpose

Ruhaniah is a nightly spiritual check-in page — designed to take exactly **5 minutes before sleep**. It helps the user reflect on the **inner dimensions** of their deen that no other app tracks: barakah perception, dua life, God-consciousness, personal Quranic reflection, and psychometric self-awareness.

The page is structured as a **guided 4-step nightly flow**, not a dashboard. Each step takes roughly 60–90 seconds. At the end, the user receives a **personalized Quranic ayah** — selected based on their prayer data, psychometric profile, barakah state, and taqwa pulse — to correct, motivate, and guide them toward dawah.

---

## Page Layout — Nightly Flow

```
┌─────────────────────────────────────────────────┐
│  RUHANIAH  —  روحانية                            │
│  "Five minutes with your soul. Every night."     │
│                                                  │
│  Step 1 of 4  ●○○○                              │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │                                          │    │
│  │   TAQWA PULSE                            │    │
│  │   "Right now, how aware are you of       │    │
│  │    Allah?"                               │    │
│  │                                          │    │
│  │   [ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]    │    │
│  │   Distracted → Fully Present             │    │
│  │                                          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│                          [ Next → ]              │
└─────────────────────────────────────────────────┘
```

After completing all 4 steps, the user sees their **Ruhaniah Verse** — a personalized Quranic ayah with tafsir context and a dawah-oriented reflection.

---

## Feature 1: Taqwa Pulse

**What it is:** A single-tap God-consciousness check-in.

**How it works:**
- At the start of the nightly flow, the user sees one question: *"Right now, how aware are you of Allah?"*
- They tap a level from 1 (distracted / heedless) to 5 (fully present / mushahadah)
- Over days and weeks, the app builds a **Taqwa Heat Map** — showing when and where the user is most/least God-conscious
- Patterns emerge: *"Your taqwa peaks after Isha but drops on weekend mornings"* or *"You are most aware of Allah on Mondays (sunnah day)"*

**Data stored:**
```
TaqwaPulse {
  id, userId, date, score (1-5), createdAt
}
```

**Insights shown on the page:**
- Current streak of taqwa check-ins
- Weekly average taqwa score
- A small sparkline showing the last 7 days
- Pattern insight (if enough data): "You've been most present after Fajr this week"

**Visual:**
- A glowing circle that fills based on score — dim (1) to radiant (5)
- Over time, a heat map calendar (like GitHub contributions but golden tones)

---

## Feature 2: Psychometric Deen Test (Fahm Test — فهم)

**What it is:** A daily 3-question psychometric assessment from a pool of 300+ carefully crafted questions. Not right/wrong — but observational, testing how the user perceives life, truth, and reality through the lens of Quran and deen.

**Name:** Fahm Test (فهم — Understanding / Comprehension)

**How it works:**
- Every night, 3 questions are randomly selected from a pool of 300+
- Questions are **not factual (fiqh/quiz)** — they are **situational, reflective, and perceptual**
- There are no absolute right answers — but answer patterns reveal how connected the user's worldview is to the Quran's absolute truth
- Questions rotate so the user rarely sees the same question within 60 days
- Answers are scored on a spectrum (e.g., 1–5 Likert or multiple choice with weighted values)

**Question Categories (50+ questions each, 300+ total):**

1. **Qadr Perception (قدر)** — How do you interpret events in your life?
   - *"When something bad happens to you, your first thought is:"*
     - A) "Why me? What did I do wrong?" (guilt-focused)
     - B) "This is random, things just happen." (secular)
     - C) "Allah is testing me — there's wisdom here." (tawakkul)
     - D) "I need to fix this immediately." (control-focused)

2. **Truth Anchoring (حق)** — How do you relate to absolute truth vs. relative opinion?
   - *"When two people disagree, you believe:"*
     - A) Both sides have equal truth (relativism)
     - B) Truth exists but is hard to find (seeking)
     - C) Only Allah knows the full truth (tawadu)
     - D) The more knowledgeable person is right (authority)

3. **Dawah Readiness (دعوة)** — How do you see your role in guiding others?
   - *"If a non-Muslim friend asks 'Why do you pray?', you would:"*
     - A) Feel uncomfortable and change the topic
     - B) Give a logical, rational explanation
     - C) Share how salah makes you feel personally
     - D) Invite them to try it with you once

4. **Nafs Awareness (نفس)** — How well do you know your own spiritual state?
   - *"When you feel lazy about salah, the real reason is usually:"*
     - A) I'm genuinely tired
     - B) Salah doesn't feel meaningful right now
     - C) I know I should but I keep delaying
     - D) I haven't thought about why

5. **Akhirah Orientation (آخرة)** — How much does the unseen world influence your decisions?
   - *"When making a big life decision, what weighs most?"*
     - A) Financial security (dunya)
     - B) Family approval (social)
     - C) Whether it pleases Allah (akhirah)
     - D) What feels right emotionally (nafs)

6. **Sabr & Shukr (صبر وشكر)** — How do you respond to ease and hardship?
   - *"You got promoted at work. Your internal reaction is:"*
     - A) I deserve this — I worked hard (nafs)
     - B) Alhamdulillah — Allah gave this (shukr)
     - C) Hope it lasts (anxiety)
     - D) Now I can buy what I wanted (dunya-focus)

7. **Ilm Attitude (علم)** — How do you relate to Islamic knowledge?
   - *"The last time you learned something new about Islam was:"*
     - A) This week (active seeker)
     - B) This month (occasional)
     - C) Can't remember (disconnected)
     - D) I learn from life, not books (passive)

8. **Social Deen (معاملات)** — How does your deen manifest in dealings?
   - *"A shopkeeper gives you extra change by mistake. You:"*
     - A) Keep it — their mistake (opportunistic)
     - B) Feel guilty but keep it (conflicted)
     - C) Return it immediately (taqwa)
     - D) Return it only if they notice (conditional)

**Scoring System:**
- Each answer is weighted on a **Quranic Alignment Scale (QAS)** from 1-5
- 1 = furthest from Quranic worldview
- 5 = most aligned with Quranic truth
- The app does NOT tell the user "you got 3/5" — instead it tracks the **pattern**
- Over 30 days (90 questions), the app builds a **Fahm Profile** showing:
  - Strongest dimension (e.g., "Your Qadr perception is deeply rooted")
  - Weakest dimension (e.g., "Your Akhirah orientation needs reflection")
  - Overall trajectory (improving / stable / declining)

**Data stored:**
```
FahmQuestion {
  id, category, text, options (JSON), weights (JSON), difficulty
}

FahmResponse {
  id, userId, date, questionId, answerIndex, weight, createdAt
}

FahmProfile (computed/cached) {
  userId, categoryScores (JSON), overallQAS, strongest, weakest, trend, updatedAt
}
```

---

## Feature 3: Barakah Meter (بركة)

**What it is:** A nightly reflection on where the user feels barakah (blessing) in their life.

**How it works:**
- The user rates their perceived barakah in 4 life areas for the day:
  - **Time** — Did your day feel blessed / productive or wasted?
  - **Rizq** — Did your sustenance feel abundant or restricted?
  - **Health** — Did your body feel energized or drained?
  - **Heart** — Did your heart feel at peace or restless?
- Each is rated 1 (restricted) to 5 (abundant)
- Over time, the app correlates barakah scores with:
  - Prayer consistency (did salah on time → higher time barakah?)
  - Sin avoidance (logged struggle → lower heart barakah?)
  - Sadaqah/generosity → rizq barakah patterns
  - Tahajjud/Qiyam → overall barakah spikes

**Insights shown:**
- Today's barakah snapshot (4 mini-circles)
- Weekly barakah trend
- Correlation insights (after 2+ weeks of data):
  - *"Your time barakah was highest on days you prayed Fajr on time"*
  - *"Heart barakah drops when you skip Quran for 3+ days"*
  - *"Rizq barakah spiked the week you increased sadaqah"*

**Data stored:**
```
BarakahLog {
  id, userId, date, timeScore, rizqScore, healthScore, heartScore, createdAt
}
```

**Visual:**
- 4 interconnected circles — when all are high, they merge into a glowing unified ring (barakah overflow)
- A timeline showing barakah trends alongside prayer completion

---

## Feature 4: Dua Graveyard & Garden (دعاء)

**What it is:** A private dua tracker — log what you ask Allah, and track the response.

**How it works:**
- The user logs a dua with:
  - Text (what they asked for)
  - Category: Rizq / Health / Relationships / Guidance / Forgiveness / Jannah / Dunya / Custom
  - Date started
  - Optional: context (what prompted this dua)
- Over time, the user updates the status:
  - **Answered as asked** 🌸 — Allah gave exactly what you asked
  - **Answered differently** 🌿 — Allah gave something better / redirected
  - **Still waiting** 🕰️ — Trusting the timing
  - **Stored for Akhirah** ✨ — Reframed: not rejected, saved for the eternal life
- The **Garden** shows answered duas with gratitude prompts
- The **Graveyard** shows long-unanswered duas — but reframed with hope:
  - *"This dua isn't dead — it's planted. On the Day of Judgment, you'll wish NONE of your duas were answered in the dunya."* (Hadith concept)

**Insights shown:**
- Total duas logged
- Answer rate: *"Allah responded to 68% of your duas — 40% differently than expected"*
- Category breakdown: *"Most of your duas are about guidance — your heart is in the right place"*
- Longest waiting dua + encouragement hadith
- **The Surprise:** The app reminds users of duas they forgot they made — small ones from months ago that were quietly answered

**Data stored:**
```
DuaEntry {
  id, userId, text, category, status (ANSWERED_SAME / ANSWERED_DIFFERENT / WAITING / STORED_AKHIRAH),
  context, dateStarted, dateResolved, createdAt, updatedAt
}
```

**Visual:**
- A garden that grows — each answered dua adds a flower/tree
- A peaceful graveyard with stars for stored duas
- A timeline of dua → response

---

## The Ruhaniah Verse (Personalized Quranic Ayah)

**What it is:** After completing all 4 steps, the user receives a **single personalized Quranic ayah** — selected by the system based on their complete spiritual snapshot.

**How it's selected:**
The system considers ALL of the user's data to pick the most relevant ayah:

| Input Signal | What It Reveals | Ayah Direction |
|---|---|---|
| Today's prayer completion | Obedience level | Reminder vs. encouragement |
| Taqwa Pulse score | Current God-consciousness | Tafakkur (reflection) ayahs |
| Fahm Test weakest category | Where worldview is off | Corrective ayahs |
| Barakah scores | Where life feels restricted | Promise of barakah ayahs |
| Dua status (if many waiting) | Patience/tawakkul level | Sabr ayahs |
| Mood check-in | Emotional state | Comfort vs. motivation |
| Streak data | Consistency vs. relapse | Hope vs. urgency |

**Ayah Pool:** 200+ ayahs tagged by situation, mood, struggle, and strength. Each ayah comes with:
- Arabic text
- Translation
- Brief tafsir context (2-3 lines)
- A **personal reflection prompt** tied to their data
- A **dawah connection** — how this ayah can be shared with others

**Example flow:**
```
Today's snapshot:
- Prayed 3/5 fard (missed Asr, Maghrib)
- Taqwa pulse: 2/5 (distracted)
- Fahm weakest: Akhirah orientation
- Barakah: Time 2/5, Heart 3/5
- Mood: Anxious

Selected Ayah:
"Indeed, in the creation of the heavens and earth, and the alternation
of night and day, are signs for those of understanding."
— Aal-E-Imran 3:190

Reflection: "Your time barakah is low and your taqwa was distracted today.
This ayah invites you to LOOK — to find Allah in the patterns of your day.
Tonight before sleep, spend 2 minutes watching the sky. Let it remind you:
this life is temporary, and every missed salah is a missed meeting with
the One who created all of this — for you."

Dawah connection: "Share this ayah with someone who feels life is random.
The signs are everywhere — they just need someone to point at them."
```

**Data stored:**
```
RuhaniahVerse {
  id, userId, date, ayahRef (surah:ayah), reflectionText, dawahText,
  signals (JSON — snapshot of all inputs used), createdAt
}
```

---

## Nightly Flow — Complete UX

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🌙 RUHANIAH — روحانية                              │
│   "Five minutes with your soul. Every night."       │
│                                                     │
│   ─────────────────────────────────────────────     │
│                                                     │
│   Step 1 ● ○ ○ ○        TAQWA PULSE                │
│                                                     │
│   "Right now, how aware are you of Allah?"          │
│                                                     │
│   ○ 1      ○ 2      ○ 3      ○ 4      ○ 5          │
│   Distracted    Neutral    Present                   │
│                                                     │
│                              [ Next → ]             │
│   ─────────────────────────────────────────────     │
│   Takes ~30 seconds                                 │
└─────────────────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────────────────┐
│   Step 2 ● ● ○ ○        FAHM TEST                  │
│                                                     │
│   Q: "When something unexpected happens, your       │
│       first instinct is to..."                      │
│                                                     │
│   ○ A) Look for the logical cause                   │
│   ○ B) Ask 'What is Allah teaching me?'             │
│   ○ C) Feel anxious about what's next               │
│   ○ D) Accept it and move on                        │
│                                                     │
│   [ ← Back ]                  [ Next → ]            │
│   ─────────────────────────────────────────────     │
│   3 questions · ~90 seconds                         │
└─────────────────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────────────────┐
│   Step 3 ● ● ● ○        BARAKAH METER              │
│                                                     │
│   "How did barakah feel in your life today?"        │
│                                                     │
│   ⏰ Time    ●●●○○  (3/5 — decent day)              │
│   💰 Rizq    ●●●●○  (4/5 — felt abundant)           │
│   💚 Health  ●●○○○  (2/5 — low energy)              │
│   🤍 Heart   ●●●●●  (5/5 — deep peace)              │
│                                                     │
│   [ ← Back ]                  [ Next → ]            │
│   ─────────────────────────────────────────────     │
│   Takes ~45 seconds                                 │
└─────────────────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────────────────┐
│   Step 4 ● ● ● ●        DUA LOG                    │
│                                                     │
│   "Any dua you want to log tonight?"                │
│                                                     │
│   [ + Add a new dua ]                               │
│                                                     │
│   ┌─ Your Active Duas ─────────────────────────┐   │
│   │ 🕰️  Guidance for my parents        (12 days)│   │
│   │ 🕰️  Help me wake for Tahajjud      (5 days) │   │
│   │ 🌸  Job interview — Alhamdulillah! (answered)│   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   [ Skip ]                    [ Finish → ]          │
│   ─────────────────────────────────────────────     │
│   Takes ~30 seconds                                 │
└─────────────────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────────────────┐
│                                                     │
│   ✨ YOUR RUHANIAH VERSE TONIGHT ✨                  │
│                                                     │
│   بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ             │
│                                                     │
│   "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا    │
│    وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ"          │
│                                                     │
│   "Whoever fears Allah, He will make for him        │
│    a way out, and provide from where he             │
│    does not expect."                                │
│   — At-Talaq 65:2-3                                 │
│                                                     │
│   ┌─ Reflection ──────────────────────────────┐    │
│   │ Your rizq barakah is strong (4/5) but your │    │
│   │ time barakah is low. You're blessed in      │    │
│   │ sustenance but struggling with focus.        │    │
│   │ Taqwa (fear/awareness of Allah) is the      │    │
│   │ key — not more hours. Prioritize your        │    │
│   │ salah quality over quantity of tasks.        │    │
│   └────────────────────────────────────────────┘    │
│                                                     │
│   ┌─ Dawah Moment ────────────────────────────┐    │
│   │ Someone around you is anxious about rizq.   │    │
│   │ Share this ayah with them this week.         │    │
│   │ Your testimony — that Allah provided for     │    │
│   │ you when you least expected — is dawah.      │    │
│   └────────────────────────────────────────────┘    │
│                                                     │
│            [ 🤲 Close with Du'a ]                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema Additions

```prisma
model TaqwaPulse {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime @db.Date
  score     Int      // 1-5
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
}

model FahmQuestion {
  id       String @id @default(cuid())
  category String // QADR, TRUTH, DAWAH, NAFS, AKHIRAH, SABR_SHUKR, ILM, SOCIAL
  text     String
  options  Json   // [{text, weight}]
  active   Boolean @default(true)
  createdAt DateTime @default(now())

  @@index([category, active])
}

model FahmResponse {
  id          String   @id @default(cuid())
  userId      String
  date        DateTime @db.Date
  questionId  String
  answerIndex Int
  weight      Int      // QAS weight for this answer
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  question    FahmQuestion @relation(fields: [questionId], references: [id])

  @@unique([userId, date, questionId])
  @@index([userId, date])
}

model BarakahLog {
  id          String   @id @default(cuid())
  userId      String
  date        DateTime @db.Date
  timeScore   Int      // 1-5
  rizqScore   Int      // 1-5
  healthScore Int      // 1-5
  heartScore  Int      // 1-5
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
}

model DuaEntry {
  id           String   @id @default(cuid())
  userId       String
  text         String
  category     String   // RIZQ, HEALTH, RELATIONSHIPS, GUIDANCE, FORGIVENESS, JANNAH, DUNYA, CUSTOM
  status       String   @default("WAITING") // ANSWERED_SAME, ANSWERED_DIFFERENT, WAITING, STORED_AKHIRAH
  context      String?
  dateStarted  DateTime @db.Date
  dateResolved DateTime? @db.Date
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([userId, dateStarted])
}

model RuhaniahVerse {
  id             String   @id @default(cuid())
  userId         String
  date           DateTime @db.Date
  ayahRef        String   // e.g., "65:2-3"
  reflectionText String
  dawahText      String
  signals        Json     // snapshot of all input signals used
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
}
```

---

## Ayah Selection Algorithm (Pseudocode)

```typescript
function selectRuhaniahVerse(userId: string): AyahSelection {
  // 1. Gather all signals
  const todaySalah = getSalahCompletion(userId, today)
  const taqwaScore = getTaqwaPulse(userId, today)
  const fahmProfile = getFahmProfile(userId) // weakest category
  const barakah = getBarakahLog(userId, today)
  const activeDuas = getActiveDuas(userId)
  const mood = getMoodCheckIn(userId, today)
  const streak = getStreakData(userId)

  // 2. Build situation tags
  const tags: string[] = []

  // Prayer-based tags
  if (todaySalah.completed >= 4) tags.push('obedient', 'consistent')
  if (todaySalah.completed <= 2) tags.push('neglectful', 'needs_reminder')
  if (streak.current > 30) tags.push('strong_streak')
  if (streak.broken) tags.push('relapse', 'needs_hope')

  // Taqwa-based tags
  if (taqwaScore <= 2) tags.push('heedless', 'distracted')
  if (taqwaScore >= 4) tags.push('conscious', 'present')

  // Fahm-based tags (weakest category)
  if (fahmProfile.weakest === 'AKHIRAH') tags.push('dunya_focused')
  if (fahmProfile.weakest === 'QADR') tags.push('anxious', 'control_seeking')
  if (fahmProfile.weakest === 'DAWAH') tags.push('shy_deen', 'needs_courage')
  if (fahmProfile.weakest === 'SABR_SHUKR') tags.push('impatient')

  // Barakah-based tags
  if (barakah.timeScore <= 2) tags.push('time_restricted')
  if (barakah.rizqScore >= 4) tags.push('rizq_blessed')
  if (barakah.heartScore <= 2) tags.push('restless_heart')

  // Dua-based tags
  if (activeDuas.waiting > 5) tags.push('waiting_many', 'needs_sabr')
  if (activeDuas.recentlyAnswered) tags.push('answered_dua', 'needs_shukr')

  // Mood-based tags
  if (mood === 'anxious') tags.push('anxious')
  if (mood === 'grateful') tags.push('grateful')
  if (mood === 'sad') tags.push('needs_comfort')

  // 3. Match against ayah pool
  // Ayah pool: 200+ ayahs, each tagged with situation/mood/struggle
  // Weighted scoring: primary tag match = 3 points, secondary = 1
  // Recently shown ayahs get -10 penalty (avoid repetition)
  // Ayahs matching dawah-readiness from Fahm get +2 bonus

  const scored = ayahPool.map(ayah => ({
    ayah,
    score: tags.reduce((sum, tag) =>
      sum + (ayah.tags.includes(tag) ? 3 : 0) +
            (ayah.secondaryTags.includes(tag) ? 1 : 0), 0) +
      (ayah.dawahTags.includes(fahmProfile.strongest) ? 2 : 0) -
      (recentlyShown.has(ayah.ref) ? 10 : 0)
  }))

  // 4. Pick top-scored, with slight randomization among top 5
  scored.sort((a, b) => b.score - a.score)
  const top5 = scored.slice(0, 5)
  return weightedRandom(top5)
}
```

---

## Key Design Principles

1. **5 minutes max** — Respect the user's time. Every interaction is tap-based, not text-heavy.
2. **Nightly ritual** — The page is designed for end-of-day, before sleep. It's a wind-down, not a morning task.
3. **No guilt** — Missed prayers are acknowledged, not shamed. The tone is always encouraging.
4. **Private by default** — Fahm answers, dua entries, and taqwa scores are NEVER shared with friends. This is between the user and Allah.
5. **Progressive depth** — New users get simple questions and generic ayahs. Over weeks, the system learns their patterns and gives increasingly personalized reflections.
6. **Dawah-oriented** — Every ayah ends with a dawah connection. The goal is not just self-improvement but becoming a light for others.
7. **Quran-centric** — The final output is always a Quranic ayah. Not hadith, not quotes — the direct word of Allah. This is the app's spiritual anchor.

---

## Technical Architecture — Free-Tier Scaling Strategy

### Infrastructure Constraints

| Resource | Provider | Free Tier Limit |
|---|---|---|
| Hosting | Vercel | 100GB bandwidth, 1000 fn invocations/day |
| Database | Neon PostgreSQL | 512MB storage, 191.9h compute/month (auto-suspend after 5min idle) |
| Edge Cache | Vercel Edge Cache | Unlimited reads (CDN-cached) |
| Cron | Vercel Cron | 2 jobs on free tier |

**Core challenge:** Neon free tier has **cold start** (~500ms–1.5s) after 5min idle and limited compute hours. Every DB query must be justified. The entire Ruhaniah system must work with **≤3 DB queries per nightly flow** (all 4 steps + verse).

---

### Strategy 1: Single Atomic Write — One API Call for All 4 Steps

**Problem:** 4 steps = 4 writes would burn 4 DB round-trips + 4 serverless invocations.

**Solution:** The entire nightly flow is submitted as **one POST request** at the end. Steps 1–4 are collected client-side, then sent together.

```typescript
// POST /api/ruhaniah
// Body: { taqwaScore, fahmResponses, barakahScores, duaEntries }
// One transaction, one DB round-trip

export async function POST(req: Request) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const body = await req.json();
  const today = startOfDay(new Date());

  // Validate all inputs first (no DB hit)
  const taqwaScore = validateTaqwa(body.taqwaScore);
  const fahmResponses = validateFahmResponses(body.fahmResponses); // 3 items
  const barakah = validateBarakah(body.barakahScores);
  const duas = validateDuas(body.duaEntries);

  // Single transaction — all or nothing
  await prisma.$transaction([
    // 1. Taqwa pulse
    prisma.taqwaPulse.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      create: { userId: user.id, date: today, score: taqwaScore },
      update: { score: taqwaScore },
    }),
    // 2. Fahm responses (3 questions)
    ...fahmResponses.map(r =>
      prisma.fahmResponse.upsert({
        where: { userId_date_questionId: { userId: user.id, date: today, questionId: r.questionId } },
        create: { userId: user.id, date: today, questionId: r.questionId, answerIndex: r.answerIndex, weight: r.weight },
        update: { answerIndex: r.answerIndex, weight: r.weight },
      })
    ),
    // 3. Barakah log
    prisma.barakahLog.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      create: { userId: user.id, date: today, ...barakah },
      update: barakah,
    }),
    // 4. Dua entries (only new ones — client sends only new duas)
    ...duas.map(d =>
      prisma.duaEntry.create({ data: { userId: user.id, ...d, dateStarted: today } })
    ),
  ]);

  // 5. Select and return verse (precomputed or computed on-demand)
  const verse = await getOrComputeVerse(user.id, today);
  return jsonOk({ verse, saved: true });
}
```

**DB cost:** 1 transaction = 1 connection = 1 compute-hour deduction. Neon handles this efficiently.

---

### Strategy 2: Fahm Questions — Cached at Edge, Scored Client-Side

**Problem:** 320 questions in DB would mean a DB query to fetch 3 random questions every night.

**Solution:** Questions are **baked into the client bundle** as a static JSON file. Selection and scoring happen entirely in the browser.

```
lib/fahm-questions.json  (static, ~120KB gzipped ~30KB)
├── Imported at build time by Next.js
├── Shipped as part of the JS bundle
├── Client filters out recently-seen questions (localStorage)
├── Client picks 3 random questions
├── Client computes weights locally
└── Only the final { questionId, answerIndex, weight } is sent to server
```

**DB cost for Fahm:** ZERO queries on read. Only the write (part of the atomic POST).

**Question rotation without DB:**
```typescript
// Client-side: track seen questions in localStorage
const SEEN_KEY = 'fahm_seen_v1';
const MAX_HISTORY = 120; // keep last 120 question IDs (40 days worth)

function getTodaysQuestions(): FahmQuestion[] {
  const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  const available = ALL_QUESTIONS.filter(q => !seen.has(q.id));

  // If pool exhausted, reset (user has seen all 320+)
  if (available.length < 3) {
    localStorage.setItem(SEEN_KEY, '[]');
    return pickRandom(ALL_QUESTIONS, 3);
  }

  const selected = pickRandom(available, 3);

  // Update seen history
  const newSeen = [...seen, ...selected.map(q => q.id)].slice(-MAX_HISTORY);
  localStorage.setItem(SEEN_KEY, JSON.stringify(newSeen));

  return selected;
}
```

**No repeat questions for 40+ days — zero DB cost.**

---

### Strategy 3: Ruhaniah Verse — Precomputed via Vercel Cron

**Problem:** The verse selection algorithm needs multiple data points (salah, taqwa, fahm profile, barakah, duas, mood). Computing this on every page load = multiple DB queries.

**Solution:** Precompute each user's verse **once per day** via Vercel Cron at 8 PM (before typical bedtime). The page simply reads the cached result.

```
Vercel Cron Job: POST /api/internal/ruhaniah-verse
Schedule: "0 20 * * *" (8 PM daily, Asia/Dhaka)

Logic:
1. Fetch all active users (logged in within last 7 days)
2. For each user:
   a. Read today's salah records (1 query, already indexed)
   b. Read taqwa pulse (1 query)
   c. Read fahm profile (cached in UserRuhaniahProfile table — 1 query)
   d. Read barakah log (1 query)
   e. Read active duas count (1 query)
   f. Read mood check-in (1 query)
   g. Compute verse via tag matching
   h. Upsert into RuhaniahVerse table
3. Total: ~6 queries per user, batched in chunks of 50
```

**Optimization — Batch users:**
```typescript
// /api/internal/ruhaniah-verse (Vercel Cron)
export async function POST(req: Request) {
  // Verify cron secret
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const activeUsers = await prisma.user.findMany({
    where: {
      sessions: { some: { expiresAt: { gte: new Date() } } },
    },
    select: { id: true },
  });

  // Process in batches of 50 to avoid Neon connection limits
  for (let i = 0; i < activeUsers.length; i += 50) {
    const batch = activeUsers.slice(i, i + 50);
    await Promise.all(batch.map(u => computeAndStoreVerse(u.id)));
  }

  return jsonOk({ processed: activeUsers.length });
}
```

**On the page:** Read the precomputed verse — **1 DB query**:
```typescript
// GET /api/ruhaniah/verse
const verse = await prisma.ruhaniahVerse.findUnique({
  where: { userId_date: { userId: user.id, date: today } },
});
// If null (new user or cron missed), compute on-demand as fallback
```

**Total nightly flow DB cost: 2 queries** (1 read verse + 1 write all 4 steps).

---

### Strategy 4: Fahm Profile — Materialized Summary Table

**Problem:** Computing a user's Fahm profile from raw responses requires scanning 90+ rows and aggregating by category.

**Solution:** A **materialized summary** table that updates after each nightly submission.

```prisma
model UserFahmProfile {
  userId          String   @id
  totalQuestions  Int      @default(0)
  categoryScores  Json     @default("{}")  // { QADR: 3.2, TRUTH: 2.8, ... }
  overallQAS      Float    @default(0)     // weighted average
  strongest       String?                  // category name
  weakest         String?                  // category name
  trend           String   @default("NEW") // IMPROVING, STABLE, DECLINING, NEW
  updatedAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Updated in the same transaction** as the nightly POST:
```typescript
// After inserting fahm responses, recompute profile
const allResponses = await prisma.fahmResponse.groupBy({
  by: ['questionId'],
  where: { userId: user.id },
  // We need category info — join with question
});

// Simpler: fetch last 90 responses with question category
const recent = await prisma.fahmResponse.findMany({
  where: { userId: user.id },
  include: { question: { select: { category: true } } },
  orderBy: { date: 'desc' },
  take: 90,
});

const categoryScores = computeCategoryAverages(recent);
const profile = {
  totalQuestions: recent.length,
  categoryScores,
  overallQAS: Object.values(categoryScores).reduce((a, b) => a + b, 0) / Object.keys(categoryScores).length,
  strongest: Object.entries(categoryScores).sort(([,a], [,b]) => b - a)[0]?.[0],
  weakest: Object.entries(categoryScores).sort(([,a], [,b]) => a - b)[0]?.[0],
  trend: computeTrend(recent),
};

await prisma.userFahmProfile.upsert({
  where: { userId: user.id },
  create: { userId: user.id, ...profile },
  update: profile,
});
```

**This query runs ONLY when the user submits** (once per day). The verse precomputation reads the cached profile — no aggregation needed.

---

### Strategy 5: Barakah & Taqwa — Read Only Last 30 Days

**Problem:** Historical data grows unbounded. Queries get slower.

**Solution:** The app only ever needs the **last 30 days** of barakah and taqwa data for display. Queries are bounded.

```typescript
// Always query with a 30-day window
const thirtyDaysAgo = addDays(today, -30);

const [taqwaHistory, barakahHistory] = await Promise.all([
  prisma.taqwaPulse.findMany({
    where: { userId: user.id, date: { gte: thirtyDaysAgo } },
    orderBy: { date: 'desc' },
    select: { date: true, score: true },
  }),
  prisma.barakahLog.findMany({
    where: { userId: user.id, date: { gte: thirtyDaysAgo } },
    orderBy: { date: 'desc' },
    select: { date: true, timeScore: true, rizqScore: true, healthScore: true, heartScore: true },
  }),
]);
```

**Indexes cover this perfectly:**
```prisma
model TaqwaPulse {
  @@unique([userId, date])  // ← this index serves the query
}
model BarakahLog {
  @@unique([userId, date])  // ← same
}
```

No additional indexes needed. Neon can scan 30 rows in <1ms.

---

### Strategy 6: Dua Entries — Paginated, Lazy-Loaded

**Problem:** A user might accumulate 100+ duas over months.

**Solution:** Dua list is **not loaded during the nightly flow**. The step 4 Dua Log shows only:
- Active duas (status = WAITING) — capped at 10 most recent
- Recently answered (last 7 days) — capped at 5

Full dua history is on a separate `/ruhaniah/duas` page with pagination.

```typescript
// Lightweight query for nightly flow
const duas = await prisma.duaEntry.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: 'desc' },
  take: 15,
  select: { id: true, text: true, category: true, status: true, dateStarted: true },
});
```

---

### Strategy 7: Client-Side Caching with SWR

**Problem:** If the user refreshes the page mid-flow, we don't want redundant API calls.

**Solution:** Use the existing SWR dependency. All Ruhaniah data is fetched once and cached client-side.

```typescript
// hooks/useRuhaniah.ts
export function useRuhaniah() {
  return useSWR('/api/ruhaniah', fetcher, {
    revalidateOnFocus: false,    // don't refetch on tab switch
    revalidateOnReconnect: false, // don't refetch on reconnect
    dedupingInterval: 300000,     // dedupe for 5 minutes
    refreshInterval: 0,           // no polling — this isn't real-time data
  });
}
```

---

### Strategy 8: Vercel Edge Caching for Static Assets

**Problem:** The Fahm question JSON (120KB) and ayah pool JSON (80KB) are static but shipped with every page load.

**Solution:** Serve via `public/` with aggressive caching headers.

```
public/data/fahm-questions.json    ← CDN cached, immutable
public/data/ayah-pool.json         ← CDN cached, immutable
```

```typescript
// next.config.js
async headers() {
  return [
    {
      source: '/data/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ];
}
```

These files are versioned (e.g., `fahm-questions-v2.json`). When questions are added, bump the version — old cache expires naturally.

---

### Strategy 9: Neon Connection Pool Management

**Problem:** Neon free tier limits concurrent connections. Multiple users hitting Ruhaniah at 10 PM could exhaust the pool.

**Solution:** Singleton Prisma client (already in the app) + connection pooling via PgBouncer (Neon includes this).

```typescript
// lib/prisma.ts (likely already exists)
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

if (process.env.NODE_ENV === 'production') globalForPrisma.prisma = prisma;
```

**Plus:** The `$transaction` in Strategy 1 uses a single connection for all writes — no connection leak.

---

### Strategy 10: Graceful Degradation — Fallbacks When Precomputed Verse is Missing

**Problem:** Cron might fail. New users don't have a precomputed verse.

**Solution:** The API endpoint has a fallback chain:

```typescript
async function getOrComputeVerse(userId: string, date: Date): Promise<RuhaniahVerse> {
  // 1. Try precomputed verse (1 query, indexed)
  const cached = await prisma.ruhaniahVerse.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (cached) return cached;

  // 2. Fallback: compute on-demand (expensive, but rare)
  return await computeAndStoreVerse(userId);
}
```

For brand-new users with <7 days of data, the system uses a **default pool** of universally relevant ayahs — no personalization needed yet.

---

### Strategy 11: Batch Write Optimization — Neon-Safe Transactions

**Problem:** Neon free tier has a 191.9 compute-hour limit per month. Long transactions burn hours.

**Solution:** Keep transactions under 50ms by:
1. Writing only **today's data** (no historical updates)
2. Using `upsert` (avoids read-then-write)
3. Batching all writes into a single `$transaction`
4. Deferring Fahm profile recomputation to a **background step** (not blocking the response)

```typescript
// POST /api/ruhaniah — simplified flow
await prisma.$transaction([
  // All upserts in one shot — ~20ms total on Neon
  prisma.taqwaPulse.upsert(...),
  prisma.fahmResponse.upsert(...),  // ×3
  prisma.barakahLog.upsert(...),
  prisma.duaEntry.create(...),       // ×N (only new duas)
]);

// Fahm profile recomputation — fire-and-forget (not blocking response)
computeFahmProfileAsync(userId).catch(console.error);

// Return verse immediately
const verse = await getOrComputeVerse(userId, today);
return jsonOk({ verse });
```

The Fahm profile update runs **after** the response is sent. If it fails, it'll be recomputed next time — no data loss.

---

### Total DB Cost Per Nightly Flow

| Operation | Queries | Compute Time |
|---|---|---|
| Read precomputed verse | 1 | ~5ms |
| Write all 4 steps (transaction) | 1 transaction (7 upserts) | ~20ms |
| Fahm profile recompute (async) | 1 read + 1 upsert | ~15ms |
| **Total** | **3** | **~40ms** |

For 1000 daily active users at 10 PM:
- 3000 queries in ~1 hour
- Neon free tier: 191.9 hours = **enough for 64x that**
- Vercel invocations: 1000/day = **well within 1000 limit** (one POST per user)

---

### Strategy 12: Database Schema — Final Optimized Version

```prisma
// ─── Ruhaniah Tables ───

model TaqwaPulse {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime @db.Date
  score     Int      // 1-5
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])   // 1 row per user per day
  @@index([userId, date])    // covered by unique, explicit for clarity
}

model FahmQuestion {
  id       String  @id @default(cuid())
  category String  // QADR, TRUTH, DAWAH, NAFS, AKHIRAH, SABR_SHUKR, ILM, SOCIAL
  text     String
  options  Json    // [{text, weight}]
  active   Boolean @default(true)
  createdAt DateTime @default(now())

  @@index([category, active])  // for admin queries only — client reads from static JSON
}

model FahmResponse {
  id          String   @id @default(cuid())
  userId      String
  date        DateTime @db.Date
  questionId  String
  answerIndex Int
  weight      Int      // QAS weight (1-4)
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  question    FahmQuestion @relation(fields: [questionId], references: [id])

  @@unique([userId, date, questionId])  // prevents duplicate answers
  @@index([userId, date])               // for daily reads
  @@index([userId, createdAt])          // for profile computation (last 90)
}

model UserFahmProfile {
  userId         String   @id
  totalQuestions Int      @default(0)
  categoryScores Json     @default("{}")  // { QADR: 3.2, TRUTH: 2.8, ... }
  overallQAS     Float    @default(0)
  strongest      String?
  weakest        String?
  trend          String   @default("NEW") // IMPROVING, STABLE, DECLINING, NEW
  updatedAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model BarakahLog {
  id          String   @id @default(cuid())
  userId      String
  date        DateTime @db.Date
  timeScore   Int      // 1-5
  rizqScore   Int      // 1-5
  healthScore Int      // 1-5
  heartScore  Int      // 1-5
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
}

model DuaEntry {
  id           String    @id @default(cuid())
  userId       String
  text         String
  category     String    // RIZQ, HEALTH, RELATIONSHIPS, GUIDANCE, FORGIVENESS, JANNAH, DUNYA, CUSTOM
  status       String    @default("WAITING") // ANSWERED_SAME, ANSWERED_DIFFERENT, WAITING, STORED_AKHIRAH
  context      String?
  dateStarted  DateTime  @db.Date
  dateResolved DateTime? @db.Date
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])       // for "active duas" query
  @@index([userId, createdAt])    // for pagination
}

model RuhaniahVerse {
  id             String   @id @default(cuid())
  userId         String
  date           DateTime @db.Date
  ayahRef        String   // e.g., "65:2-3"
  reflectionText String
  dawahText      String
  signals        Json     // snapshot of all input signals
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])  // 1 verse per user per day
  @@index([userId, date])
}
```

---

### API Routes Summary

| Route | Method | Auth | DB Queries | Purpose |
|---|---|---|---|---|
| `/api/ruhaniah` | POST | Yes | 3 | Submit all 4 steps + get verse |
| `/api/ruhaniah/verse` | GET | Yes | 1 | Read precomputed verse only |
| `/api/ruhaniah/history` | GET | Yes | 1 | Last 30 days taqwa + barakah |
| `/api/ruhaniah/duas` | GET | Yes | 1 | Paginated dua list |
| `/api/internal/ruhaniah-verse` | POST | Cron | ~6/user | Precompute daily verses |

**Static (zero DB):**
| Asset | Source | Size |
|---|---|---|
| Fahm questions | `public/data/fahm-questions.json` | ~30KB gzipped |
| Ayah pool | `public/data/ayah-pool.json` | ~25KB gzipped |

---

### Migration Path — When Scaling Beyond Free Tier

| Growth Stage | Trigger | Action |
|---|---|---|
| 0–500 DAU | Default | Everything works on free tier |
| 500–2000 DAU | Neon compute hours > 150/mo | Upgrade Neon to Launch ($19/mo) — 300h compute |
| 2000–10K DAU | Vercel invocations > 800/day | Upgrade Vercel Pro ($20/mo) |
| 10K+ DAU | DB connections saturated | Add Redis cache layer for verse reads (Upstash free tier: 10K commands/day) |
| 50K+ DAU | Fahm question JSON too large for bundle | Split into per-category chunks, lazy-load by category |
