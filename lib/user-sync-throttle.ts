const lastRun = new Map<string, number>();

/** Run `fn` at most once per `intervalMs` per key (e.g. userId). */
export async function throttlePerKey<T>(
  key: string,
  intervalMs: number,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  const now = Date.now();
  const prev = lastRun.get(key) ?? 0;
  if (now - prev < intervalMs) return undefined;
  lastRun.set(key, now);
  return fn();
}
