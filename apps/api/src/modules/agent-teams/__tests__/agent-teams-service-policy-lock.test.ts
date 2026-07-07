import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { AgentTeamRuntimeRepository } from '../repositories/agent-team-runtime.repository'
import { AgentTeamPolicyWorkflowService } from '../services/agent-team-policy-workflow.service'
import { AgentTeamsService } from '../services/agent-teams.service'

const adminScope = {
  userId: 'user-1',
  orgId: null,
  orgRole: null,
}

function makeService() {
  const repo = {
    getTeamById: vi.fn(),
    listTeamGrants: vi.fn(async () => []),
    replaceTeamGrants: vi.fn(async () => []),
    removeTeamMember: vi.fn(async () => undefined),
    listOverrides: vi.fn(async () => []),
    replaceOverrides: vi.fn(async () => []),
    canManageAgent: vi.fn(async () => true),
  }
  const policy = {
    bustAgent: vi.fn(),
    bustTeam: vi.fn(),
    resolveAgentPolicy: vi.fn(async (agentKey: string) => ({
      agentKey,
      teamId: null,
      teamName: null,
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      effective: new Set<string>(),
    })),
    resolveRoleDefaultCapabilities: vi.fn(async () => [
      { kind: 'action_domain', id: 'read_campaign' },
    ]),
  }
  const userAgentApi = {
    invoke: vi.fn(async () => ({ ok: true, status: 200 })),
  }
  const runtimeRepo = new AgentTeamRuntimeRepository()
  const policyWorkflow = new AgentTeamPolicyWorkflowService(
    repo as any,
    policy as any,
    userAgentApi as any,
    runtimeRepo,
  )
  const service = new AgentTeamsService(repo as any, policy as any, policyWorkflow, runtimeRepo)
  return { service, repo, policy, userAgentApi }
}

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

describe('AgentTeamsService protected policy locks', () => {
  it('serializes canonical agent policy with role-default access', async () => {
    const { service, policy } = makeService()

    await expect(
      service.getAgentPolicy(
        { userId: 'actor-1', orgId: null, orgRole: null } as any,
        'user-123e4567-e89b-42d3-a456-426614174000-vibey',
      ),
    ).resolves.toMatchObject({
      asJson: {
        agent_key: 'vibey',
        role_defaults: [{ kind: 'action_domain', id: 'read_campaign' }],
      },
    })
    expect(policy.resolveAgentPolicy).toHaveBeenCalledWith('vibey', {
      orgId: null,
      userId: 'actor-1',
    })
  })

  it('does not allow protected system contract action domains to be denied', async () => {
    const { service, repo } = makeService()

    const supabase = { rpc: vi.fn(async () => ({ error: null })) }

    await expect(
      service.replaceAgentOverrides(supabase as any, adminScope as any, 'vibey', [
        { kind: 'action_domain', id: 'edit_campaign', mode: 'deny' },
      ]),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repo.replaceOverrides).not.toHaveBeenCalled()
  })

  it('does not allow protected system agents to add non-contract access overrides', async () => {
    const { service, repo } = makeService()
    const supabase = { rpc: vi.fn(async () => ({ error: null })) }

    await expect(
      service.replaceAgentOverrides(supabase as any, adminScope as any, 'loop', [
        { kind: 'action_domain', id: 'generate_media', mode: 'allow_extra' },
      ]),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repo.replaceOverrides).not.toHaveBeenCalled()
  })

  it('does not allow protected system agent skill overrides', async () => {
    const { service, repo } = makeService()
    const supabase = { rpc: vi.fn(async () => ({ error: null })) }

    await expect(
      service.setSkillOverride(supabase as any, adminScope as any, 'loop', 'flow-builder', false),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repo.listOverrides).not.toHaveBeenCalled()
    expect(repo.replaceOverrides).not.toHaveBeenCalled()
  })

  it('allows inline approval to write exact user-grantable allow_extra overrides', async () => {
    const { service, repo, userAgentApi } = makeService()
    const supabase = { rpc: vi.fn(async () => ({ error: null })) }

    await service.replaceAgentOverrides(supabase as any, adminScope as any, 'lux', [
      { kind: 'action_domain', id: 'write_marketing_artifacts', mode: 'allow_extra' },
    ])

    expect(repo.replaceOverrides).toHaveBeenCalledWith(
      supabase,
      'lux',
      { orgId: null, userId: 'user-1' },
      [
        {
          kind: 'action_domain',
          id: 'write_marketing_artifacts',
          mode: 'allow_extra',
        },
      ],
    )
    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'user-1',
      '/api/agents/lux/sync',
      expect.objectContaining({ method: 'POST' }),
      expect.any(Object),
    )
  })

  it('blocks non-admin users from granting extra inline access', async () => {
    const { service } = makeService()

    await expect(
      service.replaceAgentOverrides(
        {} as any,
        { userId: 'user-1', orgId: 'org-1', orgRole: 'member' } as any,
        'lux',
        [{ kind: 'action_domain', id: 'write_marketing_artifacts', mode: 'allow_extra' }],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('fetches team overview through the team overview RPC', async () => {
    const { service } = makeService()
    const supabase = {
      rpc: vi.fn(async () => ({ data: { activeAgents: 2 }, error: null })),
    }

    await expect(
      service.getTeamOverview(supabase as any, 'team-1', {
        start: '2026-06-01',
        end: '2026-06-17',
      }),
    ).resolves.toEqual({ activeAgents: 2 })

    expect(supabase.rpc).toHaveBeenCalledWith('get_team_overview', {
      p_team_id: 'team-1',
      p_start: '2026-06-01',
      p_end: '2026-06-17',
    })
  })

  it('maps team spending RPC totals and daily rows', async () => {
    const { service } = makeService()
    const supabase = {
      rpc: vi.fn(async () => ({
        data: {
          totals: { credits: '10', costUsd: '1.5', eventCount: '3' },
          previousTotals: { credits: '4', costUsd: '0.75', eventCount: '2' },
          daily: [{ day: '2026-06-17', credits: '6', costUsd: '1.1', eventCount: '1' }],
        },
        error: null,
      })),
    }

    await expect(
      service.getTeamSpending(supabase as any, 'org-1', 'team-1', {
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-17T00:00:00.000Z',
        campaignIds: ['campaign-1'],
      }),
    ).resolves.toEqual({
      totals: { credits: 10, costUsd: 1.5, eventCount: 3 },
      previousTotals: { credits: 4, costUsd: 0.75, eventCount: 2 },
      daily: [{ day: '2026-06-17', credits: 6, costUsd: 1.1, eventCount: 1 }],
    })

    expect(supabase.rpc).toHaveBeenCalledWith('billing_team_spending_org', {
      p_org_id: 'org-1',
      p_team_id: 'team-1',
      p_start: '2026-06-01T00:00:00.000Z',
      p_end: '2026-06-17T00:00:00.000Z',
      p_campaign_ids: ['campaign-1'],
    })
  })

  it('does not remove active org owners from the Management team', async () => {
    const { service, repo } = makeService()
    repo.getTeamById.mockResolvedValue({
      id: 'team-management',
      name: 'Management',
      org_id: 'org-1',
      is_system: true,
    })
    const orgMemberQuery = query({
      data: { role: 'owner', status: 'active' },
      error: null,
    })
    const supabase = {
      from: vi.fn(() => orgMemberQuery),
    }

    await expect(
      service.removeTeamMember(
        supabase as any,
        { userId: 'actor-1', orgId: 'org-1', orgRole: 'admin' } as any,
        'team-management',
        'owner-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(supabase.from).toHaveBeenCalledWith('org_members')
    expect(orgMemberQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(orgMemberQuery.eq).toHaveBeenCalledWith('user_id', 'owner-1')
    expect(repo.removeTeamMember).not.toHaveBeenCalled()
  })

  it('syncs every agent currently assigned to a team after replacing grants', async () => {
    const { service, repo, userAgentApi } = makeService()
    repo.getTeamById.mockResolvedValue({ id: 'team-1', is_system: false })
    repo.listTeamGrants.mockResolvedValue([])
    repo.replaceTeamGrants.mockResolvedValue([{ id: 1 }])
    const teamAgentsQuery = query({
      data: [{ agent_key: 'atlas' }, { agent_key: 'lux' }, { agent_key: 'atlas' }],
      error: null,
    })
    const supabase = {
      rpc: vi.fn(async () => ({ error: null })),
      from: vi.fn(() => teamAgentsQuery),
    }

    await service.replaceTeamGrants(
      supabase as any,
      { userId: 'actor-1', orgId: 'org-1', orgRole: 'admin' } as any,
      'team-1',
      [{ kind: 'action_domain', id: 'read_campaign' }],
    )

    expect(supabase.rpc).toHaveBeenCalledWith('notify_agent_policy_invalidate', {
      p_agent_key: null,
      p_team_id: 'team-1',
      p_org_id: 'org-1',
      p_user_id: null,
    })
    expect(supabase.from).toHaveBeenCalledWith('agents_registry')
    expect(userAgentApi.invoke).toHaveBeenCalledTimes(2)
    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'actor-1',
      '/api/agents/atlas/sync',
      expect.objectContaining({ method: 'POST' }),
      expect.any(Object),
    )
    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'actor-1',
      '/api/agents/lux/sync',
      expect.objectContaining({ method: 'POST' }),
      expect.any(Object),
    )
  })

  it('invalidates previous and next teams when assigning an agent to a new team', async () => {
    const { service, repo, policy, userAgentApi } = makeService()
    repo.getTeamById.mockResolvedValue({ id: 'team-next', is_system: false })
    repo.getAgentTeamId = vi.fn(async () => 'team-prev')
    repo.setAgentTeam = vi.fn(async () => ({ agent_key: 'lux', team_id: 'team-next' }))
    const supabase = {
      rpc: vi.fn(async () => ({ error: null })),
    }

    await expect(
      service.setAgentTeam(
        supabase as any,
        { userId: 'actor-1', orgId: 'org-1', orgRole: 'admin' } as any,
        'lux',
        'team-next',
      ),
    ).resolves.toEqual({ agent_key: 'lux', team_id: 'team-next' })

    expect(policy.bustAgent).toHaveBeenCalledWith('lux', { orgId: 'org-1', userId: 'actor-1' })
    expect(policy.bustTeam).toHaveBeenCalledWith('team-prev')
    expect(policy.bustTeam).toHaveBeenCalledWith('team-next')
    expect(supabase.rpc).toHaveBeenCalledWith('notify_agent_policy_invalidate', {
      p_agent_key: 'lux',
      p_team_id: null,
      p_org_id: 'org-1',
      p_user_id: null,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('notify_agent_policy_invalidate', {
      p_agent_key: null,
      p_team_id: 'team-prev',
      p_org_id: 'org-1',
      p_user_id: null,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('notify_agent_policy_invalidate', {
      p_agent_key: null,
      p_team_id: 'team-next',
      p_org_id: 'org-1',
      p_user_id: null,
    })
    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'actor-1',
      '/api/agents/lux/sync',
      expect.objectContaining({ method: 'POST' }),
      expect.any(Object),
    )
  })

  it('re-enables a denied skill by replacing overrides without that skill row', async () => {
    const { service, repo, policy, userAgentApi } = makeService()
    repo.listOverrides.mockResolvedValue([
      {
        capability_kind: 'skill',
        capability_id: 'writer',
        mode: 'deny',
      },
      {
        capability_kind: 'action_domain',
        capability_id: 'read_campaign',
        mode: 'allow_extra',
      },
    ])
    const supabase = {
      rpc: vi.fn(async () => ({ error: null })),
    }

    await expect(
      service.setSkillOverride(
        supabase as any,
        { userId: 'actor-1', orgId: null, orgRole: null } as any,
        'lux',
        'writer',
        true,
      ),
    ).resolves.toEqual({ agent_key: 'lux', skill_key: 'writer', enabled: true })

    expect(repo.replaceOverrides).toHaveBeenCalledWith(
      supabase,
      'lux',
      { orgId: null, userId: 'actor-1' },
      [
        {
          kind: 'action_domain',
          id: 'read_campaign',
          mode: 'allow_extra',
        },
      ],
    )
    expect(policy.bustAgent).toHaveBeenCalledWith('lux', { orgId: null, userId: 'actor-1' })
    expect(supabase.rpc).toHaveBeenCalledWith('notify_agent_policy_invalidate', {
      p_agent_key: 'lux',
      p_team_id: null,
      p_org_id: null,
      p_user_id: 'actor-1',
    })
    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'actor-1',
      '/api/agents/lux/sync',
      expect.objectContaining({ method: 'POST' }),
      expect.any(Object),
    )
  })
})
