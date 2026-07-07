import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissionAgentGatewayService } from './mission-agent-gateway.service'

describe('MissionAgentGatewayService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('prepares the scoped Atlas runtime before routing brain jobs to OpenClaw', async () => {
    const invoke = vi.fn(async (_userId: string, path: string) => {
      if (path === '/api/agents/atlas/ensure-ready') {
        return new Response(JSON.stringify({ ready: true }), { status: 200 })
      }
      if (path === '/api/artifacts/openclaw/responses') {
        return new Response(JSON.stringify({ content: 'JOB_STATUS:completed - ok' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'unexpected path' }), { status: 404 })
    })
    const service = new MissionAgentGatewayService({ invoke } as never)

    await expect(
      service.callOpenClawForBrainJob(
        'user-1',
        'atlas',
        'system prompt',
        'user prompt',
        undefined,
        'user',
        'brain-1',
        'org-1',
        { lane: 'brain-import:job-1' },
      ),
    ).resolves.toEqual({ content: 'JOB_STATUS:completed - ok' })

    expect(invoke).toHaveBeenCalledTimes(2)
    expect(invoke.mock.calls[0]?.[1]).toBe('/api/agents/atlas/ensure-ready')
    expect(invoke.mock.calls[1]?.[1]).toBe('/api/artifacts/openclaw/responses')

    const readinessInit = invoke.mock.calls[0]?.[2] as RequestInit
    expect(JSON.parse(String(readinessInit.body))).toEqual({
      user_id: 'user-1',
      org_id: 'org-1',
      gateway_agent_id: 'org-org-1-atlas',
    })

    const openClawInit = invoke.mock.calls[1]?.[2] as RequestInit
    const openClawHeaders = openClawInit.headers as Record<string, string>
    const openClawBody = JSON.parse(String(openClawInit.body)) as Record<string, unknown>
    expect(openClawBody).toEqual(
      expect.objectContaining({
        model: 'openclaw:org-org-1-atlas',
        stream: true,
        lane: 'brain-import:job-1',
        input: 'user prompt',
        instructions: 'system prompt',
        metadata: {
          user_id: 'user-1',
          agent_key: 'atlas',
          org_id: 'org-1',
        },
      }),
    )
    expect(openClawHeaders['x-openclaw-agent-id']).toBe('org-org-1-atlas')
    expect(openClawHeaders['x-org-id']).toBe('org-1')
    expect(openClawHeaders['x-openclaw-session-key']).toContain(
      'agent:org-org-1-atlas:atlas-brain-job-user-1',
    )
    expect(openClawHeaders['x-openclaw-session-key']).toContain('::brain:user:brain-1')
    expect(openClawHeaders['x-openclaw-session-key']).toContain('::org:org-1')
  })

  it('syncs the requested org agent for active organization members', async () => {
    const memberQuery = {
      data: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
      error: null,
      select: vi.fn(function (this: unknown) {
        return this
      }),
      eq: vi.fn(function (this: unknown) {
        return this
      }),
    }
    const supabase = { from: vi.fn(() => memberQuery) }
    const service = new MissionAgentGatewayService({ invoke: vi.fn() } as never)
    vi.spyOn(service, 'getServiceRoleClient').mockReturnValue(supabase as never)
    vi.spyOn(service, 'triggerAgentSkillsSync').mockResolvedValue(true)

    await service.triggerOrgAgentSync('org-1', 'atlas')

    expect(service.triggerAgentSkillsSync).toHaveBeenCalledWith('user-1', 'atlas', 'org-1')
    expect(service.triggerAgentSkillsSync).toHaveBeenCalledWith('user-2', 'atlas', 'org-1')
  })
})
