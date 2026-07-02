import { jsonOk, jsonError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { computeAndStoreVerse } from '@/lib/ruhaniah-verse';

/** Max users to process per cron invocation (avoids Vercel timeout) */
const MAX_USERS = 200;
/** Batch size for parallel verse computation */
const BATCH_SIZE = 50;

/** Vercel Cron: Precompute daily verses for active users */
export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return jsonError('Unauthorized', 401);
  }

  // Cursor-based pagination: accept ?cursor=<userId> for continuation
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') || undefined;

  // Find active users (logged in within last 7 days), capped at MAX_USERS
  const activeUsers = await prisma.user.findMany({
    where: {
      sessions: {
        some: {
          expiresAt: { gte: new Date() },
        },
      },
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    select: { id: true },
    orderBy: { id: 'asc' },
    take: MAX_USERS,
  });

  // Process in batches of BATCH_SIZE (parallel within batch)
  let processed = 0;
  for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
    const batch = activeUsers.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((u) => computeAndStoreVerse(u.id)),
    );
    processed += results.filter((r) => r.status === 'fulfilled').length;
  }

  const lastId = activeUsers.length > 0 ? activeUsers[activeUsers.length - 1].id : null;
  const hasMore = activeUsers.length === MAX_USERS;

  return jsonOk({
    processed,
    batch: activeUsers.length,
    hasMore,
    nextCursor: hasMore ? lastId : null,
  });
}
