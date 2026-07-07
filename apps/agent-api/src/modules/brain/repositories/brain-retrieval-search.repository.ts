import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type ListResult<T = Record<string, unknown>> = { data: T[] | null; error: QueryError | null }

type TemporalInput = {
  as_of?: string | null
  occurred_from?: string | null
  occurred_to?: string | null
  include_historical?: boolean
}

@Injectable()
export class BrainRetrievalSearchRepository {
  async searchMemoryVectorRows(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; candidateLimit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_ns_memories', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.25,
      p_match_count: input.candidateLimit,
      p_min_significance: 0,
      ...this.temporalRpcArgs(input),
    })) as ListResult
  }

  async searchMemoryLexicalRows(
    supabase: SupabaseClient,
    input: { brainId: string; query: string; candidateLimit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_ns_memories_lexical', {
      p_brain_id: input.brainId,
      p_query: input.query,
      p_limit: input.candidateLimit,
      ...this.temporalRpcArgs(input),
    })) as ListResult
  }

  async searchSnapshotLexicalRows(
    supabase: SupabaseClient,
    input: { brainId: string; query: string; candidateLimit: number },
  ): Promise<ListResult> {
    return (await supabase.rpc('search_ns_snapshots_lexical', {
      p_brain_id: input.brainId,
      p_query: input.query,
      p_limit: input.candidateLimit,
    })) as ListResult
  }

  async findSimilarSnapshots(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; candidateLimit: number },
  ): Promise<ListResult<{ id: string; similarity: number }>> {
    return (await supabase.rpc('find_similar_snapshots', {
      p_embedding: input.embedding,
      p_brain_id: input.brainId,
      p_exclude_ids: [],
      p_limit: input.candidateLimit,
    })) as ListResult<{ id: string; similarity: number }>
  }

  async listSnapshotRows(
    supabase: SupabaseClient,
    input: { brainId: string; ids: string[] },
  ): Promise<ListResult> {
    return (await supabase
      .from('ns_snapshots')
      .select(
        'id, brain_id, name, type, core, confidence, significance_score, tags, source, proof, challenge, source_type, source_id, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .in('id', input.ids)
      .eq('brain_id', input.brainId)) as ListResult
  }

  async traverseSnapshotEdges(
    supabase: SupabaseClient,
    input: { snapshotIds: string[]; maxDepth: number; minStrength: number },
  ): Promise<ListResult<{ snapshot_id: string; depth: number; strength: number }>> {
    return (await supabase.rpc('traverse_edges', {
      p_snapshot_ids: input.snapshotIds,
      p_max_depth: input.maxDepth,
      p_min_strength: input.minStrength,
    })) as ListResult<{ snapshot_id: string; depth: number; strength: number }>
  }

  async searchCompanyObjectVectorRows(
    supabase: SupabaseClient,
    input: { brainId: string; orgId: string | null; embedding: string; candidateLimit: number } &
      TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_company_cortex_objects', {
      p_brain_id: input.brainId,
      p_org_id: input.orgId,
      p_query_embedding: input.embedding,
      p_match_count: input.candidateLimit,
      p_match_threshold: 0.35,
      ...this.temporalAsOfArgs(input),
    })) as ListResult
  }

  async searchCompanyObjectTextRows(
    supabase: SupabaseClient,
    input: { brainId: string; orgId: string | null; query: string; candidateLimit: number } &
      TemporalInput,
  ): Promise<ListResult> {
    const query = supabase
      .from('company_cortex_objects')
      .select(
        'id, brain_id, org_id, object_type, title, truth, status, confidence, evidence_refs, retrieval_rule, metadata, effective_from, effective_until, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)
      .neq('status', 'retired')
      .order('confidence', { ascending: false })
      .limit(input.candidateLimit)
    return (await this.applyTextSearch(
      this.applyMemoryTemporalFilters(query, input),
      input.query,
    )) as ListResult
  }

  async searchCustomerAvatarVectorRows(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; candidateLimit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_customer_avatars', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.25,
      p_match_count: input.candidateLimit,
      ...this.temporalAsOfArgs(input),
    })) as ListResult
  }

  async searchCustomerAvatarLexicalRows(
    supabase: SupabaseClient,
    input: { brainId: string; query: string; candidateLimit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_customer_avatars_lexical', {
      p_brain_id: input.brainId,
      p_query: input.query,
      p_limit: input.candidateLimit,
      ...this.temporalAsOfArgs(input),
    })) as ListResult
  }

  async searchAvatarAxisVectorRows(
    supabase: SupabaseClient,
    input: { orgId: string; embedding: string; candidateLimit: number },
  ): Promise<ListResult> {
    return (await supabase.rpc('search_avatar_discriminator_axes', {
      p_org_id: input.orgId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.25,
      p_match_count: input.candidateLimit,
    })) as ListResult
  }

  async searchAvatarAxisLexicalRows(
    supabase: SupabaseClient,
    input: { orgId: string; query: string; candidateLimit: number },
  ): Promise<ListResult> {
    return (await supabase.rpc('search_avatar_discriminator_axes_lexical', {
      p_org_id: input.orgId,
      p_query: input.query,
      p_limit: input.candidateLimit,
    })) as ListResult
  }

  private temporalRpcArgs(input: TemporalInput): Record<string, unknown> {
    const args: Record<string, unknown> = {}
    if (input.as_of) args.p_as_of = input.as_of
    if (input.occurred_from) args.p_occurred_from = input.occurred_from
    if (input.occurred_to) args.p_occurred_to = input.occurred_to
    if (typeof input.include_historical === 'boolean') {
      args.p_include_historical = input.include_historical
    }
    return args
  }

  private temporalAsOfArgs(input: Pick<TemporalInput, 'as_of' | 'include_historical'>) {
    const args: Record<string, unknown> = {}
    if (input.as_of) args.p_as_of = input.as_of
    if (typeof input.include_historical === 'boolean') {
      args.p_include_historical = input.include_historical
    }
    return args
  }

  private applyTextSearch(query: any, rawQuery: string) {
    const websearchQuery = rawQuery.trim().replace(/\s+/g, ' ')
    if (!websearchQuery) return query
    return query.textSearch('search_vector', websearchQuery, {
      type: 'websearch',
      config: 'english',
    })
  }

  private applyMemoryTemporalFilters(query: any, input: TemporalInput): any {
    let scoped = query
    if (input.occurred_from) {
      scoped = scoped.or(
        `occurred_until.gte.${input.occurred_from},occurred_at.gte.${input.occurred_from}`,
      )
    }
    if (input.occurred_to) {
      scoped = scoped.or(
        `occurred_at.lte.${input.occurred_to},occurred_until.lte.${input.occurred_to}`,
      )
    }
    if (input.include_historical === false) scoped = scoped.eq('temporal_status', 'current')
    if (input.as_of) {
      scoped = scoped
        .lte('valid_from', input.as_of)
        .or(`valid_until.is.null,valid_until.gt.${input.as_of}`)
    }
    return scoped
  }
}
