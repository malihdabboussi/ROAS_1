interface CacheEntry {
  value?: unknown
  fetchedAt: number
  inflight?: Promise<unknown>
}

const entries = new Map<string, CacheEntry>()

/**
 * Promise-deduping fetch cache keyed by string.
 *
 * - Concurrent calls for the same key share one in-flight request — this
 *   collapses React StrictMode double-effects and duplicate component mounts
 *   into a single network call.
 * - Successful results are reused for `ttlMs` (default 0 = dedupe only,
 *   every settled call refetches).
 * - Failures are not cached; the next call retries.
 */
export function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { ttlMs?: number },
): Promise<T> {
  const ttlMs = opts?.ttlMs ?? 0
  const existing = entries.get(key)
  if (existing) {
    if (existing.value !== undefined && Date.now() - existing.fetchedAt < ttlMs) {
      return Promise.resolve(existing.value as T)
    }
    if (existing.inflight) return existing.inflight as Promise<T>
  }
  const entry: CacheEntry = existing ?? { fetchedAt: 0 }
  const inflight = fetcher()
    .then((value) => {
      entry.value = value
      entry.fetchedAt = Date.now()
      return value
    })
    .finally(() => {
      entry.inflight = undefined
    })
  entry.inflight = inflight
  entries.set(key, entry)
  return inflight
}

/** Synchronous read of a cached value (ignores TTL freshness). */
export function peekCachedFetch<T>(key: string): T | undefined {
  const existing = entries.get(key)
  if (!existing || existing.value === undefined) return undefined
  return existing.value as T
}

/** Drop all cached entries whose key starts with `keyPrefix`. */
export function invalidateCachedFetch(keyPrefix: string) {
  for (const key of entries.keys()) {
    if (key.startsWith(keyPrefix)) entries.delete(key)
  }
}
