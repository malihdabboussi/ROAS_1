import { describe, expect, it } from 'vitest'
import type { MetaAdsInsightsRow } from '../../services/analytics.service'
import { buildAdsManagerUrl, buildBlazeAnalysisPrompt } from './meta-ads-analysis'

const campaignRow: MetaAdsInsightsRow = {
  id: 'local-campaign-1',
  name: 'Webinar Campaign',
  level: 'campaign',
  meta_id: '120251552697870763',
  meta_effective_status: 'ACTIVE',
  ad_account_id: null,
  spend: 2290,
  impressions: 76214,
  reach: 60000,
  clicks: 1985,
  ctr: 2.6,
  cpc: 1.15,
  cpm: 30.05,
  leads: 151,
  conversions: 0,
  results: 151,
  result_type: 'registration',
  revenue: 0,
  roas: 0,
  cost_per_result: 15.16,
  daily_budget: 60000,
  lifetime_budget: null,
}

describe('Meta ads analysis helpers', () => {
  it('opens Ads Manager with both the account and selected campaign', () => {
    expect(buildAdsManagerUrl(campaignRow, '1487555021386771')).toBe(
      'https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1487555021386771&selected_campaign_ids=120251552697870763',
    )
  })

  it('gives Blaze the selected campaign snapshot and reporting period', () => {
    const prompt = buildBlazeAnalysisPrompt({
      analysisId: 'needs-improvement',
      workspaceName: 'Sakha Media Group',
      timeRangeLabel: 'Last 30 days',
      rows: [campaignRow],
    })

    expect(prompt).toContain('Blaze')
    expect(prompt).toContain('Last 30 days')
    expect(prompt).toContain('Webinar Campaign')
    expect(prompt).toContain('Results: 151 completed registrations')
    expect(prompt).toContain('Do not ask me to choose an ad account or Facebook Page')
    expect(prompt).not.toContain('\u2014')
  })
})
