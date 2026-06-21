import { NextResponse } from 'next/server';
import { getSessionUser } from './auth';

export async function apiRequireAuth() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, error: null };
}

/** Prevent browsers from caching authenticated responses (bfcache / back button). */
export const PRIVATE_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export function jsonOk<T>(data: T, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(data, { status, headers: { ...PRIVATE_CACHE_HEADERS, ...headers } });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
