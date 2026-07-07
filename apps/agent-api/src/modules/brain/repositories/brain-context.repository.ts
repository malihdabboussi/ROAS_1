import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type ListResult<T = Record<string, unknown>> = { data: T[] | null; error: QueryError | null }
type MaybeResult<T = Record<string, unknown>> = { data: T | null; error: QueryError | null }

@Injectable()
export class BrainContextRepository {
  async searchUserMemories(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; limit: number },
  ): Promise<ListResult> {
    return (await supabase.rpc('search_ns_memories', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.25,
      p_match_count: input.limit,
      p_min_significance: 0,
    })) as ListResult
  }

  async findSimilarSnapshots(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; limit: number },
  ): Promise<ListResult<{ id: string; similarity: number }>> {
    return (await supabase.rpc('find_similar_snapshots', {
      p_embedding: input.embedding,
      p_brain_id: input.brainId,
      p_exclude_ids: [],
      p_limit: input.limit,
    })) as ListResult<{ id: string; similarity: number }>
  }

  async searchSkEntries(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; limit: number },
  ): Promise<ListResult> {
    return (await supabase.rpc('search_sk_entries', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: 0.4,
      p_match_count: input.limit,
      p_domain: null,
      p_min_mastery: 0,
    })) as ListResult
  }

  async findActiveAgentAddonBrainId(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; orgId?: string | null },
  ): Promise<MaybeResult<{ brain_id: string | null }>> {
    let query = supabase
      .from('user_addons')
      .select('brain_id')
      .eq('user_id', input.userId)
      .eq('addon_slug', 'agent-brain')
      .eq('agent_id', input.agentKey)
      .eq('status', 'active')
    if (input.orgId !== undefined)
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.maybeSingle()) as MaybeResult<{ brain_id: string | null }>
  }

  async findAgentBrainId(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; orgId?: string | null },
  ): Promise<MaybeResult<{ id: string }>> {
    let query = supabase
      .from('ns_brains')
      .select('id')
      .eq('owner_id', input.userId)
      .eq('agent_id', input.agentKey)
    if (input.orgId !== undefined)
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.maybeSingle()) as MaybeResult<{ id: string }>
  }

  async findDefaultUserBrainId(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<MaybeResult<{ id: string }>> {
    let query = supabase
      .from('ns_brains')
      .select('id')
      .eq('owner_id', input.userId)
      .eq('is_default', true)
      .eq('scope', 'user')
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.maybeSingle()) as MaybeResult<{ id: string }>
  }

  async findBrainCortexFlag(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<MaybeResult<{ cortex_max?: boolean | null }>> {
    return (await supabase
      .from('ns_brains')
      .select('cortex_max')
      .eq('id', brainId)
      .maybeSingle()) as MaybeResult<{ cortex_max?: boolean | null }>
  }

  async findCapsuleNarrativePage(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<MaybeResult<{ content_md: string | null }>> {
    return (await supabase
      .from('ns_narrative_pages')
      .select('content_md')
      .eq('brain_id', brainId)
      .eq('page_type', 'capsule')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()) as MaybeResult<{ content_md: string | null }>
  }

  async listNarrativePageIndex(supabase: SupabaseClient, brainId: string): Promise<ListResult> {
    return (await supabase
      .from('ns_narrative_pages')
      .select('slug, title, page_type, summary')
      .eq('brain_id', brainId)
      .eq('status', 'active')
      .neq('page_type', 'capsule')
      .order('updated_at', { ascending: false })) as ListResult
  }

  async searchNarrativePages(
    supabase: SupabaseClient,
    input: { brainId: string; embedding: string; threshold: number; count: number },
  ): Promise<ListResult> {
    return (await supabase.rpc('search_narrative_pages', {
      p_brain_id: input.brainId,
      p_query_embedding: input.embedding,
      p_match_threshold: input.threshold,
      p_match_count: input.count,
    })) as ListResult
  }

  async traverseSnapshotEdges(
    supabase: SupabaseClient,
    input: { snapshotIds: string[]; maxDepth: number; minStrength: number },
  ): Promise<ListResult> {
    return (await supabase.rpc('traverse_edges', {
      p_snapshot_ids: input.snapshotIds,
      p_max_depth: input.maxDepth,
      p_min_strength: input.minStrength,
    })) as ListResult
  }

  async listMemoriesByIds(
    supabase: SupabaseClient,
    ids: string[],
    brainId?: string,
  ): Promise<ListResult> {
    let query = supabase
      .from('ns_memories')
      .select('id, content, memory_type, significance, tags, updated_at, last_recalled_at')
      .in('id', ids)
    if (brainId) query = query.eq('brain_id', brainId)
    return (await query) as ListResult
  }

  async listSkEntriesByIds(
    supabase: SupabaseClient,
    ids: string[],
    brainId?: string,
  ): Promise<ListResult> {
    let query = supabase
      .from('ns_sk_entries')
      .select('id, title, content, entry_type, domain, mastery, tags, updated_at, last_recalled_at')
      .in('id', ids)
    if (brainId) query = query.eq('brain_id', brainId)
    return (await query) as ListResult
  }

  async listSnapshotsByIds(
    supabase: SupabaseClient,
    brainId: string,
    ids: string[],
  ): Promise<ListResult> {
    return (await supabase
      .from('ns_snapshots')
      .select('id, name, core, confidence, updated_at')
      .in('id', ids)
      .eq('brain_id', brainId)) as ListResult
  }

  async listTopUserMemories(
    supabase: SupabaseClient,
    brainId: string,
    limit: number,
  ): Promise<ListResult> {
    return (await supabase
      .from('ns_memories')
      .select('id, content, memory_type, significance, tags, updated_at, last_recalled_at')
      .eq('brain_id', brainId)
      .gte('significance', 0.6)
      .order('significance', { ascending: false })
      .limit(limit)) as ListResult
  }

  async listTopUserSnapshots(
    supabase: SupabaseClient,
    brainId: string,
    limit: number,
  ): Promise<ListResult> {
    return (await supabase
      .from('ns_snapshots')
      .select('id, name, core, confidence, updated_at')
      .eq('brain_id', brainId)
      .gte('confidence', 0.6)
      .order('confidence', { ascending: false })
      .limit(limit)) as ListResult
  }

  async listTopAgentSk(
    supabase: SupabaseClient,
    brainId: string,
    limit: number,
  ): Promise<ListResult> {
    return (await supabase
      .from('ns_sk_entries')
      .select('id, title, content, entry_type, domain, mastery, tags, updated_at, last_recalled_at')
      .eq('brain_id', brainId)
      .gte('mastery', 0.2)
      .order('mastery', { ascending: false })
      .limit(limit)) as ListResult
  }

  async listTopAgentSnapshots(
    supabase: SupabaseClient,
    brainId: string,
    limit: number,
  ): Promise<ListResult> {
    return (await supabase
      .from('ns_snapshots')
      .select('id, name, core, confidence, updated_at')
      .eq('brain_id', brainId)
      .gte('confidence', 0.5)
      .order('confidence', { ascending: false })
      .limit(limit)) as ListResult
  }
}
