import { prisma } from './prisma';
import { batchFriendWeekRates } from './friendship';
import { getBadgeForCoins } from './rewards';
import { canView, parseProfilePrivacy } from './profile-privacy';
import { maskGoldCoins, maskWeekRate, privateWaktRow } from './profile-privacy-apply';
import { POKE_COOLDOWN_MS, applyPokeCooldown } from './poke-cooldown';
import { startOfDay } from './salah-utils';
import {
  emptyFriendWaktRow,
  type FriendWaktRow,
} from './friends-wakt';
import {
  ensureSnapshotsFresh,
  loadSnapshots,
  snapshotToWaktRow,
  summarizeSnapshots,
} from './wakt-snapshot';

export const FRIENDS_PAGE_DEFAULT_LIMIT = 20;
export const FRIENDS_PAGE_MAX_LIMIT = 50;

export const friendUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatarColor: true,
  avatarUrl: true,
  goldCoins: true,
  city: true,
  country: true,
  profilePrivacy: true,
} as const;

export type FriendPeer = {
  friendshipId: string;
  person: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    avatarColor: string;
    avatarUrl: string | null;
    goldCoins: number;
    city: string | null;
    country: string | null;
    profilePrivacy: unknown;
  };
};

export function parseFriendsPageParams(searchParams: URLSearchParams) {
  const cursor = Math.max(0, Number.parseInt(searchParams.get('cursor') ?? '0', 10) || 0);
  const limit = Math.min(
    FRIENDS_PAGE_MAX_LIMIT,
    Math.max(1, Number.parseInt(searchParams.get('limit') ?? String(FRIENDS_PAGE_DEFAULT_LIMIT), 10) || FRIENDS_PAGE_DEFAULT_LIMIT),
  );
  return { cursor, limit };
}

export async function loadAcceptedFriendPeers(viewerId: string): Promise<FriendPeer[]> {
  const accepted = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ userId: viewerId }, { friendId: viewerId }],
    },
    include: {
      user: { select: friendUserSelect },
      friend: { select: friendUserSelect },
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
  });

  const peers = accepted.map((friendship) => ({
    friendshipId: friendship.id,
    person: friendship.userId === viewerId ? friendship.friend : friendship.user,
  }));

  peers.sort((a, b) => a.person.name.localeCompare(b.person.name, undefined, { sensitivity: 'base' }));
  return peers;
}

function groupRecordsByUser(
  records: Array<{
    userId: string;
    prayer: string;
    completed: boolean;
    updatedAt: Date;
  }>,
) {
  return records.reduce<Map<string, Array<{ prayer: string; completed: boolean; updatedAt: Date }>>>(
    (acc, record) => {
      const bucket = acc.get(record.userId);
      const row = {
        prayer: record.prayer,
        completed: record.completed,
        updatedAt: record.updatedAt,
      };
      if (bucket) bucket.push(row);
      else acc.set(record.userId, [row]);
      return acc;
    },
    new Map(),
  );
}

type MapFriendOptions = {
  friendshipId: string;
  weekRate: number;
  connected: boolean;
};

export function mapCircleFriend(
  u: FriendPeer['person'],
  { friendshipId, weekRate, connected }: MapFriendOptions,
) {
  const privacy = parseProfilePrivacy(u.profilePrivacy);
  const viewer = connected ? ('connection' as const) : ('public' as const);
  const showBadge = canView(privacy, 'showBadge', viewer);
  const showPhoto = canView(privacy, 'showAvatarPhoto', viewer);
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    avatarColor: u.avatarColor,
    avatarUrl: showPhoto ? u.avatarUrl : null,
    goldCoins: maskGoldCoins(u.goldCoins, privacy, viewer) ?? 0,
    goldCoinsHidden: !canView(privacy, 'showGoldCoins', viewer),
    friendshipId,
    weekRate: maskWeekRate(weekRate, privacy, viewer),
    weekRateHidden: !canView(privacy, 'showSalahStats', viewer),
    badge: showBadge ? getBadgeForCoins(u.goldCoins) : null,
  };
}

export function mapBoardRow(
  u: FriendPeer['person'],
  friendshipId: string,
  wakt: FriendWaktRow & { isPrivate?: boolean },
) {
  const privacy = parseProfilePrivacy(u.profilePrivacy);
  const viewer = 'connection' as const;
  const showPhoto = canView(privacy, 'showAvatarPhoto', viewer);
  const showCoins = canView(privacy, 'showGoldCoins', viewer);
  const showBadge = canView(privacy, 'showBadge', viewer);
  const goldCoins = u.goldCoins;

  return {
    id: u.id,
    name: u.name,
    username: u.username,
    avatarColor: u.avatarColor,
    avatarUrl: showPhoto ? u.avatarUrl : null,
    goldCoins: maskGoldCoins(goldCoins, privacy, viewer) ?? 0,
    goldCoinsHidden: !showCoins,
    badge: showBadge ? getBadgeForCoins(goldCoins) : null,
    wakt,
  };
}

export async function buildFriendsHubPayload(
  viewerId: string,
  cursor: number,
  limit: number,
) {
  const now = new Date();
  const today = startOfDay(now);

  const [peers, received, me] = await Promise.all([
    loadAcceptedFriendPeers(viewerId),
    prisma.friendship.findMany({
      where: { friendId: viewerId, status: 'PENDING' },
      include: { user: { select: friendUserSelect } },
    }),
    prisma.user.findUnique({
      where: { id: viewerId },
      select: { goldCoins: true },
    }),
  ]);

  const totalFriends = peers.length;
  const pagePeers = peers.slice(cursor, cursor + limit);
  const pageFriendIds = pagePeers.map((p) => p.person.id);
  const allFriendIds = peers.map((p) => p.person.id);

  const waktVisiblePageFriends = pagePeers
    .filter((p) => canView(parseProfilePrivacy(p.person.profilePrivacy), 'showWaktStatus', 'connection'))
    .map((p) => p.person);

  const waktVisibleAllFriends = peers
    .filter((p) => canView(parseProfilePrivacy(p.person.profilePrivacy), 'showWaktStatus', 'connection'))
    .map((p) => p.person);

  const needsSummaryRefresh = cursor === 0;

  const [pageRecords, summaryRecords, recentPokes, weekRates] = await Promise.all([
    pageFriendIds.length > 0
      ? prisma.salahRecord.findMany({
          where: { userId: { in: pageFriendIds }, kind: 'FARD', date: today },
          select: { userId: true, prayer: true, completed: true, updatedAt: true, completedOnTime: true },
        })
      : Promise.resolve([]),
    needsSummaryRefresh && allFriendIds.length > 0
      ? prisma.salahRecord.findMany({
          where: { userId: { in: allFriendIds }, kind: 'FARD', date: today },
          select: { userId: true, prayer: true, completed: true, updatedAt: true, completedOnTime: true },
        })
      : Promise.resolve([]),
    pageFriendIds.length > 0
      ? prisma.poke.findMany({
          where: {
            fromUserId: viewerId,
            toUserId: { in: pageFriendIds },
            createdAt: { gte: new Date(now.getTime() - POKE_COOLDOWN_MS) },
          },
          select: { toUserId: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    batchFriendWeekRates(pageFriendIds),
  ]);

  const pageRecordsByUser = groupRecordsByUser(pageRecords);
  const summaryRecordsByUser = groupRecordsByUser(summaryRecords);

  const lastPokeByFriend = new Map<string, Date>();
  for (const poke of recentPokes) {
    if (!lastPokeByFriend.has(poke.toUserId)) {
      lastPokeByFriend.set(poke.toUserId, poke.createdAt);
    }
  }

  await ensureSnapshotsFresh(waktVisiblePageFriends, pageRecordsByUser, now);

  if (needsSummaryRefresh && waktVisibleAllFriends.length > 0) {
    await ensureSnapshotsFresh(waktVisibleAllFriends, summaryRecordsByUser, now);
  }

  const pageSnapshots = await loadSnapshots(pageFriendIds);
  const allSnapshots = await loadSnapshots(allFriendIds);
  const summary = summarizeSnapshots(allSnapshots.values());

  const friends = pagePeers.map(({ friendshipId, person }) =>
    mapCircleFriend(person, {
      friendshipId,
      weekRate: weekRates.get(person.id) ?? 0,
      connected: true,
    }),
  );

  const board = pagePeers.map(({ friendshipId, person }) => {
    const privacy = parseProfilePrivacy(person.profilePrivacy);
    const showWakt = canView(privacy, 'showWaktStatus', 'connection');

    let wakt: FriendWaktRow & { isPrivate?: boolean };
    if (!showWakt) {
      wakt = { ...privateWaktRow(), userId: person.id } as FriendWaktRow & { isPrivate?: boolean };
    } else {
      const snap = pageSnapshots.get(person.id);
      wakt = snap ? snapshotToWaktRow(snap) : emptyFriendWaktRow(person.id);
      wakt = applyPokeCooldown(wakt, lastPokeByFriend.get(person.id));
    }

    return mapBoardRow(person, friendshipId, wakt);
  });

  const requests = received.map((r) => ({
    ...mapCircleFriend(r.user, { friendshipId: r.id, weekRate: 0, connected: false }),
    status: r.status,
  }));

  const nextOffset = cursor + limit;
  const hasMore = nextOffset < totalFriends;

  return {
    me: {
      goldCoins: me?.goldCoins ?? 0,
      badge: getBadgeForCoins(me?.goldCoins ?? 0),
    },
    requests,
    friends,
    board,
    page: {
      cursor,
      nextCursor: hasMore ? String(nextOffset) : null,
      hasMore,
      limit,
      totalFriends,
    },
    summary: {
      activeInWakt: summary.activeInWakt,
      pokeable: summary.pokeable,
      totalFriends,
      revision: summary.revision,
    },
    updatedAt: now.toISOString(),
  };
}

export async function buildBoardSummary(viewerId: string) {
  const now = new Date();
  const peers = await loadAcceptedFriendPeers(viewerId);
  const allFriendIds = peers.map((p) => p.person.id);

  if (allFriendIds.length === 0) {
    return {
      activeInWakt: 0,
      pokeable: 0,
      totalFriends: 0,
      revision: '0',
    };
  }

  const today = startOfDay(now);
  const waktVisibleAllFriends = peers
    .filter((p) => canView(parseProfilePrivacy(p.person.profilePrivacy), 'showWaktStatus', 'connection'))
    .map((p) => p.person);

  const allRecords = await prisma.salahRecord.findMany({
    where: { userId: { in: allFriendIds }, kind: 'FARD', date: today },
    select: { userId: true, prayer: true, completed: true, updatedAt: true, completedOnTime: true },
  });
  const allRecordsByUser = groupRecordsByUser(allRecords);

  await ensureSnapshotsFresh(waktVisibleAllFriends, allRecordsByUser, now);
  const allSnapshots = await loadSnapshots(allFriendIds);
  const summary = summarizeSnapshots(allSnapshots.values());

  return {
    activeInWakt: summary.activeInWakt,
    pokeable: summary.pokeable,
    totalFriends: peers.length,
    revision: summary.revision,
  };
}
