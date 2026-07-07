import type { MetaCampaignObjective } from '../../types/meta.types'

export type InsightsLevel = 'campaign' | 'adset' | 'ad'

export type MetaInsightsRow = {
  id: string
  name: string
  level: InsightsLevel
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

export type MetaInsightsSummary = {
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

export const OBJECTIVE_ALLOWED_OPTIMIZATION_GOALS: Record<MetaCampaignObjective, string[]> = {
  OUTCOME_TRAFFIC: ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'REACH', 'IMPRESSIONS'],
  OUTCOME_AWARENESS: ['REACH', 'IMPRESSIONS', 'AD_RECALL_LIFT'],
  OUTCOME_ENGAGEMENT: ['POST_ENGAGEMENT', 'LINK_CLICKS', 'REACH', 'IMPRESSIONS'],
  OUTCOME_LEADS: ['LEAD_GENERATION', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'OFFSITE_CONVERSIONS'],
  OUTCOME_SALES: ['OFFSITE_CONVERSIONS', 'CONVERSIONS', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS'],
  OUTCOME_APP_PROMOTION: ['APP_INSTALLS', 'LINK_CLICKS', 'OFFSITE_CONVERSIONS'],
}

export const OBJECTIVE_DEFAULT_OPTIMIZATION_GOAL: Record<MetaCampaignObjective, string> = {
  OUTCOME_TRAFFIC: 'LINK_CLICKS',
  OUTCOME_AWARENESS: 'REACH',
  OUTCOME_ENGAGEMENT: 'POST_ENGAGEMENT',
  OUTCOME_LEADS: 'LEAD_GENERATION',
  OUTCOME_SALES: 'OFFSITE_CONVERSIONS',
  OUTCOME_APP_PROMOTION: 'APP_INSTALLS',
}
