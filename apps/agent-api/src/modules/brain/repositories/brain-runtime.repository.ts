import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { code?: string; message?: string }
type ListResult<T = Record<string, unknown>> = {
  data: T[] | null
  error: QueryError | null
  count?: number | null
}
type MaybeResult<T = Record<string, unknown>> = { data: T | null; error: QueryError | null }
type MutationResult = { error: QueryError | null }

type ListQuery<T = Record<string, unknown>> = PromiseLike<ListResult<T>> & {
  eq(field: string, value: unknown): ListQuery<T>
  in(field: string, values: unknown[]): ListQuery<T>
  is(field: string, value: null): ListQuery<T>
  limit(count: number): ListQuery<T>
  maybeSingle<R = T>(): Promise<MaybeResult<R>>
  order(field: string, options?: { ascending?: boolean }): ListQuery<T>
  single<R = T>(): Promise<MaybeResult<R>>
}

type MutationQuery = PromiseLike<MutationResult> & {
  eq(field: string, value: unknown): MutationQuery
  is(field: string, value: null): MutationQuery
}

type SelectableMutationQuery<T = Record<string, unknown>> = MutationQuery & {
  select(columns: string): {
    maybeSingle(): Promise<MaybeResult<T>>
    single(): Promise<MaybeResult<T>>
  }
}

type TableQuery = {
  insert<T = Record<string, unknown>>(payload: Record<string, unknown>): SelectableMutationQuery<T>
  select<T = Record<string, unknown>>(
    columns: string,
    options?: Record<string, unknown>,
  ): ListQuery<T>
  update(payload: Record<string, unknown>): MutationQuery
  upsert<T = Record<string, unknown>>(
    payload: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): SelectableMutationQuery<T>
}

type RpcClient = {
  rpc<T = Record<string, unknown>>(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<ListResult<T>>
}

type AgentVoiceRow = {
  voice_name?: string | null
  image_url?: string | null
  role?: string | null
}

@Injectable()
export class BrainRuntimeRepository {
  async findCompanyBrainId(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<MaybeResult<{ id: string }>> {
    return this.table(supabase, 'ns_brains')
      .select('id')
      .eq('scope', 'company')
      .eq('org_id', orgId)
      .maybeSingle()
  }

  async listActiveCompanyCortexObjects(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<ListResult> {
    return this.table(supabase, 'company_cortex_objects')
      .select('id, object_type, title, truth, status, confidence, retrieval_rule')
      .eq('brain_id', brainId)
      .eq('status', 'active')
      .order('confidence', { ascending: false })
      .limit(50)
  }

  async findDefaultUserBrainId(
    supabase: SupabaseClient,
    ownerId: string,
  ): Promise<MaybeResult<{ id: string }>> {
    return this.table(supabase, 'ns_brains')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .maybeSingle()
  }

  async createDefaultUserBrain(
    supabase: SupabaseClient,
    ownerId: string,
  ): Promise<MaybeResult<{ id: string }>> {
    return this.table(supabase, 'ns_brains')
      .insert<{ id: string }>({
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

  async findContentHash(
    supabase: SupabaseClient,
    input: { brainId: string; contentHash: string },
  ): Promise<MaybeResult<{ id: string }>> {
    return this.table(supabase, 'ns_content_hashes')
      .select('id')
      .eq('brain_id', input.brainId)
      .eq('content_hash', input.contentHash)
      .maybeSingle()
  }

  async insertContentHash(
    supabase: SupabaseClient,
    input: { brainId: string; contentHash: string; sourceType: string },
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'ns_content_hashes').insert({
      brain_id: input.brainId,
      content_hash: input.contentHash,
      source_type: input.sourceType,
      snapshot_ids: [],
    })
    return error
  }

  async updateMemoryEmotion(
    supabase: SupabaseClient,
    memoryId: string,
    update: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'ns_memories').update(update).eq('id', memoryId)
    return error
  }

  async upsertBrainEpisode(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<MaybeResult<{ id: string }>> {
    return this.table(supabase, 'brain_episodes')
      .upsert<{ id: string }>(payload, { onConflict: 'brain_id,source_type,source_id' })
      .select('id')
      .single()
  }

  async upsertEvidenceChunk(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'ns_brain_evidence_chunks').upsert(payload, {
      onConflict: 'brain_id,source_type,source_id,chunk_index',
    })
    return error
  }

  async findAgentVoiceRow(
    supabase: SupabaseClient,
    input: { agentKey: string; userId: string; orgId?: string | null },
  ): Promise<MaybeResult<AgentVoiceRow>> {
    let query = this.table(supabase, 'agents_registry')
      .select<AgentVoiceRow>('voice_name, image_url, role')
      .eq('agent_key', input.agentKey)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    return query.maybeSingle()
  }

  async updateAgentVoice(
    supabase: SupabaseClient,
    input: { agentKey: string; userId: string; orgId?: string | null; voice: string },
  ): Promise<QueryError | null> {
    let query = this.table(supabase, 'agents_registry')
      .update({ voice_name: input.voice })
      .eq('agent_key', input.agentKey)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    const { error } = await query
    return error
  }

  async createPendingCapture(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<MaybeResult<{ id: string }>> {
    return this.table(supabase, 'ns_pending_captures').insert<{ id: string }>(payload).select('id').single()
  }

  async listPendingCaptures(supabase: SupabaseClient, profileId: string): Promise<ListResult> {
    return this.table(supabase, 'ns_pending_captures')
      .select('id, profile_id, brain_id, snapshots, context, status, auto_accept_at, created_at')
      .eq('profile_id', profileId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
  }

  async findPendingCapture(
    supabase: SupabaseClient,
    input: { id: string; profileId?: string },
  ): Promise<MaybeResult> {
    let query = this.table(supabase, 'ns_pending_captures')
      .select('*')
      .eq('id', input.id)
      .eq('status', 'pending')
    if (input.profileId) query = query.eq('profile_id', input.profileId)
    return query.single()
  }

  async insertSnapshot(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'ns_snapshots').insert(payload)
    return error
  }

  async markPendingCaptureAccepted(
    supabase: SupabaseClient,
    input: { id: string; reviewedAt: string },
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'ns_pending_captures')
      .update({ status: 'accepted', reviewed_at: input.reviewedAt })
      .eq('id', input.id)
    return error
  }

  async markPendingCaptureRejected(
    supabase: SupabaseClient,
    input: { id: string; reviewedAt: string; profileId?: string },
  ): Promise<QueryError | null> {
    let query = this.table(supabase, 'ns_pending_captures')
      .update({ status: 'rejected', reviewed_at: input.reviewedAt })
      .eq('id', input.id)
      .eq('status', 'pending')
    if (input.profileId) query = query.eq('profile_id', input.profileId)
    const { error } = await query
    return error
  }

  async listUserBrainIds(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<ListResult<{ id: string; is_default?: boolean | null }>> {
    return this.table(supabase, 'ns_brains')
      .select<{ id: string; is_default?: boolean | null }>('id, is_default')
      .eq('owner_id', userId)
      .order('is_default', { ascending: false })
  }

  async searchRelatedMemories(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: number[]; threshold: number; count: number },
  ): Promise<ListResult> {
    return this.rpc(supabase, 'search_ns_memories', {
      p_brain_id: input.brainId,
      p_query_embedding: `[${input.embedding.join(',')}]`,
      p_match_threshold: input.threshold,
      p_match_count: input.count,
      p_min_significance: 0,
    })
  }

  async countBrainMemories(
    supabase: SupabaseClient,
    brainIds: string[],
  ): Promise<ListResult<{ id: string }>> {
    return this.table(supabase, 'ns_memories')
      .select<{ id: string }>('id', { count: 'exact', head: true })
      .in('brain_id', brainIds)
  }

  async listBrainSkDomains(
    supabase: SupabaseClient,
    brainIds: string[],
  ): Promise<ListResult<{ domain: string | null }>> {
    return this.table(supabase, 'ns_sk_entries')
      .select<{ domain: string | null }>('domain', { count: 'exact' })
      .in('brain_id', brainIds)
      .limit(500)
  }

  async findDefaultSpotlightBrain(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<MaybeResult<{ id: string; cortex_max?: boolean | null }>> {
    return this.table(supabase, 'ns_brains')
      .select<{ id: string; cortex_max?: boolean | null }>('id, cortex_max')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .maybeSingle()
  }

  async findBrainCortexFlag(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<MaybeResult<{ cortex_max?: boolean | null }>> {
    return this.table(supabase, 'ns_brains')
      .select<{ cortex_max?: boolean | null }>('cortex_max')
      .eq('id', brainId)
      .maybeSingle()
  }

  async listSpotlightPerspectives<T = Record<string, unknown>>(
    supabase: SupabaseClient,
    input: { brainId: string; limit: number },
  ): Promise<ListResult<T>> {
    return this.table(supabase, 'ns_perspectives')
      .select<T>('id, name, description, strength, status, blind_spots, influence_areas, updated_at')
      .eq('brain_id', input.brainId)
      .in('status', ['emerging', 'active'])
      .order('strength', { ascending: false })
      .limit(input.limit)
  }

  async listSpotlightBeliefs<T = Record<string, unknown>>(
    supabase: SupabaseClient,
    input: { brainId: string; limit: number },
  ): Promise<ListResult<T>> {
    return this.table(supabase, 'ns_belief_patterns')
      .select<T>(
        'id, pattern_name, description, strength, status, supporting_memories, emotional_signature, updated_at',
      )
      .eq('brain_id', input.brainId)
      .in('status', ['emerging', 'active', 'challenged'])
      .order('strength', { ascending: false })
      .limit(input.limit)
  }

  async listSpotlightTensions<T = Record<string, unknown>>(
    supabase: SupabaseClient,
    input: { brainId: string; limit: number },
  ): Promise<ListResult<T>> {
    return this.table(supabase, 'ns_belief_patterns')
      .select<T>('id, pattern_name, description, strength, status, updated_at')
      .eq('brain_id', input.brainId)
      .eq('status', 'challenged')
      .order('updated_at', { ascending: false })
      .limit(input.limit)
  }

  async searchSpotlightNarrativePages<T = Record<string, unknown>>(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: number[]; threshold: number; count: number },
  ): Promise<ListResult<T>> {
    return this.rpc<T>(supabase, 'search_narrative_pages', {
      p_brain_id: input.brainId,
      p_query_embedding: `[${input.embedding.join(',')}]`,
      p_match_threshold: input.threshold,
      p_match_count: input.count,
    })
  }

  private table(supabase: SupabaseClient, tableName: string): TableQuery {
    return supabase.from(tableName) as unknown as TableQuery
  }

  private rpc<T = Record<string, unknown>>(
    supabase: SupabaseClient,
    fn: string,
    args: Record<string, unknown>,
  ): Promise<ListResult<T>> {
    return (supabase as unknown as RpcClient).rpc<T>(fn, args)
  }
}
