import { describe, expect, it } from 'vitest'
import { buildBrainChatAwarenessContext } from './brain-chat-awareness'

describe('buildBrainChatAwarenessContext', () => {
  it('includes scope label, brain id, and graph stats', () => {
    const text = buildBrainChatAwarenessContext({
      scopeLabel: 'test',
      brainId: 'brain-1',
      totalMemories: 1726,
      totalConnections: 1717,
    })
    expect(text).toContain('Active Brain scope: test')
    expect(text).toContain('brain_id: brain-1')
    expect(text).toContain('1726 memories and 1717 connections')
    expect(text).toContain('search_user_brain')
  })

  it('routes Campaign Knowledge chat to search_campaign_brain', () => {
    const text = buildBrainChatAwarenessContext({
      scopeLabel: 'Multifamily Strategy Knowledge',
      brainId: 'brain-campaign',
      campaignId: 'campaign-1',
      scopeType: 'campaign_knowledge',
      totalMemories: 500,
      totalConnections: 0,
    })
    expect(text).toContain('campaign_id: campaign-1')
    expect(text).toContain('search_campaign_brain')
    expect(text).toContain('Do not use search_user_brain')
    expect(text).toContain('list_brain_domains')
  })
})
