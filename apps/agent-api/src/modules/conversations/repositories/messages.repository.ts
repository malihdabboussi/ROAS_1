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

  async findAllByConversationId(supabase: SupabaseClient, conversationId: string) {
    const pageSize = 1000
    let offset = 0
    const all: Record<string, unknown>[] = []

    for (;;) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
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

  async create(
    supabase: SupabaseClient,
    record: {
      id?: string
      conversation_id: string
      role: string
      content: string
      metadata?: Record<string, unknown>
      model_id?: string
    },
  ) {
    const insertData: Record<string, unknown> = {
      conversation_id: record.conversation_id,
      role: record.role,
      content: record.content,
    }
    if (record.id) insertData.id = record.id
    if (record.metadata) insertData.metadata = record.metadata
    if (record.model_id) insertData.model_id = record.model_id

    const { data, error } = await supabase.from('messages').insert(insertData).select().single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async update(supabase: SupabaseClient, id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select('id')
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    if (!data) throw new Error(`Message update affected 0 rows: ${id}`)
  }

  async findById(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase.from('messages').select('*').eq('id', id).single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`DB error: ${error.message}`)
    }
    return data
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
}
