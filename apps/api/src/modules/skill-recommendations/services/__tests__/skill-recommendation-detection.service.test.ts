import { describe, expect, it, vi } from 'vitest'
import { SkillRecommendationsRepository } from '../../repositories/skill-recommendations.repository'
import type { SkillRecommendationEventRow } from '../../types/skill-recommendations.types'
import { SkillRecommendationDetectionService } from '../skill-recommendation-detection.service'

function event(
  id: string,
  overrides: Partial<SkillRecommendationEventRow> = {},
): SkillRecommendationEventRow {
  return {
    id,
    user_id: `user-${id}`,
    org_id: 'org-1',
    agent_key: 'designer',
    conversation_id: `conversation-${id}`,
    trace_id: `trace-${id}`,
    channel: 'studio',
    prompt_fingerprint: 'fingerprint-1',
    prompt_excerpt: 'Build the proposal again',
    tool_signature: 'create_doc|save_doc',
    tool_names: ['create_doc', 'save_doc'],
    skill_keys_used: [],
    workflow_keys_used: [],
    status: 'completed',
    created_at: new Date(`2026-06-0${id}T10:00:00.000Z`).toISOString(),
    ...overrides,
  }
}

function makeEventsQuery(rows: SkillRecommendationEventRow[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: rows, error: null })),
  }
  return query
}

function makeSystemAgentsQuery(agentKeys: string[]) {
  const query = {
    select: vi.fn(() => query),
    or: vi.fn(async () => ({
      data: agentKeys.map((agent_key) => ({ agent_key })),
      error: null,
    })),
  }
  return query
}

function makeCandidateQuery(capture: { payload?: Record<string, unknown> }) {
  return {
    upsert: vi.fn((payload: Record<string, unknown>) => {
      capture.payload = payload
      return {
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: 'candidate-1' }, error: null })),
        })),
      }
    }),
  }
}

describe('SkillRecommendationDetectionService', () => {
  it('does not create candidates before 3 matching no-skill events', async () => {
    const candidateCapture: { payload?: Record<string, unknown> } = {}
    const eventsQuery = makeEventsQuery([
      event('1'),
      event('2'),
      event('3', { skill_keys_used: ['existing-skill'] }),
    ])
    const systemAgentsQuery = makeSystemAgentsQuery([])
    const candidateQuery = makeCandidateQuery(candidateCapture)
    const from = vi.fn((table: string) => {
      if (table === 'agent_definitions') return systemAgentsQuery
      if (table === 'skill_recommendation_events') return eventsQuery
      if (table === 'agent_improvement_candidates') return candidateQuery
      throw new Error(`Unexpected table ${table}`)
    })
    const jobs = { enqueueCandidateReview: vi.fn() }
    const service = new SkillRecommendationDetectionService(
      new SkillRecommendationsRepository({ client: { from } } as never),
      jobs as never,
    )

    const result = await service.scanOrg('org-1')

    expect(result).toEqual({ candidates: 0, jobs: 0 })
    expect(candidateQuery.upsert).not.toHaveBeenCalled()
    expect(jobs.enqueueCandidateReview).not.toHaveBeenCalled()
  })

  it('creates a candidate and enqueues Jaime review after 3 matching no-skill events', async () => {
    const candidateCapture: { payload?: Record<string, unknown> } = {}
    const eventsQuery = makeEventsQuery([event('3'), event('2'), event('1')])
    const systemAgentsQuery = makeSystemAgentsQuery([])
    const candidateQuery = makeCandidateQuery(candidateCapture)
    const from = vi.fn((table: string) => {
      if (table === 'agent_definitions') return systemAgentsQuery
      if (table === 'skill_recommendation_events') return eventsQuery
      if (table === 'agent_improvement_candidates') return candidateQuery
      throw new Error(`Unexpected table ${table}`)
    })
    const jobs = {
      enqueueCandidateReview: vi.fn(async () => ({
        jobId: 'job-1',
        status: 'queued',
        deduped: false,
      })),
    }
    const service = new SkillRecommendationDetectionService(
      new SkillRecommendationsRepository({ client: { from } } as never),
      jobs as never,
    )

    const result = await service.scanOrg('org-1')

    expect(result).toEqual({ candidates: 1, jobs: 1 })
    expect(candidateCapture.payload).toMatchObject({
      org_id: 'org-1',
      agent_key: 'designer',
      prompt_fingerprint: 'fingerprint-1',
      tool_signature: 'create_doc|save_doc',
      run_count: 3,
      tool_names: ['create_doc', 'save_doc'],
      evidence_event_ids: ['3', '2', '1'],
    })
    expect(jobs.enqueueCandidateReview).toHaveBeenCalledWith({
      userId: 'user-3',
      orgId: 'org-1',
      candidateId: 'candidate-1',
      triggerEventId: '3',
    })
  })

  it('does not create customer-visible candidates for system agents', async () => {
    const candidateCapture: { payload?: Record<string, unknown> } = {}
    const eventsQuery = makeEventsQuery([
      event('3', { agent_key: 'hr' }),
      event('2', { agent_key: 'hr' }),
      event('1', { agent_key: 'hr' }),
    ])
    const systemAgentsQuery = makeSystemAgentsQuery(['hr'])
    const candidateQuery = makeCandidateQuery(candidateCapture)
    const from = vi.fn((table: string) => {
      if (table === 'agent_definitions') return systemAgentsQuery
      if (table === 'skill_recommendation_events') return eventsQuery
      if (table === 'agent_improvement_candidates') return candidateQuery
      throw new Error(`Unexpected table ${table}`)
    })
    const jobs = { enqueueCandidateReview: vi.fn() }
    const service = new SkillRecommendationDetectionService(
      new SkillRecommendationsRepository({ client: { from } } as never),
      jobs as never,
    )

    const result = await service.scanOrg('org-1')

    expect(result).toEqual({ candidates: 0, jobs: 0 })
    expect(candidateQuery.upsert).not.toHaveBeenCalled()
    expect(jobs.enqueueCandidateReview).not.toHaveBeenCalled()
  })
})
