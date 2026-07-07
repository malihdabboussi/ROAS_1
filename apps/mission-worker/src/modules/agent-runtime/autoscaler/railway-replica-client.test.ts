import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgentRuntimeAutoscalerRuntimeConfig } from './agent-runtime-autoscaler.types'
import { RailwayReplicaClient } from './railway-replica-client'

function config(
  overrides: Partial<AgentRuntimeAutoscalerRuntimeConfig> = {},
): AgentRuntimeAutoscalerRuntimeConfig {
  return {
    enabled: true,
    mode: 'active',
    pollMs: 30000,
    lockTtlMs: 45000,
    minReplicas: 2,
    maxReplicas: 4,
    scaleUpWaitMs: 10000,
    scaleUpConsecutiveSamples: 2,
    scaleUpCooldownMs: 120000,
    scaleDownIdleMs: 900000,
    scaleDownCooldownMs: 900000,
    projectId: 'project-1',
    environmentId: 'environment-1',
    serviceId: 'service-1',
    region: 'europe-west4-drams3a',
    apiToken: 'railway-token',
    apiTokenType: 'project',
    ...overrides,
  }
}

describe('RailwayReplicaClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('reads the current replica count with a Railway project token', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: vi.fn(async () =>
        JSON.stringify({
          data: {
            serviceInstance: {
              numReplicas: 2,
              serviceName: 'VibeyV2',
            },
          },
        }),
      ),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const replicas = await new RailwayReplicaClient().readCurrentReplicas(config())

    expect(replicas).toBe(2)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://backboard.railway.app/graphql/v2',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Project-Access-Token': 'railway-token',
        }),
      }),
    )
  })

  it('updates replicas through serviceInstanceUpdate multiRegionConfig', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: vi.fn(async () => JSON.stringify({ data: { serviceInstanceUpdate: true } })),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await new RailwayReplicaClient().setReplicas(config(), 3)

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
      variables: Record<string, unknown>
    }
    expect(body.variables).toEqual(
      expect.objectContaining({
        environmentId: 'environment-1',
        serviceId: 'service-1',
        input: {
          multiRegionConfig: {
            'europe-west4-drams3a': {
              numReplicas: 3,
            },
          },
        },
      }),
    )
  })

  it('uses bearer auth when configured for account or workspace tokens', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: vi.fn(async () => JSON.stringify({ data: { serviceInstanceUpdate: true } })),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await new RailwayReplicaClient().setReplicas(config({ apiTokenType: 'bearer' }), 3)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://backboard.railway.app/graphql/v2',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer railway-token',
        }),
      }),
    )
  })

  it('surfaces Railway GraphQL errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: vi.fn(async () => JSON.stringify({ errors: [{ message: 'bad token' }] })),
      })),
    )

    await expect(new RailwayReplicaClient().readCurrentReplicas(config())).rejects.toThrow(
      'bad token',
    )
  })

  it('rejects invalid replica read responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: vi.fn(async () => JSON.stringify({ data: { serviceInstance: {} } })),
      })),
    )

    await expect(new RailwayReplicaClient().readCurrentReplicas(config())).rejects.toThrow(
      'valid numReplicas',
    )
  })
})
