import { createHash } from 'node:crypto'
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { PageGraderMeetingUpsert } from '../integrations/page-grader.integration'
import type { PageGraderClientScopeEntry } from './page-grader-api.helpers'
import { PageGraderApiService } from './page-grader-api.service'

type MeetingRoute = { space_id: string; item_id: string }
type PageGraderClient = { id: string; name: string; website_url?: string | null }

export type MeetingSyncResult = {
  source_meeting_id: string
  matched_clients: Array<{ id: string; name: string; matched_by: string }>
  synced: number
  unchanged: number
  failed: number
  needs_client_mapping: boolean
}

@Injectable()
export class PageGraderMeetingSyncService {
  private readonly logger = new Logger(PageGraderMeetingSyncService.name)

  constructor(
    private readonly pageGrader: PageGraderApiService,
    private readonly serviceClient: SupabaseServiceClient,
  ) {}

  async syncFathomMeeting(input: {
    supabase: SupabaseClient
    userId: string
    event: Record<string, unknown>
    routes?: MeetingRoute[]
  }): Promise<MeetingSyncResult> {
    const meeting = normalizeFathomMeeting(input.event)
    const routes = dedupeRoutes(input.routes ?? [])
    const catalog = await this.pageGrader.listClients(input.userId, { all: true })
    const contexts = await this.loadRouteContexts(input.supabase, routes)
    const matches = resolveMeetingClients({
      meeting,
      clients: catalog.clients,
      scopeMap: catalog.client_scope_map,
      contexts,
    })

    const result: MeetingSyncResult = {
      source_meeting_id: meeting.source_meeting_id,
      matched_clients: matches,
      synced: 0,
      unchanged: 0,
      failed: 0,
      needs_client_mapping: matches.length === 0,
    }

    if (matches.length === 0) {
      await this.stampRoutes(input.supabase, contexts, {
        status: 'needs_client_mapping',
        source_meeting_id: meeting.source_meeting_id,
      })
      return result
    }

    for (const match of matches) {
      const context =
        contexts.find((row) => contextMapsToClient(row, match.id, catalog.client_scope_map)) ??
        contexts[0]
      try {
        const response = await this.pageGrader.upsertClientMeeting(input.userId, match.id, {
          ...meeting,
          ...(context?.space_id ? { roas_space_id: context.space_id } : {}),
          ...(context?.item_id ? { roas_space_item_id: context.item_id } : {}),
          matched_by: match.matched_by,
        })
        if (response.unchanged) result.unchanged += 1
        else result.synced += 1
      } catch (error) {
        result.failed += 1
        this.logger.warn(
          `Meeting ${meeting.source_meeting_id} failed to sync to Page Grader client ${match.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }

    await this.stampRoutes(input.supabase, contexts, {
      status: result.failed > 0 ? 'partial_failure' : 'synced',
      source_meeting_id: meeting.source_meeting_id,
      clients: matches,
      synced_at: new Date().toISOString(),
      failed: result.failed,
    })
    return result
  }

  async syncSpaceItem(input: {
    supabase: SupabaseClient
    userId: string
    spaceItemId: string
    clientIds: string[]
  }): Promise<MeetingSyncResult> {
    const { data: item, error } = await input.supabase
      .from('space_items')
      .select('id, space_id, title, description, source, created_at, custom_data')
      .eq('id', input.spaceItemId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    if (!item) throw new NotFoundException('Meeting item not found')
    if (item.source !== 'fathom') throw new BadRequestException('Only Fathom call items can sync')

    const custom = asRecord(item.custom_data)
    const pageGrader = asRecord(custom.page_grader)
    const nextCustom = {
      ...custom,
      page_grader: { ...pageGrader, client_ids: [...new Set(input.clientIds)] },
    }
    const { error: updateError } = await input.supabase
      .from('space_items')
      .update({ custom_data: nextCustom })
      .eq('id', item.id)
    if (updateError) throw new BadRequestException(updateError.message)

    return this.syncFathomMeeting({
      supabase: input.supabase,
      userId: input.userId,
      routes: [{ space_id: String(item.space_id), item_id: String(item.id) }],
      event: fathomEventFromSpaceItem({ ...item, custom_data: nextCustom }),
    })
  }

  async catchUp(limit = 100): Promise<{
    scanned: number
    synced: number
    unchanged: number
    failed: number
    needs_client_mapping: number
  }> {
    const supabase = this.serviceClient.client
    const { data: integrations, error } = await supabase
      .from('user_integrations')
      .select('user_id')
      .eq('integration_id', 'page_grader')
      .eq('status', 'connected')
      .is('org_id', null)
    if (error) throw new Error(error.message)

    const totals = { scanned: 0, synced: 0, unchanged: 0, failed: 0, needs_client_mapping: 0 }
    const userIds = [
      ...new Set((integrations ?? []).map((row) => String(row.user_id)).filter(Boolean)),
    ]
    for (const userId of userIds) {
      if (totals.scanned >= limit) break
      const remaining = limit - totals.scanned
      // Look past already-synced recent calls so older unsynced rows still get a turn.
      const scanLimit = Math.min(Math.max(remaining * 5, remaining), 1000)
      const { data: items, error: itemsError } = await supabase
        .from('space_items')
        .select('id, space_id, title, description, created_at, custom_data')
        .eq('user_id', userId)
        .eq('source', 'fathom')
        .order('created_at', { ascending: false })
        .limit(scanLimit)
      if (itemsError) throw new Error(itemsError.message)

      for (const item of items ?? []) {
        if (totals.scanned >= limit) break
        const custom = asRecord(item.custom_data)
        const existing = asRecord(asRecord(custom.page_grader).meeting_sync)
        if (existing.status === 'synced') continue
        const external = asRecord(custom.external_automation)
        const sourceMeetingId = stringValue(external.meeting_id)
        if (!sourceMeetingId) continue
        totals.scanned += 1
        try {
          const sync = await this.syncFathomMeeting({
            supabase,
            userId,
            routes: [{ space_id: String(item.space_id), item_id: String(item.id) }],
            event: fathomEventFromSpaceItem(item),
          })
          totals.synced += sync.synced
          totals.unchanged += sync.unchanged
          totals.failed += sync.failed
          if (sync.needs_client_mapping) totals.needs_client_mapping += 1
        } catch (catchUpError) {
          totals.failed += 1
          this.logger.warn(
            `Meeting catch-up failed for ${sourceMeetingId}: ${
              catchUpError instanceof Error ? catchUpError.message : String(catchUpError)
            }`,
          )
        }
      }
    }
    return totals
  }

  private async loadRouteContexts(supabase: SupabaseClient, routes: MeetingRoute[]) {
    if (routes.length === 0) return []
    const spaceIds = [...new Set(routes.map((route) => route.space_id))]
    const itemIds = [...new Set(routes.map((route) => route.item_id))]
    const [{ data: spaces }, { data: items }] = await Promise.all([
      supabase.from('spaces').select('id, campaign_id').in('id', spaceIds),
      supabase
        .from('space_items')
        .select('id, space_id, title, description, custom_data')
        .in('id', itemIds),
    ])
    const spacesById = new Map((spaces ?? []).map((space) => [String(space.id), space]))
    const itemsById = new Map((items ?? []).map((item) => [String(item.id), item]))
    return routes.map((route) => {
      const space = spacesById.get(route.space_id)
      const item = itemsById.get(route.item_id)
      return {
        space_id: route.space_id,
        item_id: route.item_id,
        campaign_id: stringValue(space?.campaign_id),
        title: stringValue(item?.title),
        description: stringValue(item?.description),
        custom_data: asRecord(item?.custom_data),
        client_id: explicitClientIds(asRecord(item?.custom_data))[0] ?? null,
      }
    })
  }

  private async stampRoutes(
    supabase: SupabaseClient,
    contexts: Array<{ item_id: string; custom_data: Record<string, unknown> }>,
    meetingSync: Record<string, unknown>,
  ) {
    for (const context of contexts) {
      const pageGrader = asRecord(context.custom_data.page_grader)
      const { error } = await supabase
        .from('space_items')
        .update({
          custom_data: {
            ...context.custom_data,
            page_grader: { ...pageGrader, meeting_sync: meetingSync },
          },
        })
        .eq('id', context.item_id)
      if (error) this.logger.warn(`Could not stamp Page Grader meeting sync: ${error.message}`)
    }
  }
}

export function normalizeFathomMeeting(event: Record<string, unknown>): PageGraderMeetingUpsert {
  const sourceMeetingId = stringValue(event.id, event.recording_id, event.call_id)
  if (!sourceMeetingId) throw new Error('Fathom meeting id is required')
  const title = stringValue(event.title, event.meeting_title) || 'Untitled meeting'
  const meetingDate = validDate(
    event.recording_start_time ?? event.scheduled_start_time ?? event.created_at,
  )
  const summary = stringValue(asRecord(event.default_summary).markdown_formatted, event.summary)
  const transcriptEntries = Array.isArray(event.transcript) ? event.transcript : []
  const transcript = transcriptEntries
    .map((entry) => {
      const row = asRecord(entry)
      const speaker = asRecord(row.speaker)
      const name = stringValue(speaker.display_name, speaker.name) || 'Unknown'
      const text = stringValue(row.text)
      return text ? `${name}: ${text}` : ''
    })
    .filter(Boolean)
    .join('\n')
  const attendees = Array.isArray(event.calendar_invitees)
    ? event.calendar_invitees.map(asRecord).filter((row) => stringValue(row.name, row.email))
    : []
  const actionItems = Array.isArray(event.action_items)
    ? event.action_items.map(asRecord).filter((row) => stringValue(row.description))
    : []
  const duration = durationMinutes(
    event.recording_start_time ?? event.scheduled_start_time,
    event.recording_end_time ?? event.scheduled_end_time,
  )
  const payload: PageGraderMeetingUpsert = {
    source_meeting_id: sourceMeetingId,
    meeting_title: title,
    meeting_date: meetingDate,
    meeting_duration_minutes: duration,
    attendees,
    source_url: stringValue(event.share_url, event.url) || null,
    transcript: transcript || null,
    summary: summary || null,
    ai_summary: summary || null,
    action_items: actionItems,
  }
  payload.sync_hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  return payload
}

export function resolveMeetingClients(input: {
  meeting: PageGraderMeetingUpsert
  clients: PageGraderClient[]
  scopeMap: Record<string, PageGraderClientScopeEntry>
  contexts: Array<{
    space_id: string
    campaign_id: string | null
    title: string | null
    description: string | null
    custom_data: Record<string, unknown>
  }>
}): Array<{ id: string; name: string; matched_by: string }> {
  const matches = new Map<string, { id: string; name: string; matched_by: string }>()
  for (const context of input.contexts) {
    for (const id of explicitClientIds(context.custom_data)) {
      const client = input.clients.find((candidate) => candidate.id === id)
      if (client) matches.set(client.id, { ...client, matched_by: 'explicit_client' })
    }
    const mappedId = Object.entries(input.scopeMap).find(([, scope]) => {
      if (scope.space_id && scope.space_id === context.space_id) return true
      return Boolean(context.campaign_id && scope.campaign_id === context.campaign_id)
    })?.[0]
    const mapped = input.clients.find((client) => client.id === mappedId)
    if (mapped && !matches.has(mapped.id)) {
      matches.set(mapped.id, { ...mapped, matched_by: 'roas_campaign_mapping' })
    }
  }
  if (matches.size > 0) return [...matches.values()]

  const inviteeMatches = matchClientsByInviteeEmail({
    attendees: input.meeting.attendees ?? [],
    clients: input.clients,
  })
  if (inviteeMatches.length > 0) return inviteeMatches

  const haystack = normalizeText(
    [
      input.meeting.meeting_title,
      input.meeting.summary,
      ...input.contexts.flatMap((context) => [context.title, context.description]),
    ]
      .filter(Boolean)
      .join(' '),
  )
  const textMatches = input.clients.filter((client) => {
    const name = normalizeText(client.name)
    return name.length >= 4 && haystack.includes(name)
  })
  return textMatches.length === 1 ? [{ ...textMatches[0]!, matched_by: 'unique_client_name' }] : []
}

const INTERNAL_EMAIL_DOMAINS = new Set([
  'roas.co',
  'roas.io',
  'dylanvanas.com',
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
])

export function matchClientsByInviteeEmail(input: {
  attendees: Array<Record<string, unknown>>
  clients: PageGraderClient[]
}): Array<{ id: string; name: string; matched_by: string }> {
  const inviteeEmails = input.attendees
    .map((row) => stringValue(row.email).toLowerCase())
    .filter((email) => email.includes('@'))
  const inviteeDomains = [
    ...new Set(
      inviteeEmails
        .map((email) => email.split('@')[1] ?? '')
        .filter((domain) => domain && !INTERNAL_EMAIL_DOMAINS.has(domain)),
    ),
  ]
  if (inviteeDomains.length === 0) return []

  const matches: Array<{ id: string; name: string; matched_by: string }> = []
  for (const client of input.clients) {
    const websiteHost = hostnameFromUrl(stringValue(client.website_url))
    if (
      websiteHost &&
      inviteeDomains.some(
        (domain) =>
          domain === websiteHost ||
          domain.endsWith(`.${websiteHost}`) ||
          websiteHost.endsWith(`.${domain}`),
      )
    ) {
      matches.push({ id: client.id, name: client.name, matched_by: 'invitee_email_domain' })
      continue
    }
    const nameTokens = normalizeText(client.name)
      .split(' ')
      .filter((token) => token.length >= 4)
    const domainHit = inviteeDomains.some((domain) => {
      const domainText = normalizeText(domain.replace(/\./g, ' '))
      return nameTokens.some((token) => domainText.includes(token) || domain.includes(token))
    })
    if (domainHit) {
      matches.push({ id: client.id, name: client.name, matched_by: 'invitee_email_domain' })
    }
  }
  return matches
}

function hostnameFromUrl(value: string): string | null {
  if (!value) return null
  try {
    const host = new URL(value.includes('://') ? value : `https://${value}`).hostname
      .toLowerCase()
      .replace(/^www\./, '')
    return host || null
  } catch {
    return null
  }
}

function explicitClientIds(customData: Record<string, unknown>): string[] {
  const pageGrader = asRecord(customData.page_grader)
  const values = [
    pageGrader.client_id,
    ...(Array.isArray(pageGrader.client_ids) ? pageGrader.client_ids : []),
  ]
  return [...new Set(values.map((value) => stringValue(value)).filter(Boolean))]
}

function fathomEventFromSpaceItem(item: Record<string, unknown>): Record<string, unknown> {
  const custom = asRecord(item.custom_data)
  const external = asRecord(custom.external_automation)
  return {
    id: stringValue(external.meeting_id),
    title: item.title,
    created_at: custom.call_date ?? item.created_at,
    url: custom.recording_url ?? custom.fathom_url,
    default_summary: { markdown_formatted: item.description },
  }
}

function contextMapsToClient(
  context: {
    space_id: string
    campaign_id: string | null
    custom_data: Record<string, unknown>
  },
  clientId: string,
  scopeMap: Record<string, PageGraderClientScopeEntry>,
): boolean {
  if (explicitClientIds(context.custom_data).includes(clientId)) return true
  const scope = scopeMap[clientId]
  if (!scope) return false
  return (
    scope.space_id === context.space_id ||
    Boolean(context.campaign_id && scope.campaign_id === context.campaign_id)
  )
}

function dedupeRoutes(routes: MeetingRoute[]): MeetingRoute[] {
  const seen = new Set<string>()
  return routes.filter((route) => {
    const key = `${route.space_id}:${route.item_id}`
    if (!route.space_id || !route.item_id || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function validDate(value: unknown): string {
  const parsed = new Date(stringValue(value) || Date.now())
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function durationMinutes(start: unknown, end: unknown): number | null {
  const startMs = new Date(stringValue(start)).getTime()
  const endMs = new Date(stringValue(end)).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null
  return Math.round((endMs - startMs) / 60_000)
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
