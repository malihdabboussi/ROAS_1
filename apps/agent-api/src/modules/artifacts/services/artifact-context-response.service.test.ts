import { describe, expect, it } from 'vitest'
import type { ClassifiedArtifactContext } from './artifact-context-relevance.service'
import { buildContextResponse } from './artifact-context-response.service'

const strong = {
  object_type: 'campaign',
  object_id: 'campaign-1',
  relationship: 'owner',
  confidence: 'strong',
  reason: 'Owned by the current user.',
  agent_context_eligible: true,
  use_policy: 'answer_directly',
} satisfies ClassifiedArtifactContext

const medium = {
  object_type: 'campaign',
  object_id: 'campaign-2',
  relationship: 'linked_campaign',
  confidence: 'medium',
  reason: 'Linked to the active campaign.',
  agent_context_eligible: true,
  use_policy: 'support_only',
} satisfies ClassifiedArtifactContext

const weak = {
  object_type: 'campaign',
  object_id: 'campaign-3',
  relationship: 'org_viewer',
  confidence: 'weak',
  reason: 'Visible through shared organization access.',
  agent_context_eligible: false,
  use_policy: 'ask_first',
} satisfies ClassifiedArtifactContext

describe('buildContextResponse', () => {
  it('returns strong items as primary, medium as supporting, weak as shared by default', () => {
    const result = buildContextResponse({
      itemsKey: 'campaigns',
      items: [
        { id: 'campaign-1', name: 'Owned', context_relevance: strong },
        { id: 'campaign-2', name: 'Linked', context_relevance: medium },
        { id: 'campaign-3', name: 'Shared', context_relevance: weak },
      ],
    })

    expect(result).toMatchObject({
      mode: 'relevant',
      campaigns: [{ id: 'campaign-1', name: 'Owned' }],
      supporting_campaigns: [{ id: 'campaign-2', name: 'Linked' }],
      shared_candidates: [{ id: 'campaign-3', name: 'Shared' }],
    })
    expect(result.context_decision).toBeUndefined()
  })

  it('returns all classified items in accessible mode', () => {
    const result = buildContextResponse({
      mode: 'accessible',
      itemsKey: 'campaigns',
      items: [
        { id: 'campaign-1', name: 'Owned', context_relevance: strong },
        { id: 'campaign-3', name: 'Shared', context_relevance: weak },
      ],
    })

    expect(result).toMatchObject({
      mode: 'accessible',
      campaigns: [
        { id: 'campaign-1', name: 'Owned' },
        { id: 'campaign-3', name: 'Shared' },
      ],
    })
    expect(result.supporting_campaigns).toEqual([])
    expect(result.shared_candidates).toEqual([])
  })

  it('asks before using shared context when only weak matches exist', () => {
    const result = buildContextResponse({
      itemsKey: 'items',
      items: [{ id: 'item-1', context_relevance: weak }],
    })

    expect(result).toMatchObject({
      mode: 'relevant',
      items: [],
      supporting_items: [],
      shared_candidates: [{ id: 'item-1' }],
      context_decision: 'clarify_before_using_shared_context',
    })
  })
})
