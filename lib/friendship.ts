import { prisma } from './prisma';
import { countCompleted, startOfWeek, addDays } from './salah-utils';

const DEFAULT_WEEK_FARD_SLOTS = 35;

export type ConnectionStatus =
  | 'none'
  | 'connected'
  | 'pending_sent'
  | 'pending_received'
  | 'self';

export type ConnectionInfo = {
  status: ConnectionStatus;
  friendshipId: string | null;
};

export async function getConnectionBetween(
  viewerId: string,
  targetUserId: string,
): Promise<ConnectionInfo> {
  if (viewerId === targetUserId) {
    return { status: 'self', friendshipId: null };
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: viewerId, friendId: targetUserId },
        { userId: targetUserId, friendId: viewerId },
      ],
    },
  });

  if (!friendship) return { status: 'none', friendshipId: null };
  if (friendship.status === 'ACCEPTED') {
    return { status: 'connected', friendshipId: friendship.id };
  }
  if (friendship.userId === viewerId) {
    return { status: 'pending_sent', friendshipId: friendship.id };
  }
  return { status: 'pending_received', friendshipId: friendship.id };
}

/** Weekly fard completion % for many users in one query (Mon–Sun window). */
export async function batchFriendWeekRates(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);

  const records = await prisma.salahRecord.findMany({
    where: {
      userId: { in: userIds },
      date: { gte: weekStart, lte: weekEnd },
    },
    select: { userId: true, completed: true },
  });

  const recordsByUser = records.reduce<Map<string, { completed: boolean }[]>>((acc, record) => {
    const bucket = acc.get(record.userId);
    if (bucket) bucket.push(record);
    else acc.set(record.userId, [record]);
    return acc;
  }, new Map());

  return new Map(
    userIds.map((id) => {
      const userRecords = recordsByUser.get(id) ?? [];
      const total = userRecords.length || DEFAULT_WEEK_FARD_SLOTS;
      const rate = Math.round((countCompleted(userRecords) / total) * 100);
      return [id, rate] as const;
    }),
  );
}

export async function removeFriendship(friendshipId: string, userId: string) {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) return { ok: false as const, error: 'Not found' };
  if (friendship.userId !== userId && friendship.friendId !== userId) {
    return { ok: false as const, error: 'Not allowed' };
  }
  await prisma.friendship.delete({ where: { id: friendshipId } });
  return { ok: true as const };
}
