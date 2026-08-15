import { describe, expect, it, vi } from 'vitest'
import { AgentPolicyService } from './services/agent-policy.service'

function makeService(): AgentPolicyService {
  return new AgentPolicyService({ client: {} } as any)
}

describe('AgentPolicyService.canExecuteAction', () => {
  it('returns role_default decisions', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'vibey',
      teamId: null,
      teamName: null,
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue(['read_campaign'])

    await expect(
      service.canExecuteAction('vibey', 'get_campaign', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: true,
      sourceLevel: 'role_default',
      domain: 'read_campaign',
    })
  })

  it('applies team grant, agent allow, and agent deny precedence', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'agent',
      teamId: 'team-1',
      teamName: 'Team',
      grants: [{ kind: 'action_domain', id: 'write_marketing_artifacts' }],
      overrides: {
        allow_extra: [{ kind: 'action_domain', id: 'use_integrations' }],
        deny: [{ kind: 'action_domain', id: 'write_marketing_artifacts' }],
      },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([])
    vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)

    await expect(
      service.canExecuteAction('agent', 'use_integration', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: true,
      sourceLevel: 'agent_allow_extra',
      domain: 'use_integrations',
    })
    await expect(
      service.canExecuteAction('agent', 'create_offer', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: false,
      sourceLevel: 'agent_deny',
      domain: 'write_marketing_artifacts',
    })
  })

  it('resolves denied actions in bulk with one policy lookup', async () => {
    const service = makeService()
    const computePolicy = vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'agent',
      teamId: 'team-1',
      teamName: 'Team',
      grants: [{ kind: 'action_domain', id: 'use_integrations' }],
      overrides: {
        allow_extra: [],
        deny: [{ kind: 'action_domain', id: 'write_marketing_artifacts' }],
      },
      effective: new Set(),
    })
    const resolveRoleDefaultDomains = vi
      .spyOn(service as any, 'resolveRoleDefaultDomains')
      .mockResolvedValue([])
    const isSystemAgent = vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)

    await expect(
      service.listDeniedActions('agent', ['describe_action', 'use_integration', 'create_offer'], {
        orgId: null,
        userId: 'u1',
      }),
    ).resolves.toEqual(['create_offer'])
    expect(computePolicy).toHaveBeenCalledTimes(1)
    expect(resolveRoleDefaultDomains).toHaveBeenCalledTimes(1)
    expect(isSystemAgent).toHaveBeenCalledTimes(1)
  })

  it('caches bulk denied actions until the agent policy cache is busted', async () => {
    const service = makeService()
    const computePolicy = vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'agent',
      teamId: 'team-1',
      teamName: 'Team',
      grants: [{ kind: 'action_domain', id: 'use_integrations' }],
      overrides: {
        allow_extra: [],
        deny: [{ kind: 'action_domain', id: 'write_marketing_artifacts' }],
      },
      effective: new Set(),
    })
    const resolveRoleDefaultDomains = vi
      .spyOn(service as any, 'resolveRoleDefaultDomains')
      .mockResolvedValue([])
    const isSystemAgent = vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)
    const scope = { orgId: null, userId: 'u1' }

    const first = await service.listDeniedActions(
      'agent',
      ['describe_action', 'use_integration', 'create_offer'],
      scope,
    )
    first.push('delete_offer')
    await expect(
      service.listDeniedActions(
        'agent',
        ['describe_action', 'use_integration', 'create_offer'],
        scope,
      ),
    ).resolves.toEqual(['create_offer'])
    expect(computePolicy).toHaveBeenCalledTimes(1)
    expect(resolveRoleDefaultDomains).toHaveBeenCalledTimes(1)
    expect(isSystemAgent).toHaveBeenCalledTimes(1)

    service.bustAgent('agent', scope)
    await service.listDeniedActions(
      'agent',
      ['describe_action', 'use_integration', 'create_offer'],
      scope,
    )
    expect(computePolicy).toHaveBeenCalledTimes(2)
    expect(resolveRoleDefaultDomains).toHaveBeenCalledTimes(2)
    expect(isSystemAgent).toHaveBeenCalledTimes(2)
  })

  it('uses team action-domain grants as authoritative baseline when assigned to a team', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'agent',
      teamId: 'team-1',
      teamName: 'Team',
      grants: [{ kind: 'action_domain', id: 'read_campaign' }],
      overrides: { allow_extra: [], deny: [] },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([
      'write_marketing_artifacts',
    ])
    vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)

    await expect(
      service.canExecuteAction('agent', 'create_offer', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: false,
      domain: 'write_marketing_artifacts',
    })
  })

  it('keeps role defaults when a team has no action-domain grants or overrides', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'ivy',
      teamId: 'team-marketing',
      teamName: 'Marketing',
      grants: [{ kind: 'campaign_context', id: '*' }],
      overrides: { allow_extra: [], deny: [] },
      effective: new Set(['campaign_context:*']),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([
      'manage_content',
      'write_marketing_artifacts',
    ])
    vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)

    await expect(
      service.canExecuteAction('ivy', 'save_document', { orgId: 'org-1', userId: null }),
    ).resolves.toMatchObject({
      allowed: true,
      domain: 'manage_content',
      sourceLevel: 'role_default',
    })
  })

  it('maps managed role defaults to default campaign and personal brain capabilities', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'ivy',
      teamId: 'team-marketing',
      teamName: 'Marketing',
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([
      'read_campaign',
      'read_space_context',
      'read_brain_personal',
    ])
    vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)

    await expect(
      service.canAgentUseCapability('ivy', 'campaign_context', '*', {
        orgId: 'org-1',
        userId: null,
      }),
    ).resolves.toBe(true)
    await expect(
      service.canAgentUseCapability('ivy', 'space_context', '*', {
        orgId: 'org-1',
        userId: null,
      }),
    ).resolves.toBe(true)
    await expect(
      service.canAgentUseCapability('ivy', 'brain_access', 'personal', {
        orgId: 'org-1',
        userId: null,
      }),
    ).resolves.toBe(true)
  })

  it('lets explicit capability denies override role-default context access', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'ivy',
      teamId: 'team-marketing',
      teamName: 'Marketing',
      grants: [],
      overrides: {
        allow_extra: [],
        deny: [{ kind: 'campaign_context', id: '*' }],
      },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue(['read_campaign'])

    await expect(
      service.canAgentUseCapability('ivy', 'campaign_context', '*', {
        orgId: 'org-1',
        userId: null,
      }),
    ).resolves.toBe(false)
  })

  it('system agents bypass team policy and use role defaults', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'vibey',
      teamId: 'team-management',
      teamName: 'Management',
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([
      'read_campaign',
      'write_marketing_artifacts',
    ])

    await expect(
      service.canExecuteAction('vibey', 'create_offer', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: true,
      domain: 'write_marketing_artifacts',
      sourceLevel: 'role_default',
    })
  })

  it('allows regular save_user_memory for managed agents through write_user_memory', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'lux',
      teamId: null,
      teamName: null,
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue(['write_user_memory'])
    vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)

    await expect(
      service.canExecuteAction('lux', 'save_user_memory', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: true,
      sourceLevel: 'role_default',
      domain: 'write_user_memory',
    })
  })

  it('blocks managed agents from Atlas-only brain and strategy actions', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'lux',
      teamId: null,
      teamName: null,
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([
      'write_user_memory',
      'write_marketing_artifacts',
    ])
    vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)

    for (const action of ['create_brain_page', 'create_strategy_node']) {
      await expect(
        service.canExecuteAction('lux', action, { orgId: null, userId: 'u1' }),
      ).resolves.toMatchObject({
        allowed: false,
      })
    }
  })

  it('blocks Vibey from direct Atlas brain actions while allowing user memory', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'vibey',
      teamId: null,
      teamName: null,
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([
      'write_user_memory',
      'write_marketing_artifacts',
      'manage_team_identity',
    ])

    await expect(
      service.canExecuteAction('vibey', 'save_user_memory', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: true,
      domain: 'write_user_memory',
    })

    for (const action of [
      'ingest_user_brain_document',
      'create_brain_page',
      'create_strategy_node',
    ]) {
      await expect(
        service.canExecuteAction('vibey', action, { orgId: null, userId: 'u1' }),
      ).resolves.toMatchObject({
        allowed: false,
      })
    }
  })

  it('keeps HR identity mutation exclusive while preserving Vibey orchestration actions', async () => {
    const service = makeService()

    await expect(
      service.canExecuteAction('hr', 'create_agent', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: true,
      domain: 'manage_team_identity',
    })
    await expect(
      service.canExecuteAction('vibey', 'create_agent', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: false,
      domain: 'manage_team_identity',
    })
    await expect(
      service.canExecuteAction('vibey', 'approve_agent_hire', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: true,
      domain: 'manage_team_identity',
    })
  })

  it('allows Loop to align space structure and items for flow work', async () => {
    const service = makeService()

    for (const action of [
      'search_space_context',
      'create_space_field',
      'update_space_field',
      'create_task',
      'update_task',
    ]) {
      await expect(
        service.canExecuteAction('loop', action, { orgId: null, userId: 'u1' }),
      ).resolves.toMatchObject({
        allowed: true,
        sourceLevel: 'role_default',
      })
    }
  })

  it('allows Atlas to create belief patterns via system domain gate', async () => {
    const service = makeService()

    await expect(
      service.canExecuteAction('atlas', 'create_brain_belief_pattern', {
        orgId: null,
        userId: 'u1',
      }),
    ).resolves.toMatchObject({
      allowed: true,
      domain: 'edit_brain_models',
    })
    await expect(
      service.canExecuteAction('lux', 'create_brain_belief_pattern', { orgId: null, userId: 'u1' }),
    ).resolves.toMatchObject({
      allowed: false,
      domain: 'edit_brain_models',
    })
  })

  it('does not let user grants unlock platform-owned actions', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'lux',
      teamId: 'team-1',
      teamName: 'Marketing',
      grants: [
        { kind: 'action_domain', id: 'write_brain' },
        { kind: 'action_domain', id: 'edit_brain_models' },
      ],
      overrides: {
        allow_extra: [
          { kind: 'action_domain', id: 'write_brain' },
          { kind: 'action_domain', id: 'edit_brain_models' },
        ],
        deny: [],
      },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([])
    vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)

    for (const action of [
      'ingest_user_brain_document',
      'create_brain_page',
      'create_strategy_node',
    ]) {
      await expect(
        service.canExecuteAction('lux', action, { orgId: null, userId: 'u1' }),
      ).resolves.toMatchObject({
        allowed: false,
      })
    }
  })

  it('always allows describe_action even under hostile policy', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'lux',
      teamId: null,
      teamName: null,
      grants: [],
      overrides: {
        allow_extra: [],
        deny: [{ kind: 'action_domain', id: 'communicate' }],
      },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([])
    vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)

    for (const agentKey of ['lux', 'vibey', 'atlas', 'hr', 'random_managed_agent']) {
      await expect(
        service.canExecuteAction(agentKey, 'describe_action', { orgId: null, userId: 'u1' }),
      ).resolves.toMatchObject({
        allowed: true,
      })
    }
  })

  it('allows managed agents to read company cortex when granted read_brain_company', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'computePolicy').mockResolvedValue({
      agentKey: 'lux',
      teamId: 'team-1',
      teamName: 'Marketing',
      grants: [{ kind: 'action_domain', id: 'read_brain_company' }],
      overrides: { allow_extra: [], deny: [] },
      effective: new Set(['action_domain:read_brain_company']),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([])
    vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(false)

    await expect(
      service.canExecuteAction('lux', 'get_company_brain_objects', {
        orgId: 'org-1',
        userId: 'u1',
      }),
    ).resolves.toMatchObject({
      allowed: true,
      domain: 'read_brain_company',
    })
  })

  it('keeps personal brain in cross-search for system agents when org denies brain_access:personal', async () => {
    const service = makeService()
    vi.spyOn(service as any, 'resolveAgentPolicy').mockResolvedValue({
      agentKey: 'vibey',
      teamId: 'team-1',
      teamName: 'Management',
      grants: [],
      overrides: {
        allow_extra: [],
        deny: [{ kind: 'brain_access', id: 'personal' }],
      },
      effective: new Set(),
    })
    vi.spyOn(service as any, 'resolveRoleDefaultDomains').mockResolvedValue([
      'read_brain_personal',
      'read_brain_agent',
      'read_brain_company',
      'read_brain_customer',
    ])
    vi.spyOn(service as any, 'isSystemAgent').mockResolvedValue(true)

    await expect(
      service.listAllowedBrainSearchFamilies('vibey', { orgId: 'org-1', userId: null }),
    ).resolves.toEqual(['user', 'agent', 'company', 'customer'])
    await expect(
      service.canAgentUseCapability('vibey', 'brain_access', 'personal', {
        orgId: 'org-1',
        userId: null,
      }),
    ).resolves.toBe(true)
  })

  it('allows Atlas and Vibey to propose company cortex signals; blocks managed agents', async () => {
    const service = makeService()

    await expect(
      service.canExecuteAction('atlas', 'propose_company_brain_signal', {
        orgId: 'org-1',
        userId: 'u1',
      }),
    ).resolves.toMatchObject({
      allowed: true,
      domain: 'edit_brain_company',
    })
    await expect(
      service.canExecuteAction('vibey', 'propose_company_brain_signal', {
        orgId: 'org-1',
        userId: 'u1',
      }),
    ).resolves.toMatchObject({
      allowed: true,
      domain: 'edit_brain_company',
    })
    await expect(
      service.canExecuteAction('lux', 'propose_company_brain_signal', {
        orgId: 'org-1',
        userId: 'u1',
      }),
    ).resolves.toMatchObject({
      allowed: false,
      domain: 'edit_brain_company',
    })
  })
})
