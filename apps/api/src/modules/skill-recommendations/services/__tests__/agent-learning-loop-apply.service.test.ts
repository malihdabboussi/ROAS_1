import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { AgentLearningLoopPolicyService } from '../agent-learning-loop-policy.service'
import { AgentLearningLoopApplyService } from '../agent-learning-loop-apply.service'

const supabase = { from: vi.fn() } as unknown as SupabaseClient

function baseRecommendation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'recommendation-1',
    org_id: 'org-1',
    candidate_id: 'candidate-1',
    job_id: 'job-1',
    target_agent_key: 'designer',
    skill_key: 'proposal-doc-builder',
    name: 'Proposal Doc Builder',
    description: 'Use when building repeat proposal docs.',
    markdown_content: '# Proposal Doc Builder',
    resources: [],
    evidence_event_ids: ['event-1', 'event-2', 'event-3'],
    workflow_summary: 'Builds proposal docs.',
    recommended_actions: ['Draft proposal'],
    confidence: 0.88,
    status: 'ready',
    proposal_kind: 'skill_update',
    route_out_type: null,
    customer_visible: true,
    target_artifact_kind: 'skill',
    target_artifact_key: 'proposal-doc-builder',
    artifact_lock_key: 'org-1:designer:skill:proposal-doc-builder',
    priority_score: 78,
    proposed_patch: {},
    quality_failures: [],
    applied_checkpoint_id: null,
    applied_at: null,
    applied_by: null,
    created_at: '2026-06-24T10:00:00.000Z',
    updated_at: '2026-06-24T10:00:00.000Z',
    ...overrides,
  }
}

function makeService(repoOverrides: Record<string, unknown> = {}) {
  const repository = {
    getRecommendation: vi.fn(async () => ({
      data: baseRecommendation(),
      error: null,
    })),
    ...repoOverrides,
  }
  const learningRepository = {
    findAgentSkillByKey: vi.fn(async () => ({ data: { id: 'skill-1' }, error: null })),
    markRecommendationApplied: vi.fn(async () => ({
      data: baseRecommendation({
        status: 'experiment_running',
        applied_checkpoint_id: 'checkpoint-1',
      }),
      error: null,
    })),
    createExperiment: vi.fn(async () => ({
      data: { id: 'experiment-1' },
      error: null,
    })),
    getRunningExperimentForRecommendation: vi.fn(async () => ({
      data: {
        id: 'experiment-1',
        status: 'running',
        baseline_metrics: {
          primarySuccessRate: 0.5,
          toolErrorRate: 0.1,
          roleViolationRate: 0.02,
          negativeFeedbackRate: 0.04,
        },
        started_at: '2026-06-01T00:00:00.000Z',
      },
      error: null,
    })),
    summarizeExperimentEvents: vi.fn(async () => ({
      data: [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
      ],
      error: null,
    })),
    summarizeAgentTurnFeedback: vi.fn(async () => ({
      data: {
        total_count: 0,
        negative_count: 0,
        trusted_negative_count: 0,
      },
      error: null,
    })),
    updateExperimentDecision: vi.fn(async () => ({ data: null, error: null })),
    updateRecommendationExperimentStatus: vi.fn(async () => ({
      data: baseRecommendation({ status: 'kept' }),
      error: null,
    })),
    ...repoOverrides,
  }
  const operations = {
    assertCanManageAgent: vi.fn(async () => undefined),
    createAgentSkill: vi.fn(async () => ({ id: 'skill-new' })),
    updateAgentSkill: vi.fn(async () => ({ id: 'skill-1' })),
    createAgentSkillResource: vi.fn(async () => ({ id: 'resource-1' })),
  }
  const checkpoints = {
    createLearningLoopCheckpoint: vi.fn(async () => ({ id: 'checkpoint-1' })),
    restore: vi.fn(async () => ({ ok: true, checkpoint_id: 'restore-checkpoint-1' })),
  }
  const missionsRepository = {
    upsertAgentDefinition: vi.fn(async () => ({ id: 'definition-1' })),
  }
  const gateway = {
    triggerAgentSkillsSync: vi.fn(async () => true),
  }
  const service = new AgentLearningLoopApplyService(
    repository as never,
    learningRepository as never,
    operations as never,
    checkpoints as never,
    missionsRepository as never,
    gateway as never,
    new AgentLearningLoopPolicyService(),
  )
  return {
    service,
    repository,
    learningRepository,
    operations,
    checkpoints,
    missionsRepository,
    gateway,
  }
}

describe('AgentLearningLoopApplyService', () => {
  it('refuses to apply route-outs and hidden platform/system proposals', async () => {
    const { service, checkpoints } = makeService({
      getRecommendation: vi.fn(async () => ({
        data: baseRecommendation({
          status: 'routed_out',
          proposal_kind: 'route_out',
          route_out_type: 'product_fix_proposal',
          customer_visible: false,
        }),
        error: null,
      })),
    })

    await expect(
      service.applyRecommendation(supabase, 'user-1', 'org-1', 'recommendation-1'),
    ).rejects.toThrow('customer-visible')
    expect(checkpoints.createLearningLoopCheckpoint).not.toHaveBeenCalled()
  })

  it('applies agent file updates through a checkpointed guarded definition write', async () => {
    const { service, operations, checkpoints, missionsRepository, gateway, learningRepository } =
      makeService({
        getRecommendation: vi.fn(async () => ({
          data: baseRecommendation({
            proposal_kind: 'agent_file_update',
            target_artifact_kind: 'agent_file',
            target_artifact_key: 'ROLE.md',
            artifact_lock_key: 'org-1:designer:agent_file:ROLE.md',
            proposed_patch: {
              file_name: 'ROLE.md',
              content: '# Role\n\nUpdated operating boundary.',
            },
          }),
          error: null,
        })),
      })

    const result = await service.applyRecommendation(
      supabase,
      'user-1',
      'org-1',
      'recommendation-1',
    )

    expect(operations.assertCanManageAgent).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'designer',
      'org-1',
    )
    expect(checkpoints.createLearningLoopCheckpoint).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'org-1',
      'designer',
      expect.stringContaining('Agent Learning Loop'),
    )
    expect(missionsRepository.upsertAgentDefinition).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'org-1',
      'designer',
      'ROLE.md',
      '# Role\n\nUpdated operating boundary.',
    )
    expect(gateway.triggerAgentSkillsSync).toHaveBeenCalledWith('user-1', 'designer', 'org-1')
    expect(learningRepository.markRecommendationApplied).toHaveBeenCalledWith(
      'org-1',
      'recommendation-1',
      'user-1',
      'checkpoint-1',
      'experiment-1',
    )
    expect(result).toMatchObject({
      checkpoint_id: 'checkpoint-1',
      experiment_id: 'experiment-1',
    })
  })

  it('patches org-owned skills and resources through existing skill operations', async () => {
    const { service, learningRepository, operations } = makeService({
      getRecommendation: vi.fn(async () => ({
        data: baseRecommendation({
          proposal_kind: 'skill_update',
          proposed_patch: {
            name: 'Proposal Doc Builder',
            description: 'Use when building repeat proposal docs with pricing sections.',
            markdown_content: '# Proposal Doc Builder\n\n## Steps',
            resources: [
              {
                file_path: 'references/pricing.md',
                content_type: 'text/markdown',
                content: '# Pricing template',
              },
            ],
          },
        }),
        error: null,
      })),
    })

    await service.applyRecommendation(supabase, 'user-1', 'org-1', 'recommendation-1')

    expect(learningRepository.findAgentSkillByKey).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'org-1',
      'designer',
      'proposal-doc-builder',
    )
    expect(operations.updateAgentSkill).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'designer',
      'skill-1',
      {
        name: 'Proposal Doc Builder',
        description: 'Use when building repeat proposal docs with pricing sections.',
        markdown_content: '# Proposal Doc Builder\n\n## Steps',
      },
      'org-1',
    )
    expect(operations.createAgentSkillResource).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'designer',
      'proposal-doc-builder',
      {
        file_path: 'references/pricing.md',
        content_type: 'text/markdown',
        content: '# Pricing template',
      },
      'org-1',
    )
  })

  it('keeps an experiment when post-apply evidence clears the thresholds', async () => {
    const { service, learningRepository } = makeService({
      summarizeExperimentEvents: vi.fn(async () => ({
        data: Array.from({ length: 24 }, () => ({ status: 'completed' })),
        error: null,
      })),
    })

    const result = await service.evaluateExperiment(
      supabase,
      'user-1',
      'org-1',
      'recommendation-1',
    )

    expect(learningRepository.updateExperimentDecision).toHaveBeenCalledWith(
      'org-1',
      'experiment-1',
      expect.objectContaining({
        decision: 'keep',
        status: 'completed',
        qualifying_events: 24,
      }),
    )
    expect(learningRepository.updateRecommendationExperimentStatus).toHaveBeenCalledWith(
      'org-1',
      'recommendation-1',
      'kept',
    )
    expect(result).toMatchObject({ decision: 'keep' })
  })

  it('reverts through the saved checkpoint when experiment evidence regresses', async () => {
    const { service, learningRepository, checkpoints, gateway } = makeService({
      getRecommendation: vi.fn(async () => ({
        data: baseRecommendation({
          status: 'experiment_running',
          applied_checkpoint_id: 'checkpoint-1',
        }),
        error: null,
      })),
      summarizeExperimentEvents: vi.fn(async () => ({
        data: Array.from({ length: 20 }, (_, index) => ({
          status: index < 8 ? 'completed' : 'failed',
        })),
        error: null,
      })),
    })

    const result = await service.evaluateExperiment(
      supabase,
      'user-1',
      'org-1',
      'recommendation-1',
    )

    expect(checkpoints.restore).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'org-1',
      'designer',
      'checkpoint-1',
    )
    expect(gateway.triggerAgentSkillsSync).toHaveBeenCalledWith('user-1', 'designer', 'org-1')
    expect(learningRepository.updateRecommendationExperimentStatus).toHaveBeenCalledWith(
      'org-1',
      'recommendation-1',
      'reverted',
    )
    expect(result).toMatchObject({ decision: 'revert' })
  })

  it('uses trusted agent turn feedback as an experiment guardrail', async () => {
    const { service, learningRepository, checkpoints } = makeService({
      getRecommendation: vi.fn(async () => ({
        data: baseRecommendation({
          status: 'experiment_running',
          applied_checkpoint_id: 'checkpoint-1',
        }),
        error: null,
      })),
      summarizeExperimentEvents: vi.fn(async () => ({
        data: Array.from({ length: 24 }, () => ({ status: 'completed' })),
        error: null,
      })),
      summarizeAgentTurnFeedback: vi.fn(async () => ({
        data: {
          total_count: 10,
          negative_count: 4,
          trusted_negative_count: 2,
        },
        error: null,
      })),
    })

    const result = await service.evaluateExperiment(
      supabase,
      'user-1',
      'org-1',
      'recommendation-1',
    )

    expect(learningRepository.updateExperimentDecision).toHaveBeenCalledWith(
      'org-1',
      'experiment-1',
      expect.objectContaining({
        decision: 'revert',
        current_metrics: expect.objectContaining({
          primarySuccessRate: 1,
          negativeFeedbackRate: 0.4,
        }),
      }),
    )
    expect(checkpoints.restore).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'org-1',
      'designer',
      'checkpoint-1',
    )
    expect(result).toMatchObject({ decision: 'revert' })
  })
})
