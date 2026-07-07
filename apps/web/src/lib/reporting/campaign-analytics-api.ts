import { backendGet } from '@/lib/api/backend-client'

export interface CampaignAnalytics {
  visitors: number
  total_views: number
  leads: number
  conversion_rate: number
  chart_data: ChartDataPoint[]
}

export interface ChartDataPoint {
  date: string
  visitors: number
  leads: number
}

export interface CampaignEmailAnalytics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  open_rate: number
  click_rate: number
  chart_data: EmailChartDataPoint[]
}

export interface EmailChartDataPoint {
  date: string
  opens: number
  clicks: number
}

export async function fetchCampaignAnalytics(
  campaignId: string,
  startDate?: string,
  endDate?: string,
  options?: { funnelIds?: string[] },
): Promise<CampaignAnalytics> {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  if (options?.funnelIds !== undefined) {
    if (options.funnelIds.length === 0) params.set('funnel_ids', '')
    else params.set('funnel_ids', options.funnelIds.join(','))
  }

  const qs = params.toString()
  const url = `/api/campaigns/${campaignId}/analytics${qs ? `?${qs}` : ''}`
  return backendGet<CampaignAnalytics>(url)
}

export async function fetchCampaignEmailAnalytics(
  campaignId: string,
  startDate?: string,
  endDate?: string,
  options?: { sequenceIds?: string[] },
): Promise<CampaignEmailAnalytics> {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  if (options?.sequenceIds !== undefined) {
    if (options.sequenceIds.length === 0) params.set('sequence_ids', '')
    else params.set('sequence_ids', options.sequenceIds.join(','))
  }

  const qs = params.toString()
  const url = `/api/campaigns/${campaignId}/email-analytics${qs ? `?${qs}` : ''}`
  return backendGet<CampaignEmailAnalytics>(url)
}
