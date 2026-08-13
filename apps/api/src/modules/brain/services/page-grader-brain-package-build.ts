import { createHash } from 'node:crypto'

export type PageGraderRecord = Record<string, unknown>

export type PageGraderPackage = {
  envelope?: PageGraderRecord
  destination?: string
  page_grader_client_id?: string
  unique_client_id?: string
  exported_at?: string
  package_version?: string
  client?: PageGraderRecord
  client_campaigns?: PageGraderRecord[]
  client_offers?: PageGraderRecord[]
  client_avatars?: PageGraderRecord[]
  client_strategies?: PageGraderRecord[]
  onboarding_call_notes?: PageGraderRecord[] | PageGraderRecord
  source_items?: PageGraderRecord[]
  slack_messages?: PageGraderRecord[]
  source_pointers?: PageGraderRecord
  social_links?: PageGraderRecord[]
  intel_summary_hint?: PageGraderRecord | null
  legacy_local_only?: {
    intel_notes?: PageGraderRecord[]
    activity_log?: PageGraderRecord[]
  }
}

export type PageGraderMemoryRow = {
  content: string
  content_hash: string
  memory_type: string
  source_type: string
  source_id: string | null
  source_title: string
  confidence: number
  significance: number
  tags: string[]
  metadata: Record<string, unknown>
}

export type PageGraderEvidenceRow = {
  source_type: string
  source_id: string
  source_title: string
  chunk_index: number
  contextual_prefix: string
  content: string
  content_hash: string
  metadata: Record<string, unknown>
}

export const PAGE_GRADER_MAX_MEMORY_CHARS = 8000
export const PAGE_GRADER_MEMORY_BATCH = 100

/** Campaign Knowledge `space_semantic_objects.source_type` for a Page Grader memory. */
export type PageGraderKnowledgeSourceType =
  | 'avatar'
  | 'offer'
  | 'channel_message'
  | 'space_doc'
  | 'conversation_document'
  | 'campaign_overview_snapshot'

/**
 * Map Page Grader memory provenance onto Campaign Knowledge object kinds.
 * Avoids labeling every dual-write as `conversation_document`.
 */
export function resolvePageGraderKnowledgeSourceType(input: {
  memorySourceType?: string | null
  sourceTitle?: string | null
}): PageGraderKnowledgeSourceType {
  const st = (input.memorySourceType || '').toLowerCase()
  const title = (input.sourceTitle || '').toLowerCase()

  if (st === 'page_grader_seed' || st.includes('_seed')) {
    if (title.startsWith('avatar') || title.includes('avatar:')) return 'avatar'
    if (title.startsWith('offer') || title.includes('offer:')) return 'offer'
    if (title.includes('overview') || title.includes('client profile')) {
      return 'campaign_overview_snapshot'
    }
    return 'space_doc'
  }

  if (st.includes('slack') || st.includes('clickup') || st.includes('discord')) {
    return 'channel_message'
  }
  if (
    st.includes('call') ||
    st.includes('meeting') ||
    st.includes('fathom') ||
    st.includes('fireflies') ||
    st.includes('transcript')
  ) {
    return 'conversation_document'
  }
  if (
    st.includes('drive') ||
    st.includes('dropbox') ||
    st.includes('notion') ||
    st.includes('google') ||
    st.includes('doc')
  ) {
    return 'space_doc'
  }

  return 'space_doc'
}

export function pageGraderSha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function pageGraderTruncate(text: string, limit = PAGE_GRADER_MAX_MEMORY_CHARS): string {
  const trimmed = (text || '').trim()
  if (trimmed.length <= limit) return trimmed
  return `${trimmed.slice(0, Math.max(0, limit - 20)).trimEnd()}\n…[truncated]`
}

export function pageGraderStringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

/** Stable package content hash — excludes wall-clock exported_at. */
export function computePageGraderPackageContentHash(pkg: PageGraderPackage): string {
  const envelope = { ...(pkg.envelope ?? {}) }
  delete envelope.exported_at
  const canonical = {
    destination: pkg.destination ?? envelope.destination ?? null,
    page_grader_client_id:
      pkg.page_grader_client_id ?? envelope.page_grader_client_id ?? pkg.client?.id ?? null,
    unique_client_id:
      pkg.unique_client_id ?? envelope.unique_client_id ?? pkg.client?.unique_client_id ?? null,
    package_version: pkg.package_version ?? envelope.package_version ?? '1',
    client: pkg.client ?? null,
    client_campaigns: pkg.client_campaigns ?? [],
    client_offers: pkg.client_offers ?? [],
    client_avatars: pkg.client_avatars ?? [],
    client_strategies: pkg.client_strategies ?? [],
    onboarding_call_notes: pkg.onboarding_call_notes ?? [],
    source_items: pkg.source_items ?? [],
    slack_messages: pkg.slack_messages ?? [],
    source_pointers: pkg.source_pointers ?? null,
    social_links: pkg.social_links ?? [],
    intel_summary_hint: pkg.intel_summary_hint ?? null,
  }
  return pageGraderSha256(JSON.stringify(canonical))
}

function categoryToMemoryType(category: string | null | undefined): string {
  const mapping: Record<string, string> = {
    strategy: 'decision',
    brand: 'fact',
    target_audience: 'fact',
    competitor: 'insight',
    feedback: 'insight',
    concern: 'insight',
    meeting_notes: 'insight',
    request: 'insight',
    project: 'insight',
    asset: 'fact',
    link: 'fact',
    general: 'insight',
  }
  return mapping[(category || 'general').toLowerCase()] ?? 'insight'
}

function jsonish(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function buildPageGraderSeedMemories(
  pkg: PageGraderPackage,
  pageGraderClientId: string,
): PageGraderMemoryRow[] {
  const client = pkg.client ?? {}
  const seeds: Array<{
    title: string
    content: string
    memoryType: string
    significance: number
    tags: string[]
  }> = []

  const overview = pageGraderStringValue(client.ai_overview, client.ai_summary)
  if (overview) {
    seeds.push({
      title: 'Client overview',
      content: overview,
      memoryType: 'fact',
      significance: 0.95,
      tags: ['page_grader_seed', 'profile'],
    })
  }

  const voice = pageGraderStringValue(client.ai_brand_voice)
  if (voice) {
    seeds.push({
      title: 'Brand voice',
      content: voice,
      memoryType: 'preference',
      significance: 0.9,
      tags: ['page_grader_seed', 'brand'],
    })
  }

  if (client.ai_differentiators) {
    seeds.push({
      title: 'Differentiators',
      content: jsonish(client.ai_differentiators),
      memoryType: 'insight',
      significance: 0.9,
      tags: ['page_grader_seed', 'brand'],
    })
  }

  const raw = pageGraderStringValue(client.describe_what_you_do, client.raw_description)
  if (raw) {
    seeds.push({
      title: 'Onboarding description',
      content: raw,
      memoryType: 'fact',
      significance: 0.88,
      tags: ['page_grader_seed', 'onboarding'],
    })
  }

  for (const offer of pkg.client_offers ?? []) {
    const name = pageGraderStringValue(offer.name) || 'Offer'
    const body =
      [offer.description, offer.price, offer.promise, offer.guarantee, offer.details, offer.notes]
        .map((v) => pageGraderStringValue(v))
        .filter(Boolean)
        .join('\n') || jsonish(offer).slice(0, 4000)
    seeds.push({
      title: `Offer: ${name}`,
      content: body,
      memoryType: 'fact',
      significance: 0.92,
      tags: ['page_grader_seed', 'offer'],
    })
  }

  for (const avatar of pkg.client_avatars ?? []) {
    const name = pageGraderStringValue(avatar.name) || 'Avatar'
    const body =
      [
        avatar.description,
        avatar.pain_points,
        avatar.desires,
        avatar.demographics,
        avatar.psychographics,
        avatar.notes,
      ]
        .map((v) => pageGraderStringValue(v))
        .filter(Boolean)
        .join('\n') || jsonish(avatar).slice(0, 4000)
    seeds.push({
      title: `Avatar: ${name}`,
      content: body,
      memoryType: 'fact',
      significance: 0.9,
      tags: ['page_grader_seed', 'avatar'],
    })
  }

  for (const strat of pkg.client_strategies ?? []) {
    const name = pageGraderStringValue(strat.name, strat.title) || 'Strategy'
    const body =
      pageGraderStringValue(strat.content, strat.strategy_notes, strat.summary) ||
      jsonish(strat).slice(0, 4000)
    seeds.push({
      title: `Strategy: ${name}`,
      content: body,
      memoryType: 'decision',
      significance: 0.93,
      tags: ['page_grader_seed', 'strategy'],
    })
  }

  for (const camp of pkg.client_campaigns ?? []) {
    const name = pageGraderStringValue(camp.name) || 'Campaign'
    const body =
      [
        camp.description,
        camp.campaign_brief,
        camp.campaign_overview,
        camp.ad_strategy_overview,
        camp.campaign_objective,
      ]
        .map((v) => pageGraderStringValue(v))
        .filter(Boolean)
        .join('\n\n') || name
    seeds.push({
      title: `Campaign: ${name}`,
      content: body,
      memoryType: 'fact',
      significance: 0.9,
      tags: ['page_grader_seed', 'campaign'],
    })
  }

  let notes = pkg.onboarding_call_notes ?? []
  if (!Array.isArray(notes) && notes && typeof notes === 'object') notes = [notes]
  for (const note of notes as PageGraderRecord[]) {
    const summary = pageGraderStringValue(note.ai_summary, note.offer_notes, note.notes)
    if (summary) {
      seeds.push({
        title: 'Onboarding call notes',
        content: summary,
        memoryType: 'insight',
        significance: 0.88,
        tags: ['page_grader_seed', 'onboarding'],
      })
    }
  }

  if (pkg.source_pointers && Object.keys(pkg.source_pointers).length > 0) {
    seeds.push({
      title: 'Source pointers',
      content: jsonish(pkg.source_pointers),
      memoryType: 'fact',
      significance: 0.7,
      tags: ['page_grader_seed', 'pointers'],
    })
  }

  if (pkg.intel_summary_hint) {
    seeds.push({
      title: 'Intel summary hint',
      content: jsonish(pkg.intel_summary_hint),
      memoryType: 'insight',
      significance: 0.85,
      tags: ['page_grader_seed', 'intel'],
    })
  }

  const out: PageGraderMemoryRow[] = []
  for (const seed of seeds) {
    const body = pageGraderTruncate(`${seed.title}\n\n${seed.content}`)
    if (!body.trim()) continue
    out.push({
      content: body,
      content_hash: pageGraderSha256(`seed:${pageGraderClientId}:${seed.title}:${body}`),
      memory_type: seed.memoryType,
      source_type: 'page_grader_seed',
      source_id: `seed:${pageGraderClientId}:${pageGraderSha256(seed.title).slice(0, 12)}`,
      source_title: seed.title,
      confidence: 0.9,
      significance: seed.significance,
      tags: seed.tags,
      metadata: {
        page_grader_client_id: pageGraderClientId,
        ingest_kind: 'structured_seed',
        provisional_source_snapshot: false,
        needs_roas_extraction: false,
        destination: 'ROAS-BRAIN',
      },
    })
  }
  return out
}

export function buildPageGraderSourceMemories(
  pkg: PageGraderPackage,
  pageGraderClientId: string,
): PageGraderMemoryRow[] {
  const out: PageGraderMemoryRow[] = []
  for (const item of pkg.source_items ?? []) {
    const title = pageGraderStringValue(item.title) || 'Source item'
    const content = pageGraderStringValue(item.content_plain, item.content)
    if (!content) continue
    const status = pageGraderStringValue(item.status) || 'pending_review'
    const body = pageGraderTruncate(`${title}\n\n${content}`)
    const pgId = pageGraderStringValue(item.id)
    const sourceType = `page_grader_${pageGraderStringValue(item.source_type) || 'unknown'}`.slice(
      0,
      64,
    )
    out.push({
      content: body,
      content_hash: pageGraderSha256(`source:${pgId}:${body}`),
      memory_type: categoryToMemoryType(pageGraderStringValue(item.category) || null),
      source_type: sourceType,
      source_id: pgId || null,
      source_title: title.slice(0, 500),
      confidence: status === 'confirmed' ? 0.75 : 0.55,
      significance: status === 'confirmed' ? 0.7 : 0.55,
      tags: ['page_grader_source_item', pageGraderStringValue(item.category) || 'general', status],
      metadata: {
        page_grader_client_id: pageGraderClientId,
        page_grader_knowledge_entry_id: pgId || null,
        page_grader_source_type: item.source_type ?? null,
        page_grader_category: item.category ?? null,
        page_grader_status: status,
        ingest_kind: 'source_item',
        provisional_source_snapshot: true,
        needs_roas_extraction: true,
        destination: 'ROAS-BRAIN',
      },
    })
  }
  for (const message of pkg.slack_messages ?? []) {
    const content = pageGraderStringValue(message.text)
    if (!content) continue
    const slackTs = pageGraderStringValue(message.slack_ts, message.ts)
    const author = pageGraderStringValue(message.author, message.author_name) || 'Slack participant'
    const date = pageGraderStringValue(message.date)
    const sourceId = slackTs || pageGraderSha256(`${author}:${date}:${content}`).slice(0, 24)
    const title = `Slack — ${author}${date ? ` — ${date}` : ''}`
    const body = pageGraderTruncate(`${title}\n\n${content}`)
    out.push({
      content: body,
      content_hash: pageGraderSha256(`slack:${pageGraderClientId}:${sourceId}:${body}`),
      memory_type: 'insight',
      source_type: 'page_grader_slack',
      source_id: sourceId,
      source_title: title.slice(0, 500),
      confidence: 0.65,
      significance: 0.6,
      tags: ['page_grader_source_item', 'slack', 'recent'],
      metadata: {
        page_grader_client_id: pageGraderClientId,
        page_grader_slack_ts: slackTs || null,
        page_grader_message_date: date || null,
        ingest_kind: 'slack_message',
        provisional_source_snapshot: true,
        needs_roas_extraction: true,
        destination: 'ROAS-BRAIN',
      },
    })
  }
  return out
}

export function buildPageGraderEvidenceRows(
  pkg: PageGraderPackage,
  pageGraderClientId: string,
): PageGraderEvidenceRow[] {
  const out: PageGraderEvidenceRow[] = []
  for (const item of pkg.source_items ?? []) {
    const title = pageGraderStringValue(item.title) || 'Source item'
    const content = pageGraderStringValue(item.content_plain, item.content)
    if (!content) continue
    const pgId =
      pageGraderStringValue(item.id) || pageGraderSha256(`${title}${content}`).slice(0, 16)
    const chunk = pageGraderTruncate(content, 12000)
    out.push({
      source_type: `page_grader_${pageGraderStringValue(item.source_type) || 'unknown'}`.slice(
        0,
        64,
      ),
      source_id: pgId,
      source_title: title.slice(0, 500),
      chunk_index: 0,
      contextual_prefix: title.slice(0, 500),
      content: chunk,
      content_hash: pageGraderSha256(`evidence:${pgId}:0:${chunk}`),
      metadata: {
        page_grader_client_id: pageGraderClientId,
        page_grader_status: item.status ?? null,
        page_grader_category: item.category ?? null,
        destination: 'ROAS-BRAIN',
      },
    })
  }
  for (const message of pkg.slack_messages ?? []) {
    const content = pageGraderStringValue(message.text)
    if (!content) continue
    const slackTs = pageGraderStringValue(message.slack_ts, message.ts)
    const author = pageGraderStringValue(message.author, message.author_name) || 'Slack participant'
    const date = pageGraderStringValue(message.date)
    const sourceId =
      slackTs || pageGraderSha256(`${pageGraderClientId}:${author}:${date}:${content}`).slice(0, 24)
    out.push({
      source_type: 'page_grader_slack',
      source_id: sourceId,
      source_title: `Slack — ${author}${date ? ` — ${date}` : ''}`.slice(0, 500),
      chunk_index: 0,
      contextual_prefix: `Recent Slack message for Page Grader client ${pageGraderClientId}`,
      content: pageGraderTruncate(content, 12000),
      content_hash: pageGraderSha256(`slack-evidence:${pageGraderClientId}:${sourceId}:${content}`),
      metadata: {
        page_grader_client_id: pageGraderClientId,
        page_grader_slack_ts: slackTs || null,
        page_grader_message_date: date || null,
        destination: 'ROAS-BRAIN',
      },
    })
  }
  return out
}
