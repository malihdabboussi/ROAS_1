import { describe, expect, it } from 'vitest'
import { conversationScopeDisplayLabel } from './conversation-scope-picker-layout'

describe('conversationScopeDisplayLabel', () => {
  it('qualifies a General space with the campaign name', () => {
    expect(
      conversationScopeDisplayLabel({
        campaignName: 'Yasir Khan',
        spaceTitle: 'General',
        campaignId: 'campaign-1',
        spaceId: 'space-1',
        emptyLabel: 'All',
      }),
    ).toBe('Yasir Khan General')
  })

  it('qualifies a General campaign with the program name', () => {
    expect(
      conversationScopeDisplayLabel({
        campaignName: 'General',
        programName: 'Yasir Khan',
        campaignId: 'campaign-1',
        emptyLabel: 'All',
      }),
    ).toBe('Yasir Khan General')
  })

  it('qualifies a General space when the campaign is also General', () => {
    expect(
      conversationScopeDisplayLabel({
        campaignName: 'General',
        spaceTitle: 'General',
        programName: 'Master Your Kraft',
        campaignId: 'campaign-1',
        spaceId: 'space-1',
        emptyLabel: 'All',
      }),
    ).toBe('Master Your Kraft General')
  })

  it('does not qualify General with a Client Spaces program label', () => {
    expect(
      conversationScopeDisplayLabel({
        campaignName: 'General',
        spaceTitle: 'General',
        programName: 'Client Spaces',
        campaignId: 'campaign-1',
        spaceId: 'space-1',
        emptyLabel: 'All',
      }),
    ).toBe('General')
  })

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
