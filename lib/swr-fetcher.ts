/** SWR fetcher that throws on non-OK responses so errors are not cached as data. */
export async function swrFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}
