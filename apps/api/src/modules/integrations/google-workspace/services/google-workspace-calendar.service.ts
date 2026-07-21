import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { GoogleWorkspaceGoogleClient } from '../integrations/google-workspace-google.client'
import { OrgPersonCalendarIdentitiesRepository } from '../repositories/org-person-calendar-identities.repository'
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
    supabase: SupabaseClient,
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
    const identities = await this.identitiesRepo.list(supabase, scope.orgId)
    const eligible = identities
      .filter((row) => row.match_status === 'confirmed' || row.source === 'directory_sync')
      .slice(0, Math.max(1, Math.min(query.limit_people ?? 25, 50)))

    const people: Array<{
      identity: (typeof identities)[number]
      events: Awaited<ReturnType<typeof this.client.listCalendarEvents>>
      error?: string
    }> = []

    for (const identity of eligible) {
      try {
        const events = await this.client.listCalendarEvents({
          serviceAccount,
          calendarEmail: identity.calendar_email,
          start,
          end,
          timezone: query.timezone,
        })
        people.push({ identity, events })
      } catch (error) {
        people.push({
          identity,
          events: [],
          error: error instanceof Error ? error.message : 'Failed to load agenda',
        })
      }
    }

    return { success: true, people }
  }
}
