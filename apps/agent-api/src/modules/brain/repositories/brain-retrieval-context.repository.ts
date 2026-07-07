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
export class BrainRetrievalContextRepository {
  async searchEvidenceChunkVectorRows(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; candidateLimit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_brain_evidence_chunks', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.25,
      p_match_count: input.candidateLimit,
      ...this.temporalRpcArgs(input),
    })) as ListResult
  }

  async searchEvidenceChunkTextRows(
    supabase: SupabaseClient,
    input: { brainId: string; query: string; candidateLimit: number } & TemporalInput,
  ): Promise<ListResult> {
    const query = supabase
      .from('ns_brain_evidence_chunks')
      .select(
        'id, brain_id, source_type, source_id, source_title, chunk_index, contextual_prefix, content, metadata, episode_id, occurred_at, occurred_until, asserted_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', input.brainId)
      .order('created_at', { ascending: false })
      .limit(input.candidateLimit)
    return (await this.applyTextSearch(
      this.applyMemoryTemporalFilters(query, input),
      input.query,
    )) as ListResult
  }

  async searchSkVectorRows(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; candidateLimit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_sk_entries', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.4,
      p_match_count: input.candidateLimit,
      p_domain: null,
      p_min_mastery: 0,
      ...this.temporalRpcArgs(input),
    })) as ListResult
  }

  async searchSkTextRows(
    supabase: SupabaseClient,
    input: { brainId: string; query: string; candidateLimit: number } & TemporalInput,
  ): Promise<ListResult> {
    const query = supabase
      .from('ns_sk_entries')
      .select(
        'id, brain_id, title, content, entry_type, domain, confidence, mastery, tags, source_id, metadata, episode_id, occurred_at, occurred_until, asserted_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', input.brainId)
      .order('mastery', { ascending: false })
      .limit(input.candidateLimit)
    return (await this.applyTextSearch(
      this.applyEvidenceTemporalFilters(query, input),
      input.query,
    )) as ListResult
  }

  async searchSkKeywordRows(
    supabase: SupabaseClient,
    input: { brainId: string; terms: string[]; candidateLimit: number } & TemporalInput,
  ): Promise<ListResult> {
    if (input.terms.length === 0) return { data: [], error: null }
    const orFilter = input.terms
      .flatMap((term) => [
        `title.ilike.%${term}%`,
        `content.ilike.%${term}%`,
        `domain.ilike.%${term}%`,
      ])
      .join(',')
    const result = (await this.applyMemoryTemporalFilters(
      supabase
        .from('ns_sk_entries')
        .select(
          'id, brain_id, title, content, entry_type, domain, confidence, mastery, tags, source_id, metadata, episode_id, occurred_at, occurred_until, asserted_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
        )
        .eq('brain_id', input.brainId)
        .or(orFilter)
        .order('mastery', { ascending: false })
        .limit(Math.min(input.candidateLimit * 3, 50)),
      input,
    )) as ListResult
    if (result.error) return result
    return {
      data: (result.data ?? []).map((row, index) => ({
        ...row,
        lexical_rank: Number(row.lexical_rank ?? index + 1),
      })),
      error: null,
    }
  }

  async searchTimelineVectorRows(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; limit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_brain_timeline_items', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.25,
      p_match_count: input.limit,
      ...this.temporalRpcArgs(input),
    })) as ListResult
  }

  async searchTimelineLexicalRows(
    supabase: SupabaseClient,
    input: { brainId: string; query: string; limit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_brain_timeline_items_lexical', {
      p_brain_id: input.brainId,
      p_query: input.query,
      p_limit: input.limit,
      ...this.temporalRpcArgs(input),
    })) as ListResult
  }

  async searchCompanySignalVectorRows(
    supabase: SupabaseClient,
    input: { brainId: string; orgId: string; embedding: string; candidateLimit: number } &
      TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_company_cortex_signals', {
      p_brain_id: input.brainId,
      p_org_id: input.orgId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.25,
      p_match_count: input.candidateLimit,
      ...this.temporalAsOfArgs(input),
    })) as ListResult
  }

  async searchCompanySignalLexicalRows(
    supabase: SupabaseClient,
    input: { brainId: string; orgId: string; query: string; candidateLimit: number } &
      TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_company_cortex_signals_lexical', {
      p_brain_id: input.brainId,
      p_org_id: input.orgId,
      p_query: input.query,
      p_limit: input.candidateLimit,
      ...this.temporalAsOfArgs(input),
    })) as ListResult
  }

  async searchNarrativePageVectorRows(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; limit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_narrative_pages', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.25,
      p_match_count: input.limit,
      ...this.temporalAsOfArgs(input),
    })) as ListResult
  }

  async searchBeliefPatternVectorRows(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; limit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_ns_belief_patterns', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.25,
      p_match_count: input.limit,
      ...this.temporalAsOfArgs(input),
    })) as ListResult
  }

  async searchPerspectiveVectorRows(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; limit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_ns_perspectives', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.25,
      p_match_count: input.limit,
      ...this.temporalAsOfArgs(input),
    })) as ListResult
  }

  async searchNarrativePageTextRows(
    supabase: SupabaseClient,
    input: { brainId: string; query: string; limit: number },
  ): Promise<ListResult> {
    return (await this.applyTextSearch(
      supabase
        .from('ns_narrative_pages')
        .select(
          'id, brain_id, title, page_type, summary, content_md, source_refs, tags, status, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
        )
        .eq('brain_id', input.brainId)
        .eq('status', 'active')
        .limit(input.limit),
      input.query,
    )) as ListResult
  }

  async searchBeliefPatternLexicalRows(
    supabase: SupabaseClient,
    input: { brainId: string; query: string; limit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_ns_belief_patterns_lexical', {
      p_brain_id: input.brainId,
      p_query: input.query,
      p_limit: input.limit,
      ...this.temporalAsOfArgs(input),
    })) as ListResult
  }

  async searchPerspectiveLexicalRows(
    supabase: SupabaseClient,
    input: { brainId: string; query: string; limit: number } & TemporalInput,
  ): Promise<ListResult> {
    return (await supabase.rpc('search_ns_perspectives_lexical', {
      p_brain_id: input.brainId,
      p_query: input.query,
      p_limit: input.limit,
      ...this.temporalAsOfArgs(input),
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

  private applyEvidenceTemporalFilters(query: any, input: TemporalInput): any {
    let scoped = query
    if (input.occurred_from) {
      scoped = scoped.or(
        `evidence_ended_at.gte.${input.occurred_from},evidence_started_at.gte.${input.occurred_from},effective_until.gte.${input.occurred_from}`,
      )
    }
    if (input.occurred_to) {
      scoped = scoped.or(
        `evidence_started_at.lte.${input.occurred_to},evidence_ended_at.lte.${input.occurred_to},effective_from.lte.${input.occurred_to}`,
      )
    }
    if (input.include_historical === false) scoped = scoped.eq('temporal_status', 'current')
    if (input.as_of) {
      scoped = scoped
        .or(`valid_from.is.null,valid_from.lte.${input.as_of},effective_from.lte.${input.as_of}`)
        .or(`valid_until.is.null,valid_until.gt.${input.as_of},effective_until.gt.${input.as_of}`)
    }
    return scoped
  }
}
