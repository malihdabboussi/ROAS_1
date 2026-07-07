import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ConversationPermissionsRepository {
  async findConversationScope(
    supabase: SupabaseClient,
    conversationId: string,
    orgId?: string | null,
  ): Promise<{
    conversation: Record<string, unknown> | null
    errorMessage: string | null
  }> {
    let query = supabase
      .from('conversations')
      .select('id, user_id, org_id')
      .eq('id', conversationId)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data: conversation, error } = await query.maybeSingle()
    return {
      conversation: (conversation as Record<string, unknown> | null) ?? null,
      errorMessage: error?.message ?? null,
    }
  }

  async listConversationShares(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<{
    shares: Array<Record<string, unknown>>
    errorMessage: string | null
  }> {
    const { data: shares, error } = await supabase
      .from('conversation_shares')
      .select('entity_type, entity_id, org_id, level')
      .eq('conversation_id', conversationId)

    return {
      shares: (shares ?? []) as Array<Record<string, unknown>>,
      errorMessage: error?.message ?? null,
    }
  }
}
