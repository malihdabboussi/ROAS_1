import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ConversationActivityRow {
  conversation_id: string
  is_unread: boolean
  needs_action: boolean
}

@Injectable()
export class ConversationActivityRepository {
  async listStates(
    supabase: SupabaseClient,
    conversationIds: string[],
  ): Promise<ConversationActivityRow[]> {
    if (conversationIds.length === 0) return []
    const { data, error } = await supabase.rpc('get_conversation_activity_states', {
      p_conversation_ids: conversationIds,
    })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as ConversationActivityRow[]
  }

  async markRead(supabase: SupabaseClient, conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('conversation_reads').upsert(
      {
        conversation_id: conversationId,
        user_id: userId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'conversation_id,user_id' },
    )
    if (error) throw new Error(`DB error: ${error.message}`)
  }
}
