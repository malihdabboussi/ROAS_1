import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmotionalIntelligenceRepository } from '../repositories/emotional-intelligence.repository'
import { EmbeddingService } from './embedding.service'

/**
 * Emotional Intelligence Service (Dispenza Layers 3-5)
 *
 * Layer 3: Record and retrieve emotional responses to memories
 * Layer 4: Detect belief patterns from emotional response clusters
 * Layer 5: Synthesize perspectives from belief pattern clusters
 */
@Injectable()
export class EmotionalIntelligenceService {
  private readonly logger = new Logger(EmotionalIntelligenceService.name)

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly emotionalRepository: EmotionalIntelligenceRepository,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 3: Emotional Observation
  // ═══════════════════════════════════════════════════════════════════════

  async recordObservation(
    supabase: SupabaseClient,
    data: {
      memory_id: string
      observer_id?: string
      subject_id: string
      emotion: string
      valence?: number
      intensity?: number
      context?: string
      session_key?: string
    },
  ) {
    // Verify memory exists
    const { data: memory, error: memErr } = await this.emotionalRepository.findMemoryById(
      supabase,
      data.memory_id,
    )

    if (!memory || memErr) {
      throw new NotFoundException('Memory not found')
    }

    const response = await this.emotionalRepository.createEmotionalResponse(supabase, {
      memory_id: data.memory_id,
      observer_id: data.observer_id ?? null,
      subject_id: data.subject_id,
      emotion: data.emotion.toLowerCase().trim(),
      valence: typeof data.valence === 'number' ? Math.max(-1, Math.min(1, data.valence)) : null,
      intensity:
        typeof data.intensity === 'number' ? Math.max(0, Math.min(1, data.intensity)) : null,
      context: data.context ?? null,
      session_key: data.session_key ?? null,
    })

    this.logger.log(
      `Recorded: ${data.emotion} (v=${data.valence}, i=${data.intensity}) for memory ${data.memory_id.slice(0, 8)}`,
    )
    return { status: 'recorded', response }
  }

  async getEmotionalProfile(supabase: SupabaseClient, subjectId: string) {
    // Recent emotional responses
    const responses = await this.emotionalRepository.findRecentResponses(supabase, subjectId)

    // Active belief patterns
    const beliefs = await this.emotionalRepository.findActiveBeliefsBySubject(supabase, subjectId)

    // Perspectives
    const perspectives = await this.emotionalRepository.findActivePerspectivesBySubject(
      supabase,
      subjectId,
    )

    // Dominant emotions (aggregate)
    const emotionCounts: Record<
      string,
      { count: number; avgValence: number; avgIntensity: number }
    > = {}
    for (const r of responses) {
      if (!emotionCounts[r.emotion]) {
        emotionCounts[r.emotion] = { count: 0, avgValence: 0, avgIntensity: 0 }
      }
      emotionCounts[r.emotion].count++
      emotionCounts[r.emotion].avgValence += r.valence || 0
      emotionCounts[r.emotion].avgIntensity += r.intensity || 0
    }

    const dominantEmotions = Object.entries(emotionCounts)
      .map(([emotion, stats]) => ({
        emotion,
        count: stats.count,
        avgValence: +(stats.avgValence / stats.count).toFixed(2),
        avgIntensity: +(stats.avgIntensity / stats.count).toFixed(2),
      }))
      .sort((a, b) => b.count - a.count)

    // Most emotionally charged memories (scoped to user's default brain)
    const defaultBrain = await this.emotionalRepository.findDefaultUserBrain(supabase, subjectId)
    const chargedMemories = await this.emotionalRepository.findChargedMemories(
      supabase,
      defaultBrain?.id ? String(defaultBrain.id) : undefined,
    )

    return {
      subject_id: subjectId,
      dominant_emotions: dominantEmotions,
      active_beliefs: beliefs,
      perspectives,
      recent_responses: responses,
      most_charged_memories: chargedMemories,
      summary: {
        total_responses: responses.length,
        active_beliefs: beliefs.length,
        active_perspectives: perspectives.length,
      },
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 4: Belief Pattern Detection
  // ═══════════════════════════════════════════════════════════════════════

  async detectPatterns(
    supabase: SupabaseClient,
    subjectId: string,
    days = 30,
    orgId?: string | null,
  ) {
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const defaultBrain = await this.emotionalRepository.findDefaultUserBrain(supabase, subjectId)
    if (!defaultBrain?.id) {
      return { status: 'no_brain', message: 'No default brain found for subject' }
    }

    const memories = await this.emotionalRepository.findEmotionTaggedMemories(
      supabase,
      String(defaultBrain.id),
      since,
    )

    if (!memories || memories.length < 3) {
      return {
        status: 'insufficient_data',
        message: 'Need at least 3 emotionally-tagged memories to detect patterns',
        memories_found: memories?.length ?? 0,
      }
    }

    const memoryIds = memories.map((m) => m.id as string)

    const memoryDetails = memories
      .map((m) => {
        return `- [${m.memory_type}] emotion=${m.source_emotion} (valence=${m.emotional_valence}, intensity=${m.emotional_intensity}) intent=${m.speaker_intent || 'n/a'} | "${String(m.content).slice(0, 150)}"`
      })
      .join('\n')

    const detectPrompt = `Analyze these emotionally-tagged memories and identify belief patterns — repeated thought-emotion patterns that indicate underlying beliefs.

Memories from the last ${days} days (${memories.length} total):
${memoryDetails}

For each pattern you find, return a JSON array of objects with:
- "pattern_name": short name (e.g., "resistance to delayed gratification")
- "description": 2-3 sentences explaining the pattern
- "emotional_signature": { "dominant_emotion": string, "avg_valence": number, "avg_intensity": number }
- "supporting_memory_ids": array of memory IDs that form this pattern
- "strength": 0.0-1.0 (how strong/consistent the pattern is)

Only report genuine patterns (3+ supporting memories with clear emotional theme). Return [] if no clear patterns.
Return ONLY valid JSON array.`

    try {
      const result = await this.embedding.callGemini(detectPrompt, undefined, {
        userId: subjectId,
        orgId,
      })
      const patterns = JSON.parse(result)

      if (!Array.isArray(patterns)) {
        return { status: 'no_patterns', raw: result }
      }

      const created: Array<{
        id: string
        action: string
        pattern_name?: string
        strength?: number
      }> = []

      for (const p of patterns) {
        const existing = await this.emotionalRepository.findBeliefByName(
          supabase,
          subjectId,
          p.pattern_name,
        )

        if (existing && existing.length > 0) {
          const newStrength = Math.min(1, (existing[0].strength || 0.1) + 0.1)
          await this.emotionalRepository.reinforceBelief(supabase, existing[0].id, {
            strength: newStrength,
            last_reinforced_at: new Date().toISOString(),
            emotional_signature: p.emotional_signature,
            updated_at: new Date().toISOString(),
          })
          created.push({ id: existing[0].id, action: 'reinforced', strength: newStrength })
        } else {
          const supportingIds = Array.isArray(p.supporting_memory_ids)
            ? p.supporting_memory_ids.filter((id: string) => memoryIds.includes(id)).slice(0, 20)
            : memoryIds.slice(0, 20)

          const { data: newPattern, error } = await this.emotionalRepository.createBelief(
            supabase,
            {
              subject_id: subjectId,
              pattern_name: p.pattern_name,
              description: p.description,
              emotional_signature: p.emotional_signature || {},
              supporting_memories: supportingIds,
              strength: Math.max(0.1, Math.min(1, p.strength || 0.3)),
              status: p.strength >= 0.6 ? 'active' : 'emerging',
            },
          )

          if (!error && newPattern) {
            created.push({
              id: newPattern.id,
              action: 'created',
              pattern_name: p.pattern_name,
            })
          }
        }
      }

      this.logger.log(`Detected ${created.length} patterns for subject ${subjectId.slice(0, 8)}`)
      return { status: 'analyzed', patterns_processed: created.length, details: created }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      this.logger.error(`Pattern detection failed: ${msg}`)
      return { status: 'error', reason: msg }
    }
  }

  async getPatterns(supabase: SupabaseClient, subjectId: string) {
    return this.emotionalRepository.findPatternsBySubject(supabase, subjectId)
  }

  /**
   * Brain-scoped read used by the customer brain (and any other non-user-scope brain
   * where subject_id is not the user's uuid). Access is enforced by RLS on the
   * authenticated supabase client — the caller can only see brains they belong to.
   */
  async getPatternsForBrain(supabase: SupabaseClient, brainId: string) {
    return this.emotionalRepository.findPatternsByBrain(supabase, brainId)
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 5: Perspective Synthesis
  // ═══════════════════════════════════════════════════════════════════════

  async getPerspectives(supabase: SupabaseClient, subjectId: string) {
    return this.emotionalRepository.findPerspectivesBySubject(supabase, subjectId)
  }

  async getPerspectivesForBrain(supabase: SupabaseClient, brainId: string) {
    return this.emotionalRepository.findPerspectivesByBrain(supabase, brainId)
  }

  /**
   * Brain-scoped read for emergent customer avatars. RLS on the authenticated client
   * enforces brain access; we filter by status so transformed avatars stay out of
   * the active read path.
   */
  async getCustomerAvatarsForBrain(supabase: SupabaseClient, brainId: string) {
    return this.emotionalRepository.findCustomerAvatarsByBrain(supabase, brainId)
  }
}
