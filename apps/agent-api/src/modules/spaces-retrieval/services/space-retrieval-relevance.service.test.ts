import { describe, expect, it } from 'vitest'
import type {
  SpaceRetrievalCandidate,
  SpaceRetrievalSearchResult,
} from '../types/space-retrieval.types'
import { classifySpaceRetrievalResult } from './space-retrieval-relevance.service'

function candidate(
  overrides: Partial<SpaceRetrievalCandidate> & Pick<SpaceRetrievalCandidate, 'id'>,
): SpaceRetrievalCandidate {
  return {
    id: overrides.id,
    space_object_id: `object-${overrides.id}`,
    source_type: overrides.source_type ?? 'space_doc',
    source_id: overrides.source_id ?? `source-${overrides.id}`,
    source_title: overrides.source_title ?? 'Source',
    title: overrides.title ?? 'Evidence',
    content: overrides.content ?? 'Evidence content',
    snippet: overrides.snippet ?? 'Evidence content',
    user_id: overrides.user_id ?? 'user-2',
    org_id: overrides.org_id ?? 'org-1',
    space_id: overrides.space_id ?? null,
    campaign_id: overrides.campaign_id ?? null,
    metadata: overrides.metadata ?? {},
    retrieve_via: overrides.retrieve_via ?? {
      action: 'read_space_document',
      data: { document_id: overrides.source_id ?? `source-${overrides.id}` },
    },
    lane: overrides.lane ?? overrides.source_type ?? 'space_doc',
    scores: overrides.scores ?? { semantic: 0.8, final: 0.8 },
    match_reasons: overrides.match_reasons ?? ['Matched Space retrieval evidence'],
  }
}

function result(results: SpaceRetrievalCandidate[]): SpaceRetrievalSearchResult {
  return {
    success: true,
    query: 'launch guardrails',
    count: results.length,
    context_sufficient: false,
    sufficiency: {
      sufficient: false,
      confidence: 0.4,
      reason: 'Needs more evidence.',
      missing: ['approval owner'],
      suggested_next_queries: ['launch approval owner'],
    },
    missing: ['approval owner'],
    suggested_next_queries: ['launch approval owner'],
    results,
  }
}

describe('classifySpaceRetrievalResult', () => {
  it('classifies active Space candidates as strong and preserves retrieval metadata', () => {
    const classified = classifySpaceRetrievalResult(
      result([candidate({ id: 'chunk-1', space_id: 'space-1' })]),
      {
        userId: 'user-1',
        activeSpaceId: 'space-1',
        activeCampaignId: 'campaign-1',
      },
    )

    expect(classified).toMatchObject({
      context_sufficient: false,
      missing: ['approval owner'],
      suggested_next_queries: ['launch approval owner'],
      results: [
        {
          id: 'chunk-1',
          retrieve_via: { action: 'read_space_document' },
          scores: { semantic: 0.8, final: 0.8 },
          match_reasons: ['Matched Space retrieval evidence'],
          relationship: 'active_session',
          confidence: 'strong',
          agent_context_eligible: true,
          use_policy: 'answer_directly',
        },
      ],
    })
  })

  it('classifies active campaign related candidates as medium', () => {
    const classified = classifySpaceRetrievalResult(
      result([candidate({ id: 'chunk-1', space_id: 'space-2', campaign_id: 'campaign-1' })]),
      {
        userId: 'user-1',
        activeSpaceId: 'space-1',
        activeCampaignId: 'campaign-1',
      },
    )

    expect(classified.results[0]).toMatchObject({
      relationship: 'linked_campaign',
      confidence: 'medium',
      use_policy: 'support_only',
    })
  })

  it('classifies broad accessible candidates outside active scope as weak and asks first', () => {
    const classified = classifySpaceRetrievalResult(
      result([candidate({ id: 'chunk-1', space_id: 'space-2', campaign_id: 'campaign-2' })]),
      {
        userId: 'user-1',
        activeSpaceId: 'space-1',
        activeCampaignId: 'campaign-1',
      },
    )

    expect(classified.results[0]).toMatchObject({
      relationship: 'broad_access',
      confidence: 'weak',
      agent_context_eligible: false,
      use_policy: 'ask_first',
    })
    expect(classified.context_decision).toBe('clarify_before_using_shared_context')
  })
})
