import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonOk, jsonError } from '@/lib/api-helpers';
import { isValidInternalSecret } from '@/lib/internal-auth';
import { refreshSnapshotsForSalahUser } from '@/lib/wakt-snapshot';
import { refreshSalahDayStatForUser } from '@/lib/salah-day-stats';
import { maybeSyncNotificationsForUser } from '@/lib/notifications';

const syncSchema = z.object({
  userId: z.string(),
  task: z.enum(['refresh-snapshots', 'refresh-day-stat', 'sync-notifications']),
  dateKey: z.string().optional(),
});

/**
 * Internal sync endpoint for fire-and-forget work.
 * Protected by x-sync-secret header — not accessible from outside.
 *
 * Called via fetch() with keepalive: true from API routes
 * so the sync work completes independently of the calling function's lifecycle.
 */
export async function POST(req: NextRequest) {
  // Validate internal secret
  const headerValue = req.headers.get('x-sync-secret');
  if (!isValidInternalSecret(headerValue)) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const body = syncSchema.parse(await req.json());

    switch (body.task) {
      case 'refresh-snapshots':
        await refreshSnapshotsForSalahUser(body.userId);
        break;

      case 'refresh-day-stat':
        if (!body.dateKey) return jsonError('dateKey required for refresh-day-stat', 400);
        await refreshSalahDayStatForUser(body.userId, body.dateKey);
        break;

      case 'sync-notifications':
        await maybeSyncNotificationsForUser(body.userId);
        break;
    }

    return jsonOk({ ok: true });
  } catch (e) {
    console.error('[internal/sync]', e);
    return jsonError('Sync failed', 500);
  }
}
