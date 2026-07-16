import { BadRequestException, forwardRef, Inject, Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { OrgScopeService } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import { MeetingsPrecallPrepService } from '../../spaces/services/meetings-precall-prep.service'
import type {
  AgendaPrepLink,
  AgendaRelatedCall,
} from '../../spaces/services/meetings-precall-prep.helpers'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import {
  assertCalendarProvider,
  assertTimedRange,
  buildGoogleCreateParams,
  buildGoogleDeleteParams,
  buildGoogleUpdateParams,
  buildOutlookCreateParams,
  buildOutlookDeleteParams,
  buildOutlookUpdateParams,
  isTimedDateTime,
  normalizeProviderEventId,
} from './integrations-calendar-mutations'
import {
  listConnectedCalendarAccounts,
  pickBestCalendarConnectionRow,
  type CalendarConnectionRef,
} from './integrations-calendar-connections'
import { fetchGoogleMultiCalendarAgenda } from './integrations-calendar-google-agenda'

export type CalendarAttendee = {
  name: string | null
  email: string
  status: 'accepted' | 'declined' | 'tentative' | 'needsAction' | 'unknown'
}

export type CalendarAgendaEvent = {
  id: string
  title: string
  start: string
  end: string
  all_day: boolean
  location: string | null
  video_url: string | null
  video_label: string | null
  html_link: string | null
  color_id: string | null
  attendees: CalendarAttendee[]
  source: 'google_calendar' | 'outlook'
  account_id?: string | null
  account_label?: string | null
  prep?: AgendaPrepLink | null
  related?: AgendaRelatedCall | null
}

export type CalendarProvider = CalendarAgendaEvent['source']
export type CalendarEventAttendeeInput = {
  email: string
  name?: string
  optional?: boolean
}
export type CalendarCreateEventInput = {
  provider: CalendarProvider
  title: string
  start: string
  end: string
  timezone?: string
  description?: string | null
  location?: string | null
  attendees?: CalendarEventAttendeeInput[]
  calendar_id?: string
  create_video_meeting?: boolean
  user_integration_id?: string
}

export type CalendarUpdateEventInput = {
  title?: string
  start?: string
  end?: string
  timezone?: string
  description?: string | null
  location?: string | null
  attendees?: CalendarEventAttendeeInput[]
  calendar_id?: string
  create_video_meeting?: boolean
}

export type CalendarDeleteEventInput = {
  calendar_id?: string
}

export type CalendarEventMutationResponse = {
  success: boolean
  event?: CalendarAgendaEvent | null
}

@Injectable()
export class IntegrationsCalendarService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly composio: ComposioService,
    private readonly orgScope: OrgScopeService,
    @Optional()
    @Inject(forwardRef(() => MeetingsPrecallPrepService))
    private readonly precallPrep?: MeetingsPrecallPrepService,
  ) {}

  async getAgenda(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    query: {
      start: string
      end: string
      timezone?: string
      provider?: string
    },
  ): Promise<{
    success: boolean
    events: CalendarAgendaEvent[]
    connected: { google_calendar: boolean; outlook: boolean }
    accounts: CalendarConnectionRef[]
    error?: string
  }> {
    const start = query.start?.trim()
    const end = query.end?.trim()
    if (!start || !end) {
      throw new BadRequestException('start and end query parameters are required (ISO 8601)')
    }
    const tz = query.timezone?.trim() || 'UTC'
    const providerRaw = query.provider?.trim().toLowerCase()
    const providerFilter =
      providerRaw === 'google_calendar' || providerRaw === 'outlook' ? providerRaw : null

    const googleAccounts = await this.resolveAllConnections(
      supabase,
      user.id,
      scope,
      'google_calendar',
    )
    const outlookAccounts = await this.resolveAllConnections(
      supabase,
      user.id,
      scope,
      'outlook',
    )
    const accounts = [...googleAccounts, ...outlookAccounts]

    const connected = {
      google_calendar: googleAccounts.length > 0,
      outlook: outlookAccounts.length > 0,
    }

    if (!connected.google_calendar && !connected.outlook) {
      return { success: true, events: [], connected, accounts }
    }

    const events: CalendarAgendaEvent[] = []
    const errors: string[] = []

    const wantGoogle =
      connected.google_calendar && (!providerFilter || providerFilter === 'google_calendar')
    const wantOutlook = connected.outlook && (!providerFilter || providerFilter === 'outlook')

    const googleJobs =
      wantGoogle
        ? googleAccounts.map(async (account) => {
            const googleResult = await fetchGoogleMultiCalendarAgenda({
              executeTool: (tool, userId, params, connectionId) =>
                this.composio.executeTool(tool, userId, params, connectionId),
              userId: user.id,
              connectionId: account.composioAccountId,
              start,
              end,
              timezone: tz,
              parseEvents: (raw) => this.parseGoogleEventsListResponse(raw),
            })
            return {
              events: (googleResult.events as CalendarAgendaEvent[]).map((event) => ({
                ...event,
                account_id: account.userIntegrationId,
                account_label: account.label,
              })),
              errors: googleResult.errors.map((message) => `${account.label}: ${message}`),
            }
          })
        : []

    const outlookJobs =
      wantOutlook
        ? outlookAccounts.map(async (account) => {
            try {
              const startZ = this.ensureZSuffix(start)
              const endZ = this.ensureZSuffix(end)
              const raw = await this.composio.executeTool(
                'OUTLOOK_LIST_EVENTS',
                user.id,
                {
                  user_id: 'me',
                  timezone: tz,
                  filter: `start/dateTime ge '${startZ}' and start/dateTime le '${endZ}'`,
                  orderby: ['start/dateTime asc'],
                  top: 100,
                  expand_recurring_events: true,
                },
                account.composioAccountId,
              )
              const parsedO = this.parseOutlookListEventsResponse(raw).map((event) => ({
                ...event,
                account_id: account.userIntegrationId,
                account_label: account.label,
              }))
              return { events: parsedO, errors: [] as string[] }
            } catch (e) {
              return {
                events: [] as CalendarAgendaEvent[],
                errors: [
                  e instanceof Error
                    ? `${account.label}: ${e.message}`
                    : `${account.label}: Outlook fetch failed`,
                ],
              }
            }
          })
        : []

    const settled = await Promise.all([...googleJobs, ...outlookJobs])
    for (const result of settled) {
      events.push(...result.events)
      errors.push(...result.errors)
    }

    events.sort((a, b) => a.start.localeCompare(b.start))

    if (this.precallPrep && events.length > 0) {
      try {
        const [prepMap, relatedMap] = await Promise.all([
          this.precallPrep.enrichAgendaEvents({
            supabase,
            userId: user.id,
            orgId: scope.orgId,
            events,
          }),
          this.precallPrep.enrichAgendaRelatedCalls({
            supabase,
            userId: user.id,
            orgId: scope.orgId,
            events,
          }),
        ])
        for (const event of events) {
          event.prep = prepMap.get(event.id) ?? null
          event.related = relatedMap.get(event.id) ?? null
        }
      } catch {
        // Agenda still works without prep / related enrichment.
      }
    }

    if (errors.length > 0 && events.length === 0) {
      return { success: false, events: [], connected, accounts, error: errors.join('; ') }
    }

    return { success: true, events, connected, accounts }
  }

  async createEvent(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    input: CalendarCreateEventInput,
  ): Promise<CalendarEventMutationResponse> {
    const provider = assertCalendarProvider(input.provider)
    assertTimedRange(input.start, input.end)
    const connectionId = await this.requireConnection(
      supabase,
      user.id,
      scope,
      provider,
      input.user_integration_id,
    )
    const raw = await this.composio.executeTool(
      provider === 'google_calendar' ? 'GOOGLECALENDAR_CREATE_EVENT' : 'OUTLOOK_CREATE_ME_EVENT',
      user.id,
      provider === 'google_calendar'
        ? buildGoogleCreateParams(input)
        : buildOutlookCreateParams(input),
      connectionId,
    )

    return { success: true, event: this.parseMutationEvent(provider, raw) }
  }

  async updateEvent(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    providerInput: string,
    eventIdInput: string,
    input: CalendarUpdateEventInput,
  ): Promise<CalendarEventMutationResponse> {
    const provider = assertCalendarProvider(providerInput)
    if (input.start && input.end) assertTimedRange(input.start, input.end)
    if (input.start && !isTimedDateTime(input.start)) {
      throw new BadRequestException('start must be a timed ISO 8601 datetime')
    }
    if (input.end && !isTimedDateTime(input.end)) {
      throw new BadRequestException('end must be a timed ISO 8601 datetime')
    }
    const eventId = normalizeProviderEventId(provider, eventIdInput)
    const connectionId = await this.requireConnection(supabase, user.id, scope, provider)
    const raw = await this.composio.executeTool(
      provider === 'google_calendar'
        ? 'GOOGLECALENDAR_PATCH_EVENT'
        : 'OUTLOOK_UPDATE_CALENDAR_EVENT',
      user.id,
      provider === 'google_calendar'
        ? buildGoogleUpdateParams(eventId, input)
        : buildOutlookUpdateParams(eventId, input),
      connectionId,
    )

    return { success: true, event: this.parseMutationEvent(provider, raw) }
  }

  async deleteEvent(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    providerInput: string,
    eventIdInput: string,
    input: CalendarDeleteEventInput,
  ): Promise<CalendarEventMutationResponse> {
    const provider = assertCalendarProvider(providerInput)
    const eventId = normalizeProviderEventId(provider, eventIdInput)
    const connectionId = await this.requireConnection(supabase, user.id, scope, provider)
    await this.composio.executeTool(
      provider === 'google_calendar'
        ? 'GOOGLECALENDAR_DELETE_EVENT'
        : 'OUTLOOK_DELETE_CALENDAR_EVENT',
      user.id,
      provider === 'google_calendar'
        ? buildGoogleDeleteParams(input.calendar_id, eventId)
        : buildOutlookDeleteParams(eventId),
      connectionId,
    )

    return { success: true }
  }

  private ensureZSuffix(iso: string): string {
    if (/[zZ]$/.test(iso)) return iso
    if (/[+-]\d{2}:\d{2}$/.test(iso)) {
      const d = new Date(iso)
      if (!Number.isNaN(d.getTime())) return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
    }
    return `${iso.endsWith('Z') ? iso.slice(0, -1) : iso}Z`
  }

  private async requireConnection(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    provider: CalendarProvider,
    userIntegrationId?: string,
  ): Promise<string> {
    const connectionId = await this.resolveConnection(
      supabase,
      userId,
      scope,
      provider,
      userIntegrationId,
    )
    if (!connectionId) {
      throw new BadRequestException(`${provider} is not connected`)
    }
    return connectionId
  }

  private parseMutationEvent(
    provider: CalendarProvider,
    raw: unknown,
  ): CalendarAgendaEvent | null {
    try {
      const payload = this.unwrapComposioPayload(raw)
      const record = this.asRecord(payload)
      if (!record) return null
      const parsed =
        provider === 'google_calendar'
          ? this.parseGoogleEventsListResponse({ items: [record] })
          : this.parseOutlookListEventsResponse({ value: [record] })
      return parsed[0] ?? null
    } catch {
      return null
    }
  }

  private async listScopedIntegrationRows(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    integrationId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const q = this.repository
      .table(supabase, 'user_integrations')
      .select('id, user_id, status, metadata, scope_mode, is_default, connection_label')
      .eq('integration_id', integrationId)
    const { data: allRows } = await this.orgScope.applyScope(q, scope)
    return ((allRows ?? []) as Array<Record<string, unknown>>).filter((row) => {
      if (!scope.orgId) return true
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
      return false
    })
  }

  private async resolveAllConnections(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    integrationId: CalendarProvider,
  ): Promise<CalendarConnectionRef[]> {
    const scopedRows = await this.listScopedIntegrationRows(
      supabase,
      userId,
      scope,
      integrationId,
    )
    return listConnectedCalendarAccounts(scopedRows, integrationId)
  }

  private async resolveConnection(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    integrationId: string,
    userIntegrationId?: string,
  ): Promise<string | null> {
    const scopedRows = await this.listScopedIntegrationRows(
      supabase,
      userId,
      scope,
      integrationId,
    )
    const preferredId = String(userIntegrationId ?? '').trim()
    const preferred = preferredId
      ? scopedRows.find((row) => String(row.id ?? '') === preferredId)
      : null
    const row =
      preferred && String(preferred.status ?? '').toLowerCase() === 'connected'
        ? preferred
        : pickBestCalendarConnectionRow(scopedRows, userId, scope.orgId)
    if (!row || String(row.status ?? '').toLowerCase() !== 'connected') return null
    const meta =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {}
    const id =
      typeof meta.composio_connected_account_id === 'string'
        ? meta.composio_connected_account_id.trim()
        : ''
    return id.length > 0 ? id : null
  }

  private parseGoogleEventsListResponse(raw: unknown): CalendarAgendaEvent[] {
    const unwrapped = this.unwrapComposioPayload(raw)
    const rec = this.asRecord(unwrapped)
    if (!rec) return []
    const items = this.asArray(rec.items) ?? this.asArray(rec.events)
    if (!items) return []

    const out: CalendarAgendaEvent[] = []
    for (const item of items) {
      const ev = this.asRecord(item)
      if (!ev) continue
      const id = typeof ev.id === 'string' ? ev.id : JSON.stringify(ev.id ?? Math.random())
      const title = typeof ev.summary === 'string' ? ev.summary : '(No title)'
      const colorId = typeof ev.colorId === 'string' ? ev.colorId : null

      const startObj = this.asRecord(ev.start)
      const endObj = this.asRecord(ev.end)
      if (!startObj || !endObj) continue

      const startDate = typeof startObj.date === 'string' ? startObj.date : null
      const endDate = typeof endObj.date === 'string' ? endObj.date : null
      const startDt = typeof startObj.dateTime === 'string' ? startObj.dateTime : null
      const endDt = typeof endObj.dateTime === 'string' ? endObj.dateTime : null

      let startIso: string
      let endIso: string
      let allDay = false
      if (startDate && endDate) {
        allDay = true
        startIso = `${startDate}T00:00:00.000Z`
        endIso = `${endDate}T00:00:00.000Z`
      } else if (startDt && endDt) {
        startIso = startDt
        endIso = endDt
      } else {
        continue
      }

      const hangout = typeof ev.hangoutLink === 'string' ? ev.hangoutLink : null
      const conf = this.asRecord(ev.conferenceData)
      const confSolution = conf ? this.asRecord(conf.conferenceSolution) : null
      const entryPoints = conf ? this.asArray(conf.entryPoints) : null
      let videoUrl = hangout
      let videoLabel: string | null = null
      if (!videoUrl && entryPoints) {
        for (const ep of entryPoints) {
          const epr = this.asRecord(ep)
          if (epr && typeof epr.uri === 'string' && String(epr.entryPointType ?? '') === 'video') {
            videoUrl = epr.uri
            break
          }
        }
      }
      if (!videoUrl) {
        const loc = typeof ev.location === 'string' ? ev.location : ''
        const desc = typeof ev.description === 'string' ? ev.description : ''
        const urlMatch = (loc + ' ' + desc).match(
          /https?:\/\/[^\s<>"]+(?:zoom\.us|teams\.microsoft\.com|meet\.google\.com)[^\s<>"]+/i,
        )
        if (urlMatch) videoUrl = urlMatch[0]
      }
      if (videoUrl) {
        if (confSolution && typeof confSolution.name === 'string') {
          videoLabel = confSolution.name
        } else if (videoUrl.includes('zoom.us')) {
          videoLabel = 'Zoom'
        } else if (videoUrl.includes('teams.microsoft')) {
          videoLabel = 'Teams'
        } else if (videoUrl.includes('meet.google')) {
          videoLabel = 'Google Meet'
        }
      }
      const htmlLink = typeof ev.htmlLink === 'string' ? ev.htmlLink : null

      const attendees: CalendarAttendee[] = []
      const rawAttendees = this.asArray(ev.attendees)
      if (rawAttendees) {
        for (const a of rawAttendees) {
          const ar = this.asRecord(a)
          if (!ar) continue
          const email = typeof ar.email === 'string' ? ar.email : null
          if (!email) continue
          const name = typeof ar.displayName === 'string' ? ar.displayName : null
          const rs = String(ar.responseStatus ?? '').toLowerCase()
          const status: CalendarAttendee['status'] =
            rs === 'accepted'
              ? 'accepted'
              : rs === 'declined'
                ? 'declined'
                : rs === 'tentative'
                  ? 'tentative'
                  : rs === 'needsaction'
                    ? 'needsAction'
                    : 'unknown'
          attendees.push({ name, email, status })
        }
      }

      const locationRaw = typeof ev.location === 'string' ? ev.location.trim() : ''
      out.push({
        id: `google:${id}`,
        title,
        start: startIso,
        end: endIso,
        all_day: allDay,
        location: locationRaw || null,
        video_url: videoUrl,
        video_label: videoLabel,
        html_link: htmlLink,
        color_id: colorId,
        attendees,
        source: 'google_calendar',
      })
    }
    return out
  }

  private parseOutlookListEventsResponse(raw: unknown): CalendarAgendaEvent[] {
    const unwrapped = this.unwrapComposioPayload(raw)
    const rec = this.asRecord(unwrapped)
    if (!rec) return []
    const value =
      this.asArray(rec.value) ?? (Array.isArray(unwrapped) ? (unwrapped as unknown[]) : null)
    if (!value) return []

    const out: CalendarAgendaEvent[] = []
    for (const item of value) {
      const ev = this.asRecord(item)
      if (!ev) continue
      if (ev.isCancelled === true) continue
      const id = typeof ev.id === 'string' ? ev.id : JSON.stringify(ev.id ?? Math.random())
      const title = typeof ev.subject === 'string' ? ev.subject : '(No title)'
      const startWrap = this.asRecord(ev.start)
      const endWrap = this.asRecord(ev.end)
      const startRaw =
        startWrap && typeof startWrap.dateTime === 'string' ? startWrap.dateTime : null
      const endRaw = endWrap && typeof endWrap.dateTime === 'string' ? endWrap.dateTime : null
      if (!startRaw || !endRaw) continue
      const allDay = ev.isAllDay === true
      const om = this.asRecord(ev.onlineMeeting)
      const videoUrl =
        (typeof ev.onlineMeetingUrl === 'string' ? ev.onlineMeetingUrl : null) ??
        (om && typeof om.joinUrl === 'string' ? om.joinUrl : null)
      let videoLabel: string | null = null
      if (videoUrl) {
        const provider =
          typeof ev.onlineMeetingProvider === 'string' ? ev.onlineMeetingProvider : ''
        if (provider === 'teamsForBusiness' || provider === 'skypeForBusiness') videoLabel = 'Teams'
        else if (videoUrl.includes('zoom.us')) videoLabel = 'Zoom'
        else if (videoUrl.includes('meet.google')) videoLabel = 'Google Meet'
        else if (provider) videoLabel = provider
      }
      const htmlLink = typeof ev.webLink === 'string' ? ev.webLink : null

      const cats = this.asArray(ev.categories)
      const colorId = cats && cats.length > 0 && typeof cats[0] === 'string' ? cats[0] : null

      const attendees: CalendarAttendee[] = []
      const rawAttendees = this.asArray(ev.attendees)
      if (rawAttendees) {
        for (const a of rawAttendees) {
          const ar = this.asRecord(a)
          if (!ar) continue
          const ea = this.asRecord(ar.emailAddress)
          const email = ea && typeof ea.address === 'string' ? ea.address : null
          if (!email) continue
          const name = ea && typeof ea.name === 'string' ? ea.name : null
          const statusObj = this.asRecord(ar.status)
          const rs = statusObj ? String(statusObj.response ?? '').toLowerCase() : ''
          const status: CalendarAttendee['status'] =
            rs === 'accepted'
              ? 'accepted'
              : rs === 'declined'
                ? 'declined'
                : rs === 'tentativelyaccepted' || rs === 'tentative'
                  ? 'tentative'
                  : rs === 'none' || rs === 'notresponded'
                    ? 'needsAction'
                    : 'unknown'
          attendees.push({ name, email, status })
        }
      }

      const locWrap = this.asRecord(ev.location)
      const locationRaw =
        locWrap && typeof locWrap.displayName === 'string'
          ? locWrap.displayName.trim()
          : typeof ev.location === 'string'
            ? ev.location.trim()
            : ''
      out.push({
        id: `outlook:${id}`,
        title,
        start: startRaw,
        end: endRaw,
        all_day: allDay,
        location: locationRaw || null,
        video_url: videoUrl,
        video_label: videoLabel,
        html_link: htmlLink,
        color_id: colorId,
        attendees,
        source: 'outlook',
      })
    }
    return out
  }

  private unwrapComposioPayload(value: unknown): unknown {
    let current: unknown = value
    for (let i = 0; i < 4; i += 1) {
      const record = this.asRecord(current)
      if (!record) break
      if (typeof record.error === 'string' && record.error.length > 0) {
        throw new BadRequestException(record.error)
      }
      if (record.successful === false) {
        throw new BadRequestException(
          typeof record.error === 'string' ? record.error : 'Composio tool execution failed',
        )
      }
      if ('data' in record && record.data !== undefined && record.data !== null) {
        current = record.data
        continue
      }
      break
    }
    return current
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  }

  private asArray(value: unknown): unknown[] | null {
    return Array.isArray(value) ? value : null
  }
}
