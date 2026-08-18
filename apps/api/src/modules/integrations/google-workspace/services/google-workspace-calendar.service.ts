import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { GoogleWorkspaceGoogleClient } from '../integrations/google-workspace-google.client'
import { OrgPersonCalendarIdentitiesRepository } from '../repositories/org-person-calendar-identities.repository'
import { isWorkspaceDirectoryIdentity } from '../types/google-workspace.types'
import { GoogleWorkspaceApiService } from './google-workspace-api.service'
import {
  selectCallerDirectoryIdentity,
  selectDirectoryIdentitiesForTeamPull,
} from './google-workspace-calendar-pull'
import { OrgPersonCalendarIdentitiesService } from './org-person-calendar-identities.service'

export type OrgUpcomingCoverageSkip = {
  identity: {
    id: string
    calendar_email: string
    display_name: string | null
    match_status: string
  }
  reason: 'rejected' | 'capped'
}

@Injectable()
export class GoogleWorkspaceCalendarService {
  constructor(
    private readonly api: GoogleWorkspaceApiService,
    private readonly client: GoogleWorkspaceGoogleClient,
    private readonly identities: OrgPersonCalendarIdentitiesService,
    private readonly identitiesRepo: OrgPersonCalendarIdentitiesRepository,
  ) {}

  async getPersonAgenda(
    supabase: SupabaseClient,
    scope: RequestScope,
    query: {
      start: string
      end: string
      timezone?: string
      email?: string
      person_id?: string
      vibey_user_id?: string
      person_brain_id?: string
    },
  ) {
    if (!scope.orgId) throw new BadRequestException('Organization context is required')
    const start = query.start?.trim()
    const end = query.end?.trim()
    if (!start || !end) throw new BadRequestException('start and end are required')

    const identity = await this.identities.resolveIdentity(supabase, scope.orgId, query)
    if (!isWorkspaceDirectoryIdentity(identity)) {
      throw new BadRequestException('Calendar identity is not a Google Workspace Directory user')
    }
    const { serviceAccount } = await this.api.loadServiceAccount(scope.orgId)
    const events = await this.client.listCalendarEvents({
      serviceAccount,
      calendarEmail: identity.calendar_email,
      start,
      end,
      timezone: query.timezone,
    })
    return {
      success: true,
      identity,
      events,
    }
  }

  /**
   * Caller's Workspace Directory calendar for Mine. Login Gmail is not used first:
   * Dylan's portal email is often personal while the mailbox is dylan@roas.co.
   */
  async getCallerAgenda(
    _supabase: SupabaseClient,
    scope: RequestScope,
    query: {
      start: string
      end: string
      timezone?: string
      email?: string
      vibey_user_id?: string
    },
  ) {
    if (!scope.orgId) throw new BadRequestException('Organization context is required')
    const start = query.start?.trim()
    const end = query.end?.trim()
    if (!start || !end) throw new BadRequestException('start and end are required')

    const identities = await this.identitiesRepo.serviceList(scope.orgId)
    const eligible = identities
      .filter(isWorkspaceDirectoryIdentity)
      .filter((row) => row.match_status !== 'rejected')
    const identity = selectCallerDirectoryIdentity(eligible, {
      vibeyUserId: query.vibey_user_id,
      email: query.email,
    })
    if (!identity) {
      return { success: true as const, identity: null, events: [] }
    }

    const { serviceAccount } = await this.api.loadServiceAccount(scope.orgId)
    const events = await this.client.listCalendarEvents({
      serviceAccount,
      calendarEmail: identity.calendar_email,
      start,
      end,
      timezone: query.timezone,
    })
    return { success: true as const, identity, events }
  }

  async listOrgUpcoming(
    _supabase: SupabaseClient,
    scope: RequestScope,
    query: {
      start: string
      end: string
      timezone?: string
      limit_people?: number
      prefer_vibey_user_id?: string
    },
  ) {
    if (!scope.orgId) throw new BadRequestException('Organization context is required')
    const start = query.start?.trim()
    const end = query.end?.trim()
    if (!start || !end) throw new BadRequestException('start and end are required')

    const { serviceAccount } = await this.api.loadServiceAccount(scope.orgId)
    // Service client: Team Agenda must see every Directory identity that is not
    // rejected — person-link match_status must not gate DWD calendar pulls.
    // Never DWD-pull Slack-only / manual / external rows.
    const identities = await this.identitiesRepo.serviceList(scope.orgId)
    const directory = identities.filter(isWorkspaceDirectoryIdentity)
    const rejected = directory.filter((row) => row.match_status === 'rejected')
    const eligibleAll = directory.filter((row) => row.match_status !== 'rejected')
    const limit = Math.max(1, Math.min(query.limit_people ?? 40, 50))
    const { pulled: eligible, capped } = selectDirectoryIdentitiesForTeamPull(
      eligibleAll,
      limit,
      query.prefer_vibey_user_id,
    )

    const settled = await Promise.all(
      eligible.map(async (identity) => {
        try {
          const events = await this.client.listCalendarEvents({
            serviceAccount,
            calendarEmail: identity.calendar_email,
            start,
            end,
            timezone: query.timezone,
          })
          return { identity, events }
        } catch (error) {
          return {
            identity,
            events: [] as Awaited<ReturnType<typeof this.client.listCalendarEvents>>,
            error: error instanceof Error ? error.message : 'Failed to load agenda',
          }
        }
      }),
    )

    const skipped: OrgUpcomingCoverageSkip[] = [
      ...rejected.map((identity) => ({
        identity: {
          id: identity.id,
          calendar_email: identity.calendar_email,
          display_name: identity.display_name,
          match_status: identity.match_status,
        },
        reason: 'rejected' as const,
      })),
      ...capped.map((identity) => ({
        identity: {
          id: identity.id,
          calendar_email: identity.calendar_email,
          display_name: identity.display_name,
          match_status: identity.match_status,
        },
        reason: 'capped' as const,
      })),
    ]

    return {
      success: true,
      people: settled,
      coverage: {
        limit_people: limit,
        directory_count: directory.length,
        pulled_count: eligible.length,
        skipped,
      },
    }
  }
}
