import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ChannelMembershipsRepository } from './channel-memberships.repository'
import { ChannelUserStateRepository } from './channel-user-state.repository'

export interface ChannelRow {
  id: string
  org_id: string | null
  user_id: string
  name: string
  description: string | null
  is_private: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ChannelMembershipRow {
  id: string
  channel_id: string
  member_type: 'user' | 'agent'
  user_id: string | null
  agent_key: string | null
  role: 'admin' | 'edit' | 'view'
  added_by: string | null
  joined_at: string
  last_read_at: string | null
  created_at: string
  profile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface ChannelMessageRow {
  id: string
  channel_id: string
  sender_type: 'user' | 'agent' | 'system'
  sender_id: string
  content: string | null
  content_blocks: Array<Record<string, unknown>> | null
  metadata: Record<string, unknown> | null
  reply_to_id: string | null
  thread_name: string | null
  pinned: boolean
  pinned_by: string | null
  created_at: string
  updated_at: string
}

@Injectable()
export class ChannelsRepository {
  constructor(
    private readonly membershipsRepository: ChannelMembershipsRepository = new ChannelMembershipsRepository(),
    private readonly userStateRepository: ChannelUserStateRepository = new ChannelUserStateRepository(),
  ) {}

  async listChannels(supabase: SupabaseClient, orgId: string | null): Promise<ChannelRow[]> {
    let query = supabase.from('channels').select('*').order('created_at', { ascending: true })
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as ChannelRow[]
  }

  async findChannelById(
    supabase: SupabaseClient,
    channelId: string,
    orgId: string | null,
  ): Promise<ChannelRow | null> {
    let query = supabase.from('channels').select('*').eq('id', channelId)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)

    const { data, error } = await query.maybeSingle()
    if (error && error.code !== 'PGRST116') {
      throw new Error(`DB error: ${error.message}`)
    }

    return (data as ChannelRow | null) ?? null
  }

  async createChannel(
    supabase: SupabaseClient,
    row: {
      org_id: string | null
      user_id: string
      name: string
      description: string | null
      is_private: boolean
    },
  ): Promise<ChannelRow> {
    const channelId = randomUUID()
    const { error } = await supabase.from('channels').insert({
      id: channelId,
      ...row,
    })
    if (error) throw new Error(`DB error: ${error.message}`)

    const { data, error: fetchError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single()
    if (fetchError) throw new Error(`DB error: ${fetchError.message}`)

    return data as ChannelRow
  }

  async updateChannel(
    supabase: SupabaseClient,
    channelId: string,
    updates: Partial<Pick<ChannelRow, 'name' | 'description' | 'is_private' | 'metadata'>>,
  ): Promise<ChannelRow> {
    const { data, error } = await supabase
      .from('channels')
      .update(updates)
      .eq('id', channelId)
      .select('*')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)

    return data as ChannelRow
  }

  async deleteChannel(supabase: SupabaseClient, channelId: string): Promise<void> {
    const { error } = await supabase.from('channels').delete().eq('id', channelId)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async listMemberships(
    supabase: SupabaseClient,
    channelId: string,
  ): Promise<ChannelMembershipRow[]> {
    return this.membershipsRepository.listMemberships(supabase, channelId)
  }

  async findMembershipById(
    supabase: SupabaseClient,
    channelId: string,
    memberId: string,
  ): Promise<ChannelMembershipRow | null> {
    return this.membershipsRepository.findMembershipById(supabase, channelId, memberId)
  }

  async listAdminChannelIdsForUser(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
    return this.membershipsRepository.listAdminChannelIdsForUser(supabase, userId)
  }

  async listFavoriteChannelIdsForUser(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<Set<string>> {
    return this.userStateRepository.listFavoriteChannelIdsForUser(supabase, userId)
  }

  async listUserState(supabase: SupabaseClient, userId: string) {
    return this.userStateRepository.listUserState(supabase, userId)
  }

  async upsertUserState(
    supabase: SupabaseClient,
    userId: string,
    channelId: string,
    patch: { is_favorite?: boolean },
  ) {
    return this.userStateRepository.upsertUserState(supabase, userId, channelId, patch)
  }

  async findUserMembership(
    supabase: SupabaseClient,
    channelId: string,
    userId: string,
  ): Promise<ChannelMembershipRow | null> {
    return this.membershipsRepository.findUserMembership(supabase, channelId, userId)
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
    return this.membershipsRepository.createMembership(supabase, row)
  }

  async updateMembershipRole(
    supabase: SupabaseClient,
    memberId: string,
    role: 'admin' | 'edit' | 'view',
  ): Promise<ChannelMembershipRow> {
    return this.membershipsRepository.updateMembershipRole(supabase, memberId, role)
  }

  async deleteMembership(supabase: SupabaseClient, memberId: string): Promise<void> {
    return this.membershipsRepository.deleteMembership(supabase, memberId)
  }

  async listMessages(
    supabase: SupabaseClient,
    channelId: string,
    limit: number,
    before?: string,
  ): Promise<ChannelMessageRow[]> {
    let query = supabase
      .from('channel_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(limit)
    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)

    return (data ?? []) as ChannelMessageRow[]
  }

  async createMessage(
    supabase: SupabaseClient,
    row: {
      channel_id: string
      sender_type: 'user' | 'agent' | 'system'
      sender_id: string
      content: string | null
      content_blocks: Array<Record<string, unknown>> | null
      metadata: Record<string, unknown>
      reply_to_id?: string | null
    },
  ): Promise<ChannelMessageRow> {
    const insertRow: Record<string, unknown> = {
      channel_id: row.channel_id,
      sender_type: row.sender_type,
      sender_id: row.sender_id,
      content: row.content,
      content_blocks: row.content_blocks,
      metadata: row.metadata,
    }
    if (row.reply_to_id) insertRow.reply_to_id = row.reply_to_id
    const { data, error } = await supabase
      .from('channel_messages')
      .insert(insertRow)
      .select('*')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)

    return data as ChannelMessageRow
  }

  async findMessageById(
    supabase: SupabaseClient,
    channelId: string,
    messageId: string,
  ): Promise<ChannelMessageRow | null> {
    const { data, error } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('channel_id', channelId)
      .eq('id', messageId)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') {
      throw new Error(`DB error: ${error.message}`)
    }

    return (data as ChannelMessageRow | null) ?? null
  }

  async updateMessage(
    supabase: SupabaseClient,
    messageId: string,
    updates: Partial<
      Pick<
        ChannelMessageRow,
        'content' | 'pinned' | 'pinned_by' | 'metadata' | 'content_blocks' | 'thread_name'
      >
    >,
  ): Promise<ChannelMessageRow> {
    const { data, error } = await supabase
      .from('channel_messages')
      .update(updates)
      .eq('id', messageId)
      .select('*')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)

    return data as ChannelMessageRow
  }

  async deleteMessage(supabase: SupabaseClient, messageId: string): Promise<void> {
    const { error } = await supabase.from('channel_messages').delete().eq('id', messageId)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async getThreadParticipants(
    supabase: SupabaseClient,
    parentMessageId: string,
  ): Promise<{ humanSenderIds: string[]; agentSenderIds: string[] }> {
    const { data: parent } = await supabase
      .from('channel_messages')
      .select('sender_type, sender_id')
      .eq('id', parentMessageId)
      .maybeSingle()

    const { data: replies } = await supabase
      .from('channel_messages')
      .select('sender_type, sender_id')
      .eq('reply_to_id', parentMessageId)

    const allRows = [
      ...(parent ? [parent as { sender_type: string; sender_id: string }] : []),
      ...((replies ?? []) as Array<{ sender_type: string; sender_id: string }>),
    ]

    const humans = new Set<string>()
    const agents = new Set<string>()
    for (const r of allRows) {
      if (r.sender_type === 'user') humans.add(r.sender_id)
      else if (r.sender_type === 'agent') agents.add(r.sender_id)
    }

    return { humanSenderIds: [...humans], agentSenderIds: [...agents] }
  }

  async getThreadMessages(
    supabase: SupabaseClient,
    parentMessageId: string,
  ): Promise<ChannelMessageRow[]> {
    const { data: parent } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('id', parentMessageId)
      .maybeSingle()

    const { data: replies } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('reply_to_id', parentMessageId)
      .order('created_at', { ascending: true })

    const result: ChannelMessageRow[] = []
    if (parent) result.push(parent as ChannelMessageRow)
    if (replies) result.push(...(replies as ChannelMessageRow[]))
    return result
  }

  async markChannelRead(
    supabase: SupabaseClient,
    channelId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('channel_memberships')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('user_id', userId)
      .eq('member_type', 'user')
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async getUnreadCounts(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<Array<{ channel_id: string; unread: number }>> {
    const { data, error } = await supabase.rpc('get_channel_unread_counts', {
      p_user_id: userId,
    })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as Array<{ channel_id: string; unread: number }>
  }
}
