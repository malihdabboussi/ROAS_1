import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleWorkspaceRepository } from '../repositories/google-workspace.repository'
import { OrgPersonCalendarIdentitiesRepository } from '../repositories/org-person-calendar-identities.repository'
import type {
  OrgPersonCalendarIdentity,
  OrgPersonCalendarMatchStatus,
} from '../types/google-workspace.types'

@Injectable()
export class OrgPersonCalendarIdentitiesService {
  constructor(
    private readonly identities: OrgPersonCalendarIdentitiesRepository,
    private readonly workspaceRepo: GoogleWorkspaceRepository,
  ) {}

  list(supabase: SupabaseClient, orgId: string) {
    return this.identities.list(supabase, orgId)
  }

  async createManual(
    supabase: SupabaseClient,
    orgId: string,
    input: { calendar_email: string; display_name?: string | null },
  ) {
    const email = this.identities.normalizeEmail(input.calendar_email)
    if (!email.includes('@')) throw new BadRequestException('calendar_email must be valid')
    const seeded = await this.identities.upsertByEmail(supabase, {
      orgId,
      calendarEmail: email,
      displayName: input.display_name ?? null,
      source: 'manual',
      matchStatus: 'unmatched',
    })
    return this.refreshSuggestions(supabase, orgId, seeded)
  }

  async seedFromOrgSurfaces(supabase: SupabaseClient, orgId: string) {
    const [slackPeople, portalUsers, personalCalendars] = await Promise.all([
      this.workspaceRepo.listSlackPeopleWithEmail(supabase, orgId),
      this.workspaceRepo.listPortalUsersWithEmail(supabase, orgId),
      this.workspaceRepo.listPersonalCalendarLabels(orgId),
    ])

    let upserted = 0
    for (const person of slackPeople) {
      const email = person.email ? this.identities.normalizeEmail(person.email) : ''
      if (!email.includes('@')) continue
      const existing = await this.identities.findByEmail(supabase, orgId, email)
      if (existing?.match_status === 'confirmed') continue
      await this.identities.upsertByEmail(supabase, {
        orgId,
        calendarEmail: email,
        displayName: person.display_name,
        source: existing?.source === 'directory_sync' ? 'directory_sync' : 'slack_email',
        suggestedChannelMemberId: person.id,
        suggestedVibeyUserId: person.vibey_user_id,
        suggestedPersonBrainId: person.person_brain_id,
        matchStatus: 'suggested',
        matchMethod: 'email_exact',
      })
      upserted += 1
    }

    for (const portal of portalUsers) {
      const email = portal.email ? this.identities.normalizeEmail(portal.email) : ''
      if (!email.includes('@')) continue
      const existing = await this.identities.findByEmail(supabase, orgId, email)
      if (existing?.match_status === 'confirmed') continue
      await this.identities.upsertByEmail(supabase, {
        orgId,
        calendarEmail: email,
        displayName: portal.display_name,
        source: existing?.source === 'directory_sync' ? 'directory_sync' : 'portal_email',
        suggestedVibeyUserId: portal.user_id,
        matchStatus: 'suggested',
        matchMethod: 'email_exact',
      })
      upserted += 1
    }

    for (const calendar of personalCalendars) {
      const label = String(calendar.connection_label ?? '').trim()
      const metaEmail = String(calendar.metadata?.email ?? calendar.metadata?.account_email ?? '')
        .trim()
        .toLowerCase()
      const email = metaEmail.includes('@')
        ? metaEmail
        : label.includes('@')
          ? this.identities.normalizeEmail(label)
          : ''
      if (!email.includes('@')) continue
      const existing = await this.identities.findByEmail(supabase, orgId, email)
      if (existing?.match_status === 'confirmed') continue
      await this.identities.upsertByEmail(supabase, {
        orgId,
        calendarEmail: email,
        displayName: existing?.display_name ?? (label || null),
        source: 'personal_calendar',
        personalConnectionLabel: label || null,
        matchStatus: existing?.match_status === 'suggested' ? 'suggested' : 'unmatched',
      })
      upserted += 1
    }

    return { success: true, upserted }
  }

  async confirm(supabase: SupabaseClient, orgId: string, id: string) {
    const row = await this.identities.findById(supabase, orgId, id)
    if (!row) throw new NotFoundException('Calendar identity not found')
    return this.identities.update(supabase, orgId, id, {
      channel_member_id: row.suggested_channel_member_id ?? row.channel_member_id,
      vibey_user_id: row.suggested_vibey_user_id ?? row.vibey_user_id,
      person_brain_id: row.suggested_person_brain_id ?? row.person_brain_id,
      suggested_channel_member_id: null,
      suggested_vibey_user_id: null,
      suggested_person_brain_id: null,
      match_status: 'confirmed',
      match_method: row.match_method ?? 'manual',
    })
  }

  async reject(supabase: SupabaseClient, orgId: string, id: string) {
    const row = await this.identities.findById(supabase, orgId, id)
    if (!row) throw new NotFoundException('Calendar identity not found')
    return this.identities.update(supabase, orgId, id, {
      suggested_channel_member_id: null,
      suggested_vibey_user_id: null,
      suggested_person_brain_id: null,
      match_status: 'rejected',
      match_method: 'manual',
    })
  }

  async linkManual(
    supabase: SupabaseClient,
    orgId: string,
    id: string,
    body: {
      channel_member_id?: string | null
      vibey_user_id?: string | null
      person_brain_id?: string | null
      personal_connection_label?: string | null
    },
  ) {
    const row = await this.identities.findById(supabase, orgId, id)
    if (!row) throw new NotFoundException('Calendar identity not found')
    const nextStatus: OrgPersonCalendarMatchStatus =
      body.channel_member_id || body.vibey_user_id || body.person_brain_id
        ? 'confirmed'
        : row.match_status
    return this.identities.update(supabase, orgId, id, {
      channel_member_id:
        body.channel_member_id === undefined ? row.channel_member_id : body.channel_member_id,
      vibey_user_id: body.vibey_user_id === undefined ? row.vibey_user_id : body.vibey_user_id,
      person_brain_id:
        body.person_brain_id === undefined ? row.person_brain_id : body.person_brain_id,
      personal_connection_label:
        body.personal_connection_label === undefined
          ? row.personal_connection_label
          : body.personal_connection_label,
      suggested_channel_member_id: null,
      suggested_vibey_user_id: null,
      suggested_person_brain_id: null,
      match_status: nextStatus,
      match_method: 'manual',
    })
  }

  async resolveIdentity(
    supabase: SupabaseClient,
    orgId: string,
    query: {
      email?: string
      person_id?: string
      vibey_user_id?: string
      person_brain_id?: string
    },
  ): Promise<OrgPersonCalendarIdentity> {
    if (query.email) {
      const byEmail = await this.identities.findByEmail(supabase, orgId, query.email)
      if (byEmail) return byEmail
    }
    const byRefs = await this.identities.findByPersonRefs(supabase, orgId, {
      channelMemberId: query.person_id,
      vibeyUserId: query.vibey_user_id,
      personBrainId: query.person_brain_id,
    })
    if (byRefs) return byRefs
    throw new NotFoundException('No calendar identity matched the given person refs')
  }

  async refreshSuggestions(
    supabase: SupabaseClient,
    orgId: string,
    identity: OrgPersonCalendarIdentity,
  ): Promise<OrgPersonCalendarIdentity> {
    if (identity.match_status === 'confirmed') return identity
    const email = identity.calendar_email
    const [slackPeople, portalUsers] = await Promise.all([
      this.workspaceRepo.listSlackPeopleWithEmail(supabase, orgId),
      this.workspaceRepo.listPortalUsersWithEmail(supabase, orgId),
    ])
    const slack = slackPeople.find(
      (person) => person.email && this.identities.normalizeEmail(person.email) === email,
    )
    const portal = portalUsers.find(
      (person) => person.email && this.identities.normalizeEmail(person.email) === email,
    )
    if (!slack && !portal) return identity
    return this.identities.update(supabase, orgId, identity.id, {
      suggested_channel_member_id: slack?.id ?? null,
      suggested_vibey_user_id: portal?.user_id ?? slack?.vibey_user_id ?? null,
      suggested_person_brain_id: slack?.person_brain_id ?? null,
      match_status: 'suggested',
      match_method: 'email_exact',
    })
  }
}
