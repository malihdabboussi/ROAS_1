import { describe, expect, it, vi } from 'vitest'

async function loadService() {
  const mod = await import('./agent-learning-dream-runner.service')
  expect(mod.AgentLearningDreamRunnerService).toBeTypeOf('function')
  return mod.AgentLearningDreamRunnerService
}

describe('AgentLearningDreamRunnerService', () => {
  it('marks the run skipped when triage removes all evidence', async () => {
    const Service = await loadService()
    const runRepository = {
      findByDedupeKey: vi.fn(async () => null),
      createRun: vi.fn(async () => ({ id: 'run-1' })),
      completeRun: vi.fn(async () => undefined),
      countRecommendationsForRun: vi.fn(async () => 0),
    }
    const collector = {
      collect: vi.fn(async () => ({
        groups: [{ id: 'feedback-1', source: 'agent_turn_feedback', text: 'ok' }],
        sourceCounts: { agent_turn_feedback: 1 },
      })),
    }
    const triage = { triageGroups: vi.fn(async () => ({ included: [] })) }
    const jaime = { runAgentDreamSession: vi.fn() }
    const service = new Service({ runRepository, collector, triage, jaime })

    const result = await service.runAgentDream({
      orgId: 'org-1',
      userId: 'user-1',
      agentKey: 'designer',
      localDate: '2026-06-24',
      windowStart: '2026-06-23T00:00:00.000Z',
      windowEnd: '2026-06-24T00:00:00.000Z',
    })

    expect(jaime.runAgentDreamSession).not.toHaveBeenCalled()
    expect(runRepository.countRecommendationsForRun).not.toHaveBeenCalled()
    expect(runRepository.completeRun).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({
        status: 'skipped',
        skipped_reason: 'no_meaningful_evidence',
      }),
    )
    expect(result).toMatchObject({ skipped: true, proposalsCreated: 0 })
  })

  it('runs Jaime as a tool-loop session and counts proposals linked to the dream run', async () => {
    const Service = await loadService()
    const runRepository = {
      findByDedupeKey: vi.fn(async () => null),
      createRun: vi.fn(async () => ({ id: 'run-1' })),
      completeRun: vi.fn(async () => undefined),
      countRecommendationsForRun: vi.fn(async () => 2),
    }
    const collector = {
      collect: vi.fn(async () => ({
        groups: [{ id: 'event-1', source: 'skill_recommendation_event', text: 'Repeated work' }],
        sourceCounts: { skill_recommendation_events: 1 },
      })),
    }
    const triage = {
      triageGroups: vi.fn(async () => ({
        included: [{ id: 'event-1', source: 'skill_recommendation_event', text: 'Repeated work' }],
      })),
    }
    const jaime = {
      runAgentDreamSession: vi.fn(async () => ({
        content: 'Dream complete. I created two proposals with tools.',
        toolSteps: [],
      })),
    }
    const service = new Service({ runRepository, collector, triage, jaime })

    const result = await service.runAgentDream({
      orgId: 'org-1',
      userId: 'user-1',
      agentKey: 'designer',
      localDate: '2026-06-24',
      windowStart: '2026-06-23T00:00:00.000Z',
      windowEnd: '2026-06-24T00:00:00.000Z',
    })

    expect(jaime.runAgentDreamSession).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        userId: 'user-1',
        agentKey: 'designer',
        runId: 'run-1',
        groups: [expect.objectContaining({ id: 'event-1' })],
      }),
    )
    expect(runRepository.countRecommendationsForRun).toHaveBeenCalledWith('run-1')
    expect(runRepository.completeRun).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({
        status: 'completed',
        output: expect.objectContaining({
          proposals_created: 2,
          jaime_session_completed: true,
        }),
      }),
    )
    expect(result).toMatchObject({ proposalsCreated: 2 })
  })
})
