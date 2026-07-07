import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

const BRAIN_SELECT = 'id, owner_id, org_id, scope, agent_id, created_by'

type TemporalSearchArgs = {
  as_of?: string | null
  occurred_from?: string | null
  occurred_to?: string | null
  include_historical?: boolean
}

@Injectable()
export class BrainRetrievalRepository {
  async resolveUserBrain(client: SupabaseClient, userId: string) {
    const { data, error } = await client
      .from('ns_brains')
      .select(BRAIN_SELECT)
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve user brain: ${error.message}`)
    return data ?? null
  }

  async resolveAgentBrain(
    client: SupabaseClient,
    input: { userId: string; agentKey: string; orgId?: string | null },
  ) {
    let query = client.from('ns_brains').select(BRAIN_SELECT).eq('agent_id', input.agentKey)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.eq('owner_id', input.userId)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to resolve agent brain: ${error.message}`)
    return data ?? null
  }

  async resolveScopedBrain(
    client: SupabaseClient,
    input: { userId: string; family: string; orgId?: string | null },
  ) {
    let query = client.from('ns_brains').select(BRAIN_SELECT).eq('scope', input.family)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('owner_id', input.userId).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to resolve ${input.family} brain: ${error.message}`)
    return data ?? null
  }

  async loadBrain(client: SupabaseClient, brainId: string) {
    const { data, error } = await client
      .from('ns_brains')
      .select(BRAIN_SELECT)
      .eq('id', brainId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load brain: ${error.message}`)
    return data ?? null
  }

  async findUserShare(client: SupabaseClient, brainId: string, userId: string) {
    const { data } = await client
      .from('brain_shares')
      .select('id')
      .eq('brain_id', brainId)
      .eq('entity_type', 'user')
      .eq('entity_id', userId)
      .in('level', ['query', 'train'])
      .limit(1)
      .maybeSingle()
    return data ?? null
  }

  async findOrgShare(client: SupabaseClient, brainId: string, orgId: string) {
    const { data } = await client
      .from('brain_shares')
      .select('id')
      .eq('brain_id', brainId)
      .eq('entity_type', 'org')
      .eq('entity_id', orgId)
      .in('level', ['query', 'train'])
      .limit(1)
      .maybeSingle()
    return data ?? null
  }

  async findAgentTeamIds(client: SupabaseClient, userId: string): Promise<string[]> {
    const { data } = await client.from('agent_team_members').select('team_id').eq('user_id', userId)
    return ((data ?? []) as Array<{ team_id: string }>).map((row) => row.team_id)
  }

  async findTeamShare(client: SupabaseClient, brainId: string, teamIds: string[]) {
    const { data } = await client
      .from('brain_shares')
      .select('id')
      .eq('brain_id', brainId)
      .eq('entity_type', 'team')
      .in('entity_id', teamIds)
      .in('level', ['query', 'train'])
      .limit(1)
      .maybeSingle()
    return data ?? null
  }

  async searchMemoryVector(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    candidateLimit: number,
  ) {
    return client.rpc('search_ns_memories', {
      p_brain_id: brainId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: candidateLimit,
      p_min_significance: 0,
    })
  }

  async searchMemoryLexical(client: SupabaseClient, brainId: string, query: string, limit: number) {
    return client.rpc('search_ns_memories_lexical', {
      p_brain_id: brainId,
      p_query: query,
      p_limit: limit,
    })
  }

  async searchSnapshotLexical(
    client: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
  ) {
    return client.rpc('search_ns_snapshots_lexical', {
      p_brain_id: brainId,
      p_query: query,
      p_limit: limit,
    })
  }

  async findSimilarSnapshots(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ) {
    return client.rpc('find_similar_snapshots', {
      p_embedding: `[${embedding.join(',')}]`,
      p_brain_id: brainId,
      p_exclude_ids: [],
      p_limit: limit,
    })
  }

  async findSnapshotsByIds(client: SupabaseClient, brainId: string, ids: string[]) {
    const { data, error } = await client
      .from('ns_snapshots')
      .select(
        'id, brain_id, name, type, core, confidence, significance_score, tags, source, proof, challenge, source_type, source_id, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .in('id', ids)
      .eq('brain_id', brainId)
    if (error) throw new Error(`Snapshot fetch failed: ${error.message}`)
    return data ?? []
  }

  async traverseSnapshotEdges(client: SupabaseClient, snapshotIds: string[]) {
    return client.rpc('traverse_edges', {
      p_snapshot_ids: snapshotIds,
      p_max_depth: 2,
      p_min_strength: 0.3,
    })
  }

  async searchEvidenceChunkVector(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ) {
    return client.rpc('search_brain_evidence_chunks', {
      p_brain_id: brainId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: limit,
    })
  }

  async searchEvidenceChunkText(
    client: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
  ) {
    const textQuery = query.trim().replace(/\s+/g, ' ')
    let builder = client
      .from('ns_brain_evidence_chunks')
      .select(
        'id, brain_id, source_type, source_id, source_title, chunk_index, contextual_prefix, content, metadata, episode_id, occurred_at, occurred_until, asserted_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (textQuery) {
      builder = builder.textSearch('search_vector', textQuery, {
        type: 'websearch',
        config: 'english',
      })
    }
    return builder
  }

  async findMemoryConnections(client: SupabaseClient, memoryIds: string[]) {
    const [source, target] = await Promise.all([
      client
        .from('ns_memory_connections')
        .select('source_memory_id, target_memory_id, relationship, strength')
        .in('source_memory_id', memoryIds),
      client
        .from('ns_memory_connections')
        .select('source_memory_id, target_memory_id, relationship, strength')
        .in('target_memory_id', memoryIds),
    ])
    return { source, target }
  }

  async findRelatedMemories(client: SupabaseClient, brainId: string, relatedIds: string[]) {
    if (relatedIds.length === 0) return []
    const { data } = await client
      .from('ns_memories')
      .select('id, content, memory_type')
      .eq('brain_id', brainId)
      .in('id', relatedIds)
    return data ?? []
  }

  async findBeliefsSupportingMemories(
    client: SupabaseClient,
    brainId: string,
    memoryIds: string[],
  ) {
    const { data, error } = await client
      .from('ns_belief_patterns')
      .select('id, pattern_name, supporting_memories')
      .eq('brain_id', brainId)
      .overlaps('supporting_memories', memoryIds)
    return { data: data ?? [], error }
  }

  async searchNarrativePageVector(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ) {
    return client.rpc('search_narrative_pages', {
      p_brain_id: brainId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: limit,
    })
  }

  async searchBeliefVector(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ) {
    return client.rpc('search_ns_belief_patterns', {
      p_brain_id: brainId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: limit,
    })
  }

  async searchPerspectiveVector(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ) {
    return client.rpc('search_ns_perspectives', {
      p_brain_id: brainId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: limit,
    })
  }

  async searchNarrativePageText(
    client: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
  ) {
    const textQuery = query.trim().replace(/\s+/g, ' ')
    let builder = client
      .from('ns_narrative_pages')
      .select(
        'id, brain_id, title, page_type, summary, content_md, source_refs, tags, status, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', brainId)
      .eq('status', 'active')
      .limit(limit)
    if (textQuery) {
      builder = builder.textSearch('search_vector', textQuery, {
        type: 'websearch',
        config: 'english',
      })
    }
    return builder
  }

  async searchBeliefLexical(client: SupabaseClient, brainId: string, query: string, limit: number) {
    return client.rpc('search_ns_belief_patterns_lexical', {
      p_brain_id: brainId,
      p_query: query,
      p_limit: limit,
    })
  }

  async searchPerspectiveLexical(
    client: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
  ) {
    return client.rpc('search_ns_perspectives_lexical', {
      p_brain_id: brainId,
      p_query: query,
      p_limit: limit,
    })
  }

  async searchTimelineItemVector(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
    temporal?: TemporalSearchArgs,
  ) {
    return client.rpc('search_brain_timeline_items', {
      p_brain_id: brainId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: limit,
      ...this.temporalRpcArgs(temporal),
    })
  }

  async searchTimelineItemLexical(
    client: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
    temporal?: TemporalSearchArgs,
  ) {
    return client.rpc('search_brain_timeline_items_lexical', {
      p_brain_id: brainId,
      p_query: query,
      p_limit: limit,
      ...this.temporalRpcArgs(temporal),
    })
  }

  async findCompanyObjectEdges(client: SupabaseClient, brainId: string, objectIds: string[]) {
    const [source, target] = await Promise.all([
      client
        .from('company_cortex_object_edges')
        .select('source_object_id, target_object_id, relation_type, confidence')
        .eq('brain_id', brainId)
        .in('source_object_id', objectIds),
      client
        .from('company_cortex_object_edges')
        .select('source_object_id, target_object_id, relation_type, confidence')
        .eq('brain_id', brainId)
        .in('target_object_id', objectIds),
    ])
    return { source, target }
  }

  async findCompanyObjects(client: SupabaseClient, brainId: string, objectIds: string[]) {
    if (objectIds.length === 0) return []
    const { data } = await client
      .from('company_cortex_objects')
      .select('id, title, object_type')
      .eq('brain_id', brainId)
      .in('id', objectIds)
    return data ?? []
  }

  private temporalRpcArgs(input?: TemporalSearchArgs): Record<string, unknown> {
    const args: Record<string, unknown> = {}
    if (input?.as_of) args.p_as_of = input.as_of
    if (input?.occurred_from) args.p_occurred_from = input.occurred_from
    if (input?.occurred_to) args.p_occurred_to = input.occurred_to
    if (typeof input?.include_historical === 'boolean') {
      args.p_include_historical = input.include_historical
    }
    return args
  }
}
