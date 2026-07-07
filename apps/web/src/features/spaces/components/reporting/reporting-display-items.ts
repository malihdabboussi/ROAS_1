import type { ReportingViewType } from '../../types/space-schema'

export interface ReportingDisplayItem {
  id: string
  label: string
  defaultOn: boolean
}

/** Single source of truth for which KPI/card ids exist per reporting view type — drives the customize panel toggles AND in-grid hide buttons. */
export const REPORTING_DISPLAY_ITEMS_BY_TYPE: Partial<
  Record<ReportingViewType, ReportingDisplayItem[]>
> = {
  campaign_overview: [
    { id: 'kpi_leads', label: 'Leads', defaultOn: true },
    { id: 'kpi_conversion', label: 'Funnel Conversion', defaultOn: true },
    { id: 'kpi_email_open', label: 'Email Open Rate', defaultOn: true },
    { id: 'kpi_social_engagement', label: 'Social Engagement', defaultOn: true },
    { id: 'kpi_reach', label: 'Total Reach', defaultOn: true },
    { id: 'kpi_visitors', label: 'Visitors', defaultOn: true },
    { id: 'kpi_bounce_rate', label: 'Email Bounce Rate', defaultOn: true },
    { id: 'card_revenue_summary', label: 'Revenue summary', defaultOn: true },
    { id: 'card_revenue_trend', label: 'Revenue trend', defaultOn: true },
    { id: 'card_customer_journey', label: 'Customer journey', defaultOn: true },
    { id: 'card_best_channel', label: 'Best channel', defaultOn: true },
    { id: 'card_mission_status', label: 'Mission status', defaultOn: true },
    { id: 'kpi_missions_active', label: 'Active missions', defaultOn: true },
    { id: 'kpi_mission_completion', label: 'Mission completion rate', defaultOn: true },
    { id: 'kpi_missions_blocked', label: 'Blocked / awaiting human', defaultOn: true },
    { id: 'kpi_follower_growth', label: 'Follower growth', defaultOn: true },
    { id: 'card_best_post', label: 'Best performing post', defaultOn: true },
    { id: 'card_deliverables_by_type', label: 'Deliverables by type', defaultOn: true },
    { id: 'kpi_new_contacts', label: 'New contacts', defaultOn: true },
    { id: 'card_contacts_growth', label: 'Contact growth', defaultOn: true },
    { id: 'card_sequence_performance', label: 'Sequence performance', defaultOn: true },
    { id: 'card_best_email', label: 'Best performing email', defaultOn: true },
    { id: 'card_top_products', label: 'Top products', defaultOn: true },
    { id: 'card_top_funnels', label: 'Top funnels', defaultOn: true },
    { id: 'card_contact_sources', label: 'Contact source breakdown', defaultOn: true },
    { id: 'kpi_lead_customer', label: 'Lead → customer conversion', defaultOn: true },
    { id: 'card_campaign_leaderboard', label: 'Campaign leaderboard', defaultOn: true },
    { id: 'card_funnel_dropoff', label: 'Funnel drop-off', defaultOn: true },
    { id: 'card_roi_by_channel', label: 'ROI by channel', defaultOn: true },
    { id: 'card_unified_trend', label: 'Unified Trend', defaultOn: true },
    { id: 'card_contribution', label: 'Contribution', defaultOn: true },
    { id: 'card_alerts', label: 'Alerts', defaultOn: true },
  ],
  funnel_analytics: [
    { id: 'visitors', label: 'Visitors', defaultOn: true },
    { id: 'leads', label: 'Leads', defaultOn: true },
    { id: 'conversion', label: 'Conversion', defaultOn: true },
    { id: 'page_views', label: 'Page views', defaultOn: true },
    { id: 'chart_visitors', label: 'Visitors over time', defaultOn: true },
    { id: 'chart_leads', label: 'Leads over time', defaultOn: true },
  ],
  email_analytics: [
    { id: 'sent', label: 'Sent', defaultOn: true },
    { id: 'opens', label: 'Opens', defaultOn: true },
    { id: 'clicks', label: 'Clicks', defaultOn: true },
    { id: 'open_rate', label: 'Open rate', defaultOn: true },
    { id: 'delivered', label: 'Delivered', defaultOn: true },
    { id: 'bounced', label: 'Bounced', defaultOn: true },
    { id: 'click_rate', label: 'Click rate', defaultOn: true },
    { id: 'chart_opens', label: 'Opens over time', defaultOn: true },
    { id: 'chart_clicks', label: 'Clicks over time', defaultOn: true },
  ],
}

export type OverviewChannelId = 'funnels' | 'emails' | 'ads' | 'social'

export const OVERVIEW_CHANNEL_IDS: OverviewChannelId[] = ['funnels', 'emails', 'ads', 'social']

/** Section-id → channel-id mapping for the four channel source cards on the overview dashboard. */
export const OVERVIEW_CHANNEL_BY_SECTION_ID: Record<string, OverviewChannelId> = {
  card_funnels: 'funnels',
  card_emails: 'emails',
  card_ads: 'ads',
  card_social: 'social',
}

/** Section-id → visibility-key mapping for cards whose section id ≠ visible_kpis key (currently just `card_revenue`). */
export const OVERVIEW_VISIBILITY_KEY_BY_SECTION_ID: Record<string, string> = {
  card_revenue: 'card_revenue_summary',
}
