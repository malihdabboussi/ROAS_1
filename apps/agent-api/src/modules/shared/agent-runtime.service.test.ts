import { afterEach, describe, expect, it } from 'vitest'
import { AgentRuntimeService } from './services/agent-runtime.service'

describe('AgentRuntimeService (agent-api)', () => {
  const service = new AgentRuntimeService()
  const originalRuntimeMode = process.env.AGENT_RUNTIME_MODE

  afterEach(() => {
    if (originalRuntimeMode === undefined) delete process.env.AGENT_RUNTIME_MODE
    else process.env.AGENT_RUNTIME_MODE = originalRuntimeMode
  })

  it('resolves gateway agent id from agentKey only', () => {
    expect(service.resolveGatewayAgentId()).toBe('vibey')
    expect(service.resolveGatewayAgentId(undefined)).toBe('vibey')
    expect(service.resolveGatewayAgentId('')).toBe('vibey')
    expect(service.resolveGatewayAgentId('mara_2')).toBe('mara_2')
    expect(service.resolveGatewayAgentId('lux_2')).toBe('lux_2')
  })

  it('scopes personal gateway agent ids by user in shared runtime mode', async () => {
    process.env.AGENT_RUNTIME_MODE = 'shared'
    const userId = '00000000-0000-4000-8000-000000000001'
    expect(service.resolveGatewayAgentId('atlas', null, userId)).toBe(`user-${userId}-atlas`)
    expect(service.resolveGatewayAgentId('atlas', 'org-1', userId)).toBe('org-org-1-atlas')
  })

  it('builds canonical chat session keys', () => {
    const base = service.buildChatSessionKey({
      gatewayAgentId: 'mara_2',
      agentKey: 'mara_2',
      userId: '00000000-0000-0000-0000-000000000001',
      conversationId: '00000000-0000-0000-0000-000000000002',
    })
    expect(base).toBe(
      'agent:mara_2:mara_2-00000000-0000-0000-0000-000000000001-00000000-0000-0000-0000-000000000002',
    )

    const withCampaign = service.buildChatSessionKey({
      gatewayAgentId: 'mara_2',
      agentKey: 'mara_2',
      userId: '00000000-0000-0000-0000-000000000001',
      conversationId: '00000000-0000-0000-0000-000000000002',
      campaignId: '00000000-0000-0000-0000-000000000003',
      spaceId: '00000000-0000-0000-0000-000000000004',
    })
    expect(withCampaign).toBe(base)

    const withOrg = service.buildChatSessionKey({
      gatewayAgentId: 'mara_2',
      agentKey: 'mara_2',
      userId: '00000000-0000-0000-0000-000000000001',
      conversationId: '00000000-0000-0000-0000-000000000002',
      campaignId: '00000000-0000-0000-0000-000000000003',
      spaceId: '00000000-0000-0000-0000-000000000004',
      orgId: '00000000-0000-0000-0000-000000000005',
    })
    expect(withOrg).toBe(`${base}::org:00000000-0000-0000-0000-000000000005`)

    const withScopeSegments = service.buildChatSessionKey({
      gatewayAgentId: 'mara_2',
      agentKey: 'mara_2',
      userId: '00000000-0000-0000-0000-000000000001',
      conversationId: '00000000-0000-0000-0000-000000000002',
      campaignId: '00000000-0000-0000-0000-000000000003',
      spaceId: '00000000-0000-0000-0000-000000000004',
      orgId: '00000000-0000-0000-0000-000000000005',
      includeScopeSegments: true,
    })
    expect(withScopeSegments).toBe(
      `${base}::campaign:00000000-0000-0000-0000-000000000003::space:00000000-0000-0000-0000-000000000004::org:00000000-0000-0000-0000-000000000005`,
    )
  })

  it('resolves conversation runtime by agent level', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => ({ data: { level: 'c_level' } }),
              }),
            }),
          }),
        }),
      }),
    } as any

    const runtime = await service.resolveConversationRuntime(mockSupabase, 'user-1', 'z')
    expect(runtime.agentKey).toBe('z')
    expect(runtime.level).toBe('c_level')
    expect(runtime.gatewayAgentId).toBe('z')
  })

  it('resolves personal conversations to user-scoped gateway ids in shared mode', async () => {
    process.env.AGENT_RUNTIME_MODE = 'shared'
    const userId = '00000000-0000-4000-8000-000000000001'
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => ({ data: { level: 'employee' } }),
              }),
            }),
          }),
        }),
      }),
    } as any

    const runtime = await service.resolveConversationRuntime(mockSupabase, userId, 'z')
    expect(runtime.gatewayAgentId).toBe(`user-${userId}-z`)
  })

  it('builds delegation session keys with shared personal gateway ids', () => {
    process.env.AGENT_RUNTIME_MODE = 'shared'
    const userId = '00000000-0000-4000-8000-000000000001'
    const key = service.buildDelegationSessionKey({
      targetAgentKey: 'atlas',
      callerAgentKey: 'vibey',
      userId,
      conversationId: '00000000-0000-4000-8000-000000000002',
      delegationId: '00000000-0000-4000-8000-000000000003',
    })
    expect(key.startsWith(`agent:user-${userId}-atlas:delegation:`)).toBe(true)
  })

  it('resolves gateway from agentKey when registry level is system', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => ({ data: { level: 'system' } }),
              }),
            }),
          }),
        }),
      }),
    } as any

    const runtime = await service.resolveConversationRuntime(mockSupabase, 'user-1', 'atlas')
    expect(runtime.agentKey).toBe('atlas')
    expect(runtime.level).toBe('system')
    expect(runtime.gatewayAgentId).toBe('atlas')
  })

  it('resolves vibey runtime when conversation agent key is empty', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => ({ data: { level: 'system' } }),
              }),
            }),
          }),
        }),
      }),
    } as any

    const runtime = await service.resolveConversationRuntime(mockSupabase, 'user-1')
    expect(runtime.agentKey).toBe('vibey')
    expect(runtime.level).toBe('system')
    expect(runtime.gatewayAgentId).toBe('vibey')
  })
})
