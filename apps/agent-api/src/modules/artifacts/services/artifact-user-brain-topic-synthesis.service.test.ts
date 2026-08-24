import { describe, expect, it, vi } from 'vitest'
import type { BrainRetrievalCandidate, BrainRetrievalSearchResult } from '@vibey/api-shared'
import { ArtifactUserBrainTopicSynthesisService } from './artifact-user-brain-topic-synthesis.service'

function candidate(
  id: string,
  kind: BrainRetrievalCandidate['kind'],
  content: string,
  metadata: Record<string, unknown> = {},
): BrainRetrievalCandidate {
  return {
    id,
    brain_id: 'brain-1',
    brain_scope: 'user',
    brain_owner_id: 'user-1',
    org_id: null,
    effective_access: 'query',
    access_source: 'owner',
    family: 'user',
    kind,
    title: content.slice(0, 40),
    content,
    snippet: content,
    source_type: 'fathom',
    source_id: `source-${id}`,
    source_title: `Source ${id}`,
    metadata,
    temporal: {},
    scores: { final: 0.8 },
    match_reasons: ['Matched topic'],
    evidence_refs: [],
    related: [],
  }
}

function result(
  query: string,
  results: BrainRetrievalCandidate[],
  sufficient = true,
): BrainRetrievalSearchResult {
  return {
    success: true,
    query,
    family: 'user',
    count: results.length,
    context_sufficient: sufficient,
    sufficiency: {
      sufficient,
      confidence: sufficient ? 0.84 : 0.25,
      reason: sufficient ? 'Direct evidence found.' : 'Not enough direct evidence.',
      missing: sufficient ? [] : ['direct evidence'],
      suggested_next_queries: [],
    },
    missing: sufficient ? [] : ['direct evidence'],
    suggested_next_queries: [],
    results,
  }
}

function target(search: ReturnType<typeof vi.fn>) {
  return {
    brainRetrievalService: { search },
    serviceClient: { name: 'service-client' },
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => 'org-1'),
    getUserClient: vi.fn(async () => ({ name: 'user-client' })),
  }
}

describe('ArtifactUserBrainTopicSynthesisService', () => {
  it('retrieves multiple topic angles and returns a deduplicated evidence dossier', async () => {
    const sharedDecision = candidate('decision-1', 'memory', 'Use one evergreen webinar.', {
      memory_type: 'decision',
    })
    const search = vi
      .fn()
      .mockResolvedValueOnce(
        result('What do I think about webinars?', [
          candidate('belief-1', 'belief_pattern', 'Webinars work when the offer is specific.'),
          sharedDecision,
        ]),
      )
      .mockResolvedValueOnce(result('webinars', [sharedDecision]))
      .mockResolvedValueOnce(
        result('webinars beliefs decisions preferences', [
          candidate('preference-1', 'memory', 'Prefer live Q and A.', {
            memory_type: 'preference',
          }),
        ]),
      )
      .mockResolvedValueOnce(
        result('webinars strategies frameworks examples', [
          candidate('framework-1', 'memory', 'Teach, diagnose, then make the offer.', {
            memory_type: 'framework',
          }),
        ]),
      )
    const runtime = target(search)

    const response = await new ArtifactUserBrainTopicSynthesisService().synthesizeTopic(
      runtime,
      { topic: 'webinars', question: 'What do I think about webinars?', evidence_limit: 12 },
      'session-1',
    )

    expect(search).toHaveBeenCalledTimes(4)
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        family: 'user',
        query: 'What do I think about webinars?',
        userId: 'user-1',
        orgId: 'org-1',
        requiredAccess: 'query',
      }),
    )
    expect(runtime.getUserClient).toHaveBeenCalledWith('user-1', 'session-1')
    expect(response).toMatchObject({
      success: true,
      topic: 'webinars',
      question: 'What do I think about webinars?',
      brain_id: 'brain-1',
      coverage: {
        query_count: 4,
        retrieved_count: 5,
        unique_evidence_count: 4,
        context_sufficient: true,
      },
    })
    expect(response.synthesis.core_beliefs).toEqual(['E1'])
    expect(response.synthesis.decisions).toHaveLength(1)
    expect(response.synthesis.preferences).toHaveLength(1)
    expect(response.synthesis.frameworks_and_strategies).toHaveLength(1)
    expect(response.evidence.map((item) => item.ref)).toEqual(['E1', 'E2', 'E3', 'E4'])
    expect(response.evidence.filter((item) => item.id === 'decision-1')).toHaveLength(1)
  })

  it('returns an explicit coverage gap instead of inventing a synthesis', async () => {
    const search = vi.fn(async ({ query }: { query: string }) => result(query, [], false))

    const response = await new ArtifactUserBrainTopicSynthesisService().synthesizeTopic(
      target(search),
      { topic: 'unfamiliar topic' },
      'session-1',
    )

    expect(response.coverage).toMatchObject({
      context_sufficient: false,
      unique_evidence_count: 0,
    })
    expect(response.synthesis.short_answer_basis).toEqual([])
    expect(response.gaps).toContain('direct evidence')
    expect(response.evidence).toEqual([])
  })

  it('fails before retrieval when the Brain runtime is unavailable', async () => {
    await expect(
      new ArtifactUserBrainTopicSynthesisService().synthesizeTopic(
        { resolveUserId: () => 'user-1' },
        { topic: 'webinars' },
        'session-1',
      ),
    ).rejects.toThrow('Brain retrieval service is unavailable')
  })
})
