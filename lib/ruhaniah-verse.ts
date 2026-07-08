import { prisma } from './prisma';
import { startOfDay } from './salah-utils';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { kvGetJson, kvSetJson } from './kv';

type AyahEntry = {
  ref: string;
  arabic: string;
  translation: string;
  tafsir: string;
  reflectionTemplate: string;
  dawahTemplate: string;
  tags: string[];
  secondaryTags: string[];
  dawahTags: string[];
};

type VerseResult = {
  id?: string;
  ayahRef: string;
  arabic: string;
  translation: string;
  tafsir: string;
  reflectionText: string;
  dawahText: string;
  signals: Record<string, unknown>;
};

const AYAH_POOL_CACHE_KEY = 'ruhaniah:ayah-pool';
const AYAH_POOL_TTL = 86400; // 24h — static data

async function getAyahPool(): Promise<AyahEntry[]> {
  // Try Redis first (survives cold starts)
  const cached = await kvGetJson<AyahEntry[]>(AYAH_POOL_CACHE_KEY);
  if (cached) return cached;

  try {
    const filePath = join(process.cwd(), 'public', 'data', 'ayah-pool.json');
    const raw = await readFile(filePath, 'utf-8');
    const pool = JSON.parse(raw) as AyahEntry[];
    // Fire-and-forget Redis set
    kvSetJson(AYAH_POOL_CACHE_KEY, pool, AYAH_POOL_TTL).catch(() => {});
    return pool;
  } catch {
    return getDefaultPool();
  }
}

function getDefaultPool(): AyahEntry[] {
  return [
    {
      ref: '65:2-3',
      arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ',
      translation:
        'Whoever fears Allah, He will make for him a way out, and provide from where he does not expect.',
      tafsir: 'This ayah promises that taqwa leads to divine provision and relief from difficulty.',
      reflectionTemplate:
        'Your {weakest_area} needs attention. Taqwa — fear and awareness of Allah — is the key. Prioritize your connection with Him.',
      dawahTemplate:
        'Share this ayah with someone anxious about their future. Allah\'s provision comes from where we least expect.',
      tags: ['rizq_blessed', 'needs_sabr', 'waiting_many'],
      secondaryTags: ['anxious', 'time_restricted'],
      dawahTags: ['strongest_dawah'],
    },
    {
      ref: '94:5-6',
      arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا إِنَّ مَعَ الْعُسْرِ يُسْرًا',
      translation: 'For indeed, with hardship comes ease. Indeed, with hardship comes ease.',
      tafsir: 'Allah promises ease after every difficulty — mentioned twice for emphasis.',
      reflectionTemplate:
        'You are going through difficulty, but Allah promises ease — not once, but twice. Hold on.',
      dawahTemplate:
        'Someone around you is struggling. Remind them: ease is not just possible — it is promised by Allah.',
      tags: ['needs_sabr', 'needs_hope', 'restless_heart'],
      secondaryTags: ['anxious', 'needs_comfort'],
      dawahTags: ['needs_courage'],
    },
    {
      ref: '13:28',
      arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
      translation: 'Verily, in the remembrance of Allah do hearts find rest.',
      tafsir: 'True peace comes not from circumstances but from connection with the Creator.',
      reflectionTemplate:
        'Your heart is restless because it is disconnected from its source of peace. Return to dhikr.',
      dawahTemplate:
        'Share this with someone searching for inner peace. The answer has been there all along.',
      tags: ['restless_heart', 'heedless', 'distracted'],
      secondaryTags: ['anxious', 'sad'],
      dawahTags: ['conscious'],
    },
    {
      ref: '2:286',
      arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
      translation: 'Allah does not burden a soul beyond that it can bear.',
      tafsir: 'Every test is calibrated to your capacity.',
      reflectionTemplate:
        'Whatever you are facing, Allah knows you can handle it. He does not burden you beyond your capacity.',
      dawahTemplate:
        'Remind someone overwhelmed by life: Allah knows exactly what they can bear.',
      tags: ['needs_hope', 'needs_comfort', 'needs_sabr'],
      secondaryTags: ['anxious', 'restless_heart'],
      dawahTags: ['needs_courage'],
    },
    {
      ref: '39:53',
      arabic: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ',
      translation:
        'Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah.',
      tafsir: 'Allah addresses sinners directly — His mercy is greater than any sin.',
      reflectionTemplate:
        'You may feel you have gone too far, but Allah\'s mercy is infinite. Do not despair.',
      dawahTemplate:
        'Share this with someone who thinks they are too sinful. He calls them \'My servants\' — not sinners.',
      tags: ['relapse', 'needs_hope', 'neglectful'],
      secondaryTags: ['needs_comfort'],
      dawahTags: ['needs_courage'],
    },
    {
      ref: '2:43',
      arabic: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ',
      translation: 'Establish prayer, give zakat, and bow with those who bow.',
      tafsir:
        'The command to "bow with those who bow" is a direct call to congregation — sincerity made visible in community.',
      reflectionTemplate:
        'You are praying, but alone. There is a higher station — bowing with those who bow. The congregation is where sincerity meets commitment.',
      dawahTemplate:
        'Share this with a friend who prays at home. The mosque is not just a place; it is a belonging.',
      tags: ['sincere', 'devoted', 'jamat_strong', 'jamat_some', 'needs_jamat', 'solo_prayer'],
      secondaryTags: ['obedient', 'consistent'],
      dawahTags: ['sincere', 'devoted'],
    },
  ];
}

/** Gather spiritual signal tags from user data — all queries run in parallel */
async function gatherSignals(
  userId: string,
): Promise<{ tags: string[]; signals: Record<string, unknown> }> {
  const today = startOfDay(new Date());
  const tags: string[] = [];
  const signals: Record<string, unknown> = {};

  // All 8 queries in parallel (was 7 sequential + streak)
  const [salahRecords, taqwa, fahmProfile, barakah, activeDuas, recentlyAnswered, mood, streakData] =
    await Promise.all([
      // 1. Salah completion today
      prisma.salahRecord.findMany({
        where: { userId, date: today, kind: 'FARD', completed: true },
        select: { prayer: true, inJamat: true },
      }),
      // 2. Taqwa pulse
      prisma.taqwaPulse.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { score: true },
      }),
      // 3. Fahm profile
      prisma.userFahmProfile.findUnique({
        where: { userId },
        select: { weakest: true, strongest: true, trend: true },
      }),
      // 4. Barakah
      prisma.barakahLog.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { timeScore: true, rizqScore: true, healthScore: true, heartScore: true },
      }),
      // 5a. Active duas count
      prisma.duaEntry.count({
        where: { userId, status: 'WAITING' },
      }),
      // 5b. Recently answered duas count
      prisma.duaEntry.count({
        where: {
          userId,
          status: { in: ['ANSWERED_SAME', 'ANSWERED_DIFFERENT'] },
          dateResolved: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      }),
      // 6. Mood
      prisma.moodCheckIn.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { moodId: true },
      }),
      // 7. Streak
      computeStreak(userId),
    ]);

  // --- Derive tags from pre-fetched results ---

  // Salah
  const completed = salahRecords.length;
  signals.todaySalah = completed;
  if (completed >= 4) tags.push('obedient', 'consistent');
  if (completed <= 2) tags.push('neglectful', 'needs_reminder');

  // Jamat / Awal Wakt — sincerity signal. Praying in congregation (men) or at
  // the opening of the wakt (women) is a strong marker of seriousness. The more
  // of today's fard prayed this way, the higher the sincerity read.
  const jamatCount = salahRecords.filter((r) => r.inJamat).length;
  signals.todayJamat = jamatCount;
  if (jamatCount >= 3) tags.push('sincere', 'devoted', 'jamat_strong');
  else if (jamatCount >= 1) tags.push('sincere', 'jamat_some');
  if (completed >= 4 && jamatCount === 0) tags.push('solo_prayer', 'needs_jamat');

  // Taqwa
  const taqwaScore = taqwa?.score ?? 3;
  signals.taqwaScore = taqwaScore;
  if (taqwaScore <= 2) tags.push('heedless', 'distracted');
  if (taqwaScore >= 4) tags.push('conscious', 'present');

  // Fahm
  signals.fahmWeakest = fahmProfile?.weakest;
  if (fahmProfile?.weakest === 'AKHIRAH') tags.push('dunya_focused');
  if (fahmProfile?.weakest === 'QADR') tags.push('anxious', 'control_seeking');
  if (fahmProfile?.weakest === 'DAWAH') tags.push('shy_deen', 'needs_courage');
  if (fahmProfile?.weakest === 'SABR_SHUKR') tags.push('impatient');
  if (fahmProfile?.trend === 'IMPROVING') tags.push('strong_streak');

  // Barakah
  signals.barakah = barakah;
  if (barakah) {
    if (barakah.timeScore <= 2) tags.push('time_restricted');
    if (barakah.rizqScore >= 4) tags.push('rizq_blessed');
    if (barakah.heartScore <= 2) tags.push('restless_heart');
    if (barakah.healthScore <= 2) tags.push('health_struggling');
  }

  // Duas
  signals.activeDuas = activeDuas;
  signals.recentlyAnswered = recentlyAnswered;
  if (activeDuas > 5) tags.push('waiting_many', 'needs_sabr');
  if (recentlyAnswered > 0) tags.push('answered_dua', 'needs_shukr');

  // Mood
  signals.mood = mood?.moodId;
  if (mood?.moodId === 'anxious') tags.push('anxious');
  if (mood?.moodId === 'grateful') tags.push('grateful');
  if (mood?.moodId === 'sad') tags.push('needs_comfort');

  // Streak
  signals.streak = streakData.current;
  signals.broken = streakData.broken;
  if (streakData.current > 30) tags.push('strong_streak');
  if (streakData.broken) tags.push('relapse', 'needs_hope');

  return { tags, signals };
}

async function computeStreak(userId: string): Promise<{ current: number; broken: boolean }> {
  const stats = await prisma.userSalahDayStat.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 60,
    select: { date: true, missed: true },
  });

  let current = 0;
  let broken = false;
  for (const day of stats) {
    if (day.missed === 0) {
      current++;
    } else {
      if (current > 0) broken = true;
      break;
    }
  }

  return { current, broken };
}

/** Select the best ayah for today based on all signals */
export async function selectRuhaniahVerse(userId: string): Promise<VerseResult> {
  const { tags, signals } = await gatherSignals(userId);
  const pool = await getAyahPool();

  // Recently shown ayahs (last 7 days)
  const recentVerses = await prisma.ruhaniahVerse.findMany({
    where: {
      userId,
      date: { gte: new Date(Date.now() - 7 * 86400000) },
    },
    select: { ayahRef: true },
  });
  const recentlyShown = new Set(recentVerses.map((v) => v.ayahRef));

  // Score each ayah
  const scored = pool.map((ayah) => {
    let score = 0;
    for (const tag of tags) {
      if (ayah.tags.includes(tag)) score += 3;
      if (ayah.secondaryTags.includes(tag)) score += 1;
    }
    if (recentlyShown.has(ayah.ref)) score -= 10;
    return { ayah, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top5 = scored.slice(0, 5).filter((s) => s.score > -5);

  // If no good matches, use default pool
  const selected =
    top5.length > 0
      ? top5[Math.floor(Math.random() * top5.length)].ayah
      : pool[Math.floor(Math.random() * pool.length)];

  // Build reflection
  const weakestArea = signals.fahmWeakest as string | undefined;
  const reflectionText = selected.reflectionTemplate
    .replace('{weakest_area}', weakestArea ? weakestArea.toLowerCase() : 'spiritual state')
    .replace('{taqwa_score}', String(signals.taqwaScore ?? 'unknown'));

  const dawahText = selected.dawahTemplate;

  return {
    ayahRef: selected.ref,
    arabic: selected.arabic,
    translation: selected.translation,
    tafsir: selected.tafsir,
    reflectionText,
    dawahText,
    signals,
  };
}

/** Get or compute verse — fallback for missing precomputed verse */
export async function getOrComputeVerse(userId: string, date?: Date): Promise<VerseResult> {
  const targetDate = date ?? startOfDay(new Date());

  const cached = await prisma.ruhaniahVerse.findUnique({
    where: { userId_date: { userId, date: targetDate } },
  });

  if (cached) {
    return {
      id: cached.id,
      ayahRef: cached.ayahRef,
      arabic: (cached.signals as Record<string, unknown>)?.arabic as string ?? '',
      translation: (cached.signals as Record<string, unknown>)?.translation as string ?? '',
      tafsir: (cached.signals as Record<string, unknown>)?.tafsir as string ?? '',
      reflectionText: cached.reflectionText,
      dawahText: cached.dawahText,
      signals: cached.signals as Record<string, unknown>,
    };
  }

  // Compute on-demand
  return await computeAndStoreVerse(userId, targetDate);
}

/** Compute verse and store it */
export async function computeAndStoreVerse(
  userId: string,
  date?: Date,
): Promise<VerseResult> {
  const targetDate = date ?? startOfDay(new Date());
  const verse = await selectRuhaniahVerse(userId);

  await prisma.ruhaniahVerse.upsert({
    where: { userId_date: { userId, date: targetDate } },
    create: {
      userId,
      date: targetDate,
      ayahRef: verse.ayahRef,
      reflectionText: verse.reflectionText,
      dawahText: verse.dawahText,
      signals: { ...verse.signals, arabic: verse.arabic, translation: verse.translation, tafsir: verse.tafsir },
    },
    update: {
      ayahRef: verse.ayahRef,
      reflectionText: verse.reflectionText,
      dawahText: verse.dawahText,
      signals: { ...verse.signals, arabic: verse.arabic, translation: verse.translation, tafsir: verse.tafsir },
    },
  });

  return verse;
}
