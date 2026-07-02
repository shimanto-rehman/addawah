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
import { throttlePerKey } from './user-sync-throttle';

export const WAKT_REMINDER_MINUTES = 10;
export const NOTIFICATION_SYNC_INTERVAL_MS = 60_000;

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
    await prisma.notification.upsert({
      where: { userId_dedupeKey: { userId, dedupeKey } },
      create: {
        userId,
        dedupeKey,
        type: data.type,
        title: data.title,
        body: data.body,
        href: data.href,
        meta: data.meta ?? {},
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      },
      update: {
        title: data.title,
        body: data.body,
        href: data.href,
        meta: data.meta ?? {},
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

  await Promise.all(
    unreadPokes.map((poke) =>
      notifyDawahPoke({
        id: poke.id,
        fromUserId: poke.fromUserId,
        toUserId: poke.toUserId,
        prayer: poke.prayer,
        fromName: poke.fromUser.name,
        createdAt: poke.createdAt,
      }),
    ),
  );
}

async function syncConnectionRequestNotifications(userId: string) {
  const incoming = await prisma.friendship.findMany({
    where: { friendId: userId, status: 'PENDING' },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  await Promise.all(
    incoming.map((friendship) =>
      notifyConnectionRequest({
        id: friendship.id,
        userId: friendship.userId,
        friendId: friendship.friendId,
        fromName: friendship.user.name,
        createdAt: friendship.createdAt,
      }),
    ),
  );
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

/** At most once per minute per user — safe to call on every poll or /auth/me. */
export async function maybeSyncNotificationsForUser(userId: string) {
  await throttlePerKey(`notif-sync:${userId}`, NOTIFICATION_SYNC_INTERVAL_MS, () =>
    syncNotificationsForUser(userId),
  );
}

export async function countUnreadNotifications(userId: string) {
  return withNotifications(
    () => prisma.notification.count({ where: { userId, readAt: null } }),
    0,
  );
}

export async function listNotifications(userId: string, limit = 30, options?: { sync?: boolean }) {
  return withNotifications(
    async () => {
      if (options?.sync !== false) {
        await maybeSyncNotificationsForUser(userId);
      }

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
