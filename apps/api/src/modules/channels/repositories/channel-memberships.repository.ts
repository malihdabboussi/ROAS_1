import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChannelMembershipRow } from './channels.repository'

@Injectable()
export class ChannelMembershipsRepository {
  async listMemberships(
    supabase: SupabaseClient,
    channelId: string,
  ): Promise<ChannelMembershipRow[]> {
    const { data, error } = await supabase
      .from('channel_memberships')
      .select('*, profiles:user_id(id, full_name, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`DB error: ${error.message}`)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => this.normalizeMembership(row))
  }

  async findMembershipById(
    supabase: SupabaseClient,
    channelId: string,
    memberId: string,
  ): Promise<ChannelMembershipRow | null> {
    const { data, error } = await supabase
      .from('channel_memberships')
      .select('*, profiles:user_id(id, full_name, avatar_url)')
      .eq('channel_id', channelId)
      .eq('id', memberId)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message}`)
    return data ? this.normalizeMembership(data as Record<string, unknown>) : null
  }

  async listAdminChannelIdsForUser(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('channel_memberships')
      .select('channel_id')
      .eq('member_type', 'user')
      .eq('user_id', userId)
      .eq('role', 'admin')
    if (error) throw new Error(`DB error: ${error.message}`)
    return new Set((data ?? []).map((row) => String(row.channel_id)))
  }

  async findUserMembership(
    supabase: SupabaseClient,
    channelId: string,
    userId: string,
  ): Promise<ChannelMembershipRow | null> {
    const { data, error } = await supabase
      .from('channel_memberships')
      .select('*, profiles:user_id(id, full_name, avatar_url)')
      .eq('channel_id', channelId)
      .eq('member_type', 'user')
      .eq('user_id', userId)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message}`)
    return data ? this.normalizeMembership(data as Record<string, unknown>) : null
  }

  async createMembership(
    supabase: SupabaseClient,
    row: {
      channel_id: string
      member_type: 'user' | 'agent'
      user_id: string | null
      agent_key: string | null
      role: 'admin' | 'edit' | 'view'
      added_by: string
    },
  ): Promise<ChannelMembershipRow> {
    const { data, error } = await supabase
      .from('channel_memberships')
      .insert(row)
      .select('*, profiles:user_id(id, full_name, avatar_url)')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return this.normalizeMembership(data as Record<string, unknown>)
  }

  async updateMembershipRole(
    supabase: SupabaseClient,
    memberId: string,
    role: 'admin' | 'edit' | 'view',
  ): Promise<ChannelMembershipRow> {
    const { data, error } = await supabase
      .from('channel_memberships')
      .update({ role })
      .eq('id', memberId)
      .select('*, profiles:user_id(id, full_name, avatar_url)')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return this.normalizeMembership(data as Record<string, unknown>)
  }

  async deleteMembership(supabase: SupabaseClient, memberId: string): Promise<void> {
    const { error } = await supabase.from('channel_memberships').delete().eq('id', memberId)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  private normalizeMembership(row: Record<string, unknown>): ChannelMembershipRow {
    const rawProfile = row.profiles as
      | {
          id: string
          full_name: string | null
          avatar_url: string | null
        }
      | Array<{
          id: string
          full_name: string | null
          avatar_url: string | null
        }>
      | null
      | undefined
    const profile = Array.isArray(rawProfile) ? (rawProfile[0] ?? null) : (rawProfile ?? null)
    const { profiles: _profiles, ...rest } = row
    return {
      ...(rest as unknown as ChannelMembershipRow),
      profile,
    }
  }
}
