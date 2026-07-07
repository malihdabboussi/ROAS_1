import { describe, expect, it, vi } from 'vitest'
import { AgentPolicyRepository } from '../repositories/agent-policy.repository'
import { AgentPolicyActionDecisionService } from '../services/agent-policy-action-decision.service'
import { AgentPolicyService } from '../services/agent-policy.service'

function query(result: { data?: unknown; error?: unknown } = {}) {
  const promise = Promise.resolve(result)
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  ;(q as unknown as PromiseLike<typeof result>).then = promise.then.bind(promise)
  ;(q as unknown as Promise<typeof result>).catch = promise.catch.bind(promise)
  ;(q as unknown as Promise<typeof result>).finally = promise.finally.bind(promise)
  return q
}

describe('AgentPolicyService data-backed policy resolution', () => {
  it('builds effective policy from registry team, team grants, and agent overrides', async () => {
    const registryQuery = query({ data: { agent_key: 'lux', team_id: 'team-1' }, error: null })
    const teamQuery = query({ data: { id: 'team-1', name: 'Marketing' }, error: null })
    const grantsQuery = query({
      data: [
        { capability_kind: 'action_domain', capability_id: 'read_campaign' },
        { capability_kind: 'campaign_context', capability_id: '*' },
      ],
      error: null,
    })
    const overridesQuery = query({
      data: [
        {
          capability_kind: 'action_domain',
          capability_id: 'write_marketing_artifacts',
          mode: 'allow_extra',
        },
        { capability_kind: 'campaign_context', capability_id: '*', mode: 'deny' },
      ],
      error: null,
    })
    const from = vi
      .fn()
      .mockReturnValueOnce(registryQuery)
      .mockReturnValueOnce(teamQuery)
      .mockReturnValueOnce(grantsQuery)
      .mockReturnValueOnce(overridesQuery)
    const repository = new AgentPolicyRepository({ client: { from } } as any)
    const service = new AgentPolicyService(repository, new AgentPolicyActionDecisionService())

    await expect(
      service.resolveAgentPolicy('lux', { orgId: 'org-1', userId: null }),
    ).resolves.toMatchObject({
      agentKey: 'lux',
      teamId: 'team-1',
      teamName: 'Marketing',
      grants: [
        { kind: 'action_domain', id: 'read_campaign' },
        { kind: 'campaign_context', id: '*' },
      ],
      overrides: {
        allow_extra: [{ kind: 'action_domain', id: 'write_marketing_artifacts' }],
        deny: [{ kind: 'campaign_context', id: '*' }],
      },
    })

    const policy = await service.resolveAgentPolicy('lux', { orgId: 'org-1', userId: null })
    expect(policy.effective).toEqual(
      new Set(['action_domain:read_campaign', 'action_domain:write_marketing_artifacts']),
    )
    expect(from).toHaveBeenCalledWith('agents_registry')
    expect(from).toHaveBeenCalledWith('agent_teams')
    expect(from).toHaveBeenCalledWith('agent_team_grants')
    expect(from).toHaveBeenCalledWith('agent_overrides')
    expect(registryQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(registryQuery.is).toHaveBeenCalledWith('user_id', null)
  })
})
