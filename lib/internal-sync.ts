type SyncTask = 'refresh-snapshots' | 'refresh-day-stat' | 'sync-notifications';

/**
 * Trigger an internal sync task via fetch with keepalive.
 * The fetch completes independently of the calling function's lifecycle
 * in serverless environments (Vercel).
 *
 * Uses keepalive: true so the request survives function termination.
 * Failures are silently ignored — this is best-effort background work.
 */
export function triggerSync(task: SyncTask, userId: string, dateKey?: string) {
  const secret = process.env.INTERNAL_SYNC_SECRET;
  if (!secret) return; // Internal sync not configured — skip silently

  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const url = `${origin}/api/internal/sync`;

  const body: Record<string, string> = { userId, task };
  if (dateKey) body.dateKey = dateKey;

  // fetch with keepalive survives function termination
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-secret': secret,
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // Silently ignore — this is best-effort background work
  });
}
