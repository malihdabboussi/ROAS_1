import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SearchRepository {
  async resolveBrainId(
    client: SupabaseClient,
    userId: string,
    brainId?: string,
    agentId?: string,
    orgId?: string | null,
  ): Promise<string | null> {
    if (brainId?.trim()) {
      const { data, error } = await client
        .from('ns_brains')
        .select('id')
        .eq('id', brainId.trim())
        .maybeSingle()
      if (error) throw new Error(`Failed to resolve brain: ${error.message}`)
      return data?.id ?? null
    }

    if (agentId?.trim()) {
      let query = client.from('ns_brains').select('id').eq('agent_id', agentId.trim())
      query = orgId ? query.eq('org_id', orgId) : query.eq('owner_id', userId).is('org_id', null)
      const { data, error } = await query.maybeSingle()
      if (error) throw new Error(`Failed to resolve agent brain: ${error.message}`)
      return data?.id ?? null
    }

    const { data, error } = await client
      .from('ns_brains')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
    if (error) throw new Error(`Failed to resolve default brain: ${error.message}`)
    return data?.[0]?.id ?? null
  }

  async findMemoryTextMatches(
    client: SupabaseClient,
    brainId: string,
    query: string,
    limit: number,
  ) {
    const { data, error } = await client
      .from('ns_memories')
      .select('id, content, memory_type, confidence, significance, tags')
      .eq('brain_id', brainId)
      .ilike('content', `%${query}%`)
      .order('significance', { ascending: false })
      .limit(limit)
    return { data: data ?? [], error }
  }

  async searchSkEntries(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ) {
    const { data, error } = await client.rpc('search_sk_entries', {
      p_brain_id: brainId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.4,
      p_match_count: limit,
      p_domain: null,
      p_min_mastery: 0,
    })
    return { data: data ?? [], error }
  }

  async searchMemories(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ) {
    const { data, error } = await client.rpc('search_ns_memories', {
      p_brain_id: brainId,
      p_query_embedding: `[${embedding.join(',')}]`,
      p_match_threshold: 0.25,
      p_match_count: limit,
      p_min_significance: 0,
    })
    return { data: data ?? [], error }
  }

  async findSimilarSnapshots(
    client: SupabaseClient,
    brainId: string,
    embedding: number[],
    limit: number,
  ) {
    const { data, error } = await client.rpc('find_similar_snapshots', {
      p_embedding: `[${embedding.join(',')}]`,
      p_brain_id: brainId,
      p_exclude_ids: [],
      p_limit: limit,
    })
    if (error) throw new Error(`Semantic search failed: ${error.message}`)
    return data ?? []
  }

  async traverseEdges(client: SupabaseClient, snapshotIds: string[]) {
    const { data, error } = await client.rpc('traverse_edges', {
      p_snapshot_ids: snapshotIds,
      p_max_depth: 2,
      p_min_strength: 0.3,
    })
    if (error) throw new Error(`Graph traversal failed: ${error.message}`)
    return data ?? []
  }

  async searchSnapshotsFts(client: SupabaseClient, brainId: string, query: string, limit: number) {
    const { data, error } = await client.rpc('search_snapshots_fts', {
      p_brain_id: brainId,
      p_query: query,
      p_limit: limit,
    })
    if (error) throw new Error(`Summary search failed: ${error.message}`)
    return data ?? []
  }

  async findSnapshotsByIds(client: SupabaseClient, ids: string[]) {
    if (!ids.length) return []
    const { data, error } = await client
      .from('ns_snapshots')
      .select('id, name, type, core, confidence, significance_score, tags')
      .in('id', ids)
    if (error) throw new Error(`Failed to fetch snapshots: ${error.message}`)
    return data ?? []
  }
}
