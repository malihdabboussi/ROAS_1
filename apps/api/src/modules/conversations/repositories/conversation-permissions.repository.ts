import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ConversationShareEntityType,
  ConversationShareLevel,
} from '@vibey/api-shared'

export type ConversationPermissionRow = {
  id: string
  org_id: string | null
  user_id: string
}

export type ConversationShareRow = {
  id: string
  conversation_id: string
  org_id: string | null
  entity_type: ConversationShareEntityType
  entity_id: string
  level: ConversationShareLevel
  created_by: string
  created_at: string
}

const CONVERSATION_SHARE_SELECT =
  'id, conversation_id, org_id, entity_type, entity_id, level, created_by, created_at'

@Injectable()
export class ConversationPermissionsRepository {
  async loadConversation(
    supabase: SupabaseClient,
    conversationId: string,
    orgId?: string | null,
  ): Promise<ConversationPermissionRow | null> {
    let query = supabase
      .from('conversations')
      .select('id, org_id, user_id')
      .eq('id', conversationId)
    if (orgId) {
      query = query.or(`org_id.eq.${orgId},org_id.is.null`)
    } else {
      query = query.is('org_id', null)
    }
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(error.message)
    return data as ConversationPermissionRow | null
  }

  async listSharesByConversation(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<ConversationShareRow[]> {
    const { data, error } = await supabase
      .from('conversation_shares')
      .select(CONVERSATION_SHARE_SELECT)
      .eq('conversation_id', conversationId)
    if (error) throw new Error(error.message)
    return (data ?? []) as ConversationShareRow[]
  }

  async listSharesByConversationIds(
    supabase: SupabaseClient,
    conversationIds: string[],
  ): Promise<ConversationShareRow[]> {
    const { data, error } = await supabase
      .from('conversation_shares')
      .select(CONVERSATION_SHARE_SELECT)
      .in('conversation_id', conversationIds)
    if (error) throw new Error(error.message)
    return (data ?? []) as ConversationShareRow[]
  }

  async listConversationShares(
    supabase: SupabaseClient,
    conversationId: string,
    orgId?: string | null,
  ): Promise<ConversationShareRow[]> {
    let query = supabase
      .from('conversation_shares')
      .select(CONVERSATION_SHARE_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as ConversationShareRow[]
  }

  async upsertConversationShare(
    supabase: SupabaseClient,
    row: {
      conversation_id: string
      org_id: string | null
      entity_type: ConversationShareEntityType
      entity_id: string
      level: ConversationShareLevel
      created_by: string
    },
  ): Promise<ConversationShareRow> {
    const { data, error } = await supabase
      .from('conversation_shares')
      .upsert(row, { onConflict: 'conversation_id,entity_type,entity_id' })
      .select(CONVERSATION_SHARE_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return data as ConversationShareRow
  }

  async deleteConversationShare(
    supabase: SupabaseClient,
    conversationId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('conversation_shares')
      .delete()
      .eq('id', shareId)
      .eq('conversation_id', conversationId)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { error } = await query
    if (error) throw new Error(error.message)
  }
}
