import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type ListResult<T = Record<string, unknown>> = { data: T[] | null; error: QueryError | null }

@Injectable()
export class BrainRetrievalRelationRepository {
  async listMemoryConnectionsBySourceIds(
    supabase: SupabaseClient,
    memoryIds: string[],
  ): Promise<ListResult> {
    return (await supabase
      .from('ns_memory_connections')
      .select('source_memory_id, target_memory_id, relationship, strength')
      .in('source_memory_id', memoryIds)) as ListResult
  }

  async listMemoryConnectionsByTargetIds(
    supabase: SupabaseClient,
    memoryIds: string[],
  ): Promise<ListResult> {
    return (await supabase
      .from('ns_memory_connections')
      .select('source_memory_id, target_memory_id, relationship, strength')
      .in('target_memory_id', memoryIds)) as ListResult
  }

  async listMemoryRowsByIds(
    supabase: SupabaseClient,
    input: { brainId: string; ids: string[] },
  ): Promise<ListResult> {
    if (input.ids.length === 0) return { data: [], error: null }
    return (await supabase
      .from('ns_memories')
      .select('id, content, memory_type')
      .eq('brain_id', input.brainId)
      .in('id', input.ids)) as ListResult
  }

  async listBeliefPatternRowsBySupportingMemories(
    supabase: SupabaseClient,
    input: { brainId: string; memoryIds: string[] },
  ): Promise<ListResult> {
    return (await supabase
      .from('ns_belief_patterns')
      .select('id, pattern_name, supporting_memories')
      .eq('brain_id', input.brainId)
      .overlaps('supporting_memories', input.memoryIds)) as ListResult
  }

  async listCompanyObjectEdgesBySourceIds(
    supabase: SupabaseClient,
    input: { brainId: string; objectIds: string[] },
  ): Promise<ListResult> {
    return (await supabase
      .from('company_cortex_object_edges')
      .select('source_object_id, target_object_id, relation_type, confidence')
      .eq('brain_id', input.brainId)
      .in('source_object_id', input.objectIds)) as ListResult
  }

  async listCompanyObjectEdgesByTargetIds(
    supabase: SupabaseClient,
    input: { brainId: string; objectIds: string[] },
  ): Promise<ListResult> {
    return (await supabase
      .from('company_cortex_object_edges')
      .select('source_object_id, target_object_id, relation_type, confidence')
      .eq('brain_id', input.brainId)
      .in('target_object_id', input.objectIds)) as ListResult
  }

  async listCompanyObjectRowsByIds(
    supabase: SupabaseClient,
    input: { brainId: string; ids: string[] },
  ): Promise<ListResult> {
    if (input.ids.length === 0) return { data: [], error: null }
    return (await supabase
      .from('company_cortex_objects')
      .select('id, title, object_type')
      .eq('brain_id', input.brainId)
      .in('id', input.ids)) as ListResult
  }
}
