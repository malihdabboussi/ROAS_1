import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Messages Repository (Layer 3)
 *
 * Data access for the messages table.
 * NO business logic — only queries.
 */
@Injectable()
export class MessagesRepository {
  async findByConversationId(
    supabase: SupabaseClient,
    conversationId: string,
    options?: { before?: string; limit?: number },
  ) {
    const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 100) : 50
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (options?.before) {
      query = query.lt('created_at', options.before)
    }

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []).reverse()
  }

  async create(
    supabase: SupabaseClient,
    record: {
      id?: string
      conversation_id: string
      role: string
      content: string
      metadata?: Record<string, unknown>
    },
  ) {
    // Only include metadata in insert if provided (avoids overwriting DB defaults)
    const insertData: Record<string, unknown> = {
      conversation_id: record.conversation_id,
      role: record.role,
      content: record.content,
    }
    if (record.id) insertData.id = record.id
    if (record.metadata) insertData.metadata = record.metadata

    const { data, error } = await supabase.from('messages').insert(insertData).select().single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async createIdempotent(
    supabase: SupabaseClient,
    record: {
      id: string
      conversation_id: string
      role: string
      content: string
      metadata?: Record<string, unknown>
    },
  ) {
    const { data, error } = await supabase
      .from('messages')
      .upsert(record, { onConflict: 'id', ignoreDuplicates: true })
      .select()
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    if (data) return data

    const existing = await this.findById(supabase, record.id)
    if (!existing) throw new Error('DB error: idempotent message was not persisted')
    return existing
  }

  async update(
    supabase: SupabaseClient,
    id: string,
    updates: { content?: string; metadata?: Record<string, unknown> },
  ) {
    const { error } = await supabase.from('messages').update(updates).eq('id', id)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async findById(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase.from('messages').select('*').eq('id', id).single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`DB error: ${error.message}`)
    }
    return data
  }

  async findLatestUserMessageId(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`DB error: ${error.message}`)
    return typeof data?.id === 'string' ? data.id : null
  }

  async findFirstUserMessageContent(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('messages')
      .select('content')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`DB error: ${error.message}`)
    const content = typeof data?.content === 'string' ? data.content.trim() : ''
    return content.length > 0 ? content : null
  }

  async findUpToMessage(supabase: SupabaseClient, conversationId: string, messageId: string) {
    const message = await this.findById(supabase, messageId)
    if (!message) throw new Error('Message not found')

    const pageSize = 1000
    let offset = 0
    const all: Record<string, unknown>[] = []

    for (;;) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lte('created_at', message.created_at as string)
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (error) throw new Error(`DB error: ${error.message}`)
      const chunk = data ?? []
      all.push(...chunk)
      if (chunk.length < pageSize) break
      offset += pageSize
    }

    return all
  }

  async bulkCreate(
    supabase: SupabaseClient,
    records: Array<{
      conversation_id: string
      role: string
      content: string | null
      content_blocks?: unknown
      metadata?: Record<string, unknown>
      model_id?: string
      created_at?: string
    }>,
  ) {
    if (records.length === 0) return []

    const batchSize = 500
    const all: Record<string, unknown>[] = []

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize).map((r) => {
        const row: Record<string, unknown> = {
          conversation_id: r.conversation_id,
          role: r.role,
          content: r.content,
        }
        if (r.content_blocks) row.content_blocks = r.content_blocks
        if (r.metadata) row.metadata = r.metadata
        if (r.model_id) row.model_id = r.model_id
        if (r.created_at) row.created_at = r.created_at
        return row
      })

      const { data, error } = await supabase.from('messages').insert(batch).select()
      if (error) throw new Error(`DB error: ${error.message}`)
      all.push(...(data ?? []))
    }

    return all
  }

  async deleteFrom(supabase: SupabaseClient, conversationId: string, messageId: string) {
    const message = await this.findById(supabase, messageId)
    if (!message) throw new Error('Message not found')

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)
      .gte('created_at', message.created_at)

    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async findMessagesForAssets(
    supabase: SupabaseClient,
    userId: string,
    opts: {
      agentId?: string | null
      before?: string
      limit: number
      orgId?: string | null
      campaignId?: string | null
    },
  ) {
    let query = supabase
      .from('messages')
      .select(
        'id, conversation_id, role, content, content_blocks, metadata, created_at, conversations!inner(id, title, agent_id, user_id, org_id, campaign_id)',
      )
      .eq('conversations.user_id', userId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(opts.limit)

    query = opts.orgId
      ? query.eq('conversations.org_id', opts.orgId)
      : query.is('conversations.org_id', null)
    if (opts.agentId) query = query.eq('conversations.agent_id', opts.agentId)
    if (opts.campaignId) query = query.eq('conversations.campaign_id', opts.campaignId)
    if (opts.before) query = query.lt('created_at', opts.before)

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }
}
