import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type {
  OrgPersonCalendarIdentity,
  OrgPersonCalendarMatchStatus,
  OrgPersonCalendarSource,
} from '../types/google-workspace.types'

const IDENTITY_SELECT =
  'id, org_id, calendar_email, display_name, google_workspace_user_id, channel_member_id, vibey_user_id, person_brain_id, suggested_channel_member_id, suggested_vibey_user_id, suggested_person_brain_id, match_status, match_method, personal_connection_label, source, metadata, last_synced_at, created_at, updated_at'

export type UpsertIdentityInput = {
  orgId: string
  calendarEmail: string
  displayName?: string | null
  googleWorkspaceUserId?: string | null
  channelMemberId?: string | null
  vibeyUserId?: string | null
  personBrainId?: string | null
  suggestedChannelMemberId?: string | null
  suggestedVibeyUserId?: string | null
  suggestedPersonBrainId?: string | null
  matchStatus?: OrgPersonCalendarMatchStatus
  matchMethod?: string | null
  personalConnectionLabel?: string | null
  source?: OrgPersonCalendarSource
  metadata?: Record<string, unknown>
  lastSyncedAt?: string | null
}

@Injectable()
export class OrgPersonCalendarIdentitiesRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
  }

  async list(supabase: SupabaseClient, orgId: string): Promise<OrgPersonCalendarIdentity[]> {
    const { data, error } = await supabase
      .from('org_person_calendar_identities')
      .select(IDENTITY_SELECT)
      .eq('org_id', orgId)
      .order('calendar_email', { ascending: true })
    if (error) throw new Error(`Failed to list calendar identities: ${error.message}`)
    return (data ?? []) as OrgPersonCalendarIdentity[]
  }

  async findById(
    supabase: SupabaseClient,
    orgId: string,
    id: string,
  ): Promise<OrgPersonCalendarIdentity | null> {
    const { data, error } = await supabase
      .from('org_person_calendar_identities')
      .select(IDENTITY_SELECT)
      .eq('org_id', orgId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Failed to load calendar identity: ${error.message}`)
    return (data as OrgPersonCalendarIdentity | null) ?? null
  }

  async findByEmail(
    supabase: SupabaseClient,
    orgId: string,
    email: string,
  ): Promise<OrgPersonCalendarIdentity | null> {
    const { data, error } = await supabase
      .from('org_person_calendar_identities')
      .select(IDENTITY_SELECT)
      .eq('org_id', orgId)
      .eq('calendar_email', this.normalizeEmail(email))
      .maybeSingle()
    if (error) throw new Error(`Failed to find calendar identity by email: ${error.message}`)
    return (data as OrgPersonCalendarIdentity | null) ?? null
  }

  async findByPersonRefs(
    supabase: SupabaseClient,
    orgId: string,
    refs: {
      channelMemberId?: string
      vibeyUserId?: string
      personBrainId?: string
    },
  ): Promise<OrgPersonCalendarIdentity | null> {
    if (refs.channelMemberId) {
      const { data, error } = await supabase
        .from('org_person_calendar_identities')
        .select(IDENTITY_SELECT)
        .eq('org_id', orgId)
        .eq('channel_member_id', refs.channelMemberId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`Failed to find calendar identity by person: ${error.message}`)
      if (data) return data as OrgPersonCalendarIdentity
    }
    if (refs.vibeyUserId) {
      const { data, error } = await supabase
        .from('org_person_calendar_identities')
        .select(IDENTITY_SELECT)
        .eq('org_id', orgId)
        .eq('vibey_user_id', refs.vibeyUserId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`Failed to find calendar identity by user: ${error.message}`)
      if (data) return data as OrgPersonCalendarIdentity
    }
    if (refs.personBrainId) {
      const { data, error } = await supabase
        .from('org_person_calendar_identities')
        .select(IDENTITY_SELECT)
        .eq('org_id', orgId)
        .eq('person_brain_id', refs.personBrainId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`Failed to find calendar identity by brain: ${error.message}`)
      if (data) return data as OrgPersonCalendarIdentity
    }
    return null
  }

  async upsertByEmail(
    supabase: SupabaseClient,
    input: UpsertIdentityInput,
  ): Promise<OrgPersonCalendarIdentity> {
    const email = this.normalizeEmail(input.calendarEmail)
    const existing = await this.findByEmail(supabase, input.orgId, email)
    const payload = {
      org_id: input.orgId,
      calendar_email: email,
      display_name: input.displayName ?? existing?.display_name ?? null,
      google_workspace_user_id:
        input.googleWorkspaceUserId ?? existing?.google_workspace_user_id ?? null,
      channel_member_id: input.channelMemberId ?? existing?.channel_member_id ?? null,
      vibey_user_id: input.vibeyUserId ?? existing?.vibey_user_id ?? null,
      person_brain_id: input.personBrainId ?? existing?.person_brain_id ?? null,
      suggested_channel_member_id:
        input.suggestedChannelMemberId ?? existing?.suggested_channel_member_id ?? null,
      suggested_vibey_user_id:
        input.suggestedVibeyUserId ?? existing?.suggested_vibey_user_id ?? null,
      suggested_person_brain_id:
        input.suggestedPersonBrainId ?? existing?.suggested_person_brain_id ?? null,
      match_status: input.matchStatus ?? existing?.match_status ?? 'unmatched',
      match_method: input.matchMethod ?? existing?.match_method ?? null,
      personal_connection_label:
        input.personalConnectionLabel ?? existing?.personal_connection_label ?? null,
      source: input.source ?? existing?.source ?? 'manual',
      metadata: input.metadata ?? existing?.metadata ?? {},
      last_synced_at: input.lastSyncedAt ?? existing?.last_synced_at ?? null,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { data, error } = await supabase
        .from('org_person_calendar_identities')
        .update(payload)
        .eq('id', existing.id)
        .eq('org_id', input.orgId)
        .select(IDENTITY_SELECT)
        .single()
      if (error) throw new Error(`Failed to update calendar identity: ${error.message}`)
      return data as OrgPersonCalendarIdentity
    }

    const { data, error } = await supabase
      .from('org_person_calendar_identities')
      .insert(payload)
      .select(IDENTITY_SELECT)
      .single()
    if (error) throw new Error(`Failed to create calendar identity: ${error.message}`)
    return data as OrgPersonCalendarIdentity
  }

  async update(
    supabase: SupabaseClient,
    orgId: string,
    id: string,
    patch: Partial<{
      display_name: string | null
      channel_member_id: string | null
      vibey_user_id: string | null
      person_brain_id: string | null
      suggested_channel_member_id: string | null
      suggested_vibey_user_id: string | null
      suggested_person_brain_id: string | null
      match_status: OrgPersonCalendarMatchStatus
      match_method: string | null
      personal_connection_label: string | null
      metadata: Record<string, unknown>
    }>,
  ): Promise<OrgPersonCalendarIdentity> {
    const { data, error } = await supabase
      .from('org_person_calendar_identities')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select(IDENTITY_SELECT)
      .single()
    if (error) throw new Error(`Failed to patch calendar identity: ${error.message}`)
    return data as OrgPersonCalendarIdentity
  }

  /** Service-role path for agent tool calls that may not hold admin RLS. */
  serviceList(orgId: string): Promise<OrgPersonCalendarIdentity[]> {
    return this.list(this.serviceClient.client, orgId)
  }

  serviceFindByEmail(orgId: string, email: string): Promise<OrgPersonCalendarIdentity | null> {
    return this.findByEmail(this.serviceClient.client, orgId, email)
  }

  serviceFindByPersonRefs(
    orgId: string,
    refs: {
      channelMemberId?: string
      vibeyUserId?: string
      personBrainId?: string
    },
  ): Promise<OrgPersonCalendarIdentity | null> {
    return this.findByPersonRefs(this.serviceClient.client, orgId, refs)
  }
}
