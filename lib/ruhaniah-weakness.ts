/**
 * Spiritual Weakness Analysis
 *
 * Computes the top 3 areas of weakness from existing Ruhaniah signals.
 * Pure function — no DB calls. Runs server-side (cached) or client-side.
 */

export type Weakness = {
  id: string;
  title: string;
  arabicTitle: string;
  description: string;
  advice: string;
  severity: 'critical' | 'high' | 'moderate';
  icon: string;
};

type Signals = {
  todaySalah?: number;
  taqwaScore?: number;
  fahmWeakest?: string | null;
  barakah?: {
    timeScore: number;
    rizqScore: number;
    healthScore: number;
    heartScore: number;
  } | null;
  activeDuas?: number;
  recentlyAnswered?: number;
  mood?: string | null;
  streak?: number;
  broken?: boolean;
};

type FahmProfile = {
  categoryScores: Record<string, number>;
  overallQAS: number;
  weakest?: string | null;
  trend: string;
} | null;

type DuaStats = {
  total: number;
  answered: number;
  waiting: number;
} | null;

/** Human-readable names for Fahm categories */
const FAHM_CATEGORY_INFO: Record<string, { name: string; arabic: string; advice: string }> = {
  QADR: {
    name: 'Trust in Qadr (Divine Decree)',
    arabic: 'التوكل على الله',
    advice: 'Recite "Hasbiyallahu wa ni\'mal wakeel" daily. Reflect on how Allah has managed your affairs before.',
  },
  TRUTH: {
    name: 'Commitment to Truth',
    arabic: 'التمسك بالحق',
    advice: 'Speak the truth even when it\'s difficult. Recall that the Prophet ﷺ was known as Al-Amin (the trustworthy).',
  },
  DAWAH: {
    name: 'Calling to Allah (Dawah)',
    arabic: 'الدعوة إلى الله',
    advice: 'Start small — share one ayah or hadith with a friend this week. Dawah begins with sincerity, not eloquence.',
  },
  NAFS: {
    name: 'Self-Discipline (Nafs)',
    arabic: 'تهذيب النفس',
    advice: 'Choose one nafs desire to restrain this week. Fasting on Mondays and Thursdays helps train the soul.',
  },
  AKHIRAH: {
    name: 'Focus on the Hereafter',
    arabic: 'النظر إلى الآخرة',
    advice: 'Visit a graveyard, read Surah Al-Waqi\'ah, and ask yourself: "If I died tonight, am I ready?"',
  },
  SABR_SHUKR: {
    name: 'Patience & Gratitude',
    arabic: 'الصبر والشكر',
    advice: 'When hardship strikes, say "Inna lillahi wa inna ilayhi raji\'un." Before sleep, name 3 blessings you\'re grateful for.',
  },
  ILM: {
    name: 'Seeking Knowledge',
    arabic: 'طلب العلم',
    advice: 'Dedicate 15 minutes daily to learning something new about the deen. Knowledge without action is a burden, not a gift.',
  },
  SOCIAL: {
    name: 'Social Conduct (Mu\'amalat)',
    arabic: 'المعاملات',
    advice: 'Call a family member you\'ve been neglecting. The Prophet ﷺ said: "The best of you are those best to their families."',
  },
};

/** Score thresholds for severity */
function getSeverity(score: number): 'critical' | 'high' | 'moderate' {
  if (score >= 80) return 'critical';
  if (score >= 50) return 'high';
  return 'moderate';
}

/**
 * Analyze all available signals and return the top 3 weaknesses.
 * Each weakness gets a severity score (higher = more urgent).
 */
export function analyzeWeaknesses(
  signals: Signals,
  fahmProfile: FahmProfile,
  duaStats: DuaStats,
): Weakness[] {
  const candidates: { weakness: Weakness; priority: number }[] = [];

  // 1. Salah consistency
  const salahCount = signals.todaySalah ?? 3;
  if (salahCount <= 2) {
    candidates.push({
      weakness: {
        id: 'salah-neglect',
        title: 'Salah is slipping',
        arabicTitle: 'إهمال الصلاة',
        description: `You prayed only ${salahCount} of 5 fard prayers today. Salah is the first thing you'll be asked about on the Day of Judgment — before anything else.`,
        advice: 'Set alarms for each prayer. Pray Fajr before sleeping. Even if you miss, make qadha immediately — don\'t let the day end with unsettled prayers.',
        severity: salahCount <= 1 ? 'critical' : 'high',
        icon: '🕌',
      },
      priority: salahCount <= 1 ? 100 : 80,
    });
  } else if (salahCount <= 3) {
    candidates.push({
      weakness: {
        id: 'salah-inconsistent',
        title: 'Salah needs consistency',
        arabicTitle: 'استمرارية الصلاة',
        description: `You prayed ${salahCount} of 5 fard prayers today. Consistency in salah is the foundation of everything else in your deen.`,
        advice: 'Identify which prayers you\'re missing and why. Is it sleep? Work? Laziness? Address the root cause, not just the symptom.',
        severity: 'moderate',
        icon: '🕌',
      },
      priority: 50,
    });
  }

  // 2. Taqwa (God-consciousness)
  const taqwa = signals.taqwaScore ?? 3;
  if (taqwa <= 2) {
    candidates.push({
      weakness: {
        id: 'taqwa-low',
        title: 'Heedlessness creeping in',
        arabicTitle: 'غفلة القلب',
        description: `Your taqwa score is ${taqwa}/5 — you feel distant from Allah's awareness. This is the most dangerous state: a heart that doesn't feel its Creator watching.`,
        advice: 'Make istighfar 100 times daily. Increase dhikr after each salah. The Prophet ﷺ said: "The example of the one who remembers his Lord and the one who doesn\'t is like the living and the dead."',
        severity: taqwa <= 1 ? 'critical' : 'high',
        icon: '💔',
      },
      priority: taqwa <= 1 ? 95 : 70,
    });
  }

  // 3. Fahm (understanding) weakest category
  const weakestCategory = signals.fahmWeakest ?? fahmProfile?.weakest;
  if (weakestCategory && FAHM_CATEGORY_INFO[weakestCategory]) {
    const info = FAHM_CATEGORY_INFO[weakestCategory];
    const score = fahmProfile?.categoryScores?.[weakestCategory] ?? 0;
    candidates.push({
      weakness: {
        id: `fahm-${weakestCategory.toLowerCase()}`,
        title: `Weak in ${info.name}`,
        arabicTitle: info.arabic,
        description: `Your psychometric analysis reveals ${info.name} as your weakest area (score: ${score.toFixed(1)}). This is where your understanding of deen needs the most growth.`,
        advice: info.advice,
        severity: score <= 2 ? 'critical' : score <= 3.5 ? 'high' : 'moderate',
        icon: '📖',
      },
      priority: score <= 2 ? 85 : score <= 3.5 ? 60 : 35,
    });
  }

  // 4. Barakah — time management
  const barakah = signals.barakah;
  if (barakah && barakah.timeScore <= 2) {
    candidates.push({
      weakness: {
        id: 'barakah-time',
        title: 'Wasting precious time',
        arabicTitle: 'ضياع الوقت',
        description: `Your time barakah score is ${barakah.timeScore}/5. Time is the one resource you can never get back. Every minute wasted is a minute that could have been spent in sujood, dhikr, or good deeds.`,
        advice: 'Reduce screen time by 30 minutes today and use it for Quran recitation. The Prophet ﷺ said: "Take advantage of five before five: your youth before your old age..."',
        severity: barakah.timeScore <= 1 ? 'critical' : 'high',
        icon: '⏳',
      },
      priority: barakah.timeScore <= 1 ? 75 : 55,
    });
  }

  // 5. Barakah — heart unrest
  if (barakah && barakah.heartScore <= 2) {
    candidates.push({
      weakness: {
        id: 'barakah-heart',
        title: 'Heart is restless',
        arabicTitle: 'قلق القلب',
        description: `Your heart barakah score is ${barakah.heartScore}/5. A restless heart is a sign of disconnection from its Creator. True peace comes only from dhikr.`,
        advice: 'Recite Ayatul Kursi before sleeping. Make sujood outside of salah — it is the closest a servant is to Allah. Say "La ilaha illa anta subhanaka inni kuntu min adh-dhalimin" in difficulty.',
        severity: barakah.heartScore <= 1 ? 'critical' : 'high',
        icon: '🫀',
      },
      priority: barakah.heartScore <= 1 ? 70 : 50,
    });
  }

  // 6. Dua despair
  const activeDuas = signals.activeDuas ?? duaStats?.waiting ?? 0;
  const answeredDuas = signals.recentlyAnswered ?? duaStats?.answered ?? 0;
  if (activeDuas > 5 && answeredDuas === 0) {
    candidates.push({
      weakness: {
        id: 'dua-despair',
        title: 'Losing hope in dua',
        arabicTitle: 'اليأس من الدعاء',
        description: `You have ${activeDuas} pending duas with no recent answers. The shaytan whispers: "Allah isn't listening." But Allah says: "Call upon Me; I will respond to you." (40:60)`,
        advice: 'Don\'t stop making dua — the delay IS the answer being perfected. The Prophet ﷺ said: "The supplication of a Muslim is answered as long as he doesn\'t ask for sin or cutting family ties."',
        severity: activeDuas > 10 ? 'high' : 'moderate',
        icon: '🤲',
      },
      priority: activeDuas > 10 ? 45 : 30,
    });
  }

  // 7. Rizq anxiety
  if (barakah && barakah.rizqScore <= 2) {
    candidates.push({
      weakness: {
        id: 'barakah-rizq',
        title: 'Anxiety about provision',
        arabicTitle: 'القلق عن الرزق',
        description: `Your rizq barakah score is ${barakah.rizqScore}/5. Worrying about provision shows a gap in tawakkul (reliance on Allah). He who feeds the birds and clothes the lilies will surely provide for you.`,
        advice: 'Recite Surah Al-Waqi\'ah daily — it is the surah of rizq. Give sadaqah even when you feel you can\'t afford it. Allah promises: "Whatever you spend, He will compensate it." (34:39)',
        severity: barakah.rizqScore <= 1 ? 'critical' : 'high',
        icon: '💰',
      },
      priority: barakah.rizqScore <= 1 ? 60 : 40,
    });
  }

  // 8. Health neglect affecting worship
  if (barakah && barakah.healthScore <= 2) {
    candidates.push({
      weakness: {
        id: 'barakah-health',
        title: 'Health affecting worship',
        arabicTitle: 'الصحة ضعيفة',
        description: `Your health barakah score is ${barakah.healthScore}/5. When the body is weak, worship suffers. The Prophet ﷺ said: "Your body has a right over you."`,
        advice: 'Start with walking 20 minutes daily. Sleep early to wake for Fajr. Eat less — the Prophet ﷺ said: "The son of Adam fills no vessel worse than his stomach."',
        severity: 'moderate',
        icon: '🏥',
      },
      priority: 25,
    });
  }

  // 9. Mood-based: sadness / anxiety
  if (signals.mood === 'anxious') {
    candidates.push({
      weakness: {
        id: 'mood-anxious',
        title: 'Heart consumed by anxiety',
        arabicTitle: 'القلق والتوتر',
        description: 'Your mood check-in shows anxiety dominating your heart. Anxiety comes from worrying about the future — but the future is in Allah\'s hands, not yours.',
        advice: 'Make wudu when anxious — it cools the heat of worry. Recite "Allahumma inni a\'udhu bika min al-hammi wal-hazan" morning and evening. Trust the One who never forgets.',
        severity: 'high',
        icon: '😰',
      },
      priority: 55,
    });
  }

  if (signals.mood === 'sad') {
    candidates.push({
      weakness: {
        id: 'mood-sad',
        title: 'Heart is heavy with sadness',
        arabicTitle: 'حزن القلب',
        description: 'Your mood check-in shows sadness. Sadness about the past is a prison — and the key is tawbah and moving forward. Allah says: "Do not despair of the mercy of Allah." (39:53)',
        advice: 'Make tawbah for whatever weighs on your heart. Call someone you love. Read the story of Prophet Yaqub (AS) — he lost his son for decades, yet never lost hope in Allah.',
        severity: 'moderate',
        icon: '😢',
      },
      priority: 35,
    });
  }

  // 10. Fahm trend declining
  if (fahmProfile?.trend === 'DECLINING') {
    candidates.push({
      weakness: {
        id: 'fahm-declining',
        title: 'Understanding of deen is declining',
        arabicTitle: 'تراجع الفهم',
        description: 'Your psychometric trend is DECLINING — your understanding of core Islamic concepts is getting weaker over time. This is a warning sign.',
        advice: 'You may be consuming content that distances you from deen. Replace 30 minutes of social media with listening to a lecture or reading tafsir. Knowledge is protection.',
        severity: 'high',
        icon: '📉',
      },
      priority: 65,
    });
  }

  // 11. Streak broken
  if (signals.streak !== undefined && signals.streak > 0 && signals.broken) {
    candidates.push({
      weakness: {
        id: 'streak-broken',
        title: 'Prayer streak broken',
        arabicTitle: 'انقطاع الاستمرار',
        description: `You had a ${signals.streak}-day prayer streak that just broke. Don't let shaytan make you despair — the Prophet ﷺ said: "The most beloved deeds to Allah are those done consistently, even if small."`,
        advice: 'Start again today. Don\'t try to "make up" everything — just restart with consistency. A small daily deed is better than a big one you abandon.',
        severity: 'moderate',
        icon: '🔥',
      },
      priority: 40,
    });
  }

  // Sort by priority (descending) and return top 3
  candidates.sort((a, b) => b.priority - a.priority);

  const top3 = candidates.slice(0, 3).map((c) => c.weakness);

  // If fewer than 3 weaknesses found, fill with general advice
  if (top3.length < 3) {
    const defaults: Weakness[] = [
      {
        id: 'general-istency',
        title: 'Consistency is key',
        arabicTitle: 'الاستمرارية',
        description: 'You\'re doing well, ma sha Allah. But the real test of deen is not intensity — it\'s consistency. Small daily deeds outweigh large occasional ones.',
        advice: 'Choose one small act of worship and commit to it for 40 days without breaking. The Prophet ﷺ said: "The most beloved deeds are those done consistently."',
        severity: 'moderate',
        icon: '🔑',
      },
      {
        id: 'general-akhlaq',
        title: 'Character is your real score',
        arabicTitle: 'الأخلاق',
        description: 'Your tests and scores are one thing — but how you treat people is the true measure of your Islam. The Prophet ﷺ was sent to perfect good character.',
        advice: 'Today, be extra patient with someone who annoys you. Forgive someone who wronged you. Smile at a stranger. These are acts of worship no test can measure.',
        severity: 'moderate',
        icon: '🤝',
      },
      {
        id: 'general-quran',
        title: 'Increase Quran connection',
        arabicTitle: 'التخلق بالقرآن',
        description: 'The Quran is a healing for what is in the hearts. If you\'re not reciting daily, you\'re missing the most powerful source of spiritual strength.',
        advice: 'Read just 1 ayah with meaning every night before sleeping. Consistency with 1 ayah is better than reading a juz once and abandoning it.',
        severity: 'moderate',
        icon: '📿',
      },
    ];

    for (const d of defaults) {
      if (top3.length >= 3) break;
      if (!top3.find((w) => w.id === d.id)) {
        top3.push(d);
      }
    }
  }

  return top3;
}
