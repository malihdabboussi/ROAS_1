import { afterEach, describe, expect, it } from 'vitest'
import { AgentRuntimeService } from '../agent-runtime.service'

describe('AgentRuntimeService (mission-worker)', () => {
  const originalRuntimeMode = process.env.AGENT_RUNTIME_MODE
  const service = new AgentRuntimeService()

  afterEach(() => {
    if (originalRuntimeMode === undefined) delete process.env.AGENT_RUNTIME_MODE
    else process.env.AGENT_RUNTIME_MODE = originalRuntimeMode
  })

  it('resolves gateway agent id from agentKey only', () => {
    expect(service.resolveGatewayAgentId()).toBe('vibey')
    expect(service.resolveGatewayAgentId(undefined)).toBe('vibey')
    expect(service.resolveGatewayAgentId('')).toBe('vibey')
    expect(service.resolveGatewayAgentId('vibey')).toBe('vibey')
    expect(service.resolveGatewayAgentId('atlas')).toBe('atlas')
    expect(service.resolveGatewayAgentId('  orion  ')).toBe('orion')
  })

  it('resolves org gateway agent ids with the shared Agent API workspace format', () => {
    expect(service.resolveGatewayAgentId('atlas', 'org-1')).toBe('org-org-1-atlas')
  })

  it('scopes personal gateway agent ids by user in shared runtime mode', async () => {
    process.env.AGENT_RUNTIME_MODE = 'shared'

    expect(service.resolveGatewayAgentId('atlas', null, 'user-1')).toBe('user-user-1-atlas')
  })

  it('scopes personal ids from shared_railway profile even without AGENT_RUNTIME_MODE', async () => {
    delete process.env.AGENT_RUNTIME_MODE
    const supabase = {
      from: (table: string) => {
        if (table === 'agents_registry') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    maybeSingle: async () => ({ data: { level: 'employee' }, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { agent_runtime_type: 'shared_railway' },
                error: null,
              }),
            }),
          }),
        }
      },
    }

    const runtime = await service.resolveRuntimeAgent(supabase as never, 'user-1', 'nate', null)
    expect(runtime.gatewayAgentId).toBe('user-user-1-nate')
  })

  it('builds mission, subtask, and state session keys', () => {
    expect(
      service.buildMissionSessionKey({
        gatewayAgentId: 'orion',
        agentKey: 'orion',
        userId: 'u1',
        missionId: 'm1',
      }),
    ).toBe('agent:orion:mission:orion:u1:m1')

    expect(
      service.buildSubtaskSessionKey({
        gatewayAgentId: 'atlas',
        agentKey: 'atlas',
        userId: 'u1',
        subtaskId: 's1',
      }),
    ).toBe('agent:atlas:subtask:atlas:u1:s1')

    expect(
      service.buildStateSessionKey({
        gatewayAgentId: 'vibey',
        agentKey: 'vibey',
        userId: 'u1',
      }),
    ).toBe('agent:vibey:state:vibey:u1')
  })

  it('builds mission and subtask session keys with campaign, space, and org scope', () => {
    const campaignId = '11111111-1111-1111-1111-111111111111'
    const spaceId = '22222222-2222-2222-2222-222222222222'
    const orgId = '33333333-3333-3333-3333-333333333333'

    expect(
      service.buildMissionSessionKey({
        gatewayAgentId: 'orion',
        agentKey: 'orion',
        userId: 'u1',
        missionId: 'm1',
        campaignId,
        spaceId,
        orgId,
      }),
    ).toBe(
      `agent:orion:mission:orion:u1:m1::campaign:${campaignId}::space:${spaceId}::org:${orgId}`,
    )

    expect(
      service.buildSubtaskSessionKey({
        gatewayAgentId: 'atlas',
        agentKey: 'atlas',
        userId: 'u1',
        subtaskId: 's1',
        campaignId,
        spaceId,
        orgId,
      }),
    ).toBe(
      `agent:atlas:subtask:atlas:u1:s1::campaign:${campaignId}::space:${spaceId}::org:${orgId}`,
    )
  })

  it('builds brain ops session keys without mission identity', () => {
    expect(
      service.buildBrainOpsSessionKey({
        gatewayAgentId: 'atlas',
        agentKey: 'atlas',
        userId: 'u1',
        outboxId: 'outbox-1',
      }),
    ).toBe('agent:atlas:brain_ops:atlas:u1:outbox-1')
  })

  it('can pin a brain id in brain ops session keys', () => {
    expect(
      service.buildBrainOpsSessionKey({
        gatewayAgentId: 'atlas',
        agentKey: 'atlas',
        userId: 'u1',
        outboxId: 'outbox-1',
        targetBrainId: '187a9756-564a-44d5-9a5e-485d69555806',
      }),
    ).toBe('agent:atlas:brain_ops:atlas:u1:outbox-1::brain:187a9756-564a-44d5-9a5e-485d69555806')
  })
})
