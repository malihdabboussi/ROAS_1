import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MissionOpenclawGateway } from '../gateways/mission-openclaw.gateway'
import { MissionAgentStateService } from '../persistence/mission-agent-state.service'

function createService() {
  const configService = {
    get: vi.fn((key: string) => {
      if (key === 'openclaw.modelPrefix') return 'openclaw'
      if (key === 'missionApi.agentApiUrl') return 'https://agent-api.local'
      return undefined
    }),
  } as any

  const databaseService = {
    getClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === 'monthly_credit_usage') {
          const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            order: vi.fn(() => chain),
            limit: vi.fn(() => chain),
            maybeSingle: vi.fn(async () => ({
              data: {
                base_allowance: 100,
                rollover_credits: 0,
                total_credits_purchased: 0,
                total_credits_used: 0,
              },
              error: null,
            })),
          }
          return chain
        }
        return {}
      }),
    })),
  } as any

  const agentRuntimeService = {
    resolveRuntimeAgent: vi.fn(
      async (_supabase: unknown, _userId: string, agentKey: string, orgId?: string | null) => {
        return {
          gatewayAgentId: orgId ? `org-${orgId}-${agentKey}` : agentKey,
          level: 'employee',
          agentKey,
        }
      },
    ),
    buildMissionSessionKey: vi.fn(
      ({
        gatewayAgentId,
        agentKey,
        userId,
        missionId,
      }: {
        gatewayAgentId: string
        agentKey: string
        userId: string
        missionId: string
      }) => `agent:${gatewayAgentId}:mission:${agentKey}:${userId}:${missionId}`,
    ),
    buildBrainOpsSessionKey: vi.fn(
      ({
        gatewayAgentId,
        agentKey,
        userId,
        outboxId,
        orgId,
      }: {
        gatewayAgentId: string
        agentKey: string
        userId: string
        outboxId: string
        orgId?: string | null
      }) =>
        `agent:${gatewayAgentId}:brain_ops:${agentKey}:${userId}:${outboxId}${orgId ? `::org:${orgId}` : ''}`,
    ),
    buildStateSessionKey: vi.fn(),
    buildMissionLane: vi.fn(({ missionId }: { missionId: string }) => `mission:${missionId}`),
    buildSubtaskLane: vi.fn(
      ({ missionId, subtaskId }: { missionId: string; subtaskId: string }) =>
        `mission:${missionId}:subtask:${subtaskId}`,
    ),
    buildEvalLane: vi.fn(({ missionId }: { missionId: string }) => `mission:${missionId}:eval`),
    buildBrainOpsLane: vi.fn(
      ({ userId, outboxId, orgId }: { userId: string; outboxId: string; orgId?: string | null }) =>
        `brain:${orgId ?? userId}:${outboxId}`,
    ),
  } as any

  const contextService = {} as any
  const stateRepo = {} as any
  const deliverablesRepo = {} as any
  const qualityEvidenceRepo = {} as any
  const jsonService = {} as any
  const missionTracing = {
    startTrace: vi.fn().mockResolvedValue(null),
    completeTrace: vi.fn().mockResolvedValue(undefined),
    failTrace: vi.fn().mockResolvedValue(undefined),
  } as any
  const service = new MissionOpenclawGateway(
    configService,
    databaseService,
    agentRuntimeService,
    contextService,
    stateRepo,
    deliverablesRepo,
    qualityEvidenceRepo,
    jsonService,
    missionTracing,
  ) as any
  service.assertMissionHasCredits = vi.fn(async () => undefined)
  service.buildMissionAttachmentContext = vi.fn(async () => '')
  return service
}

describe('Mission worker tool access smoke', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        object: 'response',
        id: 'resp_1',
        status: 'completed',
        model: 'openclaw:test',
        created_at: Math.floor(Date.now() / 1000),
        output: [
          {
            type: 'message',
            id: 'msg_1',
            role: 'assistant',
            content: [{ type: 'output_text', text: '{"content":"done","summary":"ok"}' }],
            status: 'completed',
          },
        ],
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      }),
    })) as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('routes marketing worker mission call through artifact gateway', async () => {
    const service = createService()
    service['resolveAgentSelectedModel'] = vi.fn(async () => null)
    service['resolveAgentApiTargetStateForUser'] = vi.fn(async () => ({
      target: {
        baseUrl: 'https://agent-api.local',
        machineId: null,
      },
      machineStatus: null,
      hasMachine: false,
    }))

    const mission = {
      id: 'mission-1',
      user_id: 'user-1',
      correlation_id: 'corr-1',
    }

    const result = await service.callOpenClawRaw(
      mission,
      'copywriter',
      'campaign context',
      'task user message',
    )

    expect(result.content).toContain('"summary":"ok"')
    expect(global.fetch).toHaveBeenCalledTimes(2)

    const [readyUrl, readyInit] = (global.fetch as any).mock.calls[0]
    expect(readyUrl).toBe('https://agent-api.local/api/agents/copywriter/ensure-ready')
    expect(readyInit.headers['x-openclaw-internal']).toBe('true')
    expect(JSON.parse(readyInit.body)).toEqual({
      user_id: 'user-1',
      org_id: null,
      gateway_agent_id: 'copywriter',
    })

    const [url, init] = (global.fetch as any).mock.calls[1]
    expect(url).toBe('https://agent-api.local/api/artifacts/openclaw/responses')
    expect(init.headers['x-openclaw-session-key']).toBe(
      'agent:copywriter:mission:copywriter:user-1:mission-1',
    )
    expect(init.headers['x-openclaw-agent-id']).toBe('copywriter')
    expect(JSON.parse(init.body).lane).toBe('mission:mission-1')
  })

  it('gives every mission an authoritative current date for temporal claims', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-19T20:33:00.000Z'))
    try {
      const service = createService()
      const instructions = service['buildStaticMissionInstructions']({
        id: 'mission-date-context',
        user_id: 'user-1',
      })

      expect(instructions).toContain('CURRENT_DATETIME_UTC=2026-07-19T20:33:00.000Z')
      expect(instructions).toContain(
        'Compare full calendar dates against CURRENT_DATETIME_UTC before labeling anything past, current, or upcoming.',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('routes analyst worker mission call through artifact gateway', async () => {
    const service = createService()
    service['resolveAgentSelectedModel'] = vi.fn(async () => null)
    service['resolveAgentApiTargetStateForUser'] = vi.fn(async () => ({
      target: {
        baseUrl: 'https://agent-api.local',
        machineId: null,
      },
      machineStatus: null,
      hasMachine: false,
    }))

    const mission = {
      id: 'mission-2',
      user_id: 'user-2',
      correlation_id: 'corr-2',
    }

    await service.callOpenClawRaw(mission, 'analyst', '', 'user prompt')

    expect(global.fetch).toHaveBeenCalledTimes(2)
    const [, init] = (global.fetch as any).mock.calls[1]
    expect(init.headers['x-openclaw-session-key']).toBe(
      'agent:analyst:mission:analyst:user-2:mission-2',
    )
    expect(init.headers['x-openclaw-agent-id']).toBe('analyst')
    expect(JSON.parse(init.body).lane).toBe('mission:mission-2')
  })

  it('routes explicit Power missions to bounded medium-effort Opus review', async () => {
    const service = createService()
    service['resolveAgentSelectedModel'] = vi.fn(async () => 'auto:power')
    service['resolveAgentApiTargetStateForUser'] = vi.fn(async () => ({
      target: {
        baseUrl: 'https://agent-api.local',
        machineId: null,
      },
      machineStatus: null,
      hasMachine: false,
    }))

    await service.callOpenClawRaw(
      {
        id: 'mission-power',
        user_id: 'user-power',
        correlation_id: 'corr-power',
      },
      'analyst',
      '',
      'power mission prompt',
    )

    const [, init] = (global.fetch as any).mock.calls[1]
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'openrouter/anthropic/claude-opus-5',
      context_window_tokens: 300_000,
      reasoning: { effort: 'medium' },
    })
  })

  it('keeps subscription models off the OpenRouter namespace before proxying', () => {
    const service = createService()

    expect(service['normalizeGatewayModel']('openai-codex/gpt-5.5')).toBe('openai-codex/gpt-5.5')
    expect(service['normalizeGatewayModel']('anthropic-subscription/claude-sonnet-4-6')).toBe(
      'anthropic/claude-sonnet-4.6',
    )
    expect(service['normalizeGatewayModel']('gpt-5.5-codex')).toBe('openai-codex/gpt-5.5-codex')
    expect(service['normalizeGatewayModel']('anthropic/claude-sonnet-4.6')).toBe(
      'openrouter/anthropic/claude-sonnet-4.6',
    )
  })

  it('routes brain ops calls without mission session identity', async () => {
    const service = createService()
    service['resolveAgentSelectedModel'] = vi.fn(async () => null)
    service['resolveAgentApiTargetStateForUser'] = vi.fn(async () => ({
      target: {
        baseUrl: 'https://agent-api.local',
        machineId: null,
      },
      machineStatus: null,
      hasMachine: false,
    }))

    await service.callOpenClawRaw(
      {
        id: 'outbox-1',
        user_id: 'user-1',
        org_id: 'org-1',
        correlation_id: 'outbox-1',
      },
      'atlas',
      '',
      'brain ops prompt',
      undefined,
      'mission_execute',
      { channel: 'brain-ops', maxOutputTokens: 8_192, toolChoice: 'none' },
    )

    expect(global.fetch).toHaveBeenCalledTimes(2)
    const [readyUrl, readyInit] = (global.fetch as any).mock.calls[0]
    expect(readyUrl).toBe('https://agent-api.local/api/agents/atlas/ensure-ready')
    expect(JSON.parse(readyInit.body)).toEqual({
      user_id: 'user-1',
      org_id: 'org-1',
      gateway_agent_id: 'org-org-1-atlas',
    })
    const [, init] = (global.fetch as any).mock.calls[1]
    expect(init.headers['x-openclaw-session-key']).toBe(
      'agent:org-org-1-atlas:brain_ops:atlas:user-1:outbox-1::org:org-1',
    )
    expect(JSON.parse(init.body)).toMatchObject({
      lane: 'brain:org-1:outbox-1',
      max_output_tokens: 8_192,
      tool_choice: 'none',
    })
  })

  it('keeps provisioned users pinned when the cached machine status is not running', async () => {
    const service = createService()
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: {
          fly_machine_id: 'machine-123',
          fly_machine_url: 'https://machine-123.vm.vibey-runtimes.fly.dev',
          fly_machine_status: 'stopped',
        },
      })),
    }
    const supabase = {
      from: vi.fn(() => query),
    } as any

    const target = await service.resolveAgentApiTargetForUser(supabase, 'user-123')

    expect(target).toEqual({
      baseUrl: 'https://machine-123.vm.vibey-runtimes.fly.dev',
      machineId: 'machine-123',
    })
  })

  it('routes shared Railway users to agent_runtime_url instead of Fly machine fields', async () => {
    const service = createService()
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: {
          fly_machine_id: 'machine-123',
          fly_machine_url: 'https://machine-123.vm.vibey-runtimes.fly.dev',
          fly_machine_status: 'stopped',
          agent_runtime_type: 'shared_railway',
          agent_runtime_url: 'https://railway-agent.vibey.test',
        },
      })),
    }
    const supabase = {
      from: vi.fn(() => query),
    } as any

    const target = await service.resolveAgentApiTargetForUser(supabase, 'user-123')

    expect(target).toEqual({
      baseUrl: 'https://railway-agent.vibey.test',
      machineId: null,
    })
  })

  it('uses local agent-api without resolving a Fly machine', async () => {
    const service = createService()
    service['configService'].get = vi.fn((key: string) => {
      if (key === 'missionApi.agentApiUrl') return 'http://localhost:3003'
      return undefined
    })
    const target = await service.resolveAgentApiTargetForUser({ from: vi.fn() } as any, 'user-123')

    expect(target).toEqual({
      baseUrl: 'http://localhost:3003',
      machineId: null,
    })
  })

  it('lets local AGENT_API_URL override remote config for isolated workers', async () => {
    const previous = process.env.AGENT_API_URL
    process.env.AGENT_API_URL = 'http://localhost:3004'
    try {
      const service = createService()
      const target = await service.resolveAgentApiTargetForUser(
        { from: vi.fn() } as any,
        'user-123',
      )

      expect(target).toEqual({
        baseUrl: 'http://localhost:3004',
        machineId: null,
      })
    } finally {
      if (previous === undefined) delete process.env.AGENT_API_URL
      else process.env.AGENT_API_URL = previous
    }
  })

  it('honors MISSIONS_SKIP_MACHINE_WAKE from env even when config misses it', async () => {
    const previous = process.env.MISSIONS_SKIP_MACHINE_WAKE
    process.env.MISSIONS_SKIP_MACHINE_WAKE = 'true'
    try {
      const service = createService()
      service['configService'].get = vi.fn((key: string) => {
        if (key === 'missionApi.internalToken') return 'token'
        if (key === 'missionApi.callbackUrl')
          return 'http://localhost:3011/api/internal/missions/callback'
        if (key === 'missions.skipMachineWake') return false
        return undefined
      })

      await service.wakeUserMachineIfNeeded('user-123')

      expect(global.fetch).not.toHaveBeenCalled()
    } finally {
      if (previous === undefined) delete process.env.MISSIONS_SKIP_MACHINE_WAKE
      else process.env.MISSIONS_SKIP_MACHINE_WAKE = previous
    }
  })

  it('attaches fly-force-instance-id for provisioned mission calls', async () => {
    const service = createService()
    service['resolveAgentSelectedModel'] = vi.fn(async () => null)
    service.ensureUserMachineReachable = vi.fn(async () => undefined)
    service['resolveAgentApiTargetStateForUser'] = vi.fn(async () => ({
      target: {
        baseUrl: 'https://vibey-runtimes.fly.dev',
        machineId: 'machine-123',
      },
      machineStatus: 'running',
      hasMachine: true,
    }))

    await service.callOpenClawRaw(
      {
        id: 'mission-3',
        user_id: 'user-3',
        correlation_id: 'corr-3',
      },
      'vibey',
      '',
      'user prompt',
    )

    expect(global.fetch).toHaveBeenCalledTimes(2)
    const [url, init] = (global.fetch as any).mock.calls[1]
    expect(url).toBe('https://vibey-runtimes.fly.dev/api/artifacts/openclaw/responses')
    expect(init.headers['fly-force-instance-id']).toBe('machine-123')
  })

  it('attaches fly-force-instance-id when patching agent state', async () => {
    const fetchAgentApi = vi.fn(async () => ({
      ok: true,
      text: async () => '',
    }))
    const wakeUserMachineIfNeeded = vi.fn(async () => undefined)
    const service = new MissionAgentStateService(
      { getClient: vi.fn(() => ({})) } as any,
      {
        resolveRuntimeAgent: vi.fn(async () => ({ gatewayAgentId: 'vibey' })),
        buildStateSessionKey: vi.fn(() => 'agent:vibey:state:vibey:user-4'),
      } as any,
      {
        wakeUserMachineIfNeeded,
        resolveAgentApiTargetForUser: vi.fn(async () => ({
          baseUrl: 'https://vibey-runtimes.fly.dev',
          machineId: 'machine-456',
        })),
        fetchAgentApi,
      } as any,
    )

    await service.patchAgentState('user-4', 'vibey', 'merge', { status: 'ready' })

    expect(wakeUserMachineIfNeeded).toHaveBeenCalledWith('user-4')
    expect(fetchAgentApi).toHaveBeenCalledTimes(1)
    const [target, path] = fetchAgentApi.mock.calls[0]!
    expect(target).toEqual({
      baseUrl: 'https://vibey-runtimes.fly.dev',
      machineId: 'machine-456',
    })
    expect(path).toBe('/api/artifacts/stream')
  })

  it('does not wake Fly when patching agent state on shared Railway runtime', async () => {
    const fetchAgentApi = vi.fn(async () => ({
      ok: true,
      text: async () => '',
    }))
    const wakeUserMachineIfNeeded = vi.fn(async () => undefined)
    const service = new MissionAgentStateService(
      { getClient: vi.fn(() => ({})) } as any,
      {
        resolveRuntimeAgent: vi.fn(async () => ({ gatewayAgentId: 'user-user-4-vibey' })),
        buildStateSessionKey: vi.fn(() => 'agent:user-user-4-vibey:state:vibey:user-4'),
      } as any,
      {
        wakeUserMachineIfNeeded,
        resolveAgentApiTargetForUser: vi.fn(async () => ({
          baseUrl: 'https://railway-agent.vibey.test',
          machineId: null,
        })),
        fetchAgentApi,
      } as any,
    )

    await service.patchAgentState('user-4', 'vibey', 'merge', { status: 'ready' })

    expect(wakeUserMachineIfNeeded).not.toHaveBeenCalled()
    expect(fetchAgentApi).toHaveBeenCalledTimes(1)
    const [target, path] = fetchAgentApi.mock.calls[0]!
    expect(target).toEqual({
      baseUrl: 'https://railway-agent.vibey.test',
      machineId: null,
    })
    expect(path).toBe('/api/artifacts/stream')
  })
})
