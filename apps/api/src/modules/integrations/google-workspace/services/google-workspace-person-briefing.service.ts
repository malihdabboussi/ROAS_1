import { ForbiddenException, Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { PageGraderApiService } from '../../page-grader/services/page-grader-api.service'
import { GoogleWorkspaceRepository } from '../repositories/google-workspace.repository'
import { GoogleWorkspaceCalendarService } from './google-workspace-calendar.service'
import { OrgPersonCalendarIdentitiesService } from './org-person-calendar-identities.service'

@Injectable()
export class GoogleWorkspacePersonBriefingService {
  constructor(
    private readonly identities: OrgPersonCalendarIdentitiesService,
    private readonly calendar: GoogleWorkspaceCalendarService,
    private readonly workspaceRepo: GoogleWorkspaceRepository,
    @Optional() private readonly pageGrader?: PageGraderApiService,
  ) {}

  async getPersonBriefing(
    supabase: SupabaseClient,
    user: { id: string },
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
    if (!scope.orgId) throw new ForbiddenException('Organization context is required')

    const agenda = await this.calendar.getPersonAgenda(supabase, scope, query)
    const identity = agenda.identity
    const email = identity.calendar_email

    const [meetings, memories, slackPerson, pageGraderClients] = await Promise.all([
      this.workspaceRepo.listRecentMeetingItemsByEmail(scope.orgId, email, 12),
      identity.person_brain_id
        ? this.workspaceRepo.listBrainMemories(identity.person_brain_id, 8)
        : Promise.resolve([]),
      identity.channel_member_id
        ? supabase
            .from('channel_members')
            .select(
              'id, display_name, email, title, relationship_kind, delivery_mode, vibey_user_id, person_brain_id',
            )
            .eq('id', identity.channel_member_id)
            .eq('org_id', scope.orgId)
            .maybeSingle()
            .then((result) => result.data ?? null)
        : Promise.resolve(null),
      this.matchPageGraderClients(user.id, email, identity.display_name),
    ])

    return {
      success: true,
      identity,
      calendar: {
        events: agenda.events,
        window: { start: query.start, end: query.end, timezone: query.timezone ?? null },
      },
      fathom_or_meetings: meetings.map((row) => ({
        id: row.id,
        title: row.title,
        space_id: row.space_id,
        updated_at: row.updated_at,
        custom_data: row.custom_data,
      })),
      slack_person: slackPerson,
      person_brain: identity.person_brain_id
        ? { id: identity.person_brain_id, recent_memories: memories }
        : null,
      page_grader_clients: pageGraderClients,
    }
  }

  private async matchPageGraderClients(
    userId: string,
    email: string,
    displayName: string | null,
  ): Promise<Array<Record<string, unknown>>> {
    if (!this.pageGrader) return []
    try {
      const result = await this.pageGrader.listClients(userId, { limit: 100 })
      const clients = Array.isArray(result?.clients)
        ? result.clients
        : Array.isArray(result)
          ? result
          : []
      const normalized = email.trim().toLowerCase()
      const name = displayName?.trim().toLowerCase() ?? ''
      return (clients as unknown[])
        .filter((client): client is Record<string, unknown> =>
          Boolean(client && typeof client === 'object'),
        )
        .filter((client) => {
          const clientEmail = String(client.email ?? client.client_email ?? '')
            .trim()
            .toLowerCase()
          const clientName = String(client.name ?? client.client_name ?? '')
            .trim()
            .toLowerCase()
          if (clientEmail && clientEmail === normalized) return true
          if (name && clientName && clientName === name) return true
          return false
        })
        .slice(0, 10)
    } catch {
      return []
    }
  }
}
