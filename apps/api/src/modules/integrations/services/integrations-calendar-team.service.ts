import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { MeetingsPrecallPrepService } from '../../spaces/services/meetings-precall-prep.service'
import { GoogleWorkspaceApiService } from '../google-workspace/services/google-workspace-api.service'
import { GoogleWorkspaceCalendarService } from '../google-workspace/services/google-workspace-calendar.service'
import type { CalendarConnectionRef } from './integrations-calendar-connections'
import { dedupeTeamAgendaEvents, mergeTeamAgendaWithPersonal } from './integrations-calendar-dedupe'
import type { CalendarAgendaEvent } from './integrations-calendar.service'

@Injectable()
export class IntegrationsCalendarTeamService {
  constructor(
    private readonly workspaceCalendar: GoogleWorkspaceCalendarService,
    private readonly workspaceApi: GoogleWorkspaceApiService,
    @Optional()
    @Inject(forwardRef(() => MeetingsPrecallPrepService))
    private readonly precallPrep?: MeetingsPrecallPrepService,
  ) {}

  isAdmin(scope: RequestScope): boolean {
    return scope.orgRole === 'admin' || scope.orgRole === 'owner'
  }

  async isTeamAvailable(scope: RequestScope): Promise<boolean> {
    if (!scope.orgId || !this.isAdmin(scope)) return false
    const status = await this.workspaceApi.getStatus(scope.orgId)
    return Boolean(status.connected)
  }

  async getTeamAgenda(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    query: {
      start: string
      end: string
      timezone?: string
      limit_people?: number
    },
  ): Promise<{
    success: boolean
    events: CalendarAgendaEvent[]
    connected: { google_calendar: boolean; outlook: boolean }
    accounts: CalendarConnectionRef[]
    team_available: boolean
    error?: string
  }> {
    if (!scope.orgId) {
      throw new BadRequestException('Organization context is required for team agenda')
    }
    if (!this.isAdmin(scope)) {
      throw new ForbiddenException('Only org admins can view the team agenda')
    }

    const start = query.start?.trim()
    const end = query.end?.trim()
    if (!start || !end) {
      throw new BadRequestException('start and end query parameters are required (ISO 8601)')
    }

    const teamAvailable = await this.isTeamAvailable(scope)
    if (!teamAvailable) {
      return {
        success: true,
        events: [],
        // Do not clear personal calendar connected flags in the client when
        // Workspace is simply unavailable for Team scope.
        connected: { google_calendar: false, outlook: false },
        accounts: [],
        team_available: false,
        error: 'Google Workspace is not connected for this organization',
      }
    }

    const upcoming = await this.workspaceCalendar.listOrgUpcoming(supabase, scope, {
      start,
      end,
      timezone: query.timezone,
      limit_people: query.limit_people ?? 40,
    })

    const accounts: CalendarConnectionRef[] = []
    const events: CalendarAgendaEvent[] = []
    const errors: string[] = []

    for (const person of upcoming.people) {
      const label =
        person.identity.display_name?.trim() || person.identity.calendar_email || 'Teammate'
      accounts.push({
        userIntegrationId: person.identity.id,
        composioAccountId: person.identity.calendar_email,
        label,
        isDefault: false,
        provider: 'google_calendar',
      })
      if (person.error) {
        errors.push(`${label}: ${person.error}`)
        continue
      }
      for (const event of person.events) {
        events.push({
          id: `workspace:${person.identity.id}:${event.id}`,
          title: event.title,
          start: event.start,
          end: event.end,
          all_day: event.all_day,
          location: event.location,
          video_url: event.video_url,
          video_label: event.video_url ? 'Meet' : null,
          html_link: event.html_link,
          color_id: null,
          attendees: event.attendees.map((attendee) => ({
            name: attendee.name,
            email: attendee.email,
            status: 'unknown' as const,
          })),
          source: 'google_calendar',
          account_id: person.identity.id,
          account_label: label,
          prep: null,
          related: null,
          ...(event.ical_uid ? { ical_uid: event.ical_uid } : {}),
        } as CalendarAgendaEvent & { ical_uid?: string | null })
      }
    }

    let uniqueEvents = dedupeTeamAgendaEvents(events)

    if (this.precallPrep) {
      try {
        const [prepMap, relatedResult] = await Promise.all([
          uniqueEvents.length > 0
            ? this.precallPrep.enrichAgendaEvents({
                supabase,
                userId: user.id,
                orgId: scope.orgId ?? null,
                events: uniqueEvents,
              })
            : Promise.resolve(new Map()),
          this.precallPrep.enrichAgendaRelatedCalls({
            supabase,
            userId: user.id,
            orgId: scope.orgId ?? null,
            events: uniqueEvents,
            start,
            end,
          }),
        ])
        for (const event of uniqueEvents) {
          event.prep = prepMap.get(event.id) ?? null
          event.related = relatedResult.relatedByEventId.get(event.id) ?? null
        }
        for (const fathomEvent of relatedResult.unmatchedFathomEvents) {
          uniqueEvents.push(fathomEvent as CalendarAgendaEvent)
        }
        // Collapse Fathom-only rows onto nearby teammate calendar invites.
        uniqueEvents = dedupeTeamAgendaEvents(uniqueEvents)
      } catch {
        // Team agenda still works without prep / related / Fathom enrichment.
      }
    }

    if (errors.length > 0 && uniqueEvents.length === 0) {
      return {
        success: false,
        events: [],
        connected: { google_calendar: true, outlook: false },
        accounts,
        team_available: true,
        error: errors.join('; '),
      }
    }

    return {
      success: true,
      events: uniqueEvents,
      connected: { google_calendar: true, outlook: false },
      accounts,
      team_available: true,
    }
  }

  /** Directory teammate calendars + caller's personal Mine calendar, deduped. */
  async getTeamAgendaWithMine(
    supabase: Parameters<IntegrationsCalendarTeamService['getTeamAgenda']>[0],
    user: Parameters<IntegrationsCalendarTeamService['getTeamAgenda']>[1],
    scope: Parameters<IntegrationsCalendarTeamService['getTeamAgenda']>[2],
    query: Parameters<IntegrationsCalendarTeamService['getTeamAgenda']>[3] & {
      scope?: 'personal' | 'team'
      provider?: string
    },
    loadPersonal: (
      query: Parameters<IntegrationsCalendarTeamService['getTeamAgenda']>[3] & {
        scope?: 'personal' | 'team'
        provider?: string
      },
    ) => ReturnType<IntegrationsCalendarTeamService['getTeamAgenda']>,
  ) {
    const team = await this.getTeamAgenda(supabase, user, scope, query)
    if (!team.team_available) return team
    const personal = await loadPersonal({ ...query, scope: 'personal' })
    return mergeTeamAgendaWithPersonal(team, personal)
  }
}
