import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { sanitizeUsername } from '@/lib/validation';
import { canView, parseProfilePrivacy } from '@/lib/profile-privacy';

export async function GET(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const raw = req.nextUrl.searchParams.get('q')?.trim().replace(/^@/, '') ?? '';
  const q = sanitizeUsername(raw);
  if (q.length < 2) {
    return jsonOk({ results: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      username: { not: null, contains: q, mode: 'insensitive' },
      NOT: { id: user!.id },
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarColor: true,
      avatarUrl: true,
      profilePrivacy: true,
    },
    take: 12,
    orderBy: { username: 'asc' },
  });

  if (users.length === 0) {
    return jsonOk({ results: [] });
  }

  const userIds = users.map((u) => u.id);
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId: user!.id, friendId: { in: userIds } },
        { friendId: user!.id, userId: { in: userIds } },
      ],
    },
    select: { userId: true, friendId: true, status: true },
  });

  const statusByUserId = new Map<string, 'connected' | 'pending_sent' | 'pending_received'>();
  for (const f of friendships) {
    const otherId = f.userId === user!.id ? f.friendId : f.userId;
    if (f.status === 'ACCEPTED') {
      statusByUserId.set(otherId, 'connected');
    } else if (f.userId === user!.id) {
      statusByUserId.set(otherId, 'pending_sent');
    } else {
      statusByUserId.set(otherId, 'pending_received');
    }
  }

  const qLower = q.toLowerCase();
  const results = users
    .map((u) => {
      const privacy = parseProfilePrivacy(u.profilePrivacy);
      const connectionStatus = statusByUserId.get(u.id) ?? ('none' as const);
      const viewer =
        connectionStatus === 'connected' ? ('connection' as const) : ('public' as const);
      return {
        id: u.id,
        name: u.name,
        username: u.username!,
        avatarColor: u.avatarColor,
        avatarUrl: canView(privacy, 'showAvatarPhoto', viewer) ? u.avatarUrl : null,
        connectionStatus,
      };
    })
    .sort((a, b) => {
      const aPrefix = a.username.toLowerCase().startsWith(qLower);
      const bPrefix = b.username.toLowerCase().startsWith(qLower);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;
      return a.username.localeCompare(b.username);
    })
    .slice(0, 8);

  return jsonOk({ results });
}
