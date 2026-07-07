import { describe, expect, it, vi } from 'vitest'
import { ArtifactDreamOpsService } from './artifact-dream-ops.service'

const DREAM_SESSION = 'agent:org-org-1-hr:dream_ops:hr:user-1:run-1::org:org-1'

function makeClient(input?: { existingRecommendation?: Record<string, unknown> }) {
  const state = {
    inserts: [] as Array<{ table: string; payload: Record<string, unknown> }>,
    updates: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  }

  const run = {
    id: 'run-1',
    org_id: 'org-1',
    user_id: 'user-1',
    operation_type: 'agent_learning_dream',
    subject_kind: 'agent',
    subject_key: 'designer',
    status: 'running',
    window_start: '2026-06-23T00:00:00.000Z',
    window_end: '2026-06-24T00:00:00.000Z',
    output: {},
  }

  const client = {
    from(table: string) {
      const builder: Record<string, unknown> = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        lte: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        range: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => {
          if (table === 'dream_ops_runs') return { data: run, error: null }
          if (table === 'agent_improvement_proposals') {
            return { data: input?.existingRecommendation ?? null, error: null }
          }
          return { data: null, error: null }
        }),
        single: vi.fn(async () => ({
          data: { id: input?.existingRecommendation?.id ?? 'recommendation-1' },
          error: null,
        })),
        insert: vi.fn((payload: Record<string, unknown> | Record<string, unknown>[]) => {
          const record = Array.isArray(payload) ? payload[0] : payload
          state.inserts.push({ table, payload: record })
          return builder
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          state.updates.push({ table, payload })
          return builder
        }),
        upsert: vi.fn((payload: Record<string, unknown> | Record<string, unknown>[]) => {
          const record = Array.isArray(payload) ? payload[0] : payload
          state.inserts.push({ table, payload: record })
          return builder
        }),
      }
      return builder
    },
  }

  return { client, state }
}

function makeTarget(client: unknown) {
  return {
    serviceClient: client,
    logger: { warn: vi.fn(), error: vi.fn(), log: vi.fn() },
  }
}

describe('ArtifactDreamOpsService', () => {
  it('creates a skill update recommendation linked to the active dream run', async () => {
    const { client, state } = makeClient()
    const service = new ArtifactDreamOpsService()
    const handlers = service.getHandlers(makeTarget(client))

    const result = await handlers.dream_propose_skill_update(
      {
        target_artifact_key: 'proposal-builder',
        reason: 'Repeated proposal corrections.',
        proposed_patch: { markdown_content: '# Proposal Builder\n\nUpdated instructions.' },
        evidence_refs: [{ source_table: 'skill_recommendation_events', source_id: 'event-1' }],
        priority_score: 81,
      },
      DREAM_SESSION,
    )

    expect(result).toMatchObject({ success: true, recommendation_id: 'recommendation-1' })
    expect(state.inserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'agent_improvement_candidates',
          payload: expect.objectContaining({
            org_id: 'org-1',
            agent_key: 'designer',
            status: 'recommended',
          }),
        }),
        expect.objectContaining({
          table: 'agent_improvement_proposals',
          payload: expect.objectContaining({
            org_id: 'org-1',
            target_agent_key: 'designer',
            source_dream_run_id: 'run-1',
            target_artifact_kind: 'skill',
            target_artifact_key: 'proposal-builder',
            customer_visible: true,
          }),
        }),
      ]),
    )
  })

  it('patches an existing pending recommendation for the same artifact lock', async () => {
    const { client, state } = makeClient({
      existingRecommendation: {
        id: 'recommendation-existing',
        candidate_id: 'candidate-existing',
        status: 'ready',
        metadata: { existing: true },
      },
    })
    const service = new ArtifactDreamOpsService()
    const handlers = service.getHandlers(makeTarget(client))

    const result = await handlers.dream_propose_skill_update(
      {
        target_artifact_key: 'proposal-builder',
        reason: 'More evidence arrived before approval.',
        proposed_patch: { markdown_content: '# Proposal Builder\n\nPatched instructions.' },
      },
      DREAM_SESSION,
    )

    expect(result).toMatchObject({ success: true, recommendation_id: 'recommendation-existing' })
    expect(state.inserts).toHaveLength(0)
    expect(state.updates).toHaveLength(1)
    expect(state.updates[0]).toMatchObject({
      table: 'agent_improvement_proposals',
      payload: {
        source_dream_run_id: 'run-1',
        proposal_kind: 'skill_update',
      },
    })
  })

  it('rejects proposal actions outside a valid HR Dream Ops session before writing', async () => {
    const { client, state } = makeClient()
    const service = new ArtifactDreamOpsService()
    const handlers = service.getHandlers(makeTarget(client))

    const result = await handlers.dream_propose_skill_update(
      {
        target_artifact_key: 'proposal-builder',
        reason: 'Repeated proposal corrections.',
        proposed_patch: { markdown_content: 'Updated instructions.' },
      },
      'agent:org-org-1-hr:mission:hr:user-1:mission-1::org:org-1',
    )

    expect(result).toMatchObject({
      success: false,
      error_code: 'dream_ops_session_required',
    })
    expect(state.inserts).toHaveLength(0)
    expect(state.updates).toHaveLength(0)
  })
})
