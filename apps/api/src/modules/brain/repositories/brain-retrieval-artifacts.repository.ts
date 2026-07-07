import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

const SK_ENTRY_SELECT =
  'id, brain_id, title, content, entry_type, domain, confidence, mastery, tags, source_id, metadata, episode_id, occurred_at, occurred_until, asserted_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source'
const COMPANY_OBJECT_SELECT =
  'id, brain_id, org_id, object_type, title, truth, status, confidence, evidence_refs, retrieval_rule, metadata, effective_from, effective_until, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source'

type RetrievalSearchQuery = PromiseLike<{
  data: Array<Record<string, unknown>> | null
  error: { message: string } | null
}>

@Injectable()
export class BrainRetrievalArtifactsRepository {
  private applyTextSearch(query: any, rawQuery: string): RetrievalSearchQuery {
    const websearchQuery = rawQuery.trim().replace(/\s+/g, ' ')
    if (!websearchQuery) return query
    return query.textSearch('search_vector', websearchQuery, {
      type: 'websearch',
      config: 'english',
    })
  }

  searchSkVector(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ): RetrievalSearchQuery {
    return client.rpc('search_sk_entries', {
      p_brain_id: brainId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.4,
      p_match_count: limit,
      p_domain: null,
      p_min_mastery: 0,
    })
  }

  searchSkText(
    client: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
  ): RetrievalSearchQuery {
    return this.applyTextSearch(
      client
        .from('ns_sk_entries')
        .select(SK_ENTRY_SELECT)
        .eq('brain_id', brainId)
        .order('mastery', { ascending: false })
        .limit(limit),
      query,
    )
  }

  async searchSkKeywordRows(
    client: SupabaseClient,
    brainId: string,
    terms: string[],
    candidateLimit: number,
  ): Promise<Array<Record<string, unknown>>> {
    if (terms.length === 0) return []
    const orFilter = terms
      .flatMap((term) => [
        `title.ilike.%${term}%`,
        `content.ilike.%${term}%`,
        `domain.ilike.%${term}%`,
      ])
      .join(',')
    const { data, error } = await client
      .from('ns_sk_entries')
      .select(SK_ENTRY_SELECT)
      .eq('brain_id', brainId)
      .or(orFilter)
      .order('mastery', { ascending: false })
      .limit(Math.min(candidateLimit * 3, 50))
    if (error) return []
    return ((data ?? []) as Array<Record<string, unknown>>).map((row, index) => ({
      ...row,
      lexical_rank: Number(row.lexical_rank ?? index + 1),
    }))
  }

  searchCompanyObjectVector(
    client: SupabaseClient,
    brainId: string,
    orgId: string | null,
    embedding: number[],
    limit: number,
  ): RetrievalSearchQuery {
    return client.rpc('search_company_cortex_objects', {
      p_brain_id: brainId,
      p_org_id: orgId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_count: limit,
      p_match_threshold: 0.35,
    })
  }

  searchCompanyObjectText(
    client: SupabaseClient,
    brainId: string,
    orgId: string | null,
    query: string,
    limit: number,
  ): RetrievalSearchQuery {
    return this.applyTextSearch(
      client
        .from('company_cortex_objects')
        .select(COMPANY_OBJECT_SELECT)
        .eq('brain_id', brainId)
        .eq('org_id', orgId)
        .neq('status', 'retired')
        .order('confidence', { ascending: false })
        .limit(limit),
      query,
    )
  }

  searchCompanySignalVector(
    client: SupabaseClient,
    brainId: string,
    orgId: string,
    embedding: number[],
    limit: number,
  ): RetrievalSearchQuery {
    return client.rpc('search_company_cortex_signals', {
      p_brain_id: brainId,
      p_org_id: orgId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: limit,
    })
  }

  searchCompanySignalText(
    client: SupabaseClient,
    brainId: string,
    orgId: string,
    query: string,
    limit: number,
  ): RetrievalSearchQuery {
    return client.rpc('search_company_cortex_signals_lexical', {
      p_brain_id: brainId,
      p_org_id: orgId,
      p_query: query,
      p_limit: limit,
    })
  }

  searchCustomerAvatarVector(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ): RetrievalSearchQuery {
    return client.rpc('search_customer_avatars', {
      p_brain_id: brainId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: limit,
    })
  }

  searchCustomerAvatarText(
    client: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
  ): RetrievalSearchQuery {
    return client.rpc('search_customer_avatars_lexical', {
      p_brain_id: brainId,
      p_query: query,
      p_limit: limit,
    })
  }

  searchAvatarAxisVector(
    client: SupabaseClient,
    orgId: string,
    embedding: number[],
    limit: number,
  ): RetrievalSearchQuery {
    return client.rpc('search_avatar_discriminator_axes', {
      p_org_id: orgId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: limit,
    })
  }

  searchAvatarAxisText(
    client: SupabaseClient,
    orgId: string,
    query: string,
    limit: number,
  ): RetrievalSearchQuery {
    return client.rpc('search_avatar_discriminator_axes_lexical', {
      p_org_id: orgId,
      p_query: query,
      p_limit: limit,
    })
  }
}
