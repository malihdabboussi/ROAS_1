import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { GoogleWorkspaceGoogleClient } from '../integrations/google-workspace-google.client'
import { OrgPersonCalendarIdentitiesRepository } from '../repositories/org-person-calendar-identities.repository'
import { isWorkspaceDirectoryIdentity } from '../types/google-workspace.types'
import { GoogleWorkspaceApiService } from './google-workspace-api.service'
import { OrgPersonCalendarIdentitiesService } from './org-person-calendar-identities.service'

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

  async listOrgUpcoming(
    _supabase: SupabaseClient,
    scope: RequestScope,
    query: {
      start: string
      end: string
      timezone?: string
      limit_people?: number
    },
  ) {
    if (!scope.orgId) throw new BadRequestException('Organization context is required')
    const start = query.start?.trim()
    const end = query.end?.trim()
    if (!start || !end) throw new BadRequestException('start and end are required')

    const { serviceAccount } = await this.api.loadServiceAccount(scope.orgId)
    // Service client: Team Agenda must see every confirmed Directory identity,
    // not only what the caller's RLS snapshot happens to return. Never DWD-pull
    // Slack-only / manual / external rows.
    const identities = await this.identitiesRepo.serviceList(scope.orgId)
    const eligible = identities
      .filter((row) => row.match_status === 'confirmed' && isWorkspaceDirectoryIdentity(row))
      .slice(0, Math.max(1, Math.min(query.limit_people ?? 40, 50)))

    const people: Array<{
      identity: (typeof identities)[number]
      events: Awaited<ReturnType<typeof this.client.listCalendarEvents>>
      error?: string
    }> = []

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
    people.push(...settled)

    return { success: true, people }
  }
}
