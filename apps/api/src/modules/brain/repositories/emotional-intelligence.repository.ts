import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class EmotionalIntelligenceRepository {
  async findMemoryById(client: SupabaseClient, memoryId: string) {
    const { data, error } = await client.from('ns_memories').select('id').eq('id', memoryId).single()
    return { data, error }
  }

  async createEmotionalResponse(client: SupabaseClient, record: Record<string, unknown>) {
    const { data, error } = await client
      .from('ns_emotional_responses')
      .insert(record)
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async findRecentResponses(client: SupabaseClient, subjectId: string) {
    const { data } = await client
      .from('ns_emotional_responses')
      .select('id, memory_id, emotion, valence, intensity, context, session_key, created_at')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })
      .limit(50)
    return data ?? []
  }

  async findActiveBeliefsBySubject(client: SupabaseClient, subjectId: string) {
    const { data } = await client
      .from('ns_belief_patterns')
      .select('*')
      .eq('subject_id', subjectId)
      .in('status', ['emerging', 'active', 'challenged'])
      .order('strength', { ascending: false })
    return data ?? []
  }

  async findActivePerspectivesBySubject(client: SupabaseClient, subjectId: string) {
    const { data } = await client
      .from('ns_perspectives')
      .select('*')
      .eq('subject_id', subjectId)
      .in('status', ['emerging', 'active'])
      .order('strength', { ascending: false })
    return data ?? []
  }

  async findDefaultUserBrain(client: SupabaseClient, subjectId: string) {
    const { data } = await client
      .from('ns_brains')
      .select('id')
      .eq('owner_id', subjectId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .maybeSingle()
    return data ?? null
  }

  async findChargedMemories(client: SupabaseClient, brainId?: string) {
    let query = client
      .from('ns_memories')
      .select(
        'id, content, source_emotion, emotional_valence, emotional_intensity, speaker_intent, memory_type, created_at',
      )
      .not('source_emotion', 'is', null)
    if (brainId) query = query.eq('brain_id', brainId)
    const { data } = await query.order('emotional_intensity', { ascending: false }).limit(10)
    return data ?? []
  }

  async findEmotionTaggedMemories(client: SupabaseClient, brainId: string, since: string) {
    const { data } = await client
      .from('ns_memories')
      .select(
        'id, content, memory_type, source_emotion, emotional_valence, emotional_intensity, speaker_intent, significance, tags, created_at',
      )
      .eq('brain_id', brainId)
      .not('source_emotion', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100)
    return data ?? []
  }

  async findBeliefByName(client: SupabaseClient, subjectId: string, patternName: string) {
    const { data } = await client
      .from('ns_belief_patterns')
      .select('id, strength')
      .eq('subject_id', subjectId)
      .eq('pattern_name', patternName)
      .limit(1)
    return data ?? []
  }

  async reinforceBelief(client: SupabaseClient, id: string, update: Record<string, unknown>) {
    await client.from('ns_belief_patterns').update(update).eq('id', id)
  }

  async createBelief(client: SupabaseClient, record: Record<string, unknown>) {
    const { data, error } = await client.from('ns_belief_patterns').insert(record).select().single()
    return { data, error }
  }

  async findPatternsBySubject(client: SupabaseClient, subjectId: string) {
    const { data, error } = await client
      .from('ns_belief_patterns')
      .select('*')
      .eq('subject_id', subjectId)
      .in('status', ['emerging', 'active', 'challenged'])
      .order('strength', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findPatternsByBrain(client: SupabaseClient, brainId: string) {
    const { data, error } = await client
      .from('ns_belief_patterns')
      .select('*')
      .eq('brain_id', brainId)
      .in('status', ['emerging', 'active', 'challenged', 'transforming'])
      .order('strength', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findPerspectivesBySubject(client: SupabaseClient, subjectId: string) {
    const { data, error } = await client
      .from('ns_perspectives')
      .select('*')
      .eq('subject_id', subjectId)
      .in('status', ['emerging', 'active'])
      .order('strength', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findPerspectivesByBrain(client: SupabaseClient, brainId: string) {
    const { data, error } = await client
      .from('ns_perspectives')
      .select('*')
      .eq('brain_id', brainId)
      .in('status', ['emerging', 'active', 'shifting'])
      .order('strength', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findCustomerAvatarsByBrain(client: SupabaseClient, brainId: string) {
    const { data, error } = await client
      .from('customer_avatars')
      .select('*')
      .eq('brain_id', brainId)
      .in('status', ['emerging', 'active', 'shifting'])
      .order('strength', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }
}
