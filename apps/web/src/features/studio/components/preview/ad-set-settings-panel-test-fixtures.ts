import type { AdCampaign, AdSet } from '../../types'

export function adSetFixture(overrides: Partial<AdSet> = {}): AdSet {
  return {
    id: 'ad-set-1',
    user_id: 'user-1',
    ad_campaign_id: 'ad-campaign-1',
    campaign_id: 'campaign-1',
    space_id: null,
    name: 'Launch ad set',
    status: 'active',
    daily_budget: 5000,
    lifetime_budget: null,
    start_time: '2026-06-20T10:00:00.000Z',
    end_time: null,
    optimization_goal: 'LINK_CLICKS',
    billing_event: 'IMPRESSIONS',
    targeting: {
      geo_locations: { countries: [] },
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed'],
      instagram_positions: ['feed'],
      targeting_automation: { advantage_audience: 1 },
    },
    meta_adset_id: null,
    meta_effective_status: null,
    source: 'vibey',
    metadata: {},
    created_at: '2026-06-20T10:00:00.000Z',
    updated_at: '2026-06-20T10:00:00.000Z',
    ...overrides,
  }
}

export function adCampaignFixture(overrides: Partial<AdCampaign> = {}): AdCampaign {
  return {
    id: 'ad-campaign-1',
    user_id: 'user-1',
    campaign_id: 'campaign-1',
    space_id: null,
    name: 'Launch campaign',
    objective: 'OUTCOME_TRAFFIC',
    status: 'active',
    budget_type: 'ABO',
    daily_budget: null,
    lifetime_budget: null,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    special_ad_categories: [],
    meta_campaign_id: 'meta-campaign-1',
    meta_ad_account_id: 'act_1',
    meta_page_id: 'page-1',
    meta_effective_status: 'ACTIVE',
    schedule_type: 'continuous',
    start_time: null,
    end_time: null,
    source: 'vibey',
    metadata: {},
    created_at: '2026-06-20T10:00:00.000Z',
    updated_at: '2026-06-20T10:00:00.000Z',
    ...overrides,
  }
}
