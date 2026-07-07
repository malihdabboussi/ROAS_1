import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface HumanDmConversationRow {
  id: string
  org_id: string
  user_low: string
  user_high: string
  last_message_at: string | null
  last_message_preview: string | null
  created_at: string
  updated_at: string
}

export interface HumanDmMessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  content_blocks: Array<Record<string, unknown>> | null
  metadata: Record<string, unknown> | null
  edited_at: string | null
  created_at: string
  updated_at: string
}

export interface HumanDmPartnerProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  status_emoji: string | null
  status_text: string | null
  timezone: string | null
  functional_role: string | null
}

export interface HumanDmOrgMemberRoleRow {
  user_id: string
  role: string
}

@Injectable()
export class HumanDmRepository {
  // ── Conversations ────────────────────────────────────────────

  async findConversationByPair(
    supabase: SupabaseClient,
    orgId: string,
    userA: string,
    userB: string,
  ): Promise<HumanDmConversationRow | null> {
    const [low, high] = userA < userB ? [userA, userB] : [userB, userA]
    const { data, error } = await supabase
      .from('human_dm_conversations')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_low', low)
      .eq('user_high', high)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message}`)
    return (data as HumanDmConversationRow | null) ?? null
  }

  async createConversation(
    supabase: SupabaseClient,
    orgId: string,
    userA: string,
    userB: string,
  ): Promise<HumanDmConversationRow> {
    const [low, high] = userA < userB ? [userA, userB] : [userB, userA]
    const { data, error } = await supabase
      .from('human_dm_conversations')
      .insert({ org_id: orgId, user_low: low, user_high: high })
      .select('*')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data as HumanDmConversationRow
  }

  async listConversationsForUser(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
  ): Promise<HumanDmConversationRow[]> {
    const { data, error } = await supabase
      .from('human_dm_conversations')
      .select('*')
      .eq('org_id', orgId)
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as HumanDmConversationRow[]
  }

  async findActiveOrgMember(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
  ): Promise<{ user_id: string } | null> {
    const { data, error } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message}`)
    return (data as { user_id: string } | null) ?? null
  }

  async findConversationById(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<HumanDmConversationRow | null> {
    const { data, error } = await supabase
      .from('human_dm_conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message}`)
    return (data as HumanDmConversationRow | null) ?? null
  }

  // ── Messages ─────────────────────────────────────────────────

  async listMessages(
    supabase: SupabaseClient,
    conversationId: string,
    limit: number,
    before?: string,
  ): Promise<HumanDmMessageRow[]> {
    let query = supabase
      .from('human_dm_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)
    if (before) query = query.lt('created_at', before)
    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as HumanDmMessageRow[]
  }

  async createMessage(
    supabase: SupabaseClient,
    row: {
      conversation_id: string
      sender_id: string
      content: string | null
      content_blocks?: Array<Record<string, unknown>> | null
      metadata?: Record<string, unknown>
    },
  ): Promise<HumanDmMessageRow> {
    const { data, error } = await supabase
      .from('human_dm_messages')
      .insert({
        conversation_id: row.conversation_id,
        sender_id: row.sender_id,
        content: row.content,
        content_blocks: row.content_blocks ?? null,
        metadata: row.metadata ?? {},
      })
      .select('*')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data as HumanDmMessageRow
  }

  async findMessageById(
    supabase: SupabaseClient,
    conversationId: string,
    messageId: string,
  ): Promise<HumanDmMessageRow | null> {
    const { data, error } = await supabase
      .from('human_dm_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('id', messageId)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message}`)
    return (data as HumanDmMessageRow | null) ?? null
  }

  async updateMessage(
    supabase: SupabaseClient,
    messageId: string,
    updates: { content: string },
  ): Promise<HumanDmMessageRow> {
    const { data, error } = await supabase
      .from('human_dm_messages')
      .update(updates)
      .eq('id', messageId)
      .select('*')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data as HumanDmMessageRow
  }

  async deleteMessage(supabase: SupabaseClient, messageId: string): Promise<void> {
    const { error } = await supabase.from('human_dm_messages').delete().eq('id', messageId)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  // ── Reads ────────────────────────────────────────────────────

  async markRead(supabase: SupabaseClient, conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('human_dm_reads')
      .upsert(
        {
          conversation_id: conversationId,
          user_id: userId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'conversation_id,user_id' },
      )
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async getUnreadCounts(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<Array<{ conversation_id: string; unread: number }>> {
    const { data, error } = await supabase.rpc('get_human_dm_unread_counts', { p_user_id: userId })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as Array<{ conversation_id: string; unread: number }>
  }

  async listPartnerProfiles(
    supabase: SupabaseClient,
    userIds: string[],
  ): Promise<HumanDmPartnerProfileRow[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, status_emoji, status_text, timezone, functional_role')
      .in('id', userIds)
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as HumanDmPartnerProfileRow[]
  }

  async listActiveOrgMemberRoles(
    supabase: SupabaseClient,
    orgId: string,
    userIds: string[],
  ): Promise<HumanDmOrgMemberRoleRow[]> {
    const { data, error } = await supabase
      .from('org_members')
      .select('user_id, role')
      .eq('org_id', orgId)
      .in('user_id', userIds)
      .eq('status', 'active')
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as HumanDmOrgMemberRoleRow[]
  }

  async createNotification(
    supabase: SupabaseClient,
    row: {
      user_id: string
      org_id?: string | null
      type: 'human_dm_message'
      title: string
      body: string
      action_url: string
      channel_sent: Record<string, boolean>
      metadata: Record<string, unknown>
    },
  ): Promise<void> {
    const { error } = await supabase.from('user_notifications').insert(row)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async lookupSenderProfile(
    supabase: SupabaseClient,
    senderId: string,
  ): Promise<{ full_name: string | null } | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', senderId)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message}`)
    return (data as { full_name: string | null } | null) ?? null
  }
}
