import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmotionalTaggingRepository } from '../repositories/emotional-tagging.repository'
import { EmbeddingService } from './embedding.service'

/**
 * Emotional Tagging Service (Dispenza Layer 2)
 *
 * Uses Gemini Flash to analyze memory content and tag it with:
 * - source_emotion: primary emotion the content is about
 * - emotional_valence: positive/negative (-1.0 to 1.0)
 * - emotional_intensity: how emotionally charged (0.0 to 1.0)
 * - speaker_intent: what the speaker wants the listener to feel
 *
 * Called in background after each memory is created.
 */
@Injectable()
export class EmotionalTaggingService {
  private readonly logger = new Logger(EmotionalTaggingService.name)

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly emotionalTaggingRepository: EmotionalTaggingRepository,
  ) {}

  /**
   * Analyze and tag a memory with emotional metadata.
   * Updates the memory row in-place. Non-blocking, safe to fire-and-forget.
   */
  async tagMemory(
    supabase: SupabaseClient,
    memoryId: string,
    content: string,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    try {
      const prompt = EMOTION_TAG_PROMPT.replace('{text}', content.slice(0, 1500))
      const result = await this.embedding.callGemini(prompt, undefined, { userId, orgId })
      const parsed = JSON.parse(result)

      const update: Record<string, unknown> = {}
      if (parsed.source_emotion) {
        update.source_emotion = String(parsed.source_emotion).toLowerCase().slice(0, 50)
      }
      if (typeof parsed.emotional_valence === 'number') {
        update.emotional_valence = Math.max(-1, Math.min(1, parsed.emotional_valence))
      }
      if (typeof parsed.emotional_intensity === 'number') {
        update.emotional_intensity = Math.max(0, Math.min(1, parsed.emotional_intensity))
      }
      if (parsed.speaker_intent) {
        update.speaker_intent = String(parsed.speaker_intent).toLowerCase().slice(0, 50)
      }

      if (Object.keys(update).length > 0) {
        const error = await this.emotionalTaggingRepository.updateMemoryEmotion(
          supabase,
          memoryId,
          update,
        )

        if (error) {
          this.logger.warn(`Failed to update memory ${memoryId}: ${error.message}`)
          return
        }

        this.logger.debug(
          `Tagged ${memoryId.slice(0, 8)}: ${update.source_emotion} (v=${update.emotional_valence}, i=${update.emotional_intensity})`,
        )
      }
    } catch (e: unknown) {
      this.logger.warn(
        `Emotional tagging failed for ${memoryId.slice(0, 8)}: ${e instanceof Error ? e.message : e}`,
      )
    }
  }
}

const EMOTION_TAG_PROMPT = `Analyze the emotional content of this text. Return a JSON object with exactly these fields:
- "source_emotion": the primary emotion this content is ABOUT (e.g., "fear", "pride", "determination", "shame", "joy", "frustration", "hope", "anger", "curiosity", "grief", "confidence", "anxiety", "gratitude", "overwhelm"). Pick ONE word.
- "emotional_valence": how positive or negative (-1.0 = very negative, 0 = neutral, 1.0 = very positive)
- "emotional_intensity": how emotionally charged (0.0 = calm/factual, 1.0 = extremely intense)
- "speaker_intent": what the speaker wants the listener to FEEL (e.g., "empowerment", "urgency", "comfort", "motivation", "warning", "reassurance", "inspiration", "reflection"). Pick ONE word.

If the content is purely factual with no emotional dimension, use: source_emotion="neutral", valence=0, intensity=0.1, speaker_intent="inform".

Text: {text}

Return ONLY valid JSON, no markdown.`
