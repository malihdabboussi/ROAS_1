import type { ToolStep } from './openclaw-proxy.service'

const CAMPAIGN_SIGNAL = /\b(campaign|ads?|ad spend|roas|leads?|conversions?|performance)\b/i
const STATUS_SIGNAL =
  /\b(status|perform(?:ance|ing)?|doing|results?|metrics?|numbers?|health|live|today|this week|current|right now)\b/i
const CREATION_SIGNAL = /\b(create|write|draft|build|design|launch|make)\b/i

export function isCampaignStatusRequest(text: string): boolean {
  const normalized = text.trim()
  return (
    CAMPAIGN_SIGNAL.test(normalized) &&
    STATUS_SIGNAL.test(normalized) &&
    !CREATION_SIGNAL.test(normalized)
  )
}

export function formatCampaignStatus(toolSteps: ToolStep[]): string {
  const byAction = new Map(toolSteps.map((step) => [step.action ?? step.name, step]))
  const dashboard = byAction.get('get_campaign_main_dashboard')
  if (!dashboard || dashboard.status === 'failed') {
    return appendCampaignEvidenceReceipt(
      'I could not retrieve the live campaign dashboard, so I cannot safely report current performance.',
      toolSteps,
    )
  }

  const dashboardRecord = asRecord(dashboard.result)
  const overview = asRecord(dashboardRecord.overview)
  const sources = asRecord(dashboardRecord.sources)
  const funnels = asRecord(sources.funnels)
  const emails = asRecord(sources.emails)
  const ads = asRecord(sources.ads)
  const social = asRecord(sources.social)
  const alerts = Array.isArray(dashboardRecord.alerts) ? dashboardRecord.alerts : []
  const partial = asRecord(dashboardRecord.partial)
  const partialSources = Object.entries(partial)
    .filter(([, value]) => value === true)
    .map(([source]) => source)

  const sections = [
    '## Campaign status',
    '',
    '| Metric | Current reporting |',
    '| --- | ---: |',
    `| Leads | ${formatMetric(overview.leads)} |`,
    `| Visitors | ${formatMetric(overview.visitors)} |`,
    `| Conversion rate | ${formatPercent(overview.conversion_rate)} |`,
    `| Email open rate | ${formatPercent(overview.email_open_rate)} |`,
    `| Email click rate | ${formatPercent(overview.email_click_rate)} |`,
    `| Social reach | ${formatMetric(overview.social_reach)} |`,
    '',
    '### Channel snapshot',
    `- Funnel: ${formatMetric(funnels.visitors)} visitors, ${formatMetric(funnels.leads)} leads`,
    `- Email: ${formatMetric(emails.sent)} sent, ${formatMetric(emails.opened)} opened, ${formatMetric(emails.clicked)} clicked`,
    `- Ads: ${formatMetric(ads.total_ads)} ads, ${formatMetric(ads.ad_visitors)} visitors, ${formatMetric(ads.ad_leads)} leads`,
    `- Social: ${formatMetric(social.reach)} reach across ${formatMetric(social.post_count)} posts`,
  ]

  if (alerts.length > 0) {
    sections.push('', '### Reported alerts')
    for (const alert of alerts.slice(0, 5)) {
      const record = asRecord(alert)
      const message = readText(record.message)
      if (!message) continue
      const level = readText(record.level)?.toUpperCase() ?? 'INFO'
      const source = readText(record.source) ?? 'campaign'
      sections.push(`- ${level} · ${source}: ${message}`)
    }
  }

  if (partialSources.length > 0) {
    sections.push('', `Partial reporting: ${partialSources.join(', ')}.`)
  }
  sections.push(
    '',
    'Zero or missing reporting values are not treated as proof that campaign assets are inactive; a cause requires supporting campaign context.',
  )
  return appendCampaignEvidenceReceipt(sections.join('\n'), toolSteps)
}

export function appendCampaignEvidenceReceipt(content: string, toolSteps: ToolStep[]): string {
  const byAction = new Map(toolSteps.map((step) => [step.action ?? step.name, step]))
  const dashboard = byAction.get('get_campaign_main_dashboard')
  const brain = byAction.get('search_campaign_brain')
  const tasks = byAction.get('list_tasks')
  const dashboardRecord = asRecord(dashboard?.result)
  const sourceRecord = asRecord(dashboardRecord.canonical_source)
  const source =
    dashboard?.status === 'failed'
      ? `unavailable (${dashboard.error ?? 'reporting request failed'})`
      : `${readText(sourceRecord.system) ?? 'campaign_reporting'} / ${readText(sourceRecord.owner) ?? 'main_dashboard'}`
  const asOf =
    dashboard?.status === 'failed' ? 'unavailable' : (readAsOf(dashboardRecord) ?? 'unavailable')
  const receipt = [
    '**Evidence**',
    `- Live metrics source: ${source}`,
    `- Reporting as of: ${asOf}`,
    `- Campaign Brain: ${formatResultCount(brain, 'results', 'relevant context')}`,
    `- Open campaign tasks: ${formatResultCount(tasks, 'tasks', 'open tasks')}`,
  ].join('\n')
  return `${content}\n\n${receipt}`
}

function readAsOf(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  for (const key of ['as_of', 'fetched_at', 'generated_at']) {
    if (typeof record[key] === 'string') return record[key]
  }
  return null
}

function formatResultCount(
  step: ToolStep | undefined,
  collectionKey: string,
  label: string,
): string {
  if (!step || step.status === 'failed')
    return `unavailable${step?.error ? ` (${step.error})` : ''}`
  const record = asRecord(step.result)
  const count =
    typeof record.total_count === 'number'
      ? record.total_count
      : Array.isArray(record[collectionKey])
        ? record[collectionKey].length
        : null
  return count === null ? 'available; count not supplied' : `${count} ${label}`
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function formatMetric(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US') : '—'
}

function formatPercent(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}%` : '—'
}
