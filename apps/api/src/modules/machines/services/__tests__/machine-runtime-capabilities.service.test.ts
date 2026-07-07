import { afterEach, describe, expect, it, vi } from 'vitest'
import { MachineRuntimeCapabilitiesService } from '../machine-runtime-capabilities.service'

const baseCapabilities = {
  service: 'vibey-agent-api',
  version: '0.1.0',
  mode: 'user',
  ready: true,
  syncStatus: 'ok',
  gatewayReady: true,
  authReady: true,
  userIdResolved: true,
}

describe('MachineRuntimeCapabilitiesService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts chat runtime without work-only capabilities', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...baseCapabilities,
          capabilities: {
            ready_probe: true,
            identity_bind: true,
            openclaw_responses: false,
          },
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const service = new MachineRuntimeCapabilitiesService()
    await expect(
      service.probe('machine-1', 'vibey-runtimes', { requiredRuntime: 'chat' }),
    ).resolves.toMatchObject({
      compatible: true,
      requiredRuntime: 'chat',
      missingCapabilities: [],
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects work runtime when the real work route is missing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...baseCapabilities,
            capabilities: {
              ready_probe: true,
              identity_bind: true,
              openclaw_responses: true,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const service = new MachineRuntimeCapabilitiesService()
    await expect(
      service.probe('machine-1', 'vibey-runtimes', { requiredRuntime: 'work' }),
    ).resolves.toMatchObject({
      compatible: false,
      retryable: false,
      failureCode: 'runtime_work_route_missing',
      missingCapabilities: ['openclaw_responses'],
    })
  })

  it('accepts work runtime when the work route exists behind its guard', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...baseCapabilities,
            capabilities: {
              ready_probe: true,
              identity_bind: true,
              openclaw_responses: true,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const service = new MachineRuntimeCapabilitiesService()
    await expect(
      service.probe('machine-1', 'vibey-runtimes', { requiredRuntime: 'work' }),
    ).resolves.toMatchObject({
      compatible: true,
      requiredRuntime: 'work',
      missingCapabilities: [],
    })
  })
})
