import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type ListResult<T = Record<string, unknown>> = { data: T[] | null; error: QueryError | null }

@Injectable()
export class BrainEmotionalIntelligenceRepository {
  async findMemoryById(
    supabase: SupabaseClient,
    memoryId: string,
  ): Promise<QueryResult<{ id: string }>> {
    return supabase.from('ns_memories').select('id').eq('id', memoryId).single()
  }

  async createEmotionalResponse(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return supabase.from('ns_emotional_responses').insert(payload).select().single()
  }

  async listRecentResponses(
    supabase: SupabaseClient,
    subjectId: string,
  ): Promise<ListResult> {
    return supabase
      .from('ns_emotional_responses')
      .select('id, memory_id, emotion, valence, intensity, context, session_key, created_at')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })
      .limit(50)
  }

  async listActiveBeliefs(supabase: SupabaseClient, subjectId: string): Promise<ListResult> {
    return supabase
      .from('ns_belief_patterns')
      .select('*')
      .eq('subject_id', subjectId)
      .in('status', ['emerging', 'active', 'challenged'])
      .order('strength', { ascending: false })
  }

  async listActivePerspectives(supabase: SupabaseClient, subjectId: string): Promise<ListResult> {
    return supabase
      .from('ns_perspectives')
      .select('*')
      .eq('subject_id', subjectId)
      .in('status', ['emerging', 'active'])
      .order('strength', { ascending: false })
  }

  async findDefaultUserBrainId(
    supabase: SupabaseClient,
    subjectId: string,
  ): Promise<QueryResult<{ id: string }>> {
    return supabase
      .from('ns_brains')
      .select('id')
      .eq('owner_id', subjectId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .maybeSingle()
  }

  async listChargedMemories(
    supabase: SupabaseClient,
    brainId?: string | null,
  ): Promise<ListResult> {
    let query = supabase
      .from('ns_memories')
      .select(
        'id, content, source_emotion, emotional_valence, emotional_intensity, speaker_intent, memory_type, created_at',
      )
      .not('source_emotion', 'is', null)
    if (brainId) query = query.eq('brain_id', brainId)
    return query.order('emotional_intensity', { ascending: false }).limit(10)
  }

  async listResponsesSince(
    supabase: SupabaseClient,
    input: { subjectId: string; since: string },
  ): Promise<ListResult> {
    return supabase
      .from('ns_emotional_responses')
      .select('id, memory_id, emotion, valence, intensity, context, created_at')
      .eq('subject_id', input.subjectId)
      .gte('created_at', input.since)
      .order('created_at', { ascending: false })
  }

  async listMemoriesByIds(supabase: SupabaseClient, memoryIds: string[]): Promise<ListResult> {
    return supabase
      .from('ns_memories')
      .select('id, content, memory_type, source_emotion, speaker_intent')
      .in('id', memoryIds)
  }

  async findBeliefPatternByName(
    supabase: SupabaseClient,
    input: { subjectId: string; patternName: string },
  ): Promise<ListResult<{ id: string; strength?: number | null }>> {
    return supabase
      .from('ns_belief_patterns')
      .select('id, strength')
      .eq('subject_id', input.subjectId)
      .eq('pattern_name', input.patternName)
      .limit(1)
  }

  async reinforceBeliefPattern(
    supabase: SupabaseClient,
    input: { id: string; update: Record<string, unknown> },
  ): Promise<void> {
    await supabase.from('ns_belief_patterns').update(input.update).eq('id', input.id)
  }

  async createBeliefPattern(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return supabase.from('ns_belief_patterns').insert(payload).select().single()
  }
}
