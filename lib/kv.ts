function kvConfig() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

export function isKvEnabled() {
  const { url, token } = kvConfig();
  return Boolean(url && token);
}

export async function kvGet(key: string): Promise<string | null> {
  const { url, token } = kvConfig();
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string | null };
    return json.result ?? null;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: string, exSeconds: number) {
  const { url, token } = kvConfig();
  if (!url || !token) return;
  try {
    await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value, ex: exSeconds }),
    });
  } catch {
    // optional cache — ignore failures
  }
}

/**
 * Atomic increment with TTL. Uses Upstash pipeline to run INCR + EXPIRE
 * in a single HTTP request (1 round-trip, 2 commands counted).
 * Returns the new value, or null if Redis is unavailable.
 */
export async function kvIncr(key: string, ttlSeconds: number): Promise<number | null> {
  const { url, token } = kvConfig();
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([['incr', key], ['expire', key, ttlSeconds]]),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result: [number, number] };
    return json.result[0];
  } catch {
    return null;
  }
}

export async function kvDel(key: string) {
  const { url, token } = kvConfig();
  if (!url || !token) return;
  try {
    await fetch(`${url}/del/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // optional cache — ignore failures
  }
}

export async function kvGetJson<T>(key: string): Promise<T | null> {
  const raw = await kvGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSetJson(key: string, value: unknown, exSeconds: number) {
  await kvSet(key, JSON.stringify(value), exSeconds);
}
