import { NotificationType, Prayer, type Prisma } from '@prisma/client';
import { PRAYER_LABELS, type PrayerName } from './constants';
import type { AppNotification } from './notification-types';
export type { AppNotification } from './notification-types';
export { notificationIcon } from './notification-types';
import { prisma } from './prisma';
import {
  fetchPrayerTimes,
  formatDateKeyInTimezone,
  getNowMinutesInTimezone,
  prayerWaktWindow,
} from './prayer-times';
import { activePrayerForNow } from './rewards';
import { startOfDay } from './salah-utils';

const WAKT_REMINDER_MINUTES = 10;

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

async function upsertNotification(
  userId: string,
  dedupeKey: string,
  data: {
    type: NotificationType;
    title: string;
    body: string;
    href: string;
    meta?: Prisma.InputJsonValue;
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

export async function notifyDawahPoke(poke: {
  id: string;
  fromUserId: string;
  toUserId: string;
  prayer: Prayer | null;
  fromName: string;
}) {
  const wakt = prayerLabel(poke.prayer);
  await upsertNotification(poke.toUserId, `poke:${poke.id}`, {
    type: 'DAWAH_POKE',
    title: `${poke.fromName} sent you dawah`,
    body: poke.prayer
      ? `Gentle reminder for ${wakt} wakt — may Allah make it easy 🤲`
      : 'A gentle reminder to keep up with your salah today 🤲',
    href: '/friends',
    meta: { pokeId: poke.id, prayer: poke.prayer, fromUserId: poke.fromUserId },
  });
}

export async function notifyConnectionRequest(friendship: {
  id: string;
  userId: string;
  friendId: string;
  fromName: string;
}) {
  await upsertNotification(friendship.friendId, `conn-req:${friendship.id}`, {
    type: 'CONNECTION_REQUEST',
    title: `${friendship.fromName} wants to connect`,
    body: 'Sent you a brotherhood request — review and accept when ready.',
    href: '/friends',
    meta: { friendshipId: friendship.id, fromUserId: friendship.userId },
  });
}

export async function notifyConnectionAccepted(friendship: {
  id: string;
  userId: string;
  friendId: string;
  accepterName: string;
}) {
  await upsertNotification(friendship.userId, `conn-acc:${friendship.id}`, {
    type: 'CONNECTION_ACCEPTED',
    title: `${friendship.accepterName} accepted your request`,
    body: 'You are now connected — walk the path of salah together.',
    href: '/friends',
    meta: { friendshipId: friendship.id, fromUserId: friendship.friendId },
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

  const prayed = await prisma.salahRecord.findFirst({
    where: {
      userId,
      date: startOfDay(now),
      prayer: active,
      kind: 'FARD',
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
  await upsertNotification(userId, dedupeKey, {
    type: 'WAKT_REMINDER',
    title: `${label} wakt ending soon`,
    body: `About ${remainingMins} minute${remainingMins === 1 ? '' : 's'} left — pray now to earn gold in wakt.`,
    href: '/dashboard',
    meta: { prayer: active, remainingMinutes: remainingMins },
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

export async function listNotifications(userId: string, limit = 30) {
  return withNotifications(
    async () => {
      await syncNotificationsForUser(userId);

      const rows = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      rows.sort((a, b) => {
        const aUnread = a.readAt ? 1 : 0;
        const bUnread = b.readAt ? 1 : 0;
        if (aUnread !== bUnread) return aUnread - bUnread;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, readAt: null },
      });

      const notifications: AppNotification[] = rows.map((row) => ({
        id: row.id,
        type: row.type as AppNotification['type'],
        title: row.title,
        body: row.body,
        href: row.href,
        meta: (row.meta as Record<string, unknown>) ?? {},
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      }));

      return { notifications, unreadCount };
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
      if (pokeId) {
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
      .filter((id): id is string => Boolean(id));

    if (pokeIds.length > 0) {
      await prisma.poke.updateMany({
        where: { id: { in: pokeIds }, toUserId: userId, readAt: null },
        data: { readAt: now },
      });
    }
  }, undefined);
}
