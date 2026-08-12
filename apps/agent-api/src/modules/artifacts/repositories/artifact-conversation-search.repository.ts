import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ConversationSearchInput = {
  userId: string
  orgId: string | null
  query: string
  limit: number
}

type ConversationRow = {
  id: string
  title: string | null
  agent_id: string | null
  campaign_id: string | null
  updated_at: string | null
  summary: string | null
}

type MessageRow = {
  conversation_id: string
  role: string
  content: string | null
  created_at: string
}

@Injectable()
export class ArtifactConversationSearchRepository {
  async search(
    supabase: SupabaseClient,
    input: ConversationSearchInput,
  ): Promise<{ conversations: ConversationRow[]; messages: MessageRow[] }> {
    let conversationsQuery = supabase
      .from('conversations')
      .select('id,title,agent_id,campaign_id,updated_at,summary')
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .ilike('title', `%${input.query}%`)
      .order('updated_at', { ascending: false })
      .limit(input.limit)
    conversationsQuery = input.orgId
      ? conversationsQuery.eq('org_id', input.orgId)
      : conversationsQuery.is('org_id', null)

    const { data: conversations, error } = await conversationsQuery
    if (error) throw new Error(`DB error: ${error.message}`)
    const rows = (conversations ?? []) as ConversationRow[]
    if (rows.length === 0) return { conversations: [], messages: [] }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('conversation_id,role,content,created_at')
      .in(
        'conversation_id',
        rows.map((row) => row.id),
      )
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(rows.length * 6)
    if (messagesError) throw new Error(`DB error: ${messagesError.message}`)

    return { conversations: rows, messages: (messages ?? []) as MessageRow[] }
  }
}
