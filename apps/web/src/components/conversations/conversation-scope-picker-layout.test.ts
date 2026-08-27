import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  conversationScopeDisplayLabel,
  placeSpacesMenuFromRowRect,
} from './conversation-scope-picker-layout'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('placeSpacesMenuFromRowRect', () => {
  it('top-aligns a flyout with the hovered row', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1400)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900)
    const row = {
      top: 360,
      right: 640,
      bottom: 400,
      left: 380,
    } as DOMRect

    expect(placeSpacesMenuFromRowRect(row, 160)).toMatchObject({
      top: 360,
      left: 644,
    })
  })

  it('keeps row alignment until the viewport requires clamping', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const row = {
      top: 520,
      right: 760,
      bottom: 560,
      left: 500,
    } as DOMRect

    expect(placeSpacesMenuFromRowRect(row, 160)).toMatchObject({
      top: 432,
      left: 236,
    })
  })
})

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

  it('names a client General campaign when the space title has not loaded', () => {
    expect(
      conversationScopeDisplayLabel({
        campaignName: 'General',
        programName: 'Above It',
        campaignId: 'campaign-1',
        spaceId: 'space-1',
        emptyLabel: '',
      }),
    ).toBe('Above It General')
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
