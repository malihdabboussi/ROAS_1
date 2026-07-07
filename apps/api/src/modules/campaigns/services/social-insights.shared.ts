export type SocialAnalyticsPlatform = 'instagram' | 'linkedin' | 'facebook' | 'youtube'

const SOCIAL_ANALYTICS_PLATFORMS: SocialAnalyticsPlatform[] = [
  'instagram',
  'linkedin',
  'facebook',
  'youtube',
]

export function isSocialAnalyticsPlatform(value: string): value is SocialAnalyticsPlatform {
  return (SOCIAL_ANALYTICS_PLATFORMS as string[]).includes(value)
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
  /** Reels-specific raw values when present. */
  reels_avg_watch_time: number | null
  reels_total_watch_time: number | null
  reels_skip_rate: number | null
  raw_metrics: Record<string, unknown>
  fetched_at: string | null
  error: string | null
}

export interface SocialAnalyticsActiveConnection {
  id: string
  source: 'campaign_integration' | 'user_integration'
  label: string
}

export interface SocialAnalyticsResponse {
  platform: SocialAnalyticsPlatform
  connected: boolean
  reason: string | null
  fetched_at: string
  stale: boolean
  account: SocialAnalyticsAccountMetrics
  chart_data: SocialAnalyticsChartPoint[]
  posts: SocialAnalyticsPostRow[]
  post_count: number
  published_with_id_count: number
  partial: boolean
  /** Which connection powered this payload when connected; omitted when disconnected. */
  active_connection?: SocialAnalyticsActiveConnection | null
}

export interface SocialConnectionOptionDto {
  id: string
  source: 'campaign_integration' | 'user_integration'
  label: string
  platform: SocialAnalyticsPlatform
  scope_mode: string | null
  is_default: boolean
  linkedin_company_page_name?: string | null
  facebook_page_name?: string | null
  youtube_channel_name?: string | null
}

export interface SocialPostRow {
  id: string
  platform: string
  post_type: string | null
  published_id: string
  published_at: string | null
  caption: string | null
  headline: string | null
  image_url: string | null
  video_url: string | null
  user_id: string
  campaign_id: string | null
  org_id: string | null
}

export interface CachedInsightRow {
  social_post_id: string
  metrics: Record<string, unknown> | null
  fetched_at: string | null
  error_message: string | null
}

export interface IntegrationContext {
  connected: boolean
  connectedAccountId: string | null
  composioUserId: string
  metadata: Record<string, unknown>
  reason: string | null
  resolution?: SocialAnalyticsActiveConnection
}

export const EMPTY_ACCOUNT_METRICS: SocialAnalyticsAccountMetrics = {
  reach: 0,
  follower_count: 0,
  follower_growth: 0,
  total_interactions: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  replies: 0,
  profile_links_taps: 0,
  views: 0,
  accounts_engaged: 0,
  engagement_rate: 0,
  impressions: 0,
  clicks: 0,
  page_views: 0,
  unique_page_visitors: 0,
}

export const CACHE_TTL_MS = 6 * 60 * 60 * 1000

// IG user insights metrics that support metric_type=time_series with period=day.
// We deliberately omit metric_type so IG returns daily `values[]` arrays; we then
// sum them ourselves — this is the documented canonical pattern and avoids the
// quirky behaviour of total_value without a breakdown.
// follower_count and follows_and_unfollows require special handling (lifetime /
// breakdown) and are fetched separately.
/** IG returns daily `values[]` for these when metric_type is omitted. */
export const IG_USER_TIME_SERIES_METRICS = ['reach', 'views', 'profile_links_taps'] as const

/** IG interaction metrics use `metric_type=total_value` (see Meta user insights docs). */
export const IG_USER_TOTAL_VALUE_METRICS = [
  'accounts_engaged',
  'total_interactions',
  'likes',
  'comments',
  'shares',
  'saves',
  'replies',
] as const

export const IG_USER_METRICS = [...IG_USER_TIME_SERIES_METRICS, ...IG_USER_TOTAL_VALUE_METRICS] as const

export const IG_POST_METRIC_PRESET_BY_TYPE: Record<string, string> = {
  single_image: 'image_basic',
  carousel: 'carousel_basic',
  reel: 'reel_basic',
}
