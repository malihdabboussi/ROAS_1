import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentRuntimeAutoscalerService } from './agent-runtime-autoscaler.service'

function makeConfig(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    'agentRuntimeAutoscaler.enabled': true,
    'agentRuntimeAutoscaler.mode': 'active',
    'agentRuntimeAutoscaler.pollMs': 30000,
    'agentRuntimeAutoscaler.lockTtlMs': 45000,
    'agentRuntimeAutoscaler.minReplicas': 2,
    'agentRuntimeAutoscaler.maxReplicas': 4,
    'agentRuntimeAutoscaler.scaleUpWaitMs': 10000,
    'agentRuntimeAutoscaler.scaleUpConsecutiveSamples': 2,
    'agentRuntimeAutoscaler.scaleUpCooldownMs': 120000,
    'agentRuntimeAutoscaler.scaleDownIdleMs': 900000,
    'agentRuntimeAutoscaler.scaleDownCooldownMs': 900000,
    'agentRuntimeAutoscaler.projectId': '270231dc-870c-4d79-bebc-d77173aa6284',
    'agentRuntimeAutoscaler.environmentId': 'f3bd621a-0de4-40ea-96e2-43177277b2c2',
    'agentRuntimeAutoscaler.serviceId': '132fedbb-11a5-4209-ad65-c2c47f2d4654',
    'agentRuntimeAutoscaler.region': 'europe-west4-drams3a',
    'agentRuntimeAutoscaler.apiToken': 'railway-token',
    'agentRuntimeAutoscaler.apiTokenType': 'project',
    ...overrides,
  }
  return {
    get: vi.fn((key: string) => values[key]),
  }
}

function makeQueue(
  overrides: { counts?: Record<string, number>; jobs?: Array<{ timestamp: number }> } = {},
) {
  return {
    getJobCounts: vi.fn(async () => ({
      waiting: 0,
      prioritized: 0,
      delayed: 0,
      active: 0,
      ...(overrides.counts ?? {}),
    })),
    getJobs: vi.fn(async () => overrides.jobs ?? []),
  }
}

function makeRedis(options: { lock?: 'acquired' | 'denied'; state?: unknown } = {}) {
  const redis = {
    set: vi.fn(async (...args: unknown[]) => {
      if (args.length > 2) return options.lock === 'denied' ? null : 'OK'
      return 'OK'
    }),
    get: vi.fn(async () => (options.state === undefined ? null : JSON.stringify(options.state))),
    eval: vi.fn(async () => 1),
  }
  return redis
}

function makeClient(currentReplicas = 2) {
  return {
    readCurrentReplicas: vi.fn(async () => currentReplicas),
    setReplicas: vi.fn(async () => undefined),
  }
}

function wireRedis(service: AgentRuntimeAutoscalerService, redis: unknown): void {
  vi.spyOn(
    service as unknown as { getRedis: () => Promise<unknown> },
    'getRedis',
  ).mockResolvedValue(redis)
}

describe('AgentRuntimeAutoscalerService', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('fails closed when required Railway config is missing', async () => {
    const queue = makeQueue()
    const client = makeClient()
    const service = new AgentRuntimeAutoscalerService(
      queue as never,
      makeConfig({ 'agentRuntimeAutoscaler.apiToken': '' }) as never,
      client as never,
    )
    wireRedis(service, makeRedis())

    await service.pollOnce()

    expect(queue.getJobCounts).not.toHaveBeenCalled()
    expect(client.setReplicas).not.toHaveBeenCalled()
  })

  it('does not inspect the queue when another replica owns the Redis lock', async () => {
    const queue = makeQueue()
    const client = makeClient()
    const service = new AgentRuntimeAutoscalerService(
      queue as never,
      makeConfig() as never,
      client as never,
    )
    wireRedis(service, makeRedis({ lock: 'denied' }))

    await service.pollOnce()

    expect(queue.getJobCounts).not.toHaveBeenCalled()
    expect(client.setReplicas).not.toHaveBeenCalled()
  })

  it('scales up after the second sustained over-threshold queue sample', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-22T12:00:00.000Z'))
    const now = Date.now()
    const queue = makeQueue({
      counts: { waiting: 1, active: 4 },
      jobs: [{ timestamp: now - 11000 }],
    })
    const client = makeClient(2)
    const service = new AgentRuntimeAutoscalerService(
      queue as never,
      makeConfig() as never,
      client as never,
    )
    wireRedis(
      service,
      makeRedis({
        state: {
          consecutiveScaleUpSamples: 1,
          idleSinceMs: null,
          lastScaleAtMs: 0,
        },
      }),
    )

    await service.pollOnce()

    expect(client.setReplicas).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: expect.any(String) }),
      3,
    )
  })

  it('records dry-run scale decisions without updating Railway', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-22T12:00:00.000Z'))
    const now = Date.now()
    const queue = makeQueue({
      counts: { waiting: 1 },
      jobs: [{ timestamp: now - 11000 }],
    })
    const client = makeClient(2)
    const redis = makeRedis({
      state: {
        consecutiveScaleUpSamples: 1,
        idleSinceMs: null,
        lastScaleAtMs: 0,
      },
    })
    const service = new AgentRuntimeAutoscalerService(
      queue as never,
      makeConfig({ 'agentRuntimeAutoscaler.mode': 'dry_run' }) as never,
      client as never,
    )
    wireRedis(service, redis)

    await service.pollOnce()

    expect(client.setReplicas).not.toHaveBeenCalled()
    expect(redis.set).toHaveBeenCalledWith(
      'agent-runtime:autoscaler:railway-vibeyv2:state',
      expect.stringContaining('"lastScaleAtMs"'),
    )
  })

  it('scales down after the idle window without going below the minimum', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-22T12:00:00.000Z'))
    const queue = makeQueue()
    const client = makeClient(3)
    const service = new AgentRuntimeAutoscalerService(
      queue as never,
      makeConfig() as never,
      client as never,
    )
    wireRedis(
      service,
      makeRedis({
        state: {
          consecutiveScaleUpSamples: 0,
          idleSinceMs: Date.now() - 900000,
          lastScaleAtMs: 0,
        },
      }),
    )

    await service.pollOnce()

    expect(client.setReplicas).toHaveBeenCalledWith(expect.any(Object), 2)
  })
})
