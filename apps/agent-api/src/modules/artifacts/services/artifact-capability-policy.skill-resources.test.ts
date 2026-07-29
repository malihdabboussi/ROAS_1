import { describe, expect, it } from 'vitest'
import {
  isArtifactActionAllowed,
  SKILL_WRITE_ACTIONS,
  type ArtifactCapabilityPolicy,
} from './artifact-capability.policy'
import { ArtifactLegacyRuntimeCoreService } from './artifact-legacy-runtime-core.service'

function makeAgentsRegistryClient() {
  const queries: any[] = []
  const client = {
    from: (table: string) => {
      if (table !== 'agents_registry') throw new Error(`Unexpected table ${table}`)
      const query: any = {
        filters: {} as Record<string, unknown>,
        select: () => query,
        eq: (key: string, value: unknown) => {
          query.filters[key] = value
          return query
        },
        is: (key: string, value: unknown) => {
          query.filters[key] = value
          return query
        },
        maybeSingle: async () => {
          if (query.filters.agent_key === 'manager') {
            return {
              data: {
                agent_key: 'manager',
                role: 'Ops Manager',
                level: 'manager',
                config: {
                  capability_profile: 'managed_domain',
                  capability_domain: 'operations',
                },
              },
              error: null,
            }
          }
          if (query.filters.agent_key === 'hr') {
            return {
              data: {
                agent_key: 'hr',
                role: 'HR Manager',
                level: 'system',
                config: {
                  capability_profile: 'system_hr',
                  capability_domain: 'management',
                },
              },
              error: null,
            }
          }
          if (query.filters.agent_key === 'vibey') {
            return {
              data: { level: 'c_level' },
              error: null,
            }
          }
          return { data: null, error: null }
        },
      }
      queries.push(query)
      return query
    },
  }
  return { client, queries }
}

describe('artifact capability skill resource policy', () => {
  it('runs target-agent authorization for mutating skill resource actions', () => {
    for (const action of [
      'copy_skill_resource',
      'create_agent_skill_resource',
      'delete_agent_skill_resource',
      'update_agent_skill_resource',
      'upload_skill_asset',
    ]) {
      expect(SKILL_WRITE_ACTIONS.has(action)).toBe(true)
    }
  })

  it('allows HR to manage agent skills and skill resources', () => {
    const hr: ArtifactCapabilityPolicy = {
      profile: 'system_hr',
      level: 'system',
      domain: 'management',
    }
    for (const action of [
      'list_agent_skills',
      'create_agent_skill',
      'update_agent_skill',
      'delete_agent_skill',
      'create_agent_skill_resource',
      'update_agent_skill_resource',
      'delete_agent_skill_resource',
      'copy_skill_resource',
      'upload_skill_asset',
    ]) {
      expect(isArtifactActionAllowed(hr, action).allowed).toBe(true)
    }
  })

  it('keeps aggregate audit actions HR-only', () => {
    const hr: ArtifactCapabilityPolicy = {
      profile: 'system_hr',
      level: 'system',
      domain: 'management',
    }
    const nonHrPolicies: ArtifactCapabilityPolicy[] = [
      { profile: 'vibey_ceo', level: 'system', domain: 'management' },
      { profile: 'system_brain', level: 'system', domain: 'management' },
      { profile: 'system_builder', level: 'system', domain: 'developer' },
      { profile: 'system_flows', level: 'system', domain: 'flows' },
      { profile: 'system_delegation', level: 'system', domain: 'operations' },
      { profile: 'managed_domain', level: 'employee', domain: 'marketing' },
      { profile: 'managed_domain', level: 'employee', domain: 'developer' },
      { profile: 'managed_domain', level: 'employee', domain: 'operations' },
      { profile: 'managed_domain', level: 'employee', domain: 'analyst' },
    ]
    const actions = [
      'audit_team_agents_and_skills',
      'compare_team_skill_coverage',
      'summarize_agent_capabilities',
    ]

    for (const action of actions) {
      expect(isArtifactActionAllowed(hr, action).allowed).toBe(true)
      for (const policy of nonHrPolicies) {
        const decision = isArtifactActionAllowed(policy, action)
        expect(decision.allowed).toBe(false)
        expect(decision.reason).toBe('Action is not available for this agent.')
      }
    }
  })

  it('authorizes copy_skill_resource against the target agent key', async () => {
    const { client, queries } = makeAgentsRegistryClient()
    const core = new ArtifactLegacyRuntimeCoreService()

    const decision = await core.authorizeAction(
      {
        resolveUserId: () => 'user-1',
        resolveOrgId: () => null,
        parseAgentIdFromSessionKey: () => 'manager',
        getUserClient: async () => client,
      },
      'copy_skill_resource',
      {
        source_agent_key: 'manager',
        source_skill_key: 'docs',
        target_agent_key: 'vibey',
        target_skill_key: 'docs',
        file_path: 'references/source.md',
      },
      'session',
    )

    expect(decision.allowed).toBe(false)
    expect(decision.reason).toContain('manager) can only manage skills for employee-level agents')
    expect(queries.some((query) => query.filters.agent_key === 'vibey')).toBe(true)
  })

  it('allows HR to manage non-locked agent skills across the team', async () => {
    const { client } = makeAgentsRegistryClient()
    const core = new ArtifactLegacyRuntimeCoreService()

    const decision = await core.authorizeAction(
      {
        resolveUserId: () => 'user-1',
        resolveOrgId: () => null,
        parseAgentIdFromSessionKey: () => 'hr',
        getUserClient: async () => client,
      },
      'create_agent_skill',
      {
        agent_key: 'copywriter',
        skill_key: 'offer-research',
        name: 'Offer Research',
        markdown_content: 'Use this before writing offers.',
      },
      'session',
    )

    expect(decision.allowed).toBe(true)
  })

  it('keeps platform-managed agent skills locked even when HR is acting', async () => {
    const { client } = makeAgentsRegistryClient()
    const core = new ArtifactLegacyRuntimeCoreService()

    const decision = await core.authorizeAction(
      {
        resolveUserId: () => 'user-1',
        resolveOrgId: () => null,
        parseAgentIdFromSessionKey: () => 'hr',
        getUserClient: async () => client,
      },
      'create_agent_skill',
      {
        agent_key: 'atlas',
        skill_key: 'atlas-edit',
        name: 'Atlas Edit',
        markdown_content: 'Do not allow this.',
      },
      'session',
    )

    expect(decision.allowed).toBe(false)
    expect(decision.reason).toContain('platform-managed')
  })
})
