import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainEmotionalIntelligenceRepository } from '../repositories/brain-emotional-intelligence.repository'
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
    private readonly repository: BrainEmotionalIntelligenceRepository = new BrainEmotionalIntelligenceRepository(),
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
    const { data: memory, error: memErr } = await this.repository.findMemoryById(
      supabase,
      data.memory_id,
    )

    if (!memory || memErr) {
      throw new NotFoundException('Memory not found')
    }

    const { data: response, error } = await this.repository.createEmotionalResponse(supabase, {
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

    if (error) throw new Error(`DB error: ${error.message}`)

    this.logger.log(
      `Recorded: ${data.emotion} (v=${data.valence}, i=${data.intensity}) for memory ${data.memory_id.slice(0, 8)}`,
    )
    return { status: 'recorded', response }
  }

  async getEmotionalProfile(supabase: SupabaseClient, subjectId: string) {
    // Recent emotional responses
    const { data: responseRows } = await this.repository.listRecentResponses(supabase, subjectId)
    const responses = (responseRows ?? []) as Array<{
      id?: string
      memory_id?: string
      emotion: string
      valence?: number | null
      intensity?: number | null
      context?: string | null
      session_key?: string | null
      created_at?: string
    }>

    // Active belief patterns
    const { data: beliefs } = await this.repository.listActiveBeliefs(supabase, subjectId)

    // Perspectives
    const { data: perspectives } = await this.repository.listActivePerspectives(
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
    const { data: defaultBrain } = await this.repository.findDefaultUserBrainId(
      supabase,
      subjectId,
    )
    const { data: chargedMemories } = await this.repository.listChargedMemories(
      supabase,
      defaultBrain?.id,
    )

    return {
      subject_id: subjectId,
      dominant_emotions: dominantEmotions,
      active_beliefs: beliefs ?? [],
      perspectives: perspectives ?? [],
      recent_responses: responses ?? [],
      most_charged_memories: chargedMemories ?? [],
      summary: {
        total_responses: responses.length,
        active_beliefs: (beliefs ?? []).length,
        active_perspectives: (perspectives ?? []).length,
      },
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 4: Belief Pattern Detection
  // ═══════════════════════════════════════════════════════════════════════

  async detectPatterns(
    supabase: SupabaseClient,
    subjectId: string,
    days = 7,
    orgId?: string | null,
  ) {
    const since = new Date(Date.now() - days * 86400000).toISOString()

    // Get recent emotional responses with their memories
    const { data: responseRows } = await this.repository.listResponsesSince(supabase, {
      subjectId,
      since,
    })
    const responses = (responseRows ?? []) as Array<{
      id: string
      memory_id: string
      emotion: string
      valence?: number | null
      intensity?: number | null
      context?: string | null
      created_at?: string
    }>

    if (responses.length < 3) {
      return {
        status: 'insufficient_data',
        message: 'Need at least 3 emotional responses to detect patterns',
        responses_found: responses.length,
      }
    }

    // Get associated memories for context
    const memoryIds = [...new Set(responses.map((r) => r.memory_id))]
    const { data: relatedMemories } = await this.repository.listMemoriesByIds(
      supabase,
      memoryIds,
    )

    const memoryMap = new Map(
      (relatedMemories ?? []).map((m: Record<string, unknown>) => [m.id as string, m]),
    )

    // Build context for Gemini
    const responseDetails = responses
      .map((r) => {
        const mem = memoryMap.get(r.memory_id) as Record<string, unknown> | undefined
        return `- Response: ${r.emotion} (valence=${r.valence}, intensity=${r.intensity}) | Context: "${r.context || 'none'}" | Memory: "${((mem?.content as string) || 'unknown').slice(0, 100)}" (${(mem?.source_emotion as string) || 'untagged'})`
      })
      .join('\n')

    const detectPrompt = `Analyze these emotional responses recorded during AI assistant sessions and identify belief patterns.

Responses from the last ${days} days:
${responseDetails}

For each pattern you find, return a JSON array of objects with:
- "pattern_name": short name (e.g., "resistance to delayed gratification")
- "description": 2-3 sentences explaining the pattern
- "emotional_signature": { "dominant_emotion": string, "avg_valence": number, "avg_intensity": number }
- "supporting_response_ids": array of response IDs that form this pattern
- "strength": 0.0-1.0 (how strong/consistent the pattern is)

Only report genuine patterns (3+ supporting responses with clear emotional theme). Return [] if no clear patterns.
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
        // Check if similar pattern already exists
        const { data: existingRows } = await this.repository.findBeliefPatternByName(supabase, {
          subjectId,
          patternName: p.pattern_name,
        })
        const existing = (existingRows ?? []) as Array<{ id: string; strength?: number | null }>

        if (existing && existing.length > 0) {
          // Reinforce existing pattern
          const newStrength = Math.min(1, (existing[0].strength || 0.1) + 0.1)
          await this.repository.reinforceBeliefPattern(supabase, {
            id: existing[0].id,
            update: {
              strength: newStrength,
              last_reinforced_at: new Date().toISOString(),
              emotional_signature: p.emotional_signature,
              updated_at: new Date().toISOString(),
            },
          })
          created.push({ id: existing[0].id, action: 'reinforced', strength: newStrength })
        } else {
          // Create new pattern
          const { data: newPattern, error } = await this.repository.createBeliefPattern(supabase, {
            subject_id: subjectId,
            pattern_name: p.pattern_name,
            description: p.description,
            emotional_signature: p.emotional_signature || {},
            supporting_memories: memoryIds.slice(0, 20),
            supporting_responses: (p.supporting_response_ids || []).slice(0, 20),
            strength: Math.max(0.1, Math.min(1, p.strength || 0.3)),
            status: p.strength >= 0.6 ? 'active' : 'emerging',
          })

          if (!error && newPattern?.id) {
            created.push({
              id: String(newPattern.id),
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
    const { data, error } = await this.repository.listActiveBeliefs(supabase, subjectId)

    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 5: Perspective Synthesis
  // ═══════════════════════════════════════════════════════════════════════

  async getPerspectives(supabase: SupabaseClient, subjectId: string) {
    const { data, error } = await this.repository.listActivePerspectives(supabase, subjectId)

    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }
}
