import { describe, expect, it, vi } from 'vitest'
import { MissionSkillSeederService } from './mission-skill-seeder.service'

const LOOP_ROLLOUT_ORG_ID = '699e3530-881c-4653-b507-4c4b5993538f'

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    or: vi.fn(() => query),
    in: vi.fn(() => query),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

function createService(overrides: Record<string, unknown> = {}) {
  const missionsRepository = {
    internalUpsertAgentSkill: vi.fn().mockResolvedValue({ id: 'skill-1' }),
    internalUpsertAgentSkillResource: vi.fn().mockResolvedValue({ id: 'resource-1' }),
    updateAgentSyncStatus: vi.fn().mockResolvedValue(undefined),
    createAgentWithDefinitions: vi.fn().mockResolvedValue({ id: 'agent-1' }),
    listTemplateSkills: vi.fn().mockResolvedValue([]),
  }
  const missionAgentTemplateService = {
    loadTemplatePack: vi.fn().mockResolvedValue([{ file_name: 'AGENTS.md', content: 'follow' }]),
  }

  return {
    service: new MissionSkillSeederService(
      (overrides.missionsRepository ?? missionsRepository) as never,
      (overrides.missionAgentTemplateService ?? missionAgentTemplateService) as never,
    ),
    missionsRepository,
    missionAgentTemplateService,
  }
}

describe('MissionSkillSeederService', () => {
  it('clones selected skills and their resources to a target agent', async () => {
    const queries: Record<string, Array<Record<string, any>>> = {}
    const supabase = {
      from: vi.fn((table: string) => {
        const result =
          table === 'agent_skills'
            ? {
                data: [
                  {
                    skill_key: 'research',
                    name: 'Research',
                    description: 'Research things',
                    markdown_content: '# Research',
                  },
                ],
                error: null,
              }
            : table === 'agent_skill_resources'
              ? {
                  data: [
                    {
                      skill_key: 'research',
                      file_path: 'references/checklist.md',
                      content: '# Checklist',
                    },
                  ],
                  error: null,
                }
              : { data: null, error: null }
        const query = createQuery(result)
        queries[table] = [...(queries[table] ?? []), query]
        return query
      }),
    }
    const { service, missionsRepository } = createService()

    await service.cloneSelectedSkills(
      supabase as never,
      'user-1',
      'source-agent',
      'target-agent',
      ['research'],
    )

    expect(queries.agent_skills?.[0]?.or).toHaveBeenCalledWith('user_id.eq.user-1,user_id.is.null')
    expect(queries.agent_skills?.[0]?.or).toHaveBeenCalledWith(
      'agent_key.eq.source-agent,agent_key.eq.*',
    )
    expect(missionsRepository.internalUpsertAgentSkill).toHaveBeenCalledWith(
      supabase,
      'user-1',
      null,
      'target-agent',
      'research',
      'Research',
      'Research things',
      '# Research',
    )
    expect(missionsRepository.internalUpsertAgentSkillResource).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'target-agent',
      'research',
      'references/checklist.md',
      '# Checklist',
    )
  })

  it('seeds domain library skills with matching resources', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        const result =
          table === 'skill_library'
            ? {
                data: [
                  {
                    skill_key: 'seo-research',
                    name: 'SEO Research',
                    description: 'Research search demand',
                    markdown_content: '# SEO',
                  },
                ],
                error: null,
              }
            : table === 'skill_library_resources'
              ? {
                  data: [
                    {
                      skill_key: 'seo-research',
                      file_path: 'references/seo.md',
                      content: '# SEO details',
                    },
                  ],
                  error: null,
                }
              : { data: null, error: null }
        return createQuery(result)
      }),
    }
    const { service, missionsRepository } = createService()

    await service.seedDomainSkills(supabase as never, 'user-1', 'analyst-1', 'analyst', 'org-1')

    expect(missionsRepository.internalUpsertAgentSkill).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'org-1',
      'analyst-1',
      'seo-research',
      'SEO Research',
      'Research search demand',
      '# SEO',
      'template',
    )
    expect(missionsRepository.internalUpsertAgentSkillResource).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'analyst-1',
      'seo-research',
      'references/seo.md',
      '# SEO details',
      'org-1',
    )
  })

  it('ensures the loop agent for rollout orgs and memoizes the insert', async () => {
    const agentsQuery = createQuery({ data: null, error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agents_registry') return agentsQuery
        return createQuery()
      }),
    }
    const { service } = createService()

    await service.ensureLoopAgent(supabase as never, 'user-1', LOOP_ROLLOUT_ORG_ID)
    await service.ensureLoopAgent(supabase as never, 'user-1', LOOP_ROLLOUT_ORG_ID)

    expect(agentsQuery.insert).toHaveBeenCalledTimes(1)
    expect(agentsQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: null,
        org_id: LOOP_ROLLOUT_ORG_ID,
        agent_key: 'loop',
        name: 'Loop',
        level: 'system',
        sync_status: 'ready',
        created_by: 'user-1',
      }),
    )
  })

  it('marks an existing HR agent ready without recreating it', async () => {
    const agentsQuery = createQuery({ data: { id: 'hr-1', sync_status: 'syncing' }, error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agents_registry') return agentsQuery
        return createQuery()
      }),
    }
    const { service, missionsRepository, missionAgentTemplateService } = createService()

    await service.seedHrAgent(supabase as never, 'user-1', 'org-1')

    expect(missionsRepository.updateAgentSyncStatus).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'hr',
      'ready',
      'org-1',
    )
    expect(missionAgentTemplateService.loadTemplatePack).not.toHaveBeenCalled()
    expect(missionsRepository.createAgentWithDefinitions).not.toHaveBeenCalled()
  })
})
