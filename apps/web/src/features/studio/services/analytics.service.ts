import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
export {
  fetchCampaignAnalytics,
  fetchCampaignEmailAnalytics,
} from '@/lib/reporting/campaign-analytics-api'
export type {
  CampaignAnalytics,
  CampaignEmailAnalytics,
  ChartDataPoint,
  EmailChartDataPoint,
} from '@/lib/reporting/campaign-analytics-api'
import type { MainDashboardResponse } from '@/lib/reporting/main-dashboard-analytics-types'
export type {
  MainDashboardAds,
  MainDashboardAlert,
  MainDashboardContribution,
  MainDashboardEmails,
  MainDashboardFlow,
  MainDashboardFunnels,
  MainDashboardOverviewMetrics,
  MainDashboardResponse,
  MainDashboardSocial,
  MainDashboardSocialPlatform,
  MainDashboardTimeseriesPoint,
} from '@/lib/reporting/main-dashboard-analytics-types'
import type {
  SocialAnalyticsPlatform,
  SocialConnectionOption,
} from '@/lib/reporting/social-analytics-types'
export type {
  SocialAnalyticsPlatform,
  SocialConnectionOption,
} from '@/lib/reporting/social-analytics-types'

export interface CampaignAdAnalytics {
  ad_visitors: number
  ad_views: number
  ad_leads: number
  total_ads: number
  conversion_rate: number
  chart_data: AdChartDataPoint[]
  breakdown: AdCampaignBreakdown[]
}

export interface AdChartDataPoint {
  date: string
  visitors: number
  leads: number
}

export interface AdCampaignBreakdown {
  ad_campaign_id: string
  campaign_name: string
  objective: string
  ad_sets_count: number
  ads_count: number
  leads_count: number
  daily_budget: number
}

export type AdsInsightsLevel = 'campaign' | 'adset' | 'ad'

export interface MetaAdsInsightsRow {
  id: string
  name: string
  level: AdsInsightsLevel
  parent_id?: string | null
  meta_id: string | null
  meta_effective_status: string | null
  ad_account_id: string | null
  spend: number
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  leads: number
  conversions: number
  revenue: number
  roas: number
  cost_per_result: number
  daily_budget: number | null
  lifetime_budget: number | null
}

export interface MetaAdsInsightsSummary {
  spend: number
  impressions: number
  reach: number
  clicks: number
  leads: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  cpm: number
  roas: number
  cost_per_result: number
}

export interface MetaAdsInsightsResponse {
  success: boolean
  level: AdsInsightsLevel
  summary: MetaAdsInsightsSummary
  rows: MetaAdsInsightsRow[]
}

export interface StripeIntegrationStatus {
  success: boolean
  connected: boolean
}

export interface SocialAnalyticsAccountMetrics {
  reach: number
  follower_count: number
  follower_growth: number
  total_interactions: number
  likes: number
  comments: number
  shares: number
  saves: number
  replies: number
  profile_links_taps: number
  views: number
  accounts_engaged: number
  engagement_rate: number
  impressions: number
  clicks: number
  page_views: number
  unique_page_visitors: number
}

export interface SocialAnalyticsChartPoint {
  date: string
  reach: number
  impressions: number
  engagement: number
}

export interface SocialAnalyticsPostRow {
  social_post_id: string
  published_id: string
  post_type: string | null
  published_at: string | null
  caption: string | null
  headline: string | null
  image_url: string | null
  video_url: string | null
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  views: number
  total_interactions: number
  engagement_rate: number
  reels_avg_watch_time: number | null
  reels_total_watch_time: number | null
  reels_skip_rate: number | null
  raw_metrics: Record<string, unknown>
  fetched_at: string | null
  error: string | null
}

/** Backend `social-insights` reason codes surfaced in reporting UI. */
export type SocialAnalyticsReason =
  | 'not_connected'
  | 'missing_composio_connection'
  | 'missing_linkedin_org_urn'
  | 'missing_facebook_page_id'
  | 'missing_youtube_channel_id'
  | 'campaign_not_found'
  | string

export interface SocialAnalyticsResponse {
  platform: SocialAnalyticsPlatform
  connected: boolean
  reason: SocialAnalyticsReason | null
  fetched_at: string
  stale: boolean
  account: SocialAnalyticsAccountMetrics
  chart_data: SocialAnalyticsChartPoint[]
  posts: SocialAnalyticsPostRow[]
  post_count: number
  published_with_id_count: number
  partial: boolean
  active_connection?: {
    id: string
    source: 'campaign_integration' | 'user_integration'
    label: string
  } | null
}

export interface CampaignStripeOverview {
  success: boolean
  campaignId: string
  fromUnix: number
  toUnix: number
  currency: string
  gross: number
  refunds: number
  fees: number
  net: number
  refundRate: number
  transactionsCount: number
  chartData: Array<{ date: string; gross: number; refunds: number; fees: number; net: number }>
  topProducts?: Array<{ name: string; revenue: number }>
}

export interface CampaignReportingWidgetsResponse {
  contact_stats: { current_count: number; previous_count: number } | null
  contacts_timeseries: Array<{ date: string; count: number }> | null
  deliverables_by_type: Array<{ type: string; count: number }> | null
  sequence_stats: {
    active_sequences: number
    total_sent: number
    open_rate: number
    click_rate: number
  } | null
  top_email: {
    subject: string | null
    sent: number
    open_rate: number
    click_rate: number
  } | null
  top_funnels: Array<{
    funnel_id: string
    name: string
    visitors: number
    leads: number
    conversion_rate: number
  }> | null
  contact_sources: Array<{ source: string; count: number }> | null
  lead_customer: { leads: number; customers: number; conversion_pct: number } | null
  funnel_dropoff: {
    funnel_id: string | null
    funnel_name: string | null
    steps: Array<{ page_name: string; views: number; drop_off_pct: number }>
  } | null
  ads_budget: { ads_daily_budget_sum: number; note?: string } | null
}

export interface CampaignLeaderboardRow {
  campaign_id: string
  name: string
  leads: number
  visitors: number
  score: number
}

export async function fetchCampaignAdAnalytics(
  campaignId: string,
  startDate?: string,
  endDate?: string,
): Promise<CampaignAdAnalytics> {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)

  const qs = params.toString()
  const url = `/api/campaigns/${campaignId}/ad-analytics${qs ? `?${qs}` : ''}`
  return backendGet<CampaignAdAnalytics>(url)
}

export async function fetchCampaignSocialConnectionOptions(campaignId: string): Promise<{
  instagram: SocialConnectionOption[]
  linkedin: SocialConnectionOption[]
  facebook: SocialConnectionOption[]
  youtube: SocialConnectionOption[]
}> {
  return backendGet<{
    instagram: SocialConnectionOption[]
    linkedin: SocialConnectionOption[]
    facebook: SocialConnectionOption[]
    youtube: SocialConnectionOption[]
  }>(`/api/campaigns/${campaignId}/social-connection-options`)
}

export async function fetchCampaignSocialAnalytics(
  campaignId: string,
  platform: SocialAnalyticsPlatform,
  options: {
    since?: string
    until?: string
    refresh?: boolean
    connectionId?: string | null
  } = {},
): Promise<SocialAnalyticsResponse> {
  const params = new URLSearchParams()
  params.set('platform', platform)
  if (options.since) params.set('since', options.since)
  if (options.until) params.set('until', options.until)
  if (options.refresh) params.set('refresh', '1')
  if (options.connectionId) params.set('connection_id', options.connectionId)

  return backendGet<SocialAnalyticsResponse>(
    `/api/campaigns/${campaignId}/social-analytics?${params.toString()}`,
  )
}

export async function fetchCampaignMainDashboard(
  campaignId: string,
  options: { since?: string; until?: string; refresh?: boolean } = {},
): Promise<MainDashboardResponse> {
  const params = new URLSearchParams()
  if (options.since) params.set('since', options.since)
  if (options.until) params.set('until', options.until)
  if (options.refresh) params.set('refresh', '1')
  const qs = params.toString()
  return backendGet<MainDashboardResponse>(
    `/api/campaigns/${campaignId}/main-dashboard${qs ? `?${qs}` : ''}`,
  )
}

export async function fetchMetaAdsInsights(params: {
  campaignId: string
  level: AdsInsightsLevel
  adCampaignId?: string
  adSetId?: string
  startDate?: string
  endDate?: string
}): Promise<MetaAdsInsightsResponse> {
  const query = new URLSearchParams()
  query.set('campaignId', params.campaignId)
  query.set('level', params.level)
  if (params.adCampaignId) query.set('adCampaignId', params.adCampaignId)
  if (params.adSetId) query.set('adSetId', params.adSetId)
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)
  return backendGet<MetaAdsInsightsResponse>(`/api/integrations/meta/insights?${query.toString()}`)
}

export async function updateMetaCampaignBudget(
  adCampaignId: string,
  input: { daily_budget?: number; lifetime_budget?: number },
): Promise<{ success: boolean }> {
  return backendPatch<{ success: boolean }>(`/api/integrations/meta/campaign-budget`, {
    adCampaignId,
    ...input,
  })
}

export async function updateMetaAdSetBudget(
  adSetId: string,
  input: { daily_budget?: number; lifetime_budget?: number },
): Promise<{ success: boolean }> {
  return backendPatch<{ success: boolean }>(`/api/integrations/meta/adset-budget`, {
    adSetId,
    ...input,
  })
}

export async function setMetaRowStatus(
  level: AdsInsightsLevel,
  rowId: string,
  status: 'ACTIVE' | 'PAUSED',
): Promise<{ success: boolean }> {
  const url =
    level === 'campaign'
      ? `/api/ad-campaigns/${rowId}/set-meta-status`
      : level === 'adset'
        ? `/api/ad-sets/${rowId}/set-meta-status`
        : `/api/ads/${rowId}/set-meta-status`
  return backendPost<{ success: boolean }>(url, { status })
}

// ── Stripe Finance Types ──────────────────────────────────────────────────────

export interface StripeProduct {
  id: string
  name: string
  description: string | null
  active: boolean
  created: number
  metadata: Record<string, string>
}

export interface StripePrice {
  id: string
  product: string
  currency: string
  unit_amount: number | null
  recurring: { interval: string; interval_count: number } | null
  nickname: string | null
  active: boolean
  created: number
  metadata: Record<string, string>
}

export interface StripePaymentLink {
  id: string
  url: string
  active: boolean
  metadata: Record<string, string>
  line_items?: { data: Array<{ price: StripePrice | null; quantity: number }> }
}

export interface StripeCoupon {
  id: string
  name: string | null
  percent_off: number | null
  amount_off: number | null
  currency: string | null
  duration: 'once' | 'forever' | 'repeating'
  duration_in_months: number | null
  max_redemptions: number | null
  times_redeemed: number
  redeem_by: number | null
  valid: boolean
  created: number
  metadata: Record<string, string>
}

// ── Stripe Finance Fetch ─────────────────────────────────────────────────────

export async function fetchStripeIntegrationStatus(): Promise<StripeIntegrationStatus> {
  return backendGet<StripeIntegrationStatus>('/api/integrations/stripe/status')
}

export async function fetchCampaignStripeProducts(
  campaignId: string,
): Promise<{ data: StripeProduct[] }> {
  return backendGet(`/api/integrations/stripe/campaigns/${campaignId}/products`)
}

export async function fetchCampaignStripePaymentLinks(
  campaignId: string,
): Promise<{ data: StripePaymentLink[] }> {
  return backendGet(`/api/integrations/stripe/campaigns/${campaignId}/payment-links`)
}

export async function fetchCampaignStripeCoupons(
  campaignId: string,
): Promise<{ data: StripeCoupon[] }> {
  return backendGet(`/api/integrations/stripe/campaigns/${campaignId}/coupons`)
}

export async function fetchStripeProductPrices(
  productId: string,
): Promise<{ data: StripePrice[] }> {
  return backendGet(`/api/integrations/stripe/products/${productId}/prices`)
}

export async function createCampaignStripeProduct(
  campaignId: string,
  data: { name: string; description?: string },
): Promise<StripeProduct> {
  return backendPost(`/api/integrations/stripe/campaigns/${campaignId}/products`, data)
}

export async function updateStripeProduct(
  productId: string,
  data: { name?: string; description?: string; active?: boolean },
): Promise<StripeProduct> {
  return backendPatch(`/api/integrations/stripe/products/${productId}`, data)
}

export async function deleteStripeProduct(productId: string): Promise<void> {
  return backendDelete(`/api/integrations/stripe/products/${productId}`)
}

export async function createCampaignStripePrice(
  campaignId: string,
  data: {
    product: string
    currency: string
    unit_amount: number
    nickname?: string
    recurring?: { interval: string; interval_count?: number }
  },
): Promise<StripePrice> {
  return backendPost(`/api/integrations/stripe/campaigns/${campaignId}/prices`, data)
}

export async function createCampaignStripePaymentLink(
  campaignId: string,
  data: { price: string; quantity: number },
): Promise<StripePaymentLink> {
  return backendPost(`/api/integrations/stripe/campaigns/${campaignId}/payment-links`, data)
}

export async function createCampaignStripeCoupon(
  campaignId: string,
  data: {
    id?: string
    name?: string
    percent_off?: number
    amount_off?: number
    currency?: string
    duration: 'once' | 'forever' | 'repeating'
    duration_in_months?: number
    max_redemptions?: number
  },
): Promise<StripeCoupon> {
  return backendPost(`/api/integrations/stripe/campaigns/${campaignId}/coupons`, data)
}

export async function fetchCampaignStripeOverview(
  campaignId: string,
  fromUnix?: number,
  toUnix?: number,
): Promise<CampaignStripeOverview> {
  const params = new URLSearchParams()
  params.set('campaign_id', campaignId)
  if (typeof fromUnix === 'number') params.set('from', String(fromUnix))
  if (typeof toUnix === 'number') params.set('to', String(toUnix))
  return backendGet<CampaignStripeOverview>(
    `/api/integrations/stripe/analytics/campaign-overview?${params.toString()}`,
  )
}

export async function fetchCampaignReportingWidgets(
  campaignId: string,
  startDate?: string,
  endDate?: string,
): Promise<CampaignReportingWidgetsResponse> {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  const q = params.toString()
  return backendGet<CampaignReportingWidgetsResponse>(
    `/api/campaigns/${campaignId}/reporting-widgets${q ? `?${q}` : ''}`,
  )
}

export async function fetchCampaignLeaderboard(
  startDate?: string,
  endDate?: string,
  limit?: number,
): Promise<CampaignLeaderboardRow[]> {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  if (typeof limit === 'number') params.set('limit', String(limit))
  const q = params.toString()
  return backendGet<CampaignLeaderboardRow[]>(`/api/campaigns/leaderboard${q ? `?${q}` : ''}`)
}
