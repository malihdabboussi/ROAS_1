'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Tiny stale-while-revalidate cache for sidebar/menu fetchers.
 *
 * Goals (intentional non-goals: SWR/React-Query parity):
 * - Subsequent hooks read the previous snapshot synchronously (no flicker).
 * - The fetcher is only re-run when the cache is older than `ttlMs` or when
 *   `mutate()` invalidates it.
 * - Mutations (create/update/delete) can update the cache locally without a refetch.
 */
export interface CachedResource<T> {
  /**
   * React hook that returns the latest snapshot, a loading flag, an error,
   * and a `reload()` that forces a refetch.
   */
  use: (options?: { enabled?: boolean }) => {
    data: T | undefined
    loading: boolean
    error: string | null
    reload: () => Promise<void>
  }
  /** Imperative read: returns the cached value (may be undefined if never fetched). */
  peek: () => T | undefined
  /** Replace the cached value and notify subscribers. */
  mutate: (next: T | ((prev: T | undefined) => T)) => void
  /** Invalidate the cache so the next `use()` revalidates. */
  invalidate: () => void
  /** Force a refetch now (returns the fresh value). */
  reload: () => Promise<T>
}

interface CacheEntry<T> {
  value: T | undefined
  fetchedAt: number
  inflight: Promise<T> | null
  listeners: Set<() => void>
}

interface Options {
  /** Stale-after-this duration (ms). Default 30s. */
  ttlMs?: number
}

export function createCachedResource<T>(
  fetcher: () => Promise<T>,
  options: Options = {},
): CachedResource<T> {
  const ttl = options.ttlMs ?? 30_000
  const entry: CacheEntry<T> = {
    value: undefined,
    fetchedAt: 0,
    inflight: null,
    listeners: new Set(),
  }

  function notify() {
    for (const fn of entry.listeners) fn()
  }

  function isFresh(): boolean {
    return entry.value !== undefined && Date.now() - entry.fetchedAt < ttl
  }

  async function reload(): Promise<T> {
    if (entry.inflight) return entry.inflight
    const p = fetcher()
      .then((v) => {
        entry.value = v
        entry.fetchedAt = Date.now()
        notify()
        return v
      })
      .finally(() => {
        entry.inflight = null
      })
    entry.inflight = p
    return p
  }

  function peek() {
    return entry.value
  }

  function mutate(next: T | ((prev: T | undefined) => T)) {
    const value =
      typeof next === 'function' ? (next as (prev: T | undefined) => T)(entry.value) : next
    entry.value = value
    entry.fetchedAt = Date.now()
    notify()
  }

  function invalidate() {
    entry.fetchedAt = 0
  }

  function use(options: { enabled?: boolean } = {}) {
    const enabled = options.enabled ?? true
    const [, setTick] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(enabled && entry.value === undefined)

    useEffect(() => {
      const subscriber = () => setTick((t) => t + 1)
      entry.listeners.add(subscriber)
      // Revalidate if stale (or never fetched).
      let cancelled = false
      const shouldFetch = enabled && !isFresh()
      if (shouldFetch) {
        if (entry.value === undefined) setLoading(true)
        reload()
          .then(() => {
            if (!cancelled) {
              setError(null)
              setLoading(false)
            }
          })
          .catch((err) => {
            if (!cancelled) {
              setError(err instanceof Error ? err.message : 'Failed to load')
              setLoading(false)
            }
          })
      } else {
        setLoading(false)
      }
      return () => {
        cancelled = true
        entry.listeners.delete(subscriber)
      }
    }, [enabled])

    const reloadForHook = useCallback(async () => {
      try {
        setError(null)
        setLoading(true)
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }, [])

    return {
      data: entry.value,
      loading: enabled && entry.value === undefined && !error ? true : loading,
      error,
      reload: reloadForHook,
    }
  }

  return { use, peek, mutate, invalidate, reload }
}
