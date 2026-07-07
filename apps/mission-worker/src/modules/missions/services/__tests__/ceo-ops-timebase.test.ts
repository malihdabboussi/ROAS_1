import { describe, expect, it, vi } from 'vitest'
import { CeoOperationalLoopService } from '../ceo-operational-loop.service'

type MutableProfile = {
  last_ceo_eval_at: string | null
  ops_backoff_until: string | null
}

function createSupabase(profile: MutableProfile) {
  let missionsFromCount = 0
  const campaignRows = [
    {
      id: 'camp-1',
      name: 'Campaign A',
      status: 'active',
      context: {
        north_star_defined_at: '2026-03-01T00:00:00.000Z',
        result: 'Grow leads',
        purpose: 'Acquire demand',
        strategy: 'Always-on content',
      },
      has_active_work: false,
    },
  ]

  return {
    from: vi.fn((table: string) => {
      if (table === 'agents_registry') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi
            .fn()
            .mockReturnThis()
            .mockImplementationOnce(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ agent_key: 'ceo', name: 'CEO', config: { archetype: 'ceo' } }],
                error: null,
              }),
            })),
        }
      }

      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { ...profile }, error: null }),
          update: vi.fn((payload: Record<string, unknown>) => {
            if (Object.prototype.hasOwnProperty.call(payload, 'last_ceo_eval_at')) {
              profile.last_ceo_eval_at = String(payload.last_ceo_eval_at || null)
            }
            if (Object.prototype.hasOwnProperty.call(payload, 'ops_backoff_until')) {
              profile.ops_backoff_until =
                payload.ops_backoff_until == null ? null : String(payload.ops_backoff_until)
            }
            return {
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }
          }),
        }
      }

      if (table === 'campaigns') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockResolvedValue({ data: campaignRows, error: null }),
        }
      }

      if (table === 'campaign_agents') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ campaign_id: 'camp-1', agent_key: 'copywriter' }],
            error: null,
          }),
        }
      }

      if (table === 'missions') {
        missionsFromCount += 1
        // Same supabase mock is reused across multiple runForUser() calls; pattern repeats every 3 queries.
        const n = ((missionsFromCount - 1) % 3) + 1
        if (n === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                { campaign_id: 'camp-1', title: 'old mission', status: 'done', updated_at: 'now' },
              ],
              error: null,
            }),
          }
        }
        if (n === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        const activeChain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockImplementation((col: string) => {
            if (col === 'status') {
              return Promise.resolve({ data: [], error: null })
            }
            return activeChain
          }),
        }
        return activeChain
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

function createCeoEvaluatorMock() {
  return {
    hasAvailableCredits: vi.fn().mockResolvedValue(true),
    disableAwarenessAndNotify: vi.fn().mockResolvedValue(undefined),
  } as any
}

function createAwarenessDispatcherMock() {
  return {
    dispatchCeoOpsAmendments: vi.fn().mockResolvedValue(undefined),
  } as any
}

describe('CeoOperationalLoopService (timebase simulation)', () => {
  it('enforces 10m cooldown without real waiting', async () => {
    const profile: MutableProfile = { last_ceo_eval_at: null, ops_backoff_until: null }
    const supabase = createSupabase(profile)
    const databaseService = { getClient: vi.fn().mockReturnValue(supabase) } as any
    const configService = {
      get: vi.fn((key: string) => {
        if (key === 'missionApi.callbackUrl')
          return 'http://localhost:3001/api/internal/missions/callback'
        if (key === 'missionApi.internalToken') return 'internal-token'
        return ''
      }),
    } as any
    const openclawGateway = {
      callOpenClawRaw: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          action: 'assign',
          missions: [{ title: 'Do next step', brief: 'Continue strategy', campaign_id: 'camp-1' }],
        }),
      }),
    } as any
    const jsonService = {
      tryParseJsonStrict: vi.fn((raw: string) => JSON.parse(raw)),
    } as any
    const evaluator = createCeoEvaluatorMock()
    const awarenessActionDispatcher = createAwarenessDispatcherMock()
    const service = new CeoOperationalLoopService(
      configService,
      databaseService,
      evaluator,
      openclawGateway,
      jsonService,
      awarenessActionDispatcher,
    )

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    try {
      const first = await service.runForUser('user-1')
      expect(first.acted).toBe(true)
      expect(openclawGateway.callOpenClawRaw).toHaveBeenCalledTimes(1)

      const second = await service.runForUser('user-1')
      expect(second.acted).toBe(false)
      expect(openclawGateway.callOpenClawRaw).toHaveBeenCalledTimes(1)

      profile.last_ceo_eval_at = new Date(Date.now() - 11 * 60 * 1000).toISOString()

      const third = await service.runForUser('user-1')
      expect(third.acted).toBe(true)
      expect(openclawGateway.callOpenClawRaw).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('applies 2h backoff for nothing_to_assign and re-allows after expiry', async () => {
    const profile: MutableProfile = { last_ceo_eval_at: null, ops_backoff_until: null }
    const supabase = createSupabase(profile)
    const databaseService = { getClient: vi.fn().mockReturnValue(supabase) } as any
    const configService = {
      get: vi.fn((key: string) => {
        if (key === 'missionApi.callbackUrl')
          return 'http://localhost:3001/api/internal/missions/callback'
        if (key === 'missionApi.internalToken') return 'internal-token'
        return ''
      }),
    } as any

    let decision: 'nothing_to_assign' | 'assign' = 'nothing_to_assign'
    const openclawGateway = {
      callOpenClawRaw: vi.fn().mockImplementation(async () => ({
        content: JSON.stringify(
          decision === 'nothing_to_assign'
            ? { action: 'nothing_to_assign', missions: [] }
            : {
                action: 'assign',
                missions: [{ title: 'Resume', brief: 'Resume work', campaign_id: 'camp-1' }],
              },
        ),
      })),
    } as any
    const jsonService = {
      tryParseJsonStrict: vi.fn((raw: string) => JSON.parse(raw)),
    } as any
    const evaluator = createCeoEvaluatorMock()
    const awarenessActionDispatcher = createAwarenessDispatcherMock()
    const service = new CeoOperationalLoopService(
      configService,
      databaseService,
      evaluator,
      openclawGateway,
      jsonService,
      awarenessActionDispatcher,
    )

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    try {
      const first = await service.runForUser('user-1')
      expect(first.acted).toBe(false)
      expect(profile.ops_backoff_until).not.toBeNull()
      expect(openclawGateway.callOpenClawRaw).toHaveBeenCalledTimes(1)

      const second = await service.runForUser('user-1')
      expect(second.acted).toBe(false)
      expect(openclawGateway.callOpenClawRaw).toHaveBeenCalledTimes(1)

      decision = 'assign'
      profile.ops_backoff_until = new Date(Date.now() - 60 * 1000).toISOString()
      profile.last_ceo_eval_at = new Date(Date.now() - 11 * 60 * 1000).toISOString()

      const third = await service.runForUser('user-1')
      expect(third.acted).toBe(true)
      expect(openclawGateway.callOpenClawRaw).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('prevents runaway calls across many rapid scheduler-like ticks', async () => {
    const profile: MutableProfile = { last_ceo_eval_at: null, ops_backoff_until: null }
    const supabase = createSupabase(profile)
    const databaseService = { getClient: vi.fn().mockReturnValue(supabase) } as any
    const configService = {
      get: vi.fn((key: string) => {
        if (key === 'missionApi.callbackUrl')
          return 'http://localhost:3001/api/internal/missions/callback'
        if (key === 'missionApi.internalToken') return 'internal-token'
        return ''
      }),
    } as any
    const openclawGateway = {
      callOpenClawRaw: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          action: 'assign',
          missions: [{ title: 'Mission', brief: 'Brief', campaign_id: 'camp-1' }],
        }),
      }),
    } as any
    const jsonService = {
      tryParseJsonStrict: vi.fn((raw: string) => JSON.parse(raw)),
    } as any
    const evaluator = createCeoEvaluatorMock()
    const awarenessActionDispatcher = createAwarenessDispatcherMock()
    const service = new CeoOperationalLoopService(
      configService,
      databaseService,
      evaluator,
      openclawGateway,
      jsonService,
      awarenessActionDispatcher,
    )

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    try {
      for (let i = 0; i < 50; i += 1) {
        await service.runForUser('user-1')
      }
      // First tick may call model; subsequent rapid ticks should be blocked by 10m cooldown.
      expect(openclawGateway.callOpenClawRaw).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
