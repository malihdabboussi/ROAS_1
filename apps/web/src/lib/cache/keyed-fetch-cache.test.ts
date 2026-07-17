import { afterEach, describe, expect, it, vi } from 'vitest'
import { cachedFetch, invalidateCachedFetch, peekCachedFetch } from './keyed-fetch-cache'

describe('keyed-fetch-cache', () => {
  afterEach(() => {
    invalidateCachedFetch('')
    vi.useRealTimers()
  })

  it('reuses a fresh value within ttlMs and refetches after expiry', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b')

    await expect(cachedFetch('k', fetcher, { ttlMs: 1_000 })).resolves.toBe('a')
    await expect(cachedFetch('k', fetcher, { ttlMs: 1_000 })).resolves.toBe('a')
    expect(fetcher).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1_001)
    await expect(cachedFetch('k', fetcher, { ttlMs: 1_000 })).resolves.toBe('b')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('peek ignores ttl and invalidate drops prefix matches', async () => {
    const fetcher = vi.fn().mockResolvedValue(['row'])
    await cachedFetch('shell-conversations:vibey', fetcher, { ttlMs: 30_000 })

    expect(peekCachedFetch<string[]>('shell-conversations:vibey')).toEqual(['row'])
    invalidateCachedFetch('shell-conversations:')
    expect(peekCachedFetch('shell-conversations:vibey')).toBeUndefined()
  })
})
