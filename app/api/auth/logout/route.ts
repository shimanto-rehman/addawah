import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { PRIVATE_CACHE_HEADERS } from '@/lib/api-helpers';

export async function POST() {
  await destroySession();
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        ...PRIVATE_CACHE_HEADERS,
        // Drop cached app pages so Back cannot resurrect a logged-in shell.
        'Clear-Site-Data': '"cache"',
      },
    }
  );
}
