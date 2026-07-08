/**
 * Daily Muslim Challenge
 *
 * Five small deeds, refreshed each day. State is a bitmap (bit i = task i done)
 * plus a denormalized completed count for fast reads. The mask lives on the
 * DailyChallenge row keyed by (userId, date).
 *
 * Psychometric mapping: each task maps to one or more Fahm dimensions. The
 * challenge layer feeds a SOFT behavioral signal into the Fahm profile — it
 * refines, never dominates. See computeFahmProfile consumer.
 */

import { prisma } from '@/lib/prisma';
import { startOfDay } from '@/lib/salah-utils';

export const CHALLENGE_TASK_COUNT = 5;

/** Fahm dimension a task gently informs. */
export type ChallengeFahmDimension =
  | 'NAFS'
  | 'SOCIAL'
  | 'AKHIRAH'
  | 'SABR_SHUKR'
  | 'TRUTH';

export type ChallengeTask = {
  /** Bitmap bit index, 0..4. Stable — do not reorder. */
  index: number;
  emoji: string;
  title: string;
  subtitle: string;
  hadith: string;
  /** Fahm dimensions this task gently informs (soft signal). */
  fahm: ChallengeFahmDimension[];
};

/**
 * Task definitions. Order is stable and matches bitmap bit indices.
 * Changing order would corrupt historical masks.
 */
export const CHALLENGE_TASKS: readonly ChallengeTask[] = [
  {
    index: 0,
    emoji: '🤲',
    title: 'Give something today',
    subtitle: 'Donate, feed, or give away — even something small.',
    hadith: '“Protect yourselves from the Fire, even if with half a date.”',
    fahm: ['NAFS', 'SOCIAL'],
  },
  {
    index: 1,
    emoji: '📱',
    title: 'Reconnect with one person',
    subtitle: 'Parents, a relative, a friend, or a visit.',
    hadith: '“Whoever would like his provision to be increased and his lifespan extended, let him uphold the ties of kinship.”',
    fahm: ['SOCIAL'],
  },
  {
    index: 2,
    emoji: '🤐',
    title: 'Skip one sin intentionally',
    subtitle: 'Gossip, lying, swearing, a gaze, harmful content.',
    hadith: '“The one who abandons something for My sake, I compensate him with better.”',
    fahm: ['NAFS', 'TRUTH'],
  },
  {
    index: 3,
    emoji: '😊',
    title: 'Create one smile',
    subtitle: 'A compliment, a thank-you, a help, a kind queue.',
    hadith: '“Your smile in the face of your brother is charity.”',
    fahm: ['SOCIAL'],
  },
  {
    index: 4,
    emoji: '🌙',
    title: 'End the day with accountability',
    subtitle: 'Self-reflection, Astaghfirullah 100×, sincere tawbah.',
    hadith: '“The wise one is the one who takes himself to account and acts for what comes after death.”',
    fahm: ['AKHIRAH', 'SABR_SHUKR'],
  },
] as const;

export type ChallengeTaskState = {
  index: number;
  emoji: string;
  title: string;
  subtitle: string;
  hadith: string;
  fahm: ChallengeFahmDimension[];
  done: boolean;
};

export type DailyChallengeState = {
  date: string; // yyyy-mm-dd
  completed: number;
  total: number;
  /** Rolling 7-day completion rate [0..1], soft psychometric signal. */
  consistency: number;
  tasks: ChallengeTaskState[];
};

/** Read bit i from mask. */
function hasBit(mask: number, i: number): boolean {
  return (mask & (1 << i)) !== 0;
}

/** Set/unset bit i in mask, returning the new mask + delta. */
function toggleBit(mask: number, i: number): { mask: number; delta: number } {
  const on = hasBit(mask, i);
  return {
    mask: on ? mask & ~(1 << i) : mask | (1 << i),
    delta: on ? -1 : 1,
  };
}

function maskToTasks(mask: number): ChallengeTaskState[] {
  return CHALLENGE_TASKS.map((t) => ({
    index: t.index,
    emoji: t.emoji,
    title: t.title,
    subtitle: t.subtitle,
    hadith: t.hadith,
    fahm: [...t.fahm],
    done: hasBit(mask, t.index),
  }));
}

/** Fetch today's challenge state, creating an empty row only on first hit of the day. */
export async function getDailyChallenge(
  userId: string,
  now = new Date(),
): Promise<DailyChallengeState> {
  const today = startOfDay(now);
  const dateKey = today.toISOString().slice(0, 10);
  const weekAgo = startOfDay(new Date(now.getTime() - 6 * 86_400_000));

  // Read today's row and the rolling 7-day history in parallel.
  // Unlike an upsert-with-empty-update, this only writes on an actual miss
  // (first dashboard load of a new day), avoiding write amplification on
  // the hot read path.
  const [row, week] = await Promise.all([
    ensureTodayRow(userId, today),
    prisma.dailyChallenge.findMany({
      where: { userId, date: { gte: weekAgo, lte: today } },
      select: { completed: true },
    }),
  ]);

  const weekDone = week.reduce((sum, r) => sum + r.completed, 0);
  const consistency = Math.min(1, weekDone / (CHALLENGE_TASK_COUNT * 7));

  return {
    date: dateKey,
    completed: row.completed,
    total: CHALLENGE_TASK_COUNT,
    consistency,
    tasks: maskToTasks(row.mask),
  };
}

/**
 * Get today's row, creating an empty one on miss. Handles the unique-constraint
 * race: two concurrent first-loads of a new day could both miss then both try to
 * create; the loser falls back to a read.
 */
async function ensureTodayRow(
  userId: string,
  today: Date,
): Promise<{ mask: number; completed: number }> {
  const existing = await prisma.dailyChallenge.findUnique({
    where: { userId_date: { userId, date: today } },
    select: { mask: true, completed: true },
  });
  if (existing) return existing;
  try {
    return await prisma.dailyChallenge.create({
      data: { userId, date: today, mask: 0, completed: 0 },
      select: { mask: true, completed: true },
    });
  } catch {
    // P2002 race: another request created the row. Read it back.
    const fallback = await prisma.dailyChallenge.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { mask: true, completed: true },
    });
    return fallback ?? { mask: 0, completed: 0 };
  }
}

/** Toggle a task. Returns the new state. */
export async function toggleChallengeTask(
  userId: string,
  taskIndex: number,
  now = new Date(),
): Promise<DailyChallengeState> {
  if (taskIndex < 0 || taskIndex >= CHALLENGE_TASK_COUNT) {
    throw new Error(`Invalid challenge task index: ${taskIndex}`);
  }

  const today = startOfDay(now);
  const dateKey = today.toISOString().slice(0, 10);
  const weekAgo = startOfDay(new Date(now.getTime() - 6 * 86_400_000));

  // Read-modify-write plus the 7-day consistency read, all inside one
  // transaction. The consistency query sees today's just-written row and
  // avoids a second roundtrip after commit. Contention is per-user-per-day
  // (a single row), so this is safe; concurrent toggles serialize.
  const { mask, completed, weekDone } = await prisma.$transaction(async (tx) => {
    const existing = await tx.dailyChallenge.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { mask: true, completed: true },
    });
    const currentMask = existing?.mask ?? 0;
    const { mask: nextMask, delta } = toggleBit(currentMask, taskIndex);
    const nextCompleted = Math.max(0, (existing?.completed ?? 0) + delta);

    await tx.dailyChallenge.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, mask: nextMask, completed: nextCompleted },
      update: { mask: nextMask, completed: nextCompleted },
    });

    const week = await tx.dailyChallenge.findMany({
      where: { userId, date: { gte: weekAgo, lte: today } },
      select: { completed: true },
    });

    return {
      mask: nextMask,
      completed: nextCompleted,
      weekDone: week.reduce((sum, r) => sum + r.completed, 0),
    };
  });

  const consistency = Math.min(1, weekDone / (CHALLENGE_TASK_COUNT * 7));

  return {
    date: dateKey,
    completed,
    total: CHALLENGE_TASK_COUNT,
    consistency,
    tasks: maskToTasks(mask),
  };
}

/**
 * Per-Fahm-dimension behavioral signal from challenge completion.
 *
 * This is the SOFT psychometric layer. The Fahm profile is built from explicit
 * Q&A; the challenge adds a gentle behavioral read: someone who reliably gives,
 * reconnects, resists sin, etc. is *practicing* those dimensions, not just
 * knowing them. The blend weight is deliberately low — it refines, never
 * dominates, and it can never push a dimension score below 1 or above 5.
 *
 * Returns scores in the 1–5 QAS scale per dimension, where the dimension is
 * only present if at least one challenge window covers it.
 */
export const CHALLENGE_FAHM_BLEND_WEIGHT = 0.15;

export type ChallengeFahmSignal = {
  /** Per-Fahm-dimension behavioral score in 1–5 scale (only covered dims). */
  scores: Partial<Record<ChallengeFahmDimension, number>>;
  /** Overall 7-day consistency, 0..1 — used for ruhaniah-weakness. */
  consistency: number;
};

export async function getChallengeFahmSignal(
  userId: string,
  windowDays = 14,
  now = new Date(),
): Promise<ChallengeFahmSignal> {
  const today = startOfDay(now);
  const since = startOfDay(new Date(now.getTime() - (windowDays - 1) * 86_400_000));

  const rows = await prisma.dailyChallenge.findMany({
    where: { userId, date: { gte: since, lte: today } },
    select: { mask: true },
  });

  if (rows.length === 0) {
    return { scores: {}, consistency: 0 };
  }

  // Per dimension: count days the user completed ≥1 task mapping to it.
  // Then convert the completion rate (0..1) into a soft 1–5 score.
  const dimHitDays = new Map<ChallengeFahmDimension, number>();
  for (const t of CHALLENGE_TASKS) {
    for (const dim of t.fahm) {
      dimHitDays.set(dim, 0);
    }
  }
  for (const row of rows) {
    for (const t of CHALLENGE_TASKS) {
      if (!hasBit(row.mask, t.index)) continue;
      for (const dim of t.fahm) {
        dimHitDays.set(dim, (dimHitDays.get(dim) ?? 0) + 1);
      }
    }
  }

  const scores: Partial<Record<ChallengeFahmDimension, number>> = {};
  dimHitDays.forEach((hits, dim) => {
    const rate = Math.min(1, hits / windowDays);
    // 1.0 → 5, 0 → 1. Gentle slope.
    scores[dim] = Math.round((1 + rate * 4) * 10) / 10;
  });

  // Overall consistency: total completions / (5 tasks × windowDays).
  const totalDone = rows.reduce((s, r) => {
    let n = 0;
    for (const t of CHALLENGE_TASKS) if (hasBit(r.mask, t.index)) n += 1;
    return s + n;
  }, 0);
  const consistency = Math.min(1, totalDone / (CHALLENGE_TASK_COUNT * windowDays));

  return { scores, consistency };
}

/**
 * Blend a behavioral score into an explicit Q&A score.
 * Low weight; clamped to the 1–5 QAS band; rounded to 1 decimal.
 * If the explicit score is 0 (no Q&A for that dim), behavior alone seeds it —
 * but capped at 3.5, so the Q&A still has to confirm real understanding.
 */
export function blendFahmScore(explicit: number, behavior: number | undefined): number {
  if (behavior === undefined) return explicit;
  const blended = explicit > 0
    ? explicit * (1 - CHALLENGE_FAHM_BLEND_WEIGHT) + behavior * CHALLENGE_FAHM_BLEND_WEIGHT
    : Math.min(behavior, 3.5) * CHALLENGE_FAHM_BLEND_WEIGHT;
  return Math.round(Math.max(1, Math.min(5, blended)) * 10) / 10;
}
