import { describe, expect, it } from 'vitest'
import { conversationScopeDisplayLabel } from './conversation-scope-picker-layout'

describe('conversationScopeDisplayLabel', () => {
  it('prefers the space title, then the campaign name, then All', () => {
    expect(
      conversationScopeDisplayLabel({
        campaignName: 'Yasir Khan Coaching LTD',
        spaceTitle: 'Speak Like a CEO Workshop',
        campaignId: 'campaign-1',
        spaceId: 'space-1',
        emptyLabel: 'All',
      }),
    ).toBe('Speak Like a CEO Workshop')
    expect(
      conversationScopeDisplayLabel({
        campaignName: 'Yasir Khan Coaching LTD',
        campaignId: 'campaign-1',
        emptyLabel: 'All',
      }),
    ).toBe('Yasir Khan Coaching LTD')
    expect(conversationScopeDisplayLabel({ emptyLabel: 'All' })).toBe('All')
  })

  it('does not keep a generic Space label when the campaign name is known', () => {
    expect(
      conversationScopeDisplayLabel({
        campaignName: 'Yasir Khan Coaching LTD',
        spaceId: 'space-1',
        campaignId: 'campaign-1',
        emptyLabel: 'Choose Space',
      }),
    ).toBe('Yasir Khan Coaching LTD')
  })
})
