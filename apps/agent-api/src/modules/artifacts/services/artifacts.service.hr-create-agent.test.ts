import type { ConfigService } from '@nestjs/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtifactMissionsMediaService } from './artifact-missions-media.service'
import { ArtifactsService } from './artifacts.service'

const stubMissionsMedia = new ArtifactMissionsMediaService({
  loadCookiesForYtDlp: vi.fn(async () => null),
} as any)

function makeConfigMock(): ConfigService {
  return {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
      if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key'
      throw new Error(`Unexpected getOrThrow key: ${key}`)
    }),
    get: vi.fn((key: string, fallback?: string) => {
      if (key === 'INTERNAL_API_TOKEN') return 'internal-token'
      if (key === 'MAIN_API_URL') return 'http://localhost:3001'
      if (key === 'REPLICATE_API_TOKEN') return ''
      if (key === 'GEMINI_API_KEY') return ''
      if (key === 'GOOGLE_API_KEY') return ''
      return fallback ?? ''
    }),
  } as unknown as ConfigService
}

describe('ArtifactsService hrCreateAgent', () => {
  const fetchMock = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns success when persisted verification passes', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-agent' }),
    })

    const service = new ArtifactsService(
      makeConfigMock(),
      { logError: vi.fn() } as any,
      { get: vi.fn(), set: vi.fn() } as any,
      {} as any,
      {} as any,
      { tagMemory: vi.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      stubMissionsMedia,
    ) as any

    service.resolveUserId = vi.fn(() => 'user-1')
    service.getUserClient = vi.fn(async () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => ({ data: { agent_key: 'new_hire' }, error: null }),
              }),
            }),
          }),
        }),
      }),
    }))

    const result = await service.hrCreateAgent(
      { agent_key: 'new_hire', name: 'New Hire', role: 'Copywriter' },
      'session-key',
    )

    expect(result.success).toBe(true)
  })

  it('verifies org-scoped agents with org_id and null user_id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-agent' }),
    })

    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { agent_key: 'new_hire' }, error: null })
    const terminal: any = {
      eq: vi.fn(() => terminal),
      is: vi.fn(() => terminal),
      maybeSingle,
    }

    const service = new ArtifactsService(
      makeConfigMock(),
      { logError: vi.fn() } as any,
      { get: vi.fn(), set: vi.fn() } as any,
      {} as any,
      {} as any,
      { tagMemory: vi.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      stubMissionsMedia,
    ) as any

    service.resolveUserId = vi.fn(() => 'user-1')
    service.resolveOrgId = vi.fn(() => 'org-1')
    service.serviceClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'owner' } }),
              }),
            }),
          }),
        }),
      }),
    }
    service.getUserClient = vi.fn(async () => ({
      from: () => ({
        select: () => terminal,
      }),
    }))

    const result = await service.hrCreateAgent(
      { agent_key: 'new_hire', name: 'New Hire', role: 'Copywriter' },
      'session-key',
    )

    expect(result.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(terminal.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(terminal.is).toHaveBeenCalledWith('user_id', null)
  })

  it('returns success when the scoped agent already exists', async () => {
    const service = new ArtifactsService(
      makeConfigMock(),
      { logError: vi.fn() } as any,
      { get: vi.fn(), set: vi.fn() } as any,
      {} as any,
      {} as any,
      { tagMemory: vi.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      stubMissionsMedia,
    ) as any

    service.resolveUserId = vi.fn(() => 'user-1')
    service.getUserClient = vi.fn(async () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => ({ data: { agent_key: 'new_hire' }, error: null }),
              }),
            }),
          }),
        }),
      }),
    }))

    const result = await service.hrCreateAgent(
      { agent_key: 'new_hire', name: 'New Hire', role: 'Copywriter' },
      'session-key',
    )

    expect(result.success).toBe(true)
    expect(result.existing).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('routes get_agent through the legacy HR wrapper', async () => {
    const service = new ArtifactsService(
      makeConfigMock(),
      { logError: vi.fn() } as any,
      { get: vi.fn(), set: vi.fn() } as any,
      {} as any,
      {} as any,
      { tagMemory: vi.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      stubMissionsMedia,
    ) as any

    service.hrGetAgent = vi.fn(async () => ({ success: true, agent: { agent_key: 'new_hire' } }))

    const result = await service
      .getActionRegistryForTests()
      .get_agent({ agent_key: 'new_hire' }, 'session-key')

    expect(result.success).toBe(true)
    expect(service.hrGetAgent).toHaveBeenCalledWith({ agent_key: 'new_hire' }, 'session-key')
  })

  it('returns failure when persisted verification does not find the agent', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-agent' }),
    })

    const service = new ArtifactsService(
      makeConfigMock(),
      { logError: vi.fn() } as any,
      { get: vi.fn(), set: vi.fn() } as any,
      {} as any,
      {} as any,
      { tagMemory: vi.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      stubMissionsMedia,
    ) as any

    service.resolveUserId = vi.fn(() => 'user-1')
    service.getUserClient = vi.fn(async () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
    }))

    const result = await service.hrCreateAgent(
      { agent_key: 'new_hire', name: 'New Hire', role: 'Copywriter' },
      'session-key',
    )

    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('not yet available')
  })
})
