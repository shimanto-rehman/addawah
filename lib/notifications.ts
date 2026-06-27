import { NotificationType, Prayer, type Prisma } from '@prisma/client';
import { PRAYER_LABELS, type PrayerName } from './constants';
import type { AppNotification } from './notification-types';
export type { AppNotification } from './notification-types';
export { notificationIcon } from './notification-types';
import {
  formatNotificationTime,
  formatWaktEndTime,
  notificationTimeSuffix,
} from './notification-format';
import { prisma } from './prisma';
import {
  fetchPrayerTimes,
  formatDateKeyInTimezone,
  getNowMinutesInTimezone,
  prayerWaktWindow,
} from './prayer-times';
import { activePrayerForNow } from './rewards';
import { dateFromKey } from './salah-utils';

export const WAKT_REMINDER_MINUTES = 10;

function isMissingNotificationTable(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2021'
  );
}

async function withNotifications<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isMissingNotificationTable(error)) return fallback;
    throw error;
  }
}

function prayerLabel(prayer: Prayer | PrayerName | null | undefined) {
  if (!prayer) return 'Salah';
  return PRAYER_LABELS[prayer as PrayerName] ?? prayer;
}

const notificationListSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  href: true,
  meta: true,
  readAt: true,
  createdAt: true,
} as const;

type NotificationListRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  meta: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

function toAppNotification(row: NotificationListRow): AppNotification {
  return {
    id: row.id,
    type: row.type as AppNotification['type'],
    title: row.title,
    body: row.body,
    href: row.href,
    meta: (row.meta as Record<string, unknown>) ?? {},
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function fetchNotificationList(userId: string, limit: number) {
  const unreadWhere = { userId, readAt: null };
  const readWhere = { userId, readAt: { not: null } };

  const [unreadCount, unreadRows, readRows] = await Promise.all([
    prisma.notification.count({ where: unreadWhere }),
    prisma.notification.findMany({
      where: unreadWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: notificationListSelect,
    }),
    prisma.notification.findMany({
      where: readWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: notificationListSelect,
    }),
  ]);

  const readSlots = Math.max(0, limit - unreadRows.length);
  const rows = [...unreadRows, ...readRows.slice(0, readSlots)];

  return {
    notifications: rows.map(toAppNotification),
    unreadCount,
  };
}

function buildMeta(
  meta: Record<string, unknown>,
  eventAt: Date,
  timeZone?: string,
): Prisma.InputJsonValue {
  return {
    ...meta,
    eventAt: eventAt.toISOString(),
    eventTimeLabel: formatNotificationTime(eventAt, timeZone),
  };
}

function buildBody(base: string, eventAt: Date, timeZone?: string) {
  return `${base}${notificationTimeSuffix(eventAt, timeZone)}`;
}

async function upsertNotification(
  userId: string,
  dedupeKey: string,
  data: {
    type: NotificationType;
    title: string;
    body: string;
    href: string;
    meta?: Prisma.InputJsonValue;
    createdAt?: Date;
  },
) {
  try {
    const existing = await prisma.notification.findUnique({
      where: { userId_dedupeKey: { userId, dedupeKey } },
      select: { id: true },
    });

    if (existing) {
      await prisma.notification.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          body: data.body,
          href: data.href,
          meta: data.meta ?? {},
        },
      });
      return;
    }

    await prisma.notification.create({
      data: {
        userId,
        dedupeKey,
        type: data.type,
        title: data.title,
        body: data.body,
        href: data.href,
        meta: data.meta ?? {},
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      },
    });
  } catch (error) {
    if (!isMissingNotificationTable(error)) throw error;
  }
}

export async function clearWaktReminderForPrayer(
  userId: string,
  prayer: Prayer | PrayerName,
  dateKey: string,
) {
  await withNotifications(
    () =>
      prisma.notification.deleteMany({
        where: { userId, dedupeKey: `wakt:${prayer}:${dateKey}` },
      }),
    undefined,
  );
}

export async function notifyDawahPoke(poke: {
  id: string;
  fromUserId: string;
  toUserId: string;
  prayer: Prayer | null;
  fromName: string;
  createdAt?: Date;
}) {
  const eventAt = poke.createdAt ?? new Date();
  const wakt = prayerLabel(poke.prayer);
  const base = poke.prayer
    ? `Gentle reminder for ${wakt} wakt — may Allah make it easy.`
    : 'A gentle reminder to keep up with your salah today.';

  await upsertNotification(poke.toUserId, `poke:${poke.id}`, {
    type: 'DAWAH_POKE',
    title: `${poke.fromName} sent you dawah`,
    body: buildBody(base, eventAt),
    href: '/friends',
    meta: buildMeta(
      { pokeId: poke.id, prayer: poke.prayer, fromUserId: poke.fromUserId },
      eventAt,
    ),
    createdAt: eventAt,
  });
}

export async function notifyConnectionRequest(friendship: {
  id: string;
  userId: string;
  friendId: string;
  fromName: string;
  createdAt?: Date;
}) {
  const eventAt = friendship.createdAt ?? new Date();
  await upsertNotification(friendship.friendId, `conn-req:${friendship.id}`, {
    type: 'CONNECTION_REQUEST',
    title: `${friendship.fromName} wants to connect`,
    body: buildBody(
      'Sent you a brotherhood request — review and accept when ready.',
      eventAt,
    ),
    href: '/friends',
    meta: buildMeta(
      { friendshipId: friendship.id, fromUserId: friendship.userId },
      eventAt,
    ),
    createdAt: eventAt,
  });
}

export async function notifyConnectionAccepted(friendship: {
  id: string;
  userId: string;
  friendId: string;
  accepterName: string;
  createdAt?: Date;
}) {
  const eventAt = friendship.createdAt ?? new Date();
  await upsertNotification(friendship.userId, `conn-acc:${friendship.id}`, {
    type: 'CONNECTION_ACCEPTED',
    title: `${friendship.accepterName} accepted your request`,
    body: buildBody(
      'You are now connected — walk the path of salah together.',
      eventAt,
    ),
    href: '/friends',
    meta: buildMeta(
      { friendshipId: friendship.id, fromUserId: friendship.friendId },
      eventAt,
    ),
    createdAt: eventAt,
  });
}

async function syncPokeNotifications(userId: string) {
  const unreadPokes = await prisma.poke.findMany({
    where: { toUserId: userId, readAt: null },
    include: { fromUser: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  for (const poke of unreadPokes) {
    await notifyDawahPoke({
      id: poke.id,
      fromUserId: poke.fromUserId,
      toUserId: poke.toUserId,
      prayer: poke.prayer,
      fromName: poke.fromUser.name,
      createdAt: poke.createdAt,
    });
  }
}

async function syncConnectionRequestNotifications(userId: string) {
  const incoming = await prisma.friendship.findMany({
    where: { friendId: userId, status: 'PENDING' },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  for (const friendship of incoming) {
    await notifyConnectionRequest({
      id: friendship.id,
      userId: friendship.userId,
      friendId: friendship.friendId,
      fromName: friendship.user.name,
      createdAt: friendship.createdAt,
    });
  }
}

async function syncWaktReminderNotification(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { city: true, country: true },
  });
  if (!user) return;

  const now = new Date();
  let times;
  try {
    times = await fetchPrayerTimes(
      user.city?.trim() || 'Dhaka',
      user.country?.trim() || 'Bangladesh',
      now,
    );
  } catch {
    return;
  }

  const active = activePrayerForNow(times, now);
  if (!active) {
    await prisma.notification.deleteMany({
      where: { userId, type: 'WAKT_REMINDER', readAt: null },
    });
    return;
  }

  const dateKey = formatDateKeyInTimezone(now, times.timeZone);
  const dedupeKey = `wakt:${active}:${dateKey}`;
  const { end } = prayerWaktWindow(active, times);
  const nowMins = getNowMinutesInTimezone(now, times.timeZone);
  const remainingMins = end - nowMins;
  const waktEndLabel = formatWaktEndTime(end, times.timeZone);

  const prayed = await prisma.salahRecord.findFirst({
    where: {
      userId,
      date: dateFromKey(dateKey),
      prayer: active,
      kind: 'FARD',
      unit: 0,
      completed: true,
    },
    select: { id: true },
  });

  if (prayed || remainingMins > WAKT_REMINDER_MINUTES || remainingMins <= 0) {
    await prisma.notification.deleteMany({
      where: { userId, dedupeKey },
    });
    return;
  }

  const label = prayerLabel(active);
  const base = `${label} wakt ends at ${waktEndLabel} — ${remainingMins} minute${
    remainingMins === 1 ? '' : 's'
  } left and you have not marked ${label} as prayed. Head to your tracker now.`;

  await upsertNotification(userId, dedupeKey, {
    type: 'WAKT_REMINDER',
    title: `${label} wakt — ${remainingMins} min left`,
    body: buildBody(base, now, times.timeZone),
    href: '/dashboard',
    meta: buildMeta(
      {
        prayer: active,
        remainingMinutes: remainingMins,
        waktEndsAt: waktEndLabel,
        dateKey,
      },
      now,
      times.timeZone,
    ),
  });
}

export async function syncNotificationsForUser(userId: string) {
  await withNotifications(
    () =>
      Promise.all([
        syncPokeNotifications(userId),
        syncConnectionRequestNotifications(userId),
        syncWaktReminderNotification(userId),
      ]),
    undefined,
  );
}

export async function seedSampleNotifications(userId: string) {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

  const samples: Array<{
    dedupeKey: string;
    type: NotificationType;
    title: string;
    bodyBase: string;
    href: string;
    meta: Record<string, unknown>;
    createdAt: Date;
    readAt: Date | null;
  }> = [
    {
      dedupeKey: 'seed:wakt:dhuhr:demo',
      type: 'WAKT_REMINDER',
      title: 'Dhuhr wakt — 8 min left',
      bodyBase:
        'Dhuhr wakt ends at 12:15 PM — 8 minutes left and you have not marked Dhuhr as prayed. Head to your tracker now.',
      href: '/dashboard',
      meta: { prayer: 'DHUHR', remainingMinutes: 8, waktEndsAt: '12:15 PM', dateKey: '2026-06-18' },
      createdAt: hoursAgo(0.1),
      readAt: null,
    },
    {
      dedupeKey: 'seed:wakt:maghrib:demo-read',
      type: 'WAKT_REMINDER',
      title: 'Maghrib wakt — 10 min left',
      bodyBase:
        'Maghrib wakt ends at 6:42 PM — 10 minutes left and you have not marked Maghrib as prayed. Head to your tracker now.',
      href: '/dashboard',
      meta: { prayer: 'MAGHRIB', remainingMinutes: 10, waktEndsAt: '6:42 PM', dateKey: '2026-06-17' },
      createdAt: hoursAgo(26),
      readAt: hoursAgo(25.9),
    },
    {
      dedupeKey: 'seed:poke:ahmad',
      type: 'DAWAH_POKE',
      title: 'Ahmad Karim sent you dawah',
      bodyBase: 'Gentle reminder for Asr wakt — may Allah make it easy.',
      href: '/friends',
      meta: { pokeId: 'seed-poke-1', prayer: 'ASR', fromUserId: 'seed-user' },
      createdAt: hoursAgo(2),
      readAt: null,
    },
    {
      dedupeKey: 'seed:poke:yusuf-read',
      type: 'DAWAH_POKE',
      title: 'Yusuf Ahmed sent you dawah',
      bodyBase: 'A gentle reminder to keep up with your salah today.',
      href: '/friends',
      meta: { pokeId: 'seed-poke-2', prayer: null, fromUserId: 'seed-user-2' },
      createdAt: hoursAgo(5),
      readAt: hoursAgo(4.5),
    },
    {
      dedupeKey: 'seed:conn-req:fatima',
      type: 'CONNECTION_REQUEST',
      title: 'Fatima Rahman wants to connect',
      bodyBase: 'Sent you a brotherhood request — review and accept when ready.',
      href: '/friends',
      meta: { friendshipId: 'seed-fr-1', fromUserId: 'seed-user-3' },
      createdAt: hoursAgo(8),
      readAt: null,
    },
    {
      dedupeKey: 'seed:conn-acc:omar',
      type: 'CONNECTION_ACCEPTED',
      title: 'Omar Hassan accepted your request',
      bodyBase: 'You are now connected — walk the path of salah together.',
      href: '/friends',
      meta: { friendshipId: 'seed-fr-2', fromUserId: 'seed-user-4' },
      createdAt: hoursAgo(30),
      readAt: hoursAgo(29),
    },
    {
      dedupeKey: 'seed:wakt:fajr:demo',
      type: 'WAKT_REMINDER',
      title: 'Fajr wakt — 6 min left',
      bodyBase:
        'Fajr wakt ends at 5:18 AM — 6 minutes left and you have not marked Fajr as prayed. Head to your tracker now.',
      href: '/dashboard',
      meta: { prayer: 'FAJR', remainingMinutes: 6, waktEndsAt: '5:18 AM', dateKey: '2026-06-16' },
      createdAt: hoursAgo(48),
      readAt: null,
    },
  ];

  let created = 0;
  for (const sample of samples) {
    const body = buildBody(sample.bodyBase, sample.createdAt);
    const meta = buildMeta(sample.meta, sample.createdAt);

    await prisma.notification.upsert({
      where: { userId_dedupeKey: { userId, dedupeKey: sample.dedupeKey } },
      create: {
        userId,
        dedupeKey: sample.dedupeKey,
        type: sample.type,
        title: sample.title,
        body,
        href: sample.href,
        meta,
        createdAt: sample.createdAt,
        readAt: sample.readAt,
      },
      update: {
        type: sample.type,
        title: sample.title,
        body,
        href: sample.href,
        meta,
        readAt: sample.readAt,
      },
    });
    created += 1;
  }

  return { created };
}

export async function listNotifications(userId: string, limit = 30) {
  return withNotifications(
    async () => {
      await syncNotificationsForUser(userId);

      return fetchNotificationList(userId, limit);
    },
    { notifications: [], unreadCount: 0 },
  );
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await withNotifications(async () => {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification || notification.readAt) return;

    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    if (notification.type === 'DAWAH_POKE') {
      const pokeId = (notification.meta as { pokeId?: string })?.pokeId;
      if (pokeId && !pokeId.startsWith('seed-')) {
        await prisma.poke.updateMany({
          where: { id: pokeId, toUserId: userId, readAt: null },
          data: { readAt: new Date() },
        });
      }
    }
  }, undefined);
}

export async function markAllNotificationsRead(userId: string) {
  await withNotifications(async () => {
    const unread = await prisma.notification.findMany({
      where: { userId, readAt: null },
      select: { id: true, type: true, meta: true },
    });
    if (unread.length === 0) return;

    const now = new Date();
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: now },
    });

    const pokeIds = unread
      .filter((n) => n.type === 'DAWAH_POKE')
      .map((n) => (n.meta as { pokeId?: string })?.pokeId)
      .filter((id): id is string => Boolean(id && !id.startsWith('seed-')));

    if (pokeIds.length > 0) {
      await prisma.poke.updateMany({
        where: { id: { in: pokeIds }, toUserId: userId, readAt: null },
        data: { readAt: now },
      });
    }
  }, undefined);
}
