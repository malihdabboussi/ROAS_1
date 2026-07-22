import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleWorkspaceRepository } from '../repositories/google-workspace.repository'
import { OrgPersonCalendarIdentitiesRepository } from '../repositories/org-person-calendar-identities.repository'
import type {
  OrgPersonCalendarIdentity,
  OrgPersonCalendarMatchStatus,
} from '../types/google-workspace.types'
import { isWorkspaceDirectoryIdentity } from '../types/google-workspace.types'

@Injectable()
export class OrgPersonCalendarIdentitiesService {
  constructor(
    private readonly identities: OrgPersonCalendarIdentitiesRepository,
    private readonly workspaceRepo: GoogleWorkspaceRepository,
  ) {}

  /** Calendars UI / Team Agenda candidates: Workspace Directory only. */
  async list(supabase: SupabaseClient, orgId: string) {
    const rows = await this.identities.list(supabase, orgId)
    return rows.filter(isWorkspaceDirectoryIdentity)
  }

  async createManual(
    supabase: SupabaseClient,
    orgId: string,
    input: { calendar_email: string; display_name?: string | null },
  ) {
    const email = this.identities.normalizeEmail(input.calendar_email)
    if (!email.includes('@')) throw new BadRequestException('calendar_email must be valid')
    const existing = await this.identities.findByEmail(supabase, orgId, email)
    if (!existing || !isWorkspaceDirectoryIdentity(existing)) {
      throw new BadRequestException(
        'Only Google Workspace Directory users can be added to Team calendars. Run Sync Directory first.',
      )
    }
    return this.refreshSuggestions(supabase, orgId, existing)
  }

  /**
   * Link Slack / portal / personal-calendar emails onto existing Workspace Directory
   * identities only. Does not create rows for external Slack contacts.
   */
  async seedFromOrgSurfaces(supabase: SupabaseClient, orgId: string) {
    const pruned = await this.identities.deleteNonDirectorySources(supabase, orgId)
    const [slackPeople, portalUsers, personalCalendars, identities] = await Promise.all([
      this.workspaceRepo.listSlackPeopleWithEmail(supabase, orgId),
      this.workspaceRepo.listPortalUsersWithEmail(supabase, orgId),
      this.workspaceRepo.listPersonalCalendarLabels(orgId),
      this.identities.list(supabase, orgId),
    ])

    const directoryByEmail = new Map(
      identities
        .filter(isWorkspaceDirectoryIdentity)
        .map((row) => [row.calendar_email, row] as const),
    )

    let linked = 0
    for (const person of slackPeople) {
      const email = person.email ? this.identities.normalizeEmail(person.email) : ''
      if (!email.includes('@')) continue
      const existing = directoryByEmail.get(email)
      if (!existing || existing.match_status === 'rejected') continue
      await this.identities.update(supabase, orgId, existing.id, {
        channel_member_id: person.id,
        vibey_user_id: person.vibey_user_id ?? existing.vibey_user_id,
        person_brain_id: person.person_brain_id ?? existing.person_brain_id,
        suggested_channel_member_id: null,
        suggested_vibey_user_id: null,
        suggested_person_brain_id: null,
        match_status: 'confirmed',
        match_method: 'email_exact',
      })
      linked += 1
    }

    for (const portal of portalUsers) {
      const email = portal.email ? this.identities.normalizeEmail(portal.email) : ''
      if (!email.includes('@')) continue
      const existing = directoryByEmail.get(email)
      if (!existing || existing.match_status === 'rejected') continue
      await this.identities.update(supabase, orgId, existing.id, {
        vibey_user_id: portal.user_id,
        suggested_vibey_user_id: null,
        match_status: 'confirmed',
        match_method: 'email_exact',
      })
      linked += 1
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
      const existing = directoryByEmail.get(email)
      if (!existing || existing.match_status === 'rejected') continue
      await this.identities.update(supabase, orgId, existing.id, {
        personal_connection_label: label || null,
        match_status: existing.match_status === 'unmatched' ? 'confirmed' : existing.match_status,
        match_method: existing.match_method ?? 'email_exact',
      })
      linked += 1
    }

    return { success: true, linked, pruned, upserted: linked }
  }

  async confirm(supabase: SupabaseClient, orgId: string, id: string) {
    const row = await this.identities.findById(supabase, orgId, id)
    if (!row) throw new NotFoundException('Calendar identity not found')
    if (!isWorkspaceDirectoryIdentity(row)) {
      throw new BadRequestException(
        'Only Google Workspace Directory users can be approved for Team Agenda',
      )
    }
    const hasSuggestion = Boolean(
      row.suggested_channel_member_id ||
      row.suggested_vibey_user_id ||
      row.suggested_person_brain_id,
    )
    return this.identities.update(supabase, orgId, id, {
      channel_member_id: row.suggested_channel_member_id ?? row.channel_member_id,
      vibey_user_id: row.suggested_vibey_user_id ?? row.vibey_user_id,
      person_brain_id: row.suggested_person_brain_id ?? row.person_brain_id,
      suggested_channel_member_id: null,
      suggested_vibey_user_id: null,
      suggested_person_brain_id: null,
      match_status: 'confirmed',
      match_method: hasSuggestion
        ? (row.match_method ?? 'email_exact')
        : row.match_method === 'email_exact'
          ? 'email_exact'
          : 'manual',
    })
  }

  async reject(supabase: SupabaseClient, orgId: string, id: string) {
    const row = await this.identities.findById(supabase, orgId, id)
    if (!row) throw new NotFoundException('Calendar identity not found')
    if (!isWorkspaceDirectoryIdentity(row)) {
      throw new BadRequestException(
        'Only Google Workspace Directory users appear on Team calendars',
      )
    }
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
    if (identity.match_status === 'confirmed' || identity.match_status === 'rejected') {
      return identity
    }
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

    // Exact email match to Slack and/or portal → auto-confirm (no fuzzy).
    return this.identities.update(supabase, orgId, identity.id, {
      channel_member_id: slack?.id ?? identity.channel_member_id,
      vibey_user_id: portal?.user_id ?? slack?.vibey_user_id ?? identity.vibey_user_id,
      person_brain_id: slack?.person_brain_id ?? identity.person_brain_id,
      suggested_channel_member_id: null,
      suggested_vibey_user_id: null,
      suggested_person_brain_id: null,
      match_status: 'confirmed',
      match_method: 'email_exact',
    })
  }
}
