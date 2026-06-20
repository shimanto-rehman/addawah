import { prisma } from './prisma';

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

export async function removeFriendship(friendshipId: string, userId: string) {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) return { ok: false as const, error: 'Not found' };
  if (friendship.userId !== userId && friendship.friendId !== userId) {
    return { ok: false as const, error: 'Not allowed' };
  }
  await prisma.friendship.delete({ where: { id: friendshipId } });
  return { ok: true as const };
}
