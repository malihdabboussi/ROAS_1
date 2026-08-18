import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { OrgScopeService } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import type {
  AgendaPrepLink,
  AgendaRelatedCall,
} from '../../spaces/services/meetings-precall-prep.helpers'
import { MeetingsPrecallPrepService } from '../../spaces/services/meetings-precall-prep.service'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import {
  filterCalendarRowsOwnedByUser,
  listConnectedCalendarAccounts,
  resolveCalendarConnection,
  toCalendarAccountReceipt,
  type CalendarAccountReceipt,
  type CalendarConnectionRef,
} from './integrations-calendar-connections'
import { dedupeCalendarAgendaEvents } from './integrations-calendar-dedupe'
import { enrichAgendaWithPrecall } from './integrations-calendar-enrichment'
import { fetchGoogleMultiCalendarAgenda } from './integrations-calendar-google-agenda'
import {
  assertCalendarProvider,
  assertOptionalTimedRange,
  assertTimedRange,
  buildGoogleCreateParams,
  buildGoogleDeleteParams,
  buildGoogleUpdateParams,
  buildOutlookCreateParams,
  buildOutlookDeleteParams,
  buildOutlookUpdateParams,
  ensureZSuffix,
  normalizeProviderEventId,
} from './integrations-calendar-mutations'
import {
  parseGoogleEventsListResponse,
  parseMutationEvent,
  parseOutlookListEventsResponse,
} from './integrations-calendar-parse'
import { IntegrationsCalendarTeamService } from './integrations-calendar-team.service'
import { isPersonalCrossContextProvider } from './personal-cross-context-providers'

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
  description?: string | null
  video_url: string | null
  video_label: string | null
  html_link: string | null
  color_id: string | null
  attendees: CalendarAttendee[]
  source: 'google_calendar' | 'outlook' | 'fathom'
  /** Shared across calendars for the same invite (Google iCalUID / Outlook uid). */
  ical_uid?: string | null
  account_id?: string | null
  account_label?: string | null
  prep?: AgendaPrepLink | null
  related?: AgendaRelatedCall | null
}
export type CalendarProvider = 'google_calendar' | 'outlook'
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
  account?: CalendarAccountReceipt
}

@Injectable()
export class IntegrationsCalendarService {
  private readonly logger = new Logger(IntegrationsCalendarService.name)

  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly composio: ComposioService,
    private readonly orgScope: OrgScopeService,
    private readonly teamAgenda: IntegrationsCalendarTeamService,
    @Optional()
    @Inject(forwardRef(() => MeetingsPrecallPrepService))
    private readonly precallPrep?: MeetingsPrecallPrepService,
  ) {}

  async getAgenda(
    supabase: SupabaseClient,
    user: { id: string; email?: string | null },
    scope: RequestScope,
    query: {
      start: string
      end: string
      timezone?: string
      provider?: string
      scope?: 'personal' | 'team'
    },
  ): Promise<{
    success: boolean
    events: CalendarAgendaEvent[]
    connected: { google_calendar: boolean; outlook: boolean }
    accounts: CalendarConnectionRef[]
    team_available: boolean
    error?: string
  }> {
    if (query.scope === 'team') {
      return this.teamAgenda.getTeamAgendaWithMine(supabase, user, scope, query, (q) =>
        this.getAgenda(supabase, user, scope, q),
      )
    }

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
    const outlookAccounts = await this.resolveAllConnections(supabase, user.id, scope, 'outlook')
    const accounts = [...googleAccounts, ...outlookAccounts]

    const connected = {
      google_calendar: googleAccounts.length > 0,
      outlook: outlookAccounts.length > 0,
    }
    const team_available = await this.teamAgenda.isTeamAvailable(scope)

    const events: CalendarAgendaEvent[] = []
    const errors: string[] = []

    const wantGoogle =
      connected.google_calendar && (!providerFilter || providerFilter === 'google_calendar')
    const wantOutlook = connected.outlook && (!providerFilter || providerFilter === 'outlook')

    if (wantGoogle || wantOutlook) {
      const googleJobs = wantGoogle
        ? googleAccounts.map(async (account) => {
            const googleResult = await fetchGoogleMultiCalendarAgenda({
              executeTool: (tool, userId, params, connectionId) =>
                this.composio.executeTool(tool, userId, params, connectionId),
              userId: user.id,
              connectionId: account.composioAccountId,
              start,
              end,
              timezone: tz,
              parseEvents: (raw) => parseGoogleEventsListResponse(raw),
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

      const outlookJobs = wantOutlook
        ? outlookAccounts.map(async (account) => {
            try {
              const startZ = ensureZSuffix(start)
              const endZ = ensureZSuffix(end)
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
              const parsedO = parseOutlookListEventsResponse(raw).map((event) => ({
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
    }

    if (!providerFilter || providerFilter === 'google_calendar') {
      const directoryMine = await this.teamAgenda.getCallerDirectoryAgenda(supabase, user, scope, {
        start,
        end,
        timezone: tz,
      })
      events.push(...directoryMine.events)
      errors.push(...directoryMine.errors)
      accounts.push(...directoryMine.accounts)
      if (directoryMine.events.length > 0 || directoryMine.accounts.length > 0) {
        connected.google_calendar = true
      }
    }

    // Collapse multi-account duplicate invites before prep enrichment.
    let uniqueEvents = dedupeCalendarAgendaEvents(events)
    uniqueEvents.sort((a, b) => a.start.localeCompare(b.start))

    if (this.precallPrep) {
      uniqueEvents = await enrichAgendaWithPrecall({
        precallPrep: this.precallPrep,
        supabase,
        userId: user.id,
        orgId: scope.orgId ?? null,
        events: uniqueEvents,
        start,
        end,
        dedupe: dedupeCalendarAgendaEvents,
        logger: this.logger,
        label: 'Agenda',
      })
      uniqueEvents.sort((a, b) => a.start.localeCompare(b.start))
    }

    if (errors.length > 0 && uniqueEvents.length === 0) {
      return {
        success: false,
        events: [],
        connected,
        accounts,
        team_available,
        error: errors.join('; '),
      }
    }

    return { success: true, events: uniqueEvents, connected, accounts, team_available }
  }

  async createEvent(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    input: CalendarCreateEventInput,
  ): Promise<CalendarEventMutationResponse> {
    const provider = assertCalendarProvider(input.provider)
    assertTimedRange(input.start, input.end)
    const connection = await this.requireConnection(
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
      connection.composioAccountId,
    )

    const event = parseMutationEvent(provider, raw)
    if (event) {
      event.account_id = connection.userIntegrationId
      event.account_label = connection.label
    }
    return {
      success: true,
      event,
      account: toCalendarAccountReceipt(connection),
    }
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
    assertOptionalTimedRange(input)
    const eventId = normalizeProviderEventId(provider, eventIdInput)
    const connection = await this.requireConnection(supabase, user.id, scope, provider)
    const raw = await this.composio.executeTool(
      provider === 'google_calendar'
        ? 'GOOGLECALENDAR_PATCH_EVENT'
        : 'OUTLOOK_UPDATE_CALENDAR_EVENT',
      user.id,
      provider === 'google_calendar'
        ? buildGoogleUpdateParams(eventId, input)
        : buildOutlookUpdateParams(eventId, input),
      connection.composioAccountId,
    )

    return { success: true, event: parseMutationEvent(provider, raw) }
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
    const connection = await this.requireConnection(supabase, user.id, scope, provider)
    await this.composio.executeTool(
      provider === 'google_calendar'
        ? 'GOOGLECALENDAR_DELETE_EVENT'
        : 'OUTLOOK_DELETE_CALENDAR_EVENT',
      user.id,
      provider === 'google_calendar'
        ? buildGoogleDeleteParams(input.calendar_id, eventId)
        : buildOutlookDeleteParams(eventId),
      connection.composioAccountId,
    )

    return { success: true }
  }

  private async requireConnection(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    provider: CalendarProvider,
    userIntegrationId?: string,
  ): Promise<CalendarConnectionRef> {
    const connection = await this.resolveConnection(
      supabase,
      userId,
      scope,
      provider,
      userIntegrationId,
    )
    if (!connection) {
      const message = userIntegrationId
        ? `Selected ${provider} account is not connected`
        : `${provider} is not connected`
      throw new BadRequestException(message)
    }
    return connection
  }

  private async listScopedIntegrationRows(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    integrationId: CalendarProvider,
  ): Promise<Array<Record<string, unknown>>> {
    const q = this.repository
      .table(supabase, 'user_integrations')
      .select('id, user_id, status, metadata, scope_mode, is_default, connection_label')
      .eq('integration_id', integrationId)
    const { data: allRows } = await this.orgScope.applyScope(q, scope)
    const scopedRows = ((allRows ?? []) as Array<Record<string, unknown>>).filter((row) => {
      if (!scope.orgId) return true
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
      return false
    })

    if (scope.orgId && isPersonalCrossContextProvider(integrationId)) {
      const { data: personalRow } = await this.repository
        .table(supabase, 'user_integrations')
        .select('id, user_id, status, metadata, scope_mode, is_default, connection_label')
        .eq('integration_id', integrationId)
        .eq('user_id', userId)
        .is('org_id', null)
        .maybeSingle()
      if (personalRow) {
        const personalId = String((personalRow as Record<string, unknown>).id ?? '')
        const alreadyIncluded = scopedRows.some((row) => String(row.id ?? '') === personalId)
        if (!alreadyIncluded) scopedRows.push(personalRow as Record<string, unknown>)
      }
    }

    return scopedRows
  }

  private async resolveAllConnections(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    integrationId: CalendarProvider,
  ): Promise<CalendarConnectionRef[]> {
    const scopedRows = await this.listScopedIntegrationRows(supabase, userId, scope, integrationId)
    return listConnectedCalendarAccounts(
      filterCalendarRowsOwnedByUser(scopedRows, userId),
      integrationId,
    )
  }

  private async resolveConnection(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    integrationId: CalendarProvider,
    userIntegrationId?: string,
  ): Promise<CalendarConnectionRef | null> {
    const scopedRows = await this.listScopedIntegrationRows(supabase, userId, scope, integrationId)
    return resolveCalendarConnection(
      scopedRows,
      userId,
      scope.orgId,
      integrationId,
      userIntegrationId,
    )
  }
}
