import { describe, expect, it, vi } from 'vitest'
import { ChatPrewarmCacheService } from './chat-prewarm-cache.service'

class FakeRedis {
  readonly values = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null
  }

  async set(key: string, value: string, ...args: unknown[]): Promise<string | null> {
    if (args.includes('NX') && this.values.has(key)) return null
    this.values.set(key, value)
    return 'OK'
  }

  async del(key: string): Promise<number> {
    return this.values.delete(key) ? 1 : 0
  }
}

function keyParts(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    orgId: 'org-1',
    conversationId: 'conversation-1',
    campaignId: 'campaign-1',
    spaceId: null,
    scopeKind: 'campaign',
    model: 'google/gemini-3.5-flash',
    modelSettings: { reasoning_effort: 'none', speed_mode: 'fast' },
    source: 'studio',
    ...overrides,
  }
}

describe('ChatPrewarmCacheService', () => {
  it('returns a fresh cached entry for the same key', async () => {
    let now = 1_000
    const cache = new ChatPrewarmCacheService().configureForTests({
      ttlMs: 60_000,
      maxEntries: 10,
      now: () => now,
    })
    const key = cache.createKey(keyParts())
    const builder = vi.fn(async () => ({ marker: 'built-once' }))

    const first = await cache.getOrBuild(key, builder)
    now += 1_000
    const second = await cache.getOrBuild(key, async () => ({ marker: 'built-twice' }))

    expect(first.reused).toBe(false)
    expect(first.cacheStatus).toBe('built_on_send')
    expect(second.reused).toBe(true)
    expect(second.cacheStatus).toBe('hit_completed')
    expect(second.value).toEqual({ marker: 'built-once' })
    expect(builder).toHaveBeenCalledTimes(1)
  })

  it('misses after TTL', async () => {
    let now = 1_000
    const cache = new ChatPrewarmCacheService().configureForTests({
      ttlMs: 100,
      maxEntries: 10,
      now: () => now,
    })
    const key = cache.createKey(keyParts())

    await cache.getOrBuild(key, async () => ({ marker: 'first' }))
    now += 101
    const second = await cache.getOrBuild(key, async () => ({ marker: 'second' }))

    expect(second.reused).toBe(false)
    expect(second.value).toEqual({ marker: 'second' })
  })

  it('changes the key when model, settings, or scope changes', () => {
    const cache = new ChatPrewarmCacheService()
    const base = cache.createKey(keyParts())

    expect(cache.createKey(keyParts({ model: 'anthropic/claude-opus-4.6' }))).not.toBe(base)
    expect(
      cache.createKey(keyParts({ modelSettings: { reasoning_effort: 'low', speed_mode: 'fast' } })),
    ).not.toBe(base)
    expect(cache.createKey(keyParts({ scopeKind: 'personal' }))).not.toBe(base)
    expect(cache.createKey(keyParts({ spaceId: 'space-1' }))).not.toBe(base)
  })

  it('shares one builder promise for concurrent same-key requests', async () => {
    let resolveBuilder: (value: { marker: string }) => void = () => {}
    const pending = new Promise<{ marker: string }>((resolve) => {
      resolveBuilder = resolve
    })
    const cache = new ChatPrewarmCacheService()
    const key = cache.createKey(keyParts())
    const builder = vi.fn(() => pending)

    const first = cache.getOrBuild(key, builder)
    const second = cache.getOrBuild(key, builder)

    expect(builder).toHaveBeenCalledTimes(1)
    resolveBuilder({ marker: 'shared' })
    await expect(first).resolves.toMatchObject({
      cacheKey: key,
      reused: false,
      cacheStatus: 'built_on_send',
      store: 'memory',
      value: { marker: 'shared' },
    })
    await expect(second).resolves.toMatchObject({
      cacheKey: key,
      reused: true,
      cacheStatus: 'joined_in_flight',
      store: 'memory',
      value: { marker: 'shared' },
    })
  })

  it('reuses a completed Redis entry across cache instances', async () => {
    const redis = new FakeRedis()
    const key = new ChatPrewarmCacheService().createKey(keyParts())
    const codec = {
      serialize: JSON.stringify,
      deserialize: (value: string) => JSON.parse(value) as { marker: string },
    }
    const firstCache = new ChatPrewarmCacheService().configureForTests({
      redis,
      redisWaitMs: 10,
      redisPollMs: 1,
    })
    const secondCache = new ChatPrewarmCacheService().configureForTests({
      redis,
      redisWaitMs: 10,
      redisPollMs: 1,
    })

    await firstCache.getOrBuild(key, async () => ({ marker: 'redis-built' }), codec)
    const second = await secondCache.getOrBuild(
      key,
      async () => ({ marker: 'should-not-build' }),
      codec,
    )

    expect(second).toMatchObject({
      reused: true,
      cacheStatus: 'hit_completed',
      store: 'redis',
      value: { marker: 'redis-built' },
    })
  })

  it('joins a Redis in-flight build from another cache instance', async () => {
    const redis = new FakeRedis()
    const key = new ChatPrewarmCacheService().createKey(keyParts())
    const codec = {
      serialize: JSON.stringify,
      deserialize: (value: string) => JSON.parse(value) as { marker: string },
    }
    const firstCache = new ChatPrewarmCacheService().configureForTests({
      redis,
      redisWaitMs: 100,
      redisPollMs: 1,
    })
    const secondCache = new ChatPrewarmCacheService().configureForTests({
      redis,
      redisWaitMs: 100,
      redisPollMs: 1,
    })
    let resolveBuilder: (value: { marker: string }) => void = () => {}
    const pending = new Promise<{ marker: string }>((resolve) => {
      resolveBuilder = resolve
    })

    const first = firstCache.getOrBuild(key, vi.fn(() => pending), codec)
    const second = secondCache.getOrBuild(
      key,
      async () => ({ marker: 'should-not-build' }),
      codec,
    )

    resolveBuilder({ marker: 'redis-shared' })

    await expect(first).resolves.toMatchObject({
      reused: false,
      cacheStatus: 'built_on_send',
      store: 'redis',
      value: { marker: 'redis-shared' },
    })
    await expect(second).resolves.toMatchObject({
      reused: true,
      cacheStatus: 'joined_in_flight',
      store: 'redis',
      value: { marker: 'redis-shared' },
    })
  })
})
