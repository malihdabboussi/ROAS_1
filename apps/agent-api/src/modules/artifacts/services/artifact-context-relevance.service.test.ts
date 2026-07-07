import { describe, expect, it } from 'vitest'
import { classifyArtifactContext } from './artifact-context-relevance.service'

describe('classifyArtifactContext', () => {
  const baseContext = {
    userId: 'user-1',
    orgId: 'org-1',
    agentKey: 'vibey',
    activeCampaignId: 'campaign-active',
    activeSpaceId: 'space-active',
    activeConversationId: 'conversation-active',
  }

  it('classifies explicit references as strong answer context', () => {
    expect(
      classifyArtifactContext({
        objectType: 'campaign',
        row: { id: 'campaign-1', user_id: 'user-2', permission: 'viewer' },
        context: baseContext,
        explicitIds: ['campaign-1'],
      }),
    ).toMatchObject({
      object_type: 'campaign',
      object_id: 'campaign-1',
      relationship: 'explicit_reference',
      confidence: 'strong',
      agent_context_eligible: true,
      use_policy: 'answer_directly',
    })
  })

  it('classifies active session and owner rows as strong', () => {
    expect(
      classifyArtifactContext({
        objectType: 'campaign',
        row: { id: 'campaign-active', user_id: 'user-2', permission: 'viewer' },
        context: baseContext,
      }),
    ).toMatchObject({
      relationship: 'active_session',
      confidence: 'strong',
      use_policy: 'answer_directly',
    })

    expect(
      classifyArtifactContext({
        objectType: 'document',
        row: { id: 'doc-1', user_id: 'user-1', campaign_id: 'campaign-other' },
        context: baseContext,
      }),
    ).toMatchObject({
      relationship: 'owner',
      confidence: 'strong',
      use_policy: 'answer_directly',
    })
  })

  it('classifies active campaign or space links as medium support context', () => {
    expect(
      classifyArtifactContext({
        objectType: 'document',
        row: { id: 'doc-1', user_id: 'user-2', campaign_id: 'campaign-active' },
        context: baseContext,
      }),
    ).toMatchObject({
      relationship: 'linked_campaign',
      confidence: 'medium',
      use_policy: 'support_only',
    })

    expect(
      classifyArtifactContext({
        objectType: 'task',
        row: { id: 'task-1', user_id: 'user-2', space_id: 'space-active' },
        context: baseContext,
      }),
    ).toMatchObject({
      relationship: 'linked_space',
      confidence: 'medium',
      use_policy: 'support_only',
    })
  })

  it('classifies broad shared access as weak ask-first context', () => {
    expect(
      classifyArtifactContext({
        objectType: 'campaign',
        row: { id: 'campaign-shared', user_id: 'user-2', permission: 'viewer', org_id: 'org-1' },
        context: baseContext,
      }),
    ).toMatchObject({
      relationship: 'org_viewer',
      confidence: 'weak',
      agent_context_eligible: false,
      use_policy: 'ask_first',
    })
  })
})
