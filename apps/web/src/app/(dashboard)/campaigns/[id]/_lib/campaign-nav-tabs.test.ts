import { describe, expect, it } from 'vitest'
import {
  normalizeCampaignTabId,
  readVisibleCampaignTabs,
  DEFAULT_VISIBLE_CAMPAIGN_TABS,
} from './campaign-nav-tabs'

describe('campaign-nav-tabs', () => {
  it('maps legacy finance tab to reporting', () => {
    expect(normalizeCampaignTabId('finance')).toBe('reporting')
  })

  it('defaults to agency hub tabs when config is missing', () => {
    expect(readVisibleCampaignTabs(null)).toEqual(DEFAULT_VISIBLE_CAMPAIGN_TABS)
  })

  it('normalizes legacy visible_campaign_tabs', () => {
    expect(
      readVisibleCampaignTabs({
        visible_campaign_tabs: ['dashboard', 'finance', 'knowledge'],
      }),
    ).toEqual(['dashboard', 'knowledge', 'reporting'])
  })
})
