import { describe, expect, it, vi } from 'vitest'
import type { ErrorReporter } from '@vibey/api-shared'
import { SkillRecommendationsRepository } from '../../repositories/skill-recommendations.repository'
import type { SkillRecommendationEventRow } from '../../types/skill-recommendations.types'
import { SkillRecommendationJobsService } from '../skill-recommendation-jobs.service'

const mockErrorReporter = { report: vi.fn() } as unknown as ErrorReporter

function chainWith<T extends Record<string, unknown>>(extra: T): T & Record<string, unknown> {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    update: vi.fn(() => chain),
    ...extra,
  }
  return chain as T & Record<string, unknown>
}

describe('SkillRecommendationJobsService', () => {
  it('dedupes when an active job already exists for the candidate', async () => {
    const existingQuery = chainWith({
      maybeSingle: vi.fn(async () => ({
        data: { id: 'job-active', status: 'queued' },
        error: null,
      })),
    })
    const from = vi.fn(() => existingQuery)
    const service = new SkillRecommendationJobsService(
      new SkillRecommendationsRepository({ client: { from } } as never),
      {} as never,
      { reviewCandidate: vi.fn() } as never,
      mockErrorReporter,
    )

    const result = await service.enqueueCandidateReview({
      userId: 'user-1',
      orgId: 'org-1',
      candidateId: 'candidate-1',
      triggerEventId: 'event-1',
    })

    expect(result).toEqual({ jobId: 'job-active', status: 'queued', deduped: true })
    expect(from).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledWith('agent_improvement_jobs')
  })

  it('creates a queued job and marks the open candidate queued when no active job exists', async () => {
    const existingQuery = chainWith({
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    })
    const insertPayloads: Record<string, unknown>[] = []
    const insertQuery = chainWith({
      insert: vi.fn((payload: Record<string, unknown>) => {
        insertPayloads.push(payload)
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { id: 'job-new', status: 'queued' },
              error: null,
            })),
          })),
        }
      }),
    })
    const candidateUpdates: Record<string, unknown>[] = []
    const candidateQuery = chainWith({
      update: vi.fn((payload: Record<string, unknown>) => {
        candidateUpdates.push(payload)
        return candidateQuery
      }),
    })
    const from = vi
      .fn()
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(candidateQuery)
    const service = new SkillRecommendationJobsService(
      new SkillRecommendationsRepository({ client: { from } } as never),
      {} as never,
      { reviewCandidate: vi.fn() } as never,
      mockErrorReporter,
    )
    service.processDueJobs = vi.fn(async () => undefined)

    const result = await service.enqueueCandidateReview({
      userId: 'user-1',
      orgId: 'org-1',
      candidateId: 'candidate-1',
      triggerEventId: 'event-1',
    })

    expect(result).toEqual({ jobId: 'job-new', status: 'queued', deduped: false })
    expect(from).toHaveBeenNthCalledWith(1, 'agent_improvement_jobs')
    expect(from).toHaveBeenNthCalledWith(2, 'agent_improvement_jobs')
    expect(from).toHaveBeenNthCalledWith(3, 'agent_improvement_candidates')
    expect(insertPayloads[0]).toMatchObject({
      user_id: 'user-1',
      org_id: 'org-1',
      candidate_id: 'candidate-1',
      dedupe_key: 'agent-improvement:candidate-1',
      status: 'queued',
      attempts: 0,
      max_attempts: 3,
      payload: {
        candidate_id: 'candidate-1',
        trigger_event_id: 'event-1',
      },
    })
    expect(candidateUpdates).toEqual([{ status: 'analysis_queued' }])
    expect(service.processDueJobs).toHaveBeenCalledTimes(1)
  })

  it('hydrates Jaime-only trace evidence from event trace ids', async () => {
    const traceRows = [
      {
        id: 'trace-1',
        user_message: 'Build proposal for test@example.com at https://example.com',
        response: 'Created proposal response',
        tool_steps: [{ name: 'create_doc', status: 'completed' }],
        messages_input: { messages: [{ role: 'user', content: 'Build proposal' }] },
        messages_output: [{ role: 'assistant', content: 'Created proposal response' }],
        system_prompt: 'System prompt with 123e4567-e89b-12d3-a456-426614174000',
        model: 'anthropic/claude-sonnet-4.6',
        status: 'completed',
        total_tokens: 1200,
        duration_ms: 3000,
        completed_at: '2026-06-05T12:00:00.000Z',
      },
    ]
    const traceQuery = chainWith({
      in: vi.fn(async () => ({ data: traceRows, error: null })),
    })
    const from = vi.fn(() => traceQuery)
    const service = new SkillRecommendationJobsService(
      new SkillRecommendationsRepository({ client: { from } } as never),
      {} as never,
      { reviewCandidate: vi.fn() } as never,
      mockErrorReporter,
    )
    const loadTraceEvidence = (
      service as unknown as {
        loadTraceEvidence: (
          orgId: string,
          events: SkillRecommendationEventRow[],
        ) => Promise<unknown[]>
      }
    ).loadTraceEvidence.bind(service)

    const evidence = await loadTraceEvidence('org-1', [
      {
        id: 'event-1',
        user_id: 'user-1',
        org_id: 'org-1',
        agent_key: 'designer',
        conversation_id: 'conversation-1',
        trace_id: 'trace-1',
        channel: 'studio',
        prompt_fingerprint: 'fp',
        prompt_excerpt: 'Build proposal',
        tool_signature: 'create_doc',
        tool_names: ['create_doc'],
        skill_keys_used: [],
        workflow_keys_used: [],
        status: 'completed',
        created_at: '2026-06-05T12:00:00.000Z',
      },
    ])

    expect(from).toHaveBeenCalledWith('vb_agent_traces')
    expect(traceQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(traceQuery.in).toHaveBeenCalledWith('id', ['trace-1'])
    expect(evidence).toEqual([
      expect.objectContaining({
        event_id: 'event-1',
        trace_id: 'trace-1',
        user_message: 'Build proposal for [email] at [url]',
        agent_response: 'Created proposal response',
        tool_steps_excerpt: expect.stringContaining('create_doc'),
        messages_input_excerpt: expect.stringContaining('Build proposal'),
        messages_output_excerpt: expect.stringContaining('Created proposal response'),
        system_prompt_excerpt: 'System prompt with [id]',
        model: 'anthropic/claude-sonnet-4.6',
        status: 'completed',
        total_tokens: 1200,
        duration_ms: 3000,
      }),
    ])
  })

  it('stores route-outs as hidden non-customer proposals', async () => {
    const candidate = {
      id: 'candidate-1',
      org_id: 'org-1',
      agent_key: 'designer',
      prompt_fingerprint: 'fp',
      tool_signature: 'send_to_agent',
      tool_names: ['send_to_agent'],
      run_count: 3,
      evidence_event_ids: ['event-1'],
      first_event_at: '2026-06-24T10:00:00.000Z',
      last_event_at: '2026-06-24T11:00:00.000Z',
      status: 'analysis_processing',
      skip_reason: null,
      created_at: '2026-06-24T10:00:00.000Z',
      updated_at: '2026-06-24T10:00:00.000Z',
    }
    const repository = {
      markCandidateProcessing: vi.fn(async () => ({ error: null })),
      loadCandidate: vi.fn(async () => ({ data: candidate, error: null })),
      loadEvents: vi.fn(async () => ({ data: [], error: null })),
      listExistingSkills: vi.fn(async () => ({ data: [], error: null })),
      summarizeAgentTurnFeedback: vi.fn(async () => ({
        data: {
          total_count: 3,
          positive_count: 2,
          negative_count: 1,
          trusted_negative_count: 1,
          top_tags: ['tool_problem'],
        },
        error: null,
      })),
      upsertRecommendation: vi.fn(async () => ({
        data: { id: 'recommendation-route-out' },
        error: null,
      })),
      updateCandidate: vi.fn(async () => ({ error: null })),
      markJobSucceeded: vi.fn(async () => ({ error: null })),
      markJobFailedOrRetry: vi.fn(async () => ({ error: null })),
    }
    const service = new SkillRecommendationJobsService(
      repository as never,
      {} as never,
      {
        reviewCandidate: vi.fn(async () => ({
          verdict: 'recommend',
          proposal: {
            proposal_kind: 'route_out',
            route_out_type: 'product_fix_proposal',
            customer_visible: false,
            target_agent_key: 'designer',
            skill_key: 'route-out-tool-schema',
            name: 'Tool Schema Product Fix',
            description: 'Platform-owned tool contract needs engineering review.',
            markdown_content: 'not customer visible',
            resources: [],
            workflow_summary: 'Tool calls failed because the tool schema is wrong.',
            recommended_actions: ['Open product fix proposal for engineering'],
            evidence_event_ids: ['event-1'],
            confidence: 0.9,
            target_artifact_kind: 'tool_schema',
            target_artifact_key: 'send_to_agent',
            artifact_lock_key: 'platform:designer:tool_schema:send_to_agent',
            priority_score: 88,
            proposed_patch: { problem: 'schema mismatch' },
            quality_failures: [],
          },
          raw: '{}',
        })),
      } as never,
      mockErrorReporter,
    )

    await (
      service as unknown as {
        executeClaimedJob: (job: Record<string, unknown>) => Promise<void>
      }
    ).executeClaimedJob({
      id: 'job-1',
      user_id: 'user-1',
      org_id: 'org-1',
      candidate_id: 'candidate-1',
      attempts: 1,
      max_attempts: 3,
    })

    expect(repository.upsertRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        proposal_kind: 'route_out',
        route_out_type: 'product_fix_proposal',
        customer_visible: false,
        status: 'routed_out',
        target_artifact_kind: 'tool_schema',
        target_artifact_key: 'send_to_agent',
      }),
    )
    expect(repository.updateCandidate).toHaveBeenCalledWith('candidate-1', {
      status: 'routed_out',
    })
  })

  it('patches an existing pending proposal for the same artifact instead of adding duplicates', async () => {
    const candidate = {
      id: 'candidate-2',
      org_id: 'org-1',
      agent_key: 'designer',
      prompt_fingerprint: 'fp-2',
      tool_signature: 'create_doc',
      tool_names: ['create_doc'],
      run_count: 4,
      evidence_event_ids: ['event-1', 'event-2', 'event-3'],
      first_event_at: '2026-06-24T10:00:00.000Z',
      last_event_at: '2026-06-24T11:00:00.000Z',
      status: 'analysis_processing',
      skip_reason: null,
      created_at: '2026-06-24T10:00:00.000Z',
      updated_at: '2026-06-24T10:00:00.000Z',
    }
    const repository = {
      markCandidateProcessing: vi.fn(async () => ({ error: null })),
      loadCandidate: vi.fn(async () => ({ data: candidate, error: null })),
      loadEvents: vi.fn(async () => ({ data: [], error: null })),
      listExistingSkills: vi.fn(async () => ({ data: [], error: null })),
      summarizeAgentTurnFeedback: vi.fn(async () => ({
        data: {
          total_count: 0,
          positive_count: 0,
          negative_count: 0,
          trusted_negative_count: 0,
          top_tags: [],
        },
        error: null,
      })),
      upsertRecommendation: vi.fn(async () => ({
        data: { id: 'recommendation-new' },
        error: null,
      })),
      updateCandidate: vi.fn(async () => ({ error: null })),
      markJobSucceeded: vi.fn(async () => ({ error: null })),
      markJobFailedOrRetry: vi.fn(async () => ({ error: null })),
    }
    const learningRepository = {
      findRunningExperimentByArtifactLockKey: vi.fn(async () => ({ data: null, error: null })),
      findReadyRecommendationByArtifactLockKey: vi.fn(async () => ({
        data: { id: 'recommendation-existing' },
        error: null,
      })),
      updateRecommendationProposal: vi.fn(async () => ({
        data: { id: 'recommendation-existing' },
        error: null,
      })),
    }
    const service = new SkillRecommendationJobsService(
      repository as never,
      learningRepository as never,
      {
        reviewCandidate: vi.fn(async () => ({
          verdict: 'recommend',
          proposal: {
            proposal_kind: 'skill_update',
            route_out_type: null,
            customer_visible: true,
            target_agent_key: 'designer',
            skill_key: 'proposal-doc-builder',
            name: 'Proposal Doc Builder',
            description: 'Use when building repeat proposal docs.',
            markdown_content: '# Proposal Doc Builder',
            resources: [],
            workflow_summary: 'Builds proposal docs.',
            recommended_actions: ['Draft proposal'],
            evidence_event_ids: ['event-1', 'event-2', 'event-3'],
            confidence: 0.82,
            target_artifact_kind: 'skill',
            target_artifact_key: 'proposal-doc-builder',
            artifact_lock_key: 'org-1:designer:skill:proposal-doc-builder',
            priority_score: 78,
            proposed_patch: { markdown_content: '# Proposal Doc Builder\n\nUpdated' },
            quality_failures: [],
          },
          raw: '{}',
        })),
      } as never,
      mockErrorReporter,
    )

    await (
      service as unknown as {
        executeClaimedJob: (job: Record<string, unknown>) => Promise<void>
      }
    ).executeClaimedJob({
      id: 'job-2',
      user_id: 'user-1',
      org_id: 'org-1',
      candidate_id: 'candidate-2',
      attempts: 1,
      max_attempts: 3,
    })

    expect(learningRepository.findReadyRecommendationByArtifactLockKey).toHaveBeenCalledWith(
      'org-1',
      'org-1:designer:skill:proposal-doc-builder',
    )
    expect(learningRepository.updateRecommendationProposal).toHaveBeenCalledWith(
      'org-1',
      'recommendation-existing',
      expect.objectContaining({
        proposal_kind: 'skill_update',
        artifact_lock_key: 'org-1:designer:skill:proposal-doc-builder',
        proposed_patch: { markdown_content: '# Proposal Doc Builder\n\nUpdated' },
      }),
    )
    expect(repository.upsertRecommendation).not.toHaveBeenCalled()
    expect(repository.updateCandidate).toHaveBeenCalledWith('candidate-2', {
      status: 'recommended',
    })
  })

  it('passes human turn feedback summary into Jaime review context', async () => {
    const candidate = {
      id: 'candidate-feedback',
      org_id: 'org-1',
      agent_key: 'designer',
      prompt_fingerprint: 'fp-feedback',
      tool_signature: 'create_doc',
      tool_names: ['create_doc'],
      run_count: 3,
      evidence_event_ids: ['event-1', 'event-2', 'event-3'],
      first_event_at: '2026-06-20T10:00:00.000Z',
      last_event_at: '2026-06-24T11:00:00.000Z',
      status: 'analysis_processing',
      skip_reason: null,
      created_at: '2026-06-20T10:00:00.000Z',
      updated_at: '2026-06-24T10:00:00.000Z',
    }
    const repository = {
      markCandidateProcessing: vi.fn(async () => ({ error: null })),
      loadCandidate: vi.fn(async () => ({ data: candidate, error: null })),
      loadEvents: vi.fn(async () => ({ data: [], error: null })),
      listExistingSkills: vi.fn(async () => ({ data: [], error: null })),
      summarizeAgentTurnFeedback: vi.fn(async () => ({
        data: {
          total_count: 7,
          positive_count: 5,
          negative_count: 2,
          trusted_negative_count: 1,
          top_tags: ['missed_context', 'tool_problem'],
        },
        error: null,
      })),
      updateCandidate: vi.fn(async () => ({ error: null })),
      markJobSucceeded: vi.fn(async () => ({ error: null })),
      markJobFailedOrRetry: vi.fn(async () => ({ error: null })),
    }
    const jaime = {
      reviewCandidate: vi.fn(async () => ({
        verdict: 'skip',
        reason: 'already covered',
        raw: '{}',
      })),
    }
    const service = new SkillRecommendationJobsService(
      repository as never,
      {} as never,
      jaime as never,
      mockErrorReporter,
    )

    await (
      service as unknown as {
        executeClaimedJob: (job: Record<string, unknown>) => Promise<void>
      }
    ).executeClaimedJob({
      id: 'job-feedback',
      user_id: 'user-1',
      org_id: 'org-1',
      candidate_id: 'candidate-feedback',
      attempts: 1,
      max_attempts: 3,
    })

    expect(repository.summarizeAgentTurnFeedback).toHaveBeenCalledWith(
      'org-1',
      'designer',
      expect.any(String),
    )
    expect(jaime.reviewCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackSummary: expect.objectContaining({
          total_count: 7,
          negative_count: 2,
          trusted_negative_count: 1,
          top_tags: ['missed_context', 'tool_problem'],
        }),
      }),
    )
  })
})
