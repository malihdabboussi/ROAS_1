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
  private static readonly ARTIFACT_DOC_TYPES = [
    'offer',
    'avatar',
    'funnel',
    'presentation',
    'sequence',
    'email',
  ] as const

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

      await this.sleep(250)
      return await query()
    }
  }

  async findByUserId(
    supabase: SupabaseClient,
    userId: string,
    filters?: {
      campaign_id?: string
      agent_id?: string
      space_id?: string
      channel_id?: string
      orgId?: string | null
      listAllOrgs?: boolean
    },
  ) {
    return await this.runReadWithRetry(async () => {
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })

      if (filters?.listAllOrgs) {
        // no org filter
      } else if (filters?.orgId !== undefined) {
        query = filters.orgId ? query.eq('org_id', filters.orgId) : query.is('org_id', null)
      }
      if (filters?.campaign_id) {
        query = query.eq('campaign_id', filters.campaign_id)
      }
      if (filters?.agent_id) {
        // Supports a comma-separated list so callers can fetch several agents'
        // conversations in one request instead of one request per agent.
        const agentIds = filters.agent_id
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
        if (agentIds.length > 1) {
          query = query.in('agent_id', agentIds)
        } else if (agentIds[0]) {
          query = query.eq('agent_id', agentIds[0])
        }
      }
      if (filters?.space_id) {
        query = query.eq('metadata->>space_id', filters.space_id)
      }
      if (filters?.channel_id) {
        query = query.eq('metadata->>channel_id', filters.channel_id)
      }

      const { data, error } = await query
      if (error) throw new Error(`DB error: ${error.message}`)
      return data ?? []
    })
  }

  async findActiveOrgMembership(supabase: SupabaseClient, orgId: string, userId: string) {
    const { data, error } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async findAgentRegistryStatus(
    supabase: SupabaseClient,
    agentId: string,
    userId: string,
    orgId?: string | null,
  ) {
    let query = supabase.from('agents_registry').select('is_active').eq('agent_key', agentId)
    query = orgId
      ? query.eq('org_id', orgId).is('user_id', null)
      : query.eq('user_id', userId).is('org_id', null)
    const { data } = await query.maybeSingle()
    return data as { is_active?: boolean | null } | null
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

  async findSharedWithMe(supabase: SupabaseClient, userId: string, orgId: string) {
    return await this.runReadWithRetry(async () => {
      const { data: shares, error: shareError } = await supabase
        .from('conversation_shares')
        .select('conversation_id, level, entity_type, entity_id')
        .or(
          `and(entity_type.eq.user,entity_id.eq.${userId}),and(entity_type.eq.org,entity_id.eq.${orgId})`,
        )

      if (shareError) throw new Error(`DB error: ${shareError.message}`)

      const conversationIds = [
        ...new Set(
          (shares ?? [])
            .map((share: Record<string, unknown>) => share.conversation_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      ]

      if (conversationIds.length === 0) return []

      const { data, error } = await supabase
        .from('conversations')
        .select('*, profiles:user_id(id, full_name, avatar_url)')
        .eq('org_id', orgId)
        .in('id', conversationIds)
        .neq('user_id', userId)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })

      if (error) throw new Error(`DB error: ${error.message}`)

      return (data ?? []).map((row: Record<string, unknown>) => {
        const raw = row.profiles as
          | {
              id: string
              full_name: string | null
              avatar_url: string | null
            }
          | Array<{
              id: string
              full_name: string | null
              avatar_url: string | null
            }>
          | null
        const profile = Array.isArray(raw) ? (raw[0] ?? null) : raw
        const { profiles: _, ...rest } = row
        return {
          ...rest,
          creator: profile
            ? { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url }
            : null,
        }
      })
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
      agent_id?: string | null
      org_id?: string | null
      metadata?: Record<string, unknown>
    },
  ) {
    const { data, error } = await supabase.from('conversations').insert(record).select().single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
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

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('conversations').delete().eq('id', id)

    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async findDocumentAssetsByUser(
    supabase: SupabaseClient,
    userId: string,
    opts: {
      agentId?: string | null
      before?: string
      limit: number
      scope: 'artifacts' | 'documents'
      orgId?: string | null
    },
  ) {
    let query = supabase
      .from('conversation_documents')
      .select(
        'id, conversation_id, campaign_id, document_type, title, content, created_at, updated_at, conversations!inner(id, title, agent_id, user_id, org_id)',
      )
      .eq('conversations.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(opts.limit)

    query = opts.orgId
      ? query.eq('conversations.org_id', opts.orgId)
      : query.is('conversations.org_id', null)
    if (opts.agentId) query = query.eq('conversations.agent_id', opts.agentId)
    if (opts.before) query = query.lt('created_at', opts.before)

    if (opts.scope === 'artifacts') {
      query = query.in('document_type', [...ConversationsRepository.ARTIFACT_DOC_TYPES])
    } else {
      query = query.not(
        'document_type',
        'in',
        `(${ConversationsRepository.ARTIFACT_DOC_TYPES.join(',')})`,
      )
    }

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findFileDocumentsByUser(
    supabase: SupabaseClient,
    userId: string,
    opts: {
      agentId?: string | null
      before?: string
      limit: number
      orgId?: string | null
    },
  ) {
    let query = supabase
      .from('conversation_documents')
      .select(
        'id, conversation_id, campaign_id, document_type, title, content, created_at, updated_at, conversations!inner(id, title, agent_id, user_id, org_id)',
      )
      .eq('conversations.user_id', userId)
      .not('content->>file_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(opts.limit)

    query = opts.orgId
      ? query.eq('conversations.org_id', opts.orgId)
      : query.is('conversations.org_id', null)
    if (opts.agentId) query = query.eq('conversations.agent_id', opts.agentId)
    if (opts.before) query = query.lt('created_at', opts.before)

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }
}
