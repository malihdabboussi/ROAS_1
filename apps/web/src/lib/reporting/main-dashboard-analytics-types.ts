import type { SocialAnalyticsPlatform } from './social-analytics-types'

export interface MainDashboardOverviewMetrics {
  leads: number
  visitors: number
  conversion_rate: number
  email_open_rate: number
  email_click_rate: number
  social_reach: number
  social_engagement_rate: number
  total_reach: number
}

export interface MainDashboardFunnels {
  visitors: number
  leads: number
  conversion_rate: number
  total_views: number
}

export interface MainDashboardEmails {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  open_rate: number
  click_rate: number
}

export interface MainDashboardAds {
  total_ads: number
  ad_visitors: number
  ad_views: number
  ad_leads: number
  conversion_rate: number
}

export interface MainDashboardSocialPlatform {
  platform: SocialAnalyticsPlatform
  connected: boolean
  reach: number
  interactions: number
  engagement_rate: number
  follower_count: number
  post_count: number
}

export interface MainDashboardSocial {
  reach: number
  interactions: number
  engagement_rate: number
  post_count: number
  connected_platforms: SocialAnalyticsPlatform[]
  by_platform: MainDashboardSocialPlatform[]
}

export interface MainDashboardTimeseriesPoint {
  date: string
  visitors: number
  leads: number
  email_opens: number
  social_reach: number
}

export interface MainDashboardFlow {
  impressions: number
  clicks: number
  visitors: number
  leads: number
  conversion_to_lead_pct: number
}

export interface MainDashboardContribution {
  funnel_leads: number
  ad_leads: number
  email_clicks: number
  social_interactions: number
}

export interface MainDashboardAlert {
  level: 'info' | 'warning' | 'critical'
  source: 'funnel' | 'email' | 'ads' | 'social' | 'cross'
  message: string
}

export interface MainDashboardResponse {
  fetched_at: string
  range: { since: string | null; until: string | null }
  overview: MainDashboardOverviewMetrics
  sources: {
    funnels: MainDashboardFunnels
    emails: MainDashboardEmails
    ads: MainDashboardAds
    social: MainDashboardSocial
  }
  timeseries: MainDashboardTimeseriesPoint[]
  flow: MainDashboardFlow
  contribution: MainDashboardContribution
  alerts: MainDashboardAlert[]
  partial: { funnels: boolean; emails: boolean; ads: boolean; social: boolean }
}
