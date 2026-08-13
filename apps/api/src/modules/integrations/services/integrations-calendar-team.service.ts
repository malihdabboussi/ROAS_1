import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { MeetingsPrecallPrepService } from '../../spaces/services/meetings-precall-prep.service'
import { GoogleWorkspaceApiService } from '../google-workspace/services/google-workspace-api.service'
import { GoogleWorkspaceCalendarService } from '../google-workspace/services/google-workspace-calendar.service'
import type { CalendarConnectionRef } from './integrations-calendar-connections'
import {
  dedupeTeamAgendaEvents,
  mergeTeamAgendaWithPersonal,
  type TeamAgendaCoverage,
  type TeamAgendaPayload,
} from './integrations-calendar-dedupe'
import { enrichAgendaWithPrecall } from './integrations-calendar-enrichment'
import type { CalendarAgendaEvent } from './integrations-calendar.service'

@Injectable()
export class IntegrationsCalendarTeamService {
  private readonly logger = new Logger(IntegrationsCalendarTeamService.name)

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
  ): Promise<TeamAgendaPayload> {
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
    const errorLines: string[] = []
    const included: TeamAgendaCoverage['included'] = []
    const errors: TeamAgendaCoverage['errors'] = []

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
      included.push({
        identity_id: person.identity.id,
        email: person.identity.calendar_email,
        display_name: person.identity.display_name,
        match_status: person.identity.match_status,
        event_count: person.error ? 0 : person.events.length,
        ...(person.error ? { error: person.error } : {}),
      })
      if (person.error) {
        errorLines.push(`${label}: ${person.error}`)
        errors.push({
          identity_id: person.identity.id,
          email: person.identity.calendar_email,
          display_name: person.identity.display_name,
          error: person.error,
        })
        continue
      }
      for (const event of person.events) {
        const videoUrl = event.video_url
        let videoLabel: string | null = null
        if (videoUrl) {
          if (videoUrl.includes('zoom.us')) videoLabel = 'Zoom'
          else if (videoUrl.includes('teams.microsoft')) videoLabel = 'Teams'
          else if (videoUrl.includes('meet.google')) videoLabel = 'Google Meet'
          else videoLabel = 'Meet'
        }
        events.push({
          id: `workspace:${person.identity.id}:${event.id}`,
          title: event.title,
          start: event.start,
          end: event.end,
          all_day: event.all_day,
          location: event.location,
          description: event.description,
          video_url: videoUrl,
          video_label: videoLabel,
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

    const skipped = (upcoming.coverage?.skipped ?? []).map((row) => ({
      identity_id: row.identity.id,
      email: row.identity.calendar_email,
      display_name: row.identity.display_name,
      match_status: row.identity.match_status,
      reason: row.reason,
    }))
    const team_coverage: TeamAgendaCoverage = {
      included,
      skipped,
      errors,
      totals: {
        directory: upcoming.coverage?.directory_count ?? included.length + skipped.length,
        pulled: upcoming.coverage?.pulled_count ?? included.length,
        rejected: skipped.filter((row) => row.reason === 'rejected').length,
        capped: skipped.filter((row) => row.reason === 'capped').length,
        failed: errors.length,
      },
    }

    let uniqueEvents = dedupeTeamAgendaEvents(events)

    if (this.precallPrep) {
      // Re-dedupe collapses Fathom-only rows onto nearby teammate calendar invites.
      uniqueEvents = await enrichAgendaWithPrecall({
        precallPrep: this.precallPrep,
        supabase,
        userId: user.id,
        orgId: scope.orgId ?? null,
        events: uniqueEvents,
        start,
        end,
        dedupe: dedupeTeamAgendaEvents,
        logger: this.logger,
        label: 'Team agenda',
      })
    }

    if (errorLines.length > 0 && uniqueEvents.length === 0) {
      return {
        success: false,
        events: [],
        connected: { google_calendar: true, outlook: false },
        accounts,
        team_available: true,
        team_coverage,
        error: errorLines.join('; '),
      }
    }

    return {
      success: true,
      events: uniqueEvents,
      connected: { google_calendar: true, outlook: false },
      accounts,
      team_available: true,
      team_coverage,
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
