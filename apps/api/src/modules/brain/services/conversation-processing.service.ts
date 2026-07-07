import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MemoriesRepository } from '../repositories/memories.repository'
import type { ProcessConversationDto } from '../types/brain.types'
import { BrainOpsHookService } from './brain-ops-hook.service'
import { EmbeddingService, type BrainGeminiBillingContext } from './embedding.service'
import { EmotionalTaggingService } from './emotional-tagging.service'
import { ScholarContextService } from './scholar-context.service'

const UUID_V4_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface ExtractedMemory {
  content: string
  type: 'decision' | 'insight' | 'preference' | 'fact' | 'story' | 'framework'
  speaker: string | null
  confidence: number
  significance: number
  tags: string[]
}

function normalizeOptional(value?: string | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Conversation Processing Service (US-009)
 *
 * Extracts meaningful memories from conversation transcripts:
 * 1. Validate message count and length
 * 2. Format messages and call Gemini extraction
 * 3. Significance gate (filter < 0.6)
 * 4. Dedup via content_hash, embed, save to memories
 * 5. Track session in memory_sessions
 */
@Injectable()
export class ConversationProcessingService {
  private readonly logger = new Logger(ConversationProcessingService.name)

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly memoriesRepo: MemoriesRepository,
    private readonly emotionalTagging: EmotionalTaggingService,
    private readonly scholarContext: ScholarContextService,
    @Optional() private readonly brainOpsHook?: BrainOpsHookService,
  ) {}

  async processConversation(
    supabase: SupabaseClient,
    data: ProcessConversationDto,
  ): Promise<{
    status: string
    memories_created?: number
    memories?: Record<string, unknown>[]
    reason?: string
  }> {
    const ownerId = data.owner_id ?? this.parseSessionKeyOwnerId(data.session_key)
    if (!ownerId) {
      throw new BadRequestException('owner_id is required')
    }
    const billing: BrainGeminiBillingContext = { userId: ownerId, orgId: data.org_id }
    // ── Step 1: Validate ───────────────────────────────────────────────
    const CONVERSATION_SOURCE_TYPES = ['conversation', 'chat', 'studio']
    const sourceType = data.source_type ?? 'conversation'
    if (!CONVERSATION_SOURCE_TYPES.includes(sourceType)) {
      throw new BadRequestException(
        `ConversationProcessing is only for conversations (source_type: ${sourceType}). Use the appropriate ingestion pipeline for meetings/documents.`,
      )
    }

    if (!data.messages || data.messages.length === 0) {
      throw new BadRequestException('Conversation must have at least 1 message')
    }

    const conversationText = this.formatMessages(data.messages, data.agent_name)
    if (conversationText.length < 100) {
      throw new BadRequestException('Conversation text must be at least 100 characters')
    }

    // ── Step 2: Call Gemini extraction ──────────────────────────────────
    const extractionContext = await this.scholarContext.gatherExtractionContext(
      supabase,
      ownerId,
      conversationText.slice(0, 1000),
      'conversation',
      data.org_id,
    )
    const contextBlock = this.scholarContext.buildContextBlock(extractionContext)
    const prompt = this.buildExtractionPrompt(conversationText, contextBlock)
    const raw = await this.embedding.callGemini(prompt, undefined, billing)

    let extracted: ExtractedMemory[]
    try {
      extracted = JSON.parse(raw) as ExtractedMemory[]
    } catch {
      this.logger.error(`Failed to parse extraction JSON: ${raw.slice(0, 300)}`)
      return { status: 'error', reason: 'LLM returned invalid JSON' }
    }

    if (!Array.isArray(extracted) || extracted.length === 0) {
      return { status: 'skipped', reason: 'No significant memories found', memories_created: 0 }
    }

    // ── Step 3: Significance gate (filter < 0.6) ───────────────────────
    const significant = extracted.filter((item) => (item.significance ?? 0) >= 0.6)
    if (significant.length === 0) {
      return {
        status: 'skipped',
        reason: 'All extracted items below significance threshold (0.6)',
        memories_created: 0,
      }
    }

    // ── Step 4: Dedup, embed, save ─────────────────────────────────────
    const savedMemories: Record<string, unknown>[] = []
    let duplicateCount = 0

    for (const item of significant) {
      const contentHash = this.embedding.computeContentHash(item.content)
      const isDuplicate = await this.memoriesRepo.checkDuplicate(supabase, contentHash, ownerId)

      if (isDuplicate) {
        duplicateCount++
        continue
      }

      const vector = await this.embedding.getEmbedding(item.content, {
        taskType: 'RETRIEVAL_DOCUMENT',
        billing,
      })
      const sourceType = normalizeOptional(data.source_type) ?? 'conversation'
      const sourceId = normalizeOptional(data.source_id) ?? normalizeOptional(data.session_key)
      const sourceTitle = normalizeOptional(data.source_title)
      const agentId = normalizeOptional(data.agent_id)

      const record: Record<string, unknown> = {
        content: item.content,
        content_hash: contentHash,
        memory_type: item.type,
        source_type: sourceType,
        source_id: sourceId,
        source_title: sourceTitle,
        project_id: null,
        agent_id: agentId,
        speaker: item.speaker ?? null,
        confidence: item.confidence ?? 0.8,
        significance: item.significance ?? 0.6,
        tags: item.tags ?? [],
        metadata: ownerId
          ? {
              user_id: ownerId,
              ...(sourceType ? { import_source: sourceType } : {}),
              ...(sourceTitle ? { source_title: sourceTitle } : {}),
            }
          : {},
      }
      if (vector) {
        record.embedding = JSON.stringify(vector)
      }

      const memory = await this.memoriesRepo.create(supabase, record)
      savedMemories.push(memory)

      // Background: discover connections to existing memories
      if (vector) {
        this.discoverConnections(
          supabase,
          memory.id as string,
          item.content,
          vector,
          ownerId,
          billing,
        ).catch((e) => this.logger.warn(`Connection discovery failed: ${e}`))
      }

      // Background: tag emotions (Dispenza Layer 2)
      this.emotionalTagging
        .tagMemory(supabase, memory.id as string, item.content, ownerId, data.org_id)
        .catch((e) => this.logger.warn(`Emotional tagging failed: ${e}`))
    }

    // ── Step 5: Track session ──────────────────────────────────────────
    if (data.session_key) {
      const existingSession = await this.memoriesRepo.findSessionByKey(supabase, data.session_key)

      if (existingSession) {
        await this.memoriesRepo.updateSession(supabase, existingSession.session_key, {
          memories_created: (existingSession.memories_created ?? 0) + savedMemories.length,
          last_processed_at: new Date().toISOString(),
        })
      } else {
        await this.memoriesRepo.createSession(supabase, {
          session_key: data.session_key,
          ...(ownerId ? { owner_id: ownerId } : {}),
          memories_created: savedMemories.length,
          last_processed_at: new Date().toISOString(),
        })
      }
    }

    this.logger.log(
      `Processed conversation: ${savedMemories.length} saved, ${duplicateCount} dupes, ${significant.length - savedMemories.length - duplicateCount} failed`,
    )

    if (savedMemories.length > 0 && this.brainOpsHook) {
      const brainId = (savedMemories[0] as Record<string, unknown>)?.brain_id as string | undefined
      if (brainId) {
        this.brainOpsHook
          .onMemoriesSaved(brainId, savedMemories.length)
          .catch((e) => this.logger.warn(`Brain ops hook failed: ${e}`))
      }
    }

    return {
      status: 'ok',
      memories_created: savedMemories.length,
      memories: savedMemories,
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private formatMessages(
    messages: Array<{ role?: string; speaker?: string; content?: string; text?: string }>,
    agentName?: string,
  ): string {
    return messages
      .map((msg) => {
        const role = msg.speaker ?? msg.role ?? 'unknown'
        const displayRole = role === 'assistant' && agentName ? agentName : role
        const content = msg.content ?? msg.text ?? ''
        return `[${displayRole}]: ${content}`
      })
      .join('\n')
  }

  /**
   * Discover connections between a new memory and existing memories.
   * Finds top-3 similar memories via vector search, then classifies relationships via Gemini.
   */
  private async discoverConnections(
    supabase: SupabaseClient,
    memoryId: string,
    content: string,
    embedding: number[],
    ownerId?: string,
    billing?: BrainGeminiBillingContext,
  ): Promise<void> {
    // Find similar existing memories
    const similar = await this.memoriesRepo.search(supabase, embedding, {
      limit: 5,
      threshold: 0.72,
      owner_id: ownerId,
    })

    const candidates = (similar as Array<{ id: string; content: string }>).filter(
      (m) => m.id !== memoryId,
    )
    if (candidates.length === 0) return

    const CONNECTION_PROMPT = `Given two memories, determine if they are meaningfully related.

Memory A: {a}
Memory B: {b}

If related, return: { "related": true, "relationship": "supports|contradicts|elaborates|caused_by|evolved_from|related_to", "strength": 0.0-1.0 }
If NOT meaningfully related: { "related": false }

Be strict. Only flag genuine relationships, not vague topic overlap.`

    for (const candidate of candidates.slice(0, 3)) {
      try {
        const prompt = CONNECTION_PROMPT.replace('{a}', content.slice(0, 500)).replace(
          '{b}',
          (candidate.content || '').slice(0, 500),
        )

        const result = await this.embedding.callGemini(prompt, undefined, billing)
        const parsed = JSON.parse(result)

        if (parsed.related && parsed.relationship) {
          await this.memoriesRepo.createConnection(supabase, {
            source_memory_id: memoryId,
            target_memory_id: candidate.id,
            relationship: parsed.relationship,
            strength: Math.min(1, Math.max(0, parsed.strength || 0.5)),
            created_by: 'auto',
          })
        }
      } catch (e) {
        this.logger.warn(`Connection classification failed for ${candidate.id}: ${e}`)
      }
    }
  }

  private buildExtractionPrompt(conversationText: string, contextBlock?: string): string {
    return `You are a ruthless brain memory filter. You extract ONLY knowledge that reveals how a person THINKS — their beliefs, values, decisions, stories, and mental models. You reject everything else.
${contextBlock ? `\n${contextBlock}\n` : ''}
## STORE — Extract these (with examples):

**preference** — Business beliefs, personal values, opinions:
  "I believe authenticity beats polish every time"

**decision** — Strategic choices WITH reasoning:
  "We're launching at $49/month with a School community to funnel users to the main product"

**story** — Personal experiences that shaped thinking:
  "I was painting my house while my AI agents autonomously managed the business"

**framework** — Repeatable mental models or methodologies:
  "Drop Service Model: packaging courses as software to increase perceived value"

**insight** — Non-obvious realizations about business or life:
  "Viral growth is driven by shareable artifacts with built-in conversion paths, not ads"

**fact** — ONLY significant milestones (not routine metrics):
  "Healing Waves now has 49 tracks generating monthly passive income"

## NEVER STORE — Reject these completely:
- Config/Infrastructure details
- Routine operations (builds, deploys, PRs)
- Things stored elsewhere (SOPs, wikis, task trackers)
- Ephemeral/time-bound info
- UI/Implementation specs

## GOLDEN RULE:
If a human would put this in a config file, documentation, task tracker, analytics dashboard, or architecture diagram instead of telling a friend about it over coffee — DO NOT EXTRACT IT.

## THE TEST:
Before including ANY item, ask: "Would this still matter in 6 months?" If no → reject.

## OUTPUT:
Return a JSON array. Each item:
{ "content": "...", "type": "decision|insight|preference|fact|story|framework",
  "speaker": "name or null", "confidence": 0.0-1.0, "significance": 0.0-1.0, "tags": ["..."] }

Return EMPTY ARRAY [] if nothing qualifies.

CONVERSATION:
${conversationText}`
  }

  private parseSessionKeyOwnerId(sessionKey?: string): string | undefined {
    if (!sessionKey) return undefined
    const parts = sessionKey.split(':')
    const ownerId = parts[1]?.trim()
    if (!ownerId) return undefined
    if (!UUID_V4_LIKE_PATTERN.test(ownerId)) return undefined
    return ownerId
  }
}
