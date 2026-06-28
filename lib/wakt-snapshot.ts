import type { Prayer } from '@prisma/client';
import { prisma } from './prisma';
import {
  buildFriendWaktRowFromTimes,
  emptyFriendWaktRow,
  fetchPrayerTimesForLocations,
  friendPrayerLocation,
  type FriendWaktRow,
} from './friends-wakt';
import { formatDateKeyInTimezone } from './prayer-times';
import { startOfDay } from './salah-utils';

export const WAKT_SNAPSHOT_MAX_AGE_MS = 60_000;

type FardRecord = {
  prayer: string;
  completed: boolean;
  updatedAt: Date;
};

export type WaktSnapshotRecord = {
  userId: string;
  dateKey: string;
  prayer: Prayer | null;
  phase: string;
  salahStatus: string;
  prayerLabel: string;
  canPoke: boolean;
  forbiddenNow: boolean;
  remainingSeconds: number;
  elapsedSeconds: number;
  waktStartedAt: Date | null;
  waktEndsAt: Date | null;
  waktEndLabel: string | null;
  timeZone: string;
  refreshedAt: Date;
};

export function snapshotToWaktRow(snapshot: WaktSnapshotRecord): FriendWaktRow {
  return {
    userId: snapshot.userId,
    prayer: snapshot.prayer,
    prayerLabel: snapshot.prayerLabel,
    phase: snapshot.phase as FriendWaktRow['phase'],
    salahStatus: snapshot.salahStatus as FriendWaktRow['salahStatus'],
    waktStartedAt: snapshot.waktStartedAt?.toISOString() ?? null,
    waktEndsAt: snapshot.waktEndsAt?.toISOString() ?? null,
    waktEndLabel: snapshot.waktEndLabel,
    canPoke: snapshot.canPoke,
    pokeCooldownUntil: null,
    pokeCooldownSeconds: 0,
    forbiddenNow: snapshot.forbiddenNow,
    elapsedMinutes: Math.floor(snapshot.elapsedSeconds / 60),
    remainingMinutes: Math.ceil(snapshot.remainingSeconds / 60),
    elapsedSeconds: snapshot.elapsedSeconds,
    remainingSeconds: snapshot.remainingSeconds,
  };
}

function rowToSnapshotData(
  userId: string,
  dateKey: string,
  row: FriendWaktRow,
  timeZone: string,
  now: Date,
) {
  return {
    userId,
    dateKey,
    prayer: row.prayer,
    phase: row.phase,
    salahStatus: row.salahStatus,
    prayerLabel: row.prayerLabel,
    canPoke: row.canPoke,
    forbiddenNow: row.forbiddenNow,
    remainingSeconds: row.remainingSeconds,
    elapsedSeconds: row.elapsedSeconds,
    waktStartedAt: row.waktStartedAt ? new Date(row.waktStartedAt) : null,
    waktEndsAt: row.waktEndsAt ? new Date(row.waktEndsAt) : null,
    waktEndLabel: row.waktEndLabel,
    timeZone,
    refreshedAt: now,
  };
}

export async function refreshUserWaktSnapshot(
  userId: string,
  city: string | null | undefined,
  country: string | null | undefined,
  records: FardRecord[],
  now = new Date(),
) {
  const loc = friendPrayerLocation(city, country);
  const timesMap = await fetchPrayerTimesForLocations([loc], now);
  const times = timesMap.get(`${loc.city.toLowerCase()}|${loc.country.toLowerCase()}`);
  if (!times) {
    return emptyFriendWaktRow(userId);
  }

  const dateKey = formatDateKeyInTimezone(now, times.timeZone);
  const row = buildFriendWaktRowFromTimes(userId, records, times, now);

  await prisma.userWaktSnapshot.upsert({
    where: { userId },
    create: rowToSnapshotData(userId, dateKey, row, times.timeZone, now),
    update: rowToSnapshotData(userId, dateKey, row, times.timeZone, now),
  });

  return row;
}

export async function loadSnapshots(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, WaktSnapshotRecord>();
  const rows = await prisma.userWaktSnapshot.findMany({
    where: { userId: { in: userIds } },
  });
  return new Map(rows.map((row) => [row.userId, row as WaktSnapshotRecord]));
}

export async function ensureSnapshotsFresh(
  friends: Array<{
    id: string;
    city: string | null;
    country: string | null;
  }>,
  recordsByUser: Map<string, FardRecord[]>,
  now = new Date(),
  maxAgeMs = WAKT_SNAPSHOT_MAX_AGE_MS,
) {
  if (friends.length === 0) return new Map<string, WaktSnapshotRecord>();

  const existing = await loadSnapshots(friends.map((f) => f.id));
  const staleFriends = friends.filter((friend) => {
    const snap = existing.get(friend.id);
    if (!snap) return true;
    if (now.getTime() - snap.refreshedAt.getTime() > maxAgeMs) return true;
    return false;
  });

  if (staleFriends.length > 0) {
    const locations = staleFriends.map((f) => friendPrayerLocation(f.city, f.country));
    const timesByLocation = await fetchPrayerTimesForLocations(locations, now);

    await Promise.all(
      staleFriends.map(async (friend) => {
        const loc = friendPrayerLocation(friend.city, friend.country);
        const key = `${loc.city.toLowerCase()}|${loc.country.toLowerCase()}`;
        const times = timesByLocation.get(key);
        const records = recordsByUser.get(friend.id) ?? [];

        if (!times) {
          existing.set(friend.id, {
            userId: friend.id,
            dateKey: formatDateKeyInTimezone(now, 'Asia/Dhaka'),
            prayer: null,
            phase: 'upcoming',
            salahStatus: 'none',
            prayerLabel: '—',
            canPoke: false,
            forbiddenNow: false,
            remainingSeconds: 0,
            elapsedSeconds: 0,
            waktStartedAt: null,
            waktEndsAt: null,
            waktEndLabel: null,
            timeZone: 'Asia/Dhaka',
            refreshedAt: now,
          });
          return;
        }

        const dateKey = formatDateKeyInTimezone(now, times.timeZone);
        const snap = existing.get(friend.id);
        if (snap && snap.dateKey === dateKey && now.getTime() - snap.refreshedAt.getTime() <= maxAgeMs) {
          return;
        }

        const row = buildFriendWaktRowFromTimes(friend.id, records, times, now);
        const data = rowToSnapshotData(friend.id, dateKey, row, times.timeZone, now);
        await prisma.userWaktSnapshot.upsert({
          where: { userId: friend.id },
          create: data,
          update: data,
        });
        existing.set(friend.id, data as WaktSnapshotRecord);
      }),
    );
  }

  return existing;
}

export async function refreshSnapshotsForSalahUser(userId: string, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { city: true, country: true },
  });
  if (!user) return;

  const today = startOfDay(now);
  const records = await prisma.salahRecord.findMany({
    where: { userId, kind: 'FARD', date: today },
    select: { prayer: true, completed: true, updatedAt: true },
  });

  await refreshUserWaktSnapshot(userId, user.city, user.country, records, now);
}

export function summarizeSnapshots(
  snapshots: Iterable<WaktSnapshotRecord>,
  options?: { includePrivate?: boolean },
) {
  let activeInWakt = 0;
  let pokeable = 0;
  let revision = 0;

  for (const snap of Array.from(snapshots)) {
    if (snap.refreshedAt.getTime() > revision) revision = snap.refreshedAt.getTime();
    if (snap.phase === 'active') activeInWakt += 1;
    if (snap.canPoke) pokeable += 1;
  }

  return {
    activeInWakt,
    pokeable,
    revision: revision > 0 ? String(revision) : '0',
  };
}
