import { jsonOk, jsonError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { computeAndStoreVerse } from '@/lib/ruhaniah-verse';

/** Vercel Cron: Precompute daily verses for active users */
export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return jsonError('Unauthorized', 401);
  }

  // Find active users (logged in within last 7 days)
  const activeUsers = await prisma.user.findMany({
    where: {
      sessions: {
        some: {
          expiresAt: { gte: new Date() },
        },
      },
    },
    select: { id: true },
  });

  // Process in batches of 50
  let processed = 0;
  for (let i = 0; i < activeUsers.length; i += 50) {
    const batch = activeUsers.slice(i, i + 50);
    const results = await Promise.allSettled(
      batch.map((u) => computeAndStoreVerse(u.id)),
    );
    processed += results.filter((r) => r.status === 'fulfilled').length;
  }

  return jsonOk({ processed, total: activeUsers.length });
}
