import type { PageGraderRecord } from './page-grader-brain-package-build'

type MetaAccount = Record<string, unknown>
type MetaCampaign = Record<string, unknown>

export type PageGraderMetaContext = {
  connected?: boolean
  accounts?: MetaAccount[]
  recommended_ad_account_id?: string | null
  campaigns?: MetaCampaign[]
  provenance?: Record<string, unknown>
}

export type PageGraderCampaignMeta = {
  connected: boolean
  account: MetaAccount | null
  campaign: MetaCampaign | null
  recommendedAdAccountId: string | null
  generatedAt: string | null
}

const STATUS_OPTIONS = [
  { id: 'todo', label: 'To Do', color: 'cyan', group: 'not_started' },
  { id: 'in_progress', label: 'In Progress', color: 'amber', group: 'active' },
  { id: 'in_review', label: 'In Review', color: 'violet', group: 'active' },
  { id: 'done', label: 'Completed', color: 'emerald', group: 'closed' },
  { id: 'archived', label: 'Closed', color: 'slate', group: 'closed' },
]

export function buildPageGraderCampaignSpaceSchema(input: {
  clientId: string
  campaign: PageGraderRecord
  meta: PageGraderCampaignMeta
  syncedAt: string
}) {
  const campaignId = stringValue(input.campaign.id)
  return {
    version: 1,
    icon: 'megaphone',
    fields: [
      { id: 'title', name: 'Name', type: 'text', system: true, required: true },
      {
        id: 'status',
        name: 'Status',
        type: 'select',
        system: true,
        required: true,
        options: STATUS_OPTIONS,
      },
      {
        id: 'priority',
        name: 'Priority',
        type: 'select',
        system: true,
        required: true,
        options: [
          { id: 'low', label: 'Low', color: 'slate' },
          { id: 'medium', label: 'Medium', color: 'blue' },
          { id: 'high', label: 'High', color: 'orange' },
          { id: 'urgent', label: 'Urgent', color: 'red' },
        ],
      },
      { id: 'assignee', name: 'Assignee', type: 'assignee', system: true },
      { id: 'due_date', name: 'Due Date', type: 'date', system: true },
      { id: 'tags', name: 'Tags', type: 'multi_select', system: true, options: [] },
    ],
    views: [
      { id: 'campaign-overview', type: 'campaign_overview', name: 'Overview' },
      { id: 'docs', type: 'docs', name: 'Docs' },
      { id: 'missions', type: 'missions', name: 'Missions' },
      { id: 'calendar', type: 'calendar', name: 'Calendar' },
      {
        id: 'meta-ads',
        type: 'ads',
        name: 'Meta Ads',
        icon: 'megaphone',
        ads_config: {
          display_mode: 'grid',
          time_range: 'all',
          sort_by: 'created_at',
          sort_dir: 'desc',
          paid_ads_mode: 'structure',
        },
      },
      {
        id: 'funnels',
        type: 'funnels',
        name: 'Funnels',
        icon: 'git-branch',
        funnels_config: {
          display_mode: 'grid',
          time_range: 'all',
          sort_by: 'created_at',
          sort_dir: 'desc',
        },
      },
    ],
    custom_data: {
      source: 'page_grader',
      space_role: 'client_campaign',
      page_grader_client_id: input.clientId || null,
      page_grader_campaign_id: campaignId || null,
      page_grader_campaign_status:
        stringValue(input.campaign.status, input.campaign.platform_status) || null,
      page_grader_last_synced_at: input.syncedAt,
      meta: serializeMeta(input.meta),
    },
  }
}

/** Preserve operator-added fields/views while refreshing Page Grader-owned provenance. */
export function mergePageGraderCampaignSpaceSchema(
  existing: unknown,
  canonical: ReturnType<typeof buildPageGraderCampaignSpaceSchema>,
) {
  const current = asRecord(existing)
  const currentFields = Array.isArray(current.fields) ? current.fields : []
  const currentViews = Array.isArray(current.views) ? current.views : []
  const canonicalFieldIds = new Set(canonical.fields.map((field) => field.id))
  const canonicalViewIds = new Set(canonical.views.map((view) => view.id))
  return {
    ...current,
    ...canonical,
    fields: [
      ...canonical.fields,
      ...currentFields.filter((field) => !canonicalFieldIds.has(stringValue(asRecord(field).id))),
    ],
    views: [
      ...canonical.views,
      ...currentViews.filter((view) => !canonicalViewIds.has(stringValue(asRecord(view).id))),
    ],
    custom_data: {
      ...asRecord(current.custom_data),
      ...canonical.custom_data,
    },
  }
}

export function resolvePageGraderCampaignMeta(
  campaignId: string,
  context?: PageGraderMetaContext | null,
): PageGraderCampaignMeta {
  const campaigns = context?.campaigns ?? []
  const match =
    campaigns.find((row) => stringValue(row.page_grader_campaign_id) === campaignId) ?? null
  const accountDbId = stringValue(match?.account_db_id)
  const recommended = stringValue(context?.recommended_ad_account_id) || null
  const accounts = context?.accounts ?? []
  const account =
    accounts.find((row) => accountDbId && stringValue(row.account_db_id) === accountDbId) ??
    accounts.find((row) => recommended && stringValue(row.ad_account_id) === recommended) ??
    (accounts.filter((row) => row.active === true).length === 1
      ? (accounts.find((row) => row.active === true) ?? null)
      : null)
  return {
    connected: context?.connected === true,
    account,
    campaign: match,
    recommendedAdAccountId: recommended,
    generatedAt: stringValue(context?.provenance?.generated_at) || null,
  }
}

export function buildPageGraderCampaignBrief(input: {
  clientName: string
  campaign: PageGraderRecord
  meta: PageGraderCampaignMeta
  syncedAt: string
}): string {
  const name = stringValue(input.campaign.name, input.campaign.title) || 'Untitled campaign'
  const lines = [
    `# ${name}`,
    '',
    `Client: ${input.clientName}`,
    `Status: ${stringValue(input.campaign.status) || 'Unknown'}`,
    `Last synced from The ROAS Portal: ${input.syncedAt}`,
    '',
    '## Campaign details',
    '```json',
    JSON.stringify(input.campaign, null, 2),
    '```',
    '',
    '## Meta connection',
  ]
  if (!input.meta.connected) {
    lines.push('No active Meta connection was returned by The ROAS Portal for this client.')
  } else {
    lines.push(
      `Ad account: ${stringValue(input.meta.account?.name) || 'Not mapped'}`,
      `Ad account ID: ${stringValue(input.meta.account?.ad_account_id) || input.meta.recommendedAdAccountId || 'Not mapped'}`,
      `Meta campaign: ${stringValue(input.meta.campaign?.meta_campaign_name) || 'Not mapped'}`,
      `Meta campaign ID: ${stringValue(input.meta.campaign?.meta_campaign_id) || 'Not mapped'}`,
    )
  }
  return lines.join('\n').slice(0, 200_000)
}

function serializeMeta(meta: PageGraderCampaignMeta) {
  return {
    connected: meta.connected,
    ad_account_id: stringValue(meta.account?.ad_account_id) || meta.recommendedAdAccountId || null,
    ad_account_name: stringValue(meta.account?.name) || null,
    account_db_id: stringValue(meta.account?.account_db_id) || null,
    meta_campaign_id: stringValue(meta.campaign?.meta_campaign_id) || null,
    meta_campaign_name: stringValue(meta.campaign?.meta_campaign_name) || null,
    context_generated_at: meta.generatedAt,
  }
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
