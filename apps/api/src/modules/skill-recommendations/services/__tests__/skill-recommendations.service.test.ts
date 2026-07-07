import { describe, expect, it, vi } from 'vitest'
import { SkillRecommendationsRepository } from '../../repositories/skill-recommendations.repository'
import { SkillRecommendationsService } from '../skill-recommendations.service'

function makeQuery(result: { data: unknown; error: unknown }) {
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    update: vi.fn(() => query),
  }
  return query
}

describe('SkillRecommendationsService', () => {
  it('materializes Jaime dream settings when recommendations are enabled', async () => {
    const repository = {
      readOrganizationSettings: vi.fn(async () => ({
        data: { settings: { skill_recommendations: { enabled: false } } },
        error: null,
      })),
      updateOrganizationSettings: vi.fn(async () => ({ error: null })),
      materializeAgentLearningDreamSettings: vi.fn(async () => undefined),
    }
    const detection = { scanOrg: vi.fn(async () => ({ candidates: 0, jobs: 0 })) }
    const service = new SkillRecommendationsService(repository as never, detection as never)

    const result = await service.updateSettings('org-1', true)

    expect(result).toEqual({ enabled: true })
    expect(repository.materializeAgentLearningDreamSettings).toHaveBeenCalledWith('org-1')
    expect(detection.scanOrg).toHaveBeenCalledWith('org-1')
  })

  it('loads enabled home recommendations with pending candidates', async () => {
    const orgQuery = makeQuery({
      data: { settings: { skill_recommendations: { enabled: true } } },
      error: null,
    })
    const recommendationsQuery = makeQuery({
      data: [
        {
          id: 'recommendation-1',
          candidate_id: 'candidate-1',
          status: 'ready',
          target_agent_key: 'designer',
        },
      ],
      error: null,
    })
    const candidatesQuery = makeQuery({
      data: [
        {
          id: 'candidate-2',
          agent_key: 'writer',
          run_count: 3,
          status: 'analysis_queued',
          last_event_at: '2026-06-10T10:00:00.000Z',
          tool_names: ['create_doc'],
        },
      ],
      error: null,
    })
    const from = vi
      .fn()
      .mockReturnValueOnce(orgQuery)
      .mockReturnValueOnce(recommendationsQuery)
      .mockReturnValueOnce(candidatesQuery)
    const detection = { scanOrg: vi.fn(async () => ({ candidates: 0, jobs: 0 })) }
    const service = new SkillRecommendationsService(
      new SkillRecommendationsRepository({ client: { from } } as never),
      detection as never,
    )

    const result = await service.getHome({ orgId: 'org-1' }, 50)

    expect(result.settings).toEqual({ enabled: true })
    expect(result.recommendations).toHaveLength(1)
    expect(result.pending).toEqual([
      {
        id: 'candidate-2',
        candidate_id: 'candidate-2',
        target_agent_key: 'writer',
        run_count: 3,
        status: 'analysis_queued',
        last_seen_at: '2026-06-10T10:00:00.000Z',
        tool_names: ['create_doc'],
      },
    ])
    expect(recommendationsQuery.limit).toHaveBeenCalledWith(20)
    expect(candidatesQuery.limit).toHaveBeenCalledWith(20)
    expect(from).toHaveBeenNthCalledWith(1, 'organizations')
    expect(from).toHaveBeenNthCalledWith(2, 'agent_improvement_proposals')
    expect(from).toHaveBeenNthCalledWith(3, 'agent_improvement_candidates')
    expect(detection.scanOrg).toHaveBeenCalledWith('org-1')
  })

  it('surfaces canonical proposal table errors without falling back to removed legacy tables', async () => {
    const orgQuery = makeQuery({
      data: { settings: { skill_recommendations: { enabled: true } } },
      error: null,
    })
    const proposalsQuery = makeQuery({
      data: null,
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.agent_improvement_proposals' in the schema cache",
      },
    })
    const candidatesQuery = makeQuery({ data: [], error: null })
    const from = vi.fn((table: string) => {
      if (table === 'organizations') return orgQuery
      if (table === 'agent_improvement_proposals') return proposalsQuery
      if (table === 'agent_improvement_candidates') return candidatesQuery
      throw new Error(`Unexpected table ${table}`)
    })
    const detection = { scanOrg: vi.fn(async () => ({ candidates: 0, jobs: 0 })) }
    const service = new SkillRecommendationsService(
      new SkillRecommendationsRepository({ client: { from } } as never),
      detection as never,
    )

    await expect(service.getHome({ orgId: 'org-1' }, 5)).rejects.toThrow(
      "Failed to load skill recommendations: Could not find the table 'public.agent_improvement_proposals' in the schema cache",
    )
    expect(from).not.toHaveBeenCalledWith('skill_recommendations')
    expect(from).not.toHaveBeenCalledWith('skill_recommendation_candidates')
  })

  it('updates recommendation status and mirrors status to the candidate', async () => {
    const recommendationQuery = makeQuery({
      data: {
        id: 'recommendation-1',
        candidate_id: 'candidate-1',
        status: 'dismissed',
      },
      error: null,
    })
    const candidateQuery = makeQuery({ data: null, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(recommendationQuery)
      .mockReturnValueOnce(candidateQuery)
    const service = new SkillRecommendationsService(
      new SkillRecommendationsRepository({ client: { from } } as never),
      { scanOrg: vi.fn() } as never,
    )

    const result = await service.updateRecommendation(
      { orgId: 'org-1' },
      'recommendation-1',
      'dismissed',
    )

    expect(result).toMatchObject({ id: 'recommendation-1', candidate_id: 'candidate-1' })
    expect(recommendationQuery.update).toHaveBeenCalledWith({ status: 'dismissed' })
    expect(candidateQuery.update).toHaveBeenCalledWith({ status: 'dismissed' })
    expect(candidateQuery.eq).toHaveBeenCalledWith('id', 'candidate-1')
    expect(candidateQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })
})
