import type {
  MetaAdsInsightsRow,
  MetaAdsResultType,
} from '../../services/analytics.service'

export type AnalysisId =
  | 'whats-working'
  | 'needs-improvement'
  | 'creative-feedback'
  | 'audience-insights'
  | 'budget-optimization'
  | 'generate-variations'

const ANALYSIS_REQUESTS: Record<AnalysisId, string> = {
  'whats-working': 'Identify the strongest campaigns and the patterns worth scaling.',
  'needs-improvement': 'Identify what is underperforming and recommend the next specific changes.',
  'creative-feedback': 'Review the performance signals and recommend creative tests.',
  'audience-insights': 'Review the performance signals and recommend audience tests.',
  'budget-optimization': 'Recommend how to allocate budget across only these campaigns.',
  'generate-variations': 'Recommend the next ad concepts based on the strongest performance signals.',
}

const RESULT_LABELS: Record<MetaAdsResultType, string> = {
  registration: 'completed registrations',
  lead: 'leads',
  purchase: 'purchases',
  none: 'results',
}

export function buildAdsManagerUrl(
  row: MetaAdsInsightsRow,
  fallbackAdAccountId?: string | null,
): string {
  if (!row.meta_id) return '#'
  const params = new URLSearchParams()
  const adAccountId = row.ad_account_id ?? fallbackAdAccountId
  if (adAccountId) params.set('act', adAccountId.replace(/^act_/, ''))
  if (row.level === 'campaign') params.set('selected_campaign_ids', row.meta_id)
  if (row.level === 'adset') params.set('selected_adset_ids', row.meta_id)
  if (row.level === 'ad') params.set('selected_ad_ids', row.meta_id)
  return `https://adsmanager.facebook.com/adsmanager/manage/campaigns?${params.toString()}`
}

export function buildBlazeAnalysisPrompt(input: {
  analysisId: AnalysisId
  workspaceName: string
  timeRangeLabel: string
  rows: MetaAdsInsightsRow[]
}): string {
  const campaignSnapshots = input.rows.map((row) => {
    const resultLabel = RESULT_LABELS[row.result_type]
    return [
      `Campaign: ${row.name}`,
      `Meta campaign ID: ${row.meta_id ?? 'not published'}`,
      `Status: ${row.meta_effective_status ?? 'unknown'}`,
      `Spend: $${row.spend.toFixed(2)}`,
      `Impressions: ${row.impressions.toLocaleString()}`,
      `Clicks: ${row.clicks.toLocaleString()}`,
      `CTR: ${row.ctr.toFixed(2)}%`,
      `CPC: $${row.cpc.toFixed(2)}`,
      `CPM: $${row.cpm.toFixed(2)}`,
      `Results: ${row.results.toLocaleString()} ${resultLabel}`,
      `Cost per result: $${row.cost_per_result.toFixed(2)}`,
      `Purchases: ${row.conversions.toLocaleString()}`,
      `Revenue: $${row.revenue.toFixed(2)}`,
      `Purchase ROAS: ${row.roas.toFixed(2)}x`,
    ].join('\n')
  })

  return [
    `Blaze, review the selected Meta campaigns for ${input.workspaceName}.`,
    `Reporting period: ${input.timeRangeLabel}.`,
    ANALYSIS_REQUESTS[input.analysisId],
    'Use the supplied reporting snapshot as the source of truth and analyze only the campaigns below.',
    'Do not ask me to choose an ad account or Facebook Page. This is read-only analysis, not publishing.',
    'Judge lead-generation campaigns by their reported result type and cost per result. Do not treat a zero purchase ROAS as proof that a lead-generation campaign failed.',
    '',
    campaignSnapshots.join('\n\n'),
  ].join('\n')
}
