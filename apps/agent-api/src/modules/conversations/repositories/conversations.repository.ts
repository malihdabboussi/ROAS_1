import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isTransientNetworkError } from '@vibey/api-shared'

/**
 * Conversations Repository (Layer 3)
 *
 * Data access for the conversations table.
 * NO business logic — only queries.
 */
@Injectable()
export class ConversationsRepository {
  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async runReadWithRetry<T>(query: () => Promise<T>): Promise<T> {
    try {
      return await query()
    } catch (error) {
      if (!isTransientNetworkError(error)) {
        throw error
      }

      // Single bounded retry for transient network/transport failures.
      await this.sleep(250)
      return await query()
    }
  }

  async findByUserId(
    supabase: SupabaseClient,
    userId: string,
    filters?: { campaign_id?: string; agent_id?: string; orgId?: string | null },
  ) {
    return await this.runReadWithRetry(async () => {
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .order('id', { ascending: false })

      if (filters?.orgId !== undefined) {
        query = filters.orgId ? query.eq('org_id', filters.orgId) : query.is('org_id', null)
      }
      if (filters?.campaign_id) {
        query = query.eq('campaign_id', filters.campaign_id)
      }
      if (filters?.agent_id) {
        query = query.eq('agent_id', filters.agent_id)
      }

      const { data, error } = await query
      if (error) throw new Error(`DB error: ${error.message}`)
      return data ?? []
    })
  }

  async findById(supabase: SupabaseClient, id: string) {
    return await this.runReadWithRetry(async () => {
      const { data, error } = await supabase.from('conversations').select('*').eq('id', id).single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`DB error: ${error.message}`)
      }
      return data
    })
  }

  async findByIdScoped(
    supabase: SupabaseClient,
    id: string,
    userId: string,
    orgId?: string | null,
  ) {
    return await this.runReadWithRetry(async () => {
      let query = supabase.from('conversations').select('*').eq('id', id).eq('user_id', userId)
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
      const { data, error } = await query.single()
      if (error && error.code !== 'PGRST116') {
        throw new Error(`DB error: ${error.message}`)
      }
      return data
    })
  }

  async findByIdOrgScoped(supabase: SupabaseClient, id: string, orgId: string) {
    return await this.runReadWithRetry(async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`DB error: ${error.message}`)
      }
      return data
    })
  }

  async create(
    supabase: SupabaseClient,
    record: {
      user_id: string
      title: string
      campaign_id: string | null
      agent_id: string | null
      contact_id?: string | null
      metadata?: Record<string, unknown>
      org_id?: string | null
    },
  ) {
    const { data, error } = await supabase.from('conversations').insert(record).select().single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async findContactIdByEmail(
    supabase: SupabaseClient,
    input: {
      userId: string
      email: string
      orgId?: string | null
    },
  ): Promise<string | null> {
    let contactQuery = supabase
      .from('contacts')
      .select('id')
      .eq('user_id', input.userId)
      .eq('email', input.email)
    if (input.orgId !== undefined) {
      contactQuery = input.orgId
        ? contactQuery.eq('org_id', input.orgId)
        : contactQuery.is('org_id', null)
    }
    const { data: contactRow, error: contactErr } = await contactQuery.maybeSingle()
    if (contactErr) throw new Error(`DB error: ${contactErr.message}`)
    return (contactRow as { id?: string } | null)?.id ?? null
  }

  async update(supabase: SupabaseClient, id: string, fields: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('conversations')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async updateContactId(
    supabase: SupabaseClient,
    id: string,
    contactId: string | null,
  ): Promise<Record<string, unknown>> {
    return (await this.update(supabase, id, { contact_id: contactId })) as Record<string, unknown>
  }

  async updateMetadata(
    supabase: SupabaseClient,
    id: string,
    metadataPatch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const existing = (await this.findById(supabase, id)) as {
      metadata?: Record<string, unknown> | null
    } | null
    if (!existing) throw new Error('Conversation not found')
    const currentMetadata =
      existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}
    return (await this.update(supabase, id, {
      metadata: { ...currentMetadata, ...metadataPatch },
    })) as Record<string, unknown>
  }

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('conversations').delete().eq('id', id)

    if (error) throw new Error(`DB error: ${error.message}`)
  }
}
