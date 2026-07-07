import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { code?: string; message: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type ListResult<T> = { data: T[] | null; error: QueryError | null }

export type BrainTrainCheckRow = {
  id: string
  owner_id: string
  org_id: string | null
  scope: string
  created_by: string | null
}

export type BrainOpsRecord = {
  owner_id: string
  org_id: string | null
  agent_id: string | null
  campaign_id: string | null
  is_default: boolean
  last_library_sync_at: string | null
  cortex_max?: boolean | null
}

type KnowledgeEntry = Record<string, unknown>

@Injectable()
export class BrainIngestionRepository {
  async findTrainableBrain(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<QueryResult<BrainTrainCheckRow>> {
    return supabase
      .from('ns_brains')
      .select('id, owner_id, org_id, scope, created_by')
      .eq('id', brainId)
      .maybeSingle<BrainTrainCheckRow>()
  }

  async findActiveOrgMemberRole(
    supabase: SupabaseClient,
    input: { orgId: string; userId: string },
  ): Promise<QueryResult<{ role: string }>> {
    return supabase
      .from('org_members')
      .select('role')
      .eq('org_id', input.orgId)
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .maybeSingle<{ role: string }>()
  }

  async createSkSource(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryResult<{ id: string }>> {
    return supabase.from('ns_sk_sources').insert(payload).select('id').single()
  }

  async linkSkSourceEpisode(
    supabase: SupabaseClient,
    input: { sourceId: string; episodeId: string },
  ): Promise<QueryError | null> {
    const { error } = await supabase
      .from('ns_sk_sources')
      .update({ episode_id: input.episodeId })
      .eq('id', input.sourceId)
    return error
  }

  async findSkEntryByContentHash(
    supabase: SupabaseClient,
    input: { brainId: string; contentHash: string },
  ): Promise<QueryResult<{ id: string }>> {
    return supabase
      .from('ns_sk_entries')
      .select('id')
      .eq('brain_id', input.brainId)
      .eq('content_hash', input.contentHash)
      .maybeSingle()
  }

  async insertSkEntry(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await supabase.from('ns_sk_entries').insert(payload)
    return error
  }

  async finalizeSkSource(
    supabase: SupabaseClient,
    input: { sourceId: string; entriesCount: number; ingestedAt: string },
  ): Promise<QueryError | null> {
    const { error } = await supabase
      .from('ns_sk_sources')
      .update({
        status: 'completed',
        entries_count: input.entriesCount,
        ingested_at: input.ingestedAt,
      })
      .eq('id', input.sourceId)
    return error
  }

  async findDefaultUserBrainId(
    supabase: SupabaseClient,
    ownerId: string,
  ): Promise<QueryResult<{ id: string }>> {
    return supabase
      .from('ns_brains')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
  }

  async createDefaultUserBrain(
    supabase: SupabaseClient,
    ownerId: string,
  ): Promise<QueryResult<{ id: string }>> {
    return supabase
      .from('ns_brains')
      .insert({
        owner_id: ownerId,
        org_id: null,
        name: 'Default Brain',
        is_default: true,
        scope: 'user',
        color: '#8B85C8',
        icon: 'brain',
        tags: [],
      })
      .select('id')
      .maybeSingle()
  }

  async incrementBrainCounter(
    supabase: SupabaseClient,
    input: { brainId: string; field: string; amount: number },
  ): Promise<QueryResult<number>> {
    const result = await supabase.rpc('increment_brain_counter', {
      p_brain_id: input.brainId,
      p_field: input.field,
      p_amount: input.amount,
    })
    return result as QueryResult<number>
  }

  async findBrainForLibrarySync(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<QueryResult<BrainOpsRecord>> {
    return supabase
      .from('ns_brains')
      .select(
        'owner_id, org_id, agent_id, campaign_id, is_default, last_library_sync_at, cortex_max',
      )
      .eq('id', brainId)
      .single()
  }

  async resetBrainMemorySyncCounter(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<QueryError | null> {
    const { error } = await supabase
      .from('ns_brains')
      .update({ memories_since_last_sync: 0 })
      .eq('id', brainId)
    return error
  }

  async findBrainForPatternAnalysis(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<QueryResult<{ owner_id: string; org_id: string | null; cortex_max?: boolean | null }>> {
    return supabase
      .from('ns_brains')
      .select('owner_id, org_id, cortex_max')
      .eq('id', brainId)
      .single()
  }

  async resetBrainPageAnalysisCounter(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<QueryError | null> {
    const { error } = await supabase
      .from('ns_brains')
      .update({ pages_updated_since_last_analysis: 0 })
      .eq('id', brainId)
    return error
  }

  async insertBrainOpsOutbox(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await supabase.from('brain_ops_outbox').insert(payload)
    return error
  }

  async listNewMemories(
    supabase: SupabaseClient,
    input: { brainId: string; since: string; limit: number },
  ): Promise<KnowledgeEntry[]> {
    const { data } = await supabase
      .from('ns_memories')
      .select(
        'id, content, memory_type, source_emotion, emotional_valence, emotional_intensity, speaker_intent, significance, tags, source_type, source_title, created_at',
      )
      .eq('brain_id', input.brainId)
      .gte('created_at', input.since)
      .order('created_at', { ascending: true })
      .limit(input.limit)
    return (data ?? []) as KnowledgeEntry[]
  }

  async listNewSkEntries(
    supabase: SupabaseClient,
    input: { brainId: string; since: string; limit: number },
  ): Promise<KnowledgeEntry[]> {
    const { data } = await supabase
      .from('ns_sk_entries')
      .select('id, title, content, entry_type, domain, mastery, tags, source_id, created_at')
      .eq('brain_id', input.brainId)
      .gte('created_at', input.since)
      .order('created_at', { ascending: true })
      .limit(input.limit)
    return (data ?? []) as KnowledgeEntry[]
  }

  async listNewCampaignNodes(
    supabase: SupabaseClient,
    input: { campaignId: string; since: string; limit: number },
  ): Promise<KnowledgeEntry[]> {
    const { data } = await supabase
      .from('campaign_nodes')
      .select('id, title, content, node_type, domain, source_type, media_type, created_at')
      .eq('campaign_id', input.campaignId)
      .gte('created_at', input.since)
      .order('created_at', { ascending: true })
      .limit(input.limit)
    return (data ?? []) as KnowledgeEntry[]
  }
}
