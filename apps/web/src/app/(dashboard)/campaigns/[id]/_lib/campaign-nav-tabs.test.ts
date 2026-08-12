import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VISIBLE_CAMPAIGN_TABS,
  normalizeCampaignTabId,
  readVisibleCampaignTabs,
} from './campaign-nav-tabs'

describe('campaign-nav-tabs', () => {
  it('maps legacy finance tab to reporting', () => {
    expect(normalizeCampaignTabId('finance')).toBe('reporting')
  })

  it('defaults to agency hub tabs when config is missing', () => {
    expect(readVisibleCampaignTabs(null)).toEqual(DEFAULT_VISIBLE_CAMPAIGN_TABS)
    expect(DEFAULT_VISIBLE_CAMPAIGN_TABS).toContain('list')
    expect(DEFAULT_VISIBLE_CAMPAIGN_TABS).toContain('board')
    expect(DEFAULT_VISIBLE_CAMPAIGN_TABS).toContain('calendar')
    expect(DEFAULT_VISIBLE_CAMPAIGN_TABS).toContain('canvas')
    expect(DEFAULT_VISIBLE_CAMPAIGN_TABS).toContain('assets')
  })

  it('normalizes the campaign canvas view', () => {
    expect(normalizeCampaignTabId('canvas')).toBe('canvas')
  })

  it('normalizes legacy visible_campaign_tabs', () => {
    expect(
      readVisibleCampaignTabs({
        visible_campaign_tabs: ['dashboard', 'finance', 'knowledge'],
      }),
    ).toEqual(['dashboard', 'knowledge', 'reporting'])
  })
})
