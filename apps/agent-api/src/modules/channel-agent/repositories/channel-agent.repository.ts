import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

export interface ChannelMessageRow {
  id: string
  channel_id: string
  sender_type: 'user' | 'agent' | 'system'
  sender_id: string
  content: string | null
  metadata: Record<string, unknown> | null
  reply_to_id: string | null
  created_at: string
}

export interface ChannelRecord {
  name?: string
  description?: string
  metadata?: Record<string, unknown>
  org_id?: string | null
}

export interface ChannelMembershipRow {
  member_type?: string
  user_id?: string | null
  agent_key?: string | null
  profiles?: unknown
}

export interface ChannelAgentReplyRow {
  channel_id: string
  sender_type: 'agent'
  sender_id: string
  content: string
  content_blocks: null
  metadata: Record<string, unknown>
  reply_to_id: string
}

const CHANNEL_MESSAGE_FIELDS =
  'id, channel_id, sender_type, sender_id, content, metadata, reply_to_id, created_at'

@Injectable()
export class ChannelAgentRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  get client(): SupabaseClient {
    return this.svc.client
  }

  async findTriggerMessage(messageId: string, channelId: string) {
    return this.svc.client
      .from('channel_messages')
      .select(CHANNEL_MESSAGE_FIELDS)
      .eq('id', messageId)
      .eq('channel_id', channelId)
      .maybeSingle()
  }

  async findMessage(messageId: string) {
    return this.svc.client
      .from('channel_messages')
      .select(CHANNEL_MESSAGE_FIELDS)
      .eq('id', messageId)
      .maybeSingle()
  }

  async findChannel(channelId: string) {
    return this.svc.client
      .from('channels')
      .select('name, description, metadata, org_id')
      .eq('id', channelId)
      .maybeSingle()
  }

  async listMemberships(channelId: string) {
    return this.svc.client
      .from('channel_memberships')
      .select('member_type, user_id, agent_key, profiles:user_id(full_name)')
      .eq('channel_id', channelId)
  }

  async findCampaignName(campaignId: string) {
    return this.svc.client.from('campaigns').select('name').eq('id', campaignId).maybeSingle()
  }

  async listThreadReplies(threadParentId: string) {
    return this.svc.client
      .from('channel_messages')
      .select(CHANNEL_MESSAGE_FIELDS)
      .eq('reply_to_id', threadParentId)
      .order('created_at', { ascending: true })
  }

  async listPreviousTopLevelMessages(channelId: string, beforeCreatedAt: string, limit: number) {
    return this.svc.client
      .from('channel_messages')
      .select(CHANNEL_MESSAGE_FIELDS)
      .eq('channel_id', channelId)
      .is('reply_to_id', null)
      .lt('created_at', beforeCreatedAt)
      .order('created_at', { ascending: false })
      .limit(limit)
  }

  async listPreviousChannelMessages(channelId: string, beforeCreatedAt: string, limit: number) {
    return this.svc.client
      .from('channel_messages')
      .select(CHANNEL_MESSAGE_FIELDS)
      .eq('channel_id', channelId)
      .lt('created_at', beforeCreatedAt)
      .order('created_at', { ascending: false })
      .limit(limit)
  }

  async insertAgentReply(row: ChannelAgentReplyRow) {
    return this.svc.client.from('channel_messages').insert(row)
  }

  async findMessageMetadata(messageId: string) {
    return this.svc.client
      .from('channel_messages')
      .select('metadata')
      .eq('id', messageId)
      .maybeSingle()
  }

  async updateMessageMetadata(messageId: string, metadata: Record<string, unknown>) {
    return this.svc.client.from('channel_messages').update({ metadata }).eq('id', messageId)
  }
}
