export const AGENCY_CLIENT_PIPELINE_STAGES = [
  { slug: 'new_client_intake', label: 'New Client Intake' },
  { slug: 'onboarding_call_booked', label: 'Onboarding Call Booked' },
  { slug: 'pre_launch', label: 'Pre-Launch' },
  { slug: 're_launch', label: 'Re-Launch' },
  { slug: 'active_happy', label: 'Active/Happy' },
  { slug: 'waiting_on_client', label: 'Waiting on Client' },
  { slug: 'paused', label: 'Paused' },
  { slug: 'inactive', label: 'Inactive' },
  { slug: 'blocked', label: 'Blocked' },
  { slug: 'done_with_you_consulting', label: 'Done With You / Consulting' },
  { slug: 'churned_inactive', label: 'Churned/Inactive' },
] as const

export type AgencyClientPipelineSlug = (typeof AGENCY_CLIENT_PIPELINE_STAGES)[number]['slug']

const DEFAULT_HIDDEN_PIPELINE_SLUGS = new Set<string>(['inactive', 'blocked', 'churned_inactive'])

const PIPELINE_ALIASES: Record<string, AgencyClientPipelineSlug> = {
  'new client intake': 'new_client_intake',
  'onboarding call booked': 'onboarding_call_booked',
  'pre launch': 'pre_launch',
  prelaunch: 'pre_launch',
  're launch': 're_launch',
  relaunch: 're_launch',
  'active happy': 'active_happy',
  active: 'active_happy',
  'waiting on client': 'waiting_on_client',
  paused: 'paused',
  inactive: 'inactive',
  blocked: 'blocked',
  'done with you': 'done_with_you_consulting',
  'done with you consulting': 'done_with_you_consulting',
  consulting: 'done_with_you_consulting',
  'churned inactive': 'churned_inactive',
  churned: 'churned_inactive',
}

// Keyed as plain strings: lookups pass unvalidated user/config values, not proven slugs.
const LABEL_BY_SLUG = new Map<string, string>(
  AGENCY_CLIENT_PIPELINE_STAGES.map((stage) => [stage.slug, stage.label]),
)
const RANK_BY_SLUG = new Map<string, number>(
  AGENCY_CLIENT_PIPELINE_STAGES.map((stage, index) => [stage.slug, index]),
)

export type PipelineClientLike = {
  id?: string
  name?: string
  display_name?: string
  status?: string | null
  pipeline_stage?: string | null
  pipeline_status?: string | null
  account_manager?: { name?: string | null } | null
  config?: Record<string, unknown>
}

export type PipelineCampaignLike = {
  id?: string
  name?: string | null
  client_id?: string | null
  clients?: unknown
}

export function normalizePipelineKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[/_,-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function resolvePipelineSlug(
  value: string | null | undefined,
): AgencyClientPipelineSlug | null {
  const key = normalizePipelineKey(typeof value === 'string' ? value : '')
  if (!key) return null
  const aliased = PIPELINE_ALIASES[key]
  if (aliased) return aliased
  const asSlug = key.replace(/ /g, '_')
  return RANK_BY_SLUG.has(asSlug as AgencyClientPipelineSlug)
    ? (asSlug as AgencyClientPipelineSlug)
    : null
}

export function clientPipelineValue(client: PipelineClientLike): string {
  const fromConfig = pageGraderPipelineFromConfig(client.config)
  if (fromConfig) return fromConfig
  const stage = typeof client.pipeline_stage === 'string' ? client.pipeline_stage.trim() : ''
  if (stage) return stage
  const pipelineStatus =
    typeof client.pipeline_status === 'string' ? client.pipeline_status.trim() : ''
  if (pipelineStatus) return pipelineStatus
  return typeof client.status === 'string' ? client.status : ''
}

export function isDefaultHiddenPipelineStage(value: string | null | undefined): boolean {
  const slug = resolvePipelineSlug(value)
  return slug != null && DEFAULT_HIDDEN_PIPELINE_SLUGS.has(slug)
}

export function isDefaultHiddenClient(client: PipelineClientLike): boolean {
  return isDefaultHiddenPipelineStage(clientPipelineValue(client))
}

export function formatPipelineStageLabel(value: string | null | undefined): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return 'Active/Happy'
  const slug = resolvePipelineSlug(raw)
  if (slug && LABEL_BY_SLUG.has(slug)) return LABEL_BY_SLUG.get(slug) ?? raw
  return raw.replace(/_/g, ' ')
}

export function comparePipelineStages(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  const leftSlug = resolvePipelineSlug(left)
  const rightSlug = resolvePipelineSlug(right)
  const leftRank =
    leftSlug != null
      ? (RANK_BY_SLUG.get(leftSlug) ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER
  const rightRank =
    rightSlug != null
      ? (RANK_BY_SLUG.get(rightSlug) ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER
  if (leftRank !== rightRank) return leftRank - rightRank
  return formatPipelineStageLabel(left).localeCompare(formatPipelineStageLabel(right), undefined, {
    sensitivity: 'base',
  })
}

export function compareClientsByPipeline(
  left: PipelineClientLike,
  right: PipelineClientLike,
): number {
  const stage = comparePipelineStages(clientPipelineValue(left), clientPipelineValue(right))
  if (stage !== 0) return stage
  const leftName = (left.display_name || left.name || '').trim()
  const rightName = (right.display_name || right.name || '').trim()
  return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' })
}

export function clientMatchesQuery(client: PipelineClientLike, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return `${client.display_name || client.name || ''} ${client.account_manager?.name || ''}`
    .toLowerCase()
    .includes(needle)
}

export function pipelineClientFromUnknown(value: unknown): PipelineClientLike {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  const manager = record.account_manager
  const managerRecord =
    manager && typeof manager === 'object' && !Array.isArray(manager)
      ? (manager as Record<string, unknown>)
      : null
  return {
    id: stringField(record, 'id'),
    name:
      stringField(record, 'friendly_name') ||
      stringField(record, 'name') ||
      stringField(record, 'display_name'),
    display_name:
      stringField(record, 'display_name') ||
      stringField(record, 'friendly_name') ||
      stringField(record, 'name'),
    status: stringField(record, 'status') ?? stringField(record, 'pipeline_status') ?? null,
    pipeline_stage: stringField(record, 'pipeline_stage') ?? null,
    pipeline_status: stringField(record, 'pipeline_status') ?? null,
    account_manager: managerRecord
      ? {
          name:
            stringField(managerRecord, 'name') ??
            stringField(managerRecord, 'assignee_name') ??
            null,
        }
      : undefined,
  }
}

export function campaignParentPipelineClient(
  campaign: PipelineCampaignLike,
  catalogById?: Map<string, PipelineClientLike>,
): PipelineClientLike {
  const nested = pipelineClientFromUnknown(campaign.clients)
  const catalog = campaign.client_id ? catalogById?.get(campaign.client_id) : undefined
  return {
    id: catalog?.id ?? nested.id ?? campaign.client_id ?? undefined,
    name: catalog?.name ?? nested.name,
    display_name: catalog?.display_name ?? nested.display_name ?? nested.name,
    status: catalog?.status ?? nested.status,
    pipeline_stage: catalog?.pipeline_stage ?? nested.pipeline_stage,
    pipeline_status: catalog?.pipeline_status ?? nested.pipeline_status,
    config: catalog?.config,
    account_manager: catalog?.account_manager ?? nested.account_manager,
  }
}

export function campaignMatchesQuery(campaign: PipelineCampaignLike, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const parent = pipelineClientFromUnknown(campaign.clients)
  return `${campaign.name || ''} ${parent.display_name || parent.name || ''}`
    .toLowerCase()
    .includes(needle)
}

export function visiblePipelineCampaigns<T extends PipelineCampaignLike>(
  campaigns: T[],
  opts: {
    query?: string
    includeHidden?: boolean
    catalogById?: Map<string, PipelineClientLike>
  } = {},
): T[] {
  const query = opts.query ?? ''
  const searching = query.trim().length > 0
  return campaigns.filter((campaign) => {
    if (!campaignMatchesQuery(campaign, query)) return false
    if (opts.includeHidden || searching) return true
    return !isDefaultHiddenClient(campaignParentPipelineClient(campaign, opts.catalogById))
  })
}

export function visiblePipelineClients<T extends PipelineClientLike>(
  clients: T[],
  opts: { query?: string; includeHidden?: boolean; alwaysIncludeIds?: Iterable<string> } = {},
): T[] {
  const query = opts.query ?? ''
  const searching = query.trim().length > 0
  const alwaysInclude = new Set(opts.alwaysIncludeIds ?? [])
  const visible = clients.filter((client) => {
    if (!clientMatchesQuery(client, query)) return false
    if (opts.includeHidden || searching) return true
    if (client.id && alwaysInclude.has(client.id)) return true
    return !isDefaultHiddenClient(client)
  })
  return [...visible].sort(compareClientsByPipeline)
}

export function groupClientsByPipeline<T extends PipelineClientLike>(
  clients: T[],
): Array<[string, T[]]> {
  const map = new Map<string, T[]>()
  for (const client of clients) {
    const label = formatPipelineStageLabel(clientPipelineValue(client))
    map.set(label, [...(map.get(label) ?? []), client])
  }
  return [...map.entries()].sort(([left], [right]) => comparePipelineStages(left, right))
}

export function groupClientsByManager<T extends PipelineClientLike>(
  clients: T[],
): Array<[string, T[]]> {
  const map = new Map<string, T[]>()
  for (const client of clients) {
    const label = client.account_manager?.name?.trim() || 'Unassigned'
    map.set(label, [...(map.get(label) ?? []), client])
  }
  return [...map.entries()]
    .map(([label, rows]) => [label, [...rows].sort(compareClientsByPipeline)] as [string, T[]])
    .sort(([left], [right]) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
}

function pageGraderPipelineFromConfig(config: Record<string, unknown> | undefined): string {
  if (!config || typeof config !== 'object') return ''
  const sources = config.external_sources
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) return ''
  const pageGrader = (sources as Record<string, unknown>).page_grader
  if (!pageGrader || typeof pageGrader !== 'object' || Array.isArray(pageGrader)) return ''
  const row = pageGrader as Record<string, unknown>
  if (typeof row.pipeline_stage === 'string' && row.pipeline_stage.trim()) return row.pipeline_stage
  if (typeof row.status === 'string' && row.status.trim()) return row.status
  return ''
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
