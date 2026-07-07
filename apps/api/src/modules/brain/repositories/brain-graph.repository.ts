import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MEMORY_GRAPH_SELECT } from './memories.repository'
import { SNAPSHOT_GRAPH_SELECT } from './snapshots.repository'

const BELIEF_SELECT =
  'id, pattern_name, description, status, strength, supporting_memories, detected_at, created_at, updated_at, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source'
const PERSPECTIVE_SELECT =
  'id, name, description, status, strength, beliefs, influence_areas, blind_spots, detected_at, created_at, updated_at, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source'

@Injectable()
export class BrainGraphRepository {
  async findAccessibleBrainForSkGraph(
    client: SupabaseClient,
    userId: string,
    brainId: string,
    orgId?: string | null,
  ) {
    let query = client.from('ns_brains').select('id').eq('id', brainId)
    if (orgId) {
      query = query.or(`org_id.eq.${orgId},and(owner_id.eq.${userId},org_id.is.null)`)
    } else {
      query = query.eq('owner_id', userId)
    }
    const { data } = await query.maybeSingle()
    return data ?? null
  }

  async findSkSources(client: SupabaseClient, brainId: string, limit: number) {
    const { data } = await client
      .from('ns_sk_sources')
      .select(
        'id, brain_id, source_type, title, domain, created_at, episode_id, occurred_at, occurred_until, asserted_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }

  async findSkEntries(client: SupabaseClient, brainId: string, limit: number) {
    const { data } = await client
      .from('ns_sk_entries')
      .select(
        'id, brain_id, source_id, entry_type, title, content, domain, confidence, mastery, created_at, episode_id, occurred_at, occurred_until, asserted_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }

  async countSkEntries(client: SupabaseClient, brainId: string) {
    const { count } = await client
      .from('ns_sk_entries')
      .select('*', { count: 'exact', head: true })
      .eq('brain_id', brainId)
    return count ?? 0
  }

  async countSkSources(client: SupabaseClient, brainId: string) {
    const { count } = await client
      .from('ns_sk_sources')
      .select('*', { count: 'exact', head: true })
      .eq('brain_id', brainId)
    return count ?? 0
  }

  async findBrainScope(client: SupabaseClient, brainId: string) {
    const { data } = await client
      .from('ns_brains')
      .select('id, scope, org_id')
      .eq('id', brainId)
      .maybeSingle()
    return data ?? null
  }

  async countMemories(client: SupabaseClient, brainId: string) {
    const { count } = await client
      .from('ns_memories')
      .select('*', { count: 'exact', head: true })
      .eq('brain_id', brainId)
    return count ?? 0
  }

  async findCompanyGraphRows(
    client: SupabaseClient,
    brainId: string,
    orgId: string | null,
    limit: number,
  ) {
    const signalLimit = Math.min(80, limit)
    let objectsQuery = client
      .from('company_cortex_objects')
      .select(
        'id, object_type, title, truth, status, confidence, source_signal_ids, retrieval_rule, metadata, created_at, updated_at, effective_from, effective_until, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', brainId)
      .neq('status', 'retired')
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (orgId) objectsQuery = objectsQuery.eq('org_id', orgId)

    let signalsQuery = client
      .from('company_cortex_signals')
      .select(
        'id, signal_type, truth, confidence, status, created_at, updated_at, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', brainId)
      .in('status', ['proposed', 'active', 'merged'])
      .order('created_at', { ascending: false })
      .limit(signalLimit)
    if (orgId) signalsQuery = signalsQuery.eq('org_id', orgId)

    let edgesQuery = client
      .from('company_cortex_object_edges')
      .select('id, source_object_id, target_object_id, relation_type, confidence')
      .eq('brain_id', brainId)
    if (orgId) edgesQuery = edgesQuery.eq('org_id', orgId)

    const [{ data: objects }, { data: signals }, { data: edges }] = await Promise.all([
      objectsQuery,
      signalsQuery,
      edgesQuery,
    ])
    return {
      objects: (objects ?? []) as Array<Record<string, unknown>>,
      signals: (signals ?? []) as Array<Record<string, unknown>>,
      edges: (edges ?? []) as Array<Record<string, unknown>>,
    }
  }

  async findMemoriesForBrain(
    client: SupabaseClient,
    brainId: string,
    limit: number,
    minSignificance?: number,
    memoryType?: string,
  ) {
    let query = client
      .from('ns_memories')
      .select(MEMORY_GRAPH_SELECT)
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
    if (memoryType) query = query.eq('memory_type', memoryType)
    if (minSignificance != null) query = query.gte('significance', minSignificance)
    const { data, error } = await query.limit(limit)
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data as Array<Record<string, unknown>>) ?? []
  }

  async findSnapshotsForBrain(client: SupabaseClient, brainId: string, limit: number) {
    const { data, error } = await client
      .from('ns_snapshots')
      .select(SNAPSHOT_GRAPH_SELECT)
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100))
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data as Array<Record<string, unknown>>) ?? []
  }

  async fetchCognitionByBrain(client: SupabaseClient, brainId: string) {
    const [
      { data: beliefs, error: beliefsError },
      { data: perspectives, error: perspectivesError },
    ] = await Promise.all([
      client
        .from('ns_belief_patterns')
        .select(BELIEF_SELECT)
        .eq('brain_id', brainId)
        .in('status', ['emerging', 'active', 'challenged', 'transforming']),
      client
        .from('ns_perspectives')
        .select(PERSPECTIVE_SELECT)
        .eq('brain_id', brainId)
        .in('status', ['emerging', 'active', 'shifting']),
    ])
    if (beliefsError) throw new Error(`DB error: ${beliefsError.message}`)
    if (perspectivesError) throw new Error(`DB error: ${perspectivesError.message}`)
    return { beliefs: beliefs ?? [], perspectives: perspectives ?? [] }
  }

  async fetchCognition(client: SupabaseClient, subjectId: string) {
    const [{ data: beliefs }, { data: perspectives }] = await Promise.all([
      client
        .from('ns_belief_patterns')
        .select(BELIEF_SELECT)
        .eq('subject_id', subjectId)
        .in('status', ['emerging', 'active', 'challenged', 'transforming']),
      client
        .from('ns_perspectives')
        .select(PERSPECTIVE_SELECT)
        .eq('subject_id', subjectId)
        .in('status', ['emerging', 'active', 'shifting']),
    ])
    return { beliefs: beliefs ?? [], perspectives: perspectives ?? [] }
  }
}
