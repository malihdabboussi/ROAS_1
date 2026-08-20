import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ConversationConnectionEntityType,
  ConversationConnectionRow,
} from '../services/conversation-connections.union'

@Injectable()
export class ConversationConnectionsRepository {
  async list(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<ConversationConnectionRow[]> {
    const { data, error } = await supabase
      .from('conversation_connections')
      .select('id, conversation_id, org_id, entity_type, entity_id, is_primary, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as ConversationConnectionRow[]
  }

  async insert(
    supabase: SupabaseClient,
    row: {
      conversation_id: string
      org_id: string | null
      entity_type: ConversationConnectionEntityType
      entity_id: string
      is_primary: boolean
    },
  ): Promise<{ row: ConversationConnectionRow | null; duplicate: boolean }> {
    const { data, error } = await supabase
      .from('conversation_connections')
      .insert(row)
      .select('id, conversation_id, org_id, entity_type, entity_id, is_primary, created_at')
      .single()
    if (error?.code === '23505') return { row: null, duplicate: true }
    if (error) throw error
    return { row: data as ConversationConnectionRow, duplicate: false }
  }

  async findByEntity(
    supabase: SupabaseClient,
    conversationId: string,
    entityType: ConversationConnectionEntityType,
    entityId: string,
  ): Promise<ConversationConnectionRow | null> {
    const { data, error } = await supabase
      .from('conversation_connections')
      .select('id, conversation_id, org_id, entity_type, entity_id, is_primary, created_at')
      .eq('conversation_id', conversationId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle()
    if (error) throw error
    return (data as ConversationConnectionRow | null) ?? null
  }

  async deleteByEntity(
    supabase: SupabaseClient,
    conversationId: string,
    entityType: ConversationConnectionEntityType,
    entityId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('conversation_connections')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
    if (error) throw error
  }

  async listCampaigns(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<ConversationConnectionRow[]> {
    const { data, error } = await supabase
      .from('conversation_connections')
      .select('id, conversation_id, org_id, entity_type, entity_id, is_primary, created_at')
      .eq('conversation_id', conversationId)
      .eq('entity_type', 'campaign')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as ConversationConnectionRow[]
  }

  async setPrimary(
    supabase: SupabaseClient,
    conversationId: string,
    entityId: string,
  ): Promise<void> {
    const { error: clearError } = await supabase
      .from('conversation_connections')
      .update({ is_primary: false })
      .eq('conversation_id', conversationId)
      .eq('is_primary', true)
    if (clearError) throw clearError
    const { error } = await supabase
      .from('conversation_connections')
      .update({ is_primary: true })
      .eq('conversation_id', conversationId)
      .eq('entity_type', 'campaign')
      .eq('entity_id', entityId)
    if (error) throw error
  }
}
