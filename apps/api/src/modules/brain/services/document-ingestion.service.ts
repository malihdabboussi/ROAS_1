import { createHash } from 'crypto'
import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type AssetRef,
  normalizeTemporalPayload,
  temporalInsertFields,
  type BrainTemporalPayload,
} from '@vibey/api-shared'
import { MemoriesRepository } from '../repositories/memories.repository'
import { BrainEvidenceIngestionService } from './brain-evidence-ingestion.service'
import { BrainOpsHookService } from './brain-ops-hook.service'
import { ContentDedupeService } from './content-dedupe.service'
import { EmbeddingService, type BrainGeminiBillingContext } from './embedding.service'
import { EmotionalTaggingService } from './emotional-tagging.service'
import { ScholarContextService } from './scholar-context.service'

interface ExtractedDocMemory {
  content: string
  type: 'decision' | 'insight' | 'preference' | 'fact' | 'story' | 'framework' | 'event'
  confidence: number
  significance: number
  tags: string[]
}

type MediaType = 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'

/**
 * Document Ingestion Service
 *
 * Processes imported documents and links for user brain imports:
 * 1. Chunks large text into ~1800-char segments
 * 2. Calls Gemini to extract + classify memories from each chunk
 * 3. Significance gate (filter < 0.5)
 * 4. Dedup via content_hash, embed immediately, save
 * 5. Discover connections + tag emotions in background
 */
@Injectable()
export class DocumentIngestionService {
  private readonly logger = new Logger(DocumentIngestionService.name)

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly contentDedupe: ContentDedupeService,
    private readonly memoriesRepo: MemoriesRepository,
    private readonly emotionalTagging: EmotionalTaggingService,
    private readonly scholarContext: ScholarContextService,
    @Optional() private readonly evidenceIngestion?: BrainEvidenceIngestionService,
    @Optional() private readonly brainOpsHook?: BrainOpsHookService,
  ) {}

  async ingest(
    supabase: SupabaseClient,
    input: {
      text: string
      ownerId: string
      sourceType: string
      sourceId?: string
      sourceTitle?: string
      mediaType?: MediaType
      mediaUrl?: string
      mediaMimeType?: string
      mediaBase64?: string
      mediaCaption?: string
      assetId?: string | null
      assetRef?: AssetRef | null
      orgId?: string | null
    } & BrainTemporalPayload,
  ): Promise<{ memories_created: number }> {
    const dedupe = await this.contentDedupe.registerForOwner(
      supabase,
      input.ownerId,
      input.text,
      `memory:${input.sourceType}`,
    )
    if (dedupe.duplicate) {
      this.logger.log(
        `Document ingestion skipped duplicate content: ${input.sourceTitle ?? input.sourceType}`,
      )
      return { memories_created: 0 }
    }

    let firstBrainId: string | undefined

    const brainBilling = { userId: input.ownerId, orgId: input.orgId }
    const extractionContext = await this.scholarContext.gatherExtractionContext(
      supabase,
      input.ownerId,
      input.text.slice(0, 1000),
      input.sourceType ?? 'document',
      input.orgId,
    )
    const contextBlock = this.scholarContext.buildContextBlock(extractionContext)

    const temporal = normalizeTemporalPayload(input)
    const temporalFields = temporalInsertFields(temporal)
    const chunks = this.chunkText(input.text)
    const evidenceBrainId = await this.memoriesRepo.resolveDefaultBrainId(
      supabase,
      input.ownerId,
      input.orgId,
    )
    let episodeId: string | null = null
    if (this.evidenceIngestion && evidenceBrainId) {
      const evidence = await this.evidenceIngestion.writeEvidenceChunks(supabase, {
        brainId: evidenceBrainId,
        family: 'user',
        orgId: input.orgId ?? null,
        ownerId: input.ownerId,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        sourceTitle: input.sourceTitle ?? null,
        ingestionPath: 'atlas_import',
        chunks,
        temporal,
      })
      episodeId = evidence.episode_id
    }
    let memoriesCreated = 0

    for (const chunk of chunks) {
      let extracted: ExtractedDocMemory[]
      try {
        const raw = await this.embedding.callGemini(
          this.buildPrompt(chunk, contextBlock),
          undefined,
          brainBilling,
        )
        extracted = JSON.parse(raw) as ExtractedDocMemory[]
        if (!Array.isArray(extracted)) continue
      } catch (e) {
        this.logger.warn(`Gemini extraction failed for chunk: ${e}`)
        continue
      }

      const significant = extracted.filter((item) => (item.significance ?? 0) >= 0.5)

      for (const item of significant) {
        const contentHash = createHash('sha256')
          .update(item.content.trim().toLowerCase())
          .digest('hex')

        const isDuplicate = await this.memoriesRepo.checkDuplicate(
          supabase,
          contentHash,
          input.ownerId,
        )
        if (isDuplicate) continue

        const vector = await this.resolveEmbedding(item.content, input, brainBilling)

        const record: Record<string, unknown> = {
          content: item.content,
          content_hash: contentHash,
          memory_type: item.type,
          source_type: input.sourceType,
          source_id: input.sourceId ?? null,
          source_title: input.sourceTitle ?? null,
          ...(episodeId ? { episode_id: episodeId } : {}),
          ...temporalFields,
          project_id: null,
          agent_id: null,
          speaker: input.ownerId,
          confidence: item.confidence ?? 0.8,
          significance: item.significance ?? 0.6,
          tags: item.tags ?? [],
          metadata: {
            user_id: input.ownerId,
            import_source: input.sourceType,
            media_caption: input.mediaCaption ?? null,
            asset_id: input.assetId ?? null,
            asset_ref: input.assetRef ?? null,
            temporal,
          },
          media_type: input.mediaType ?? 'text',
          media_url: input.mediaUrl ?? null,
          media_mime_type: input.mediaMimeType ?? null,
        }
        if (vector) {
          record.embedding = JSON.stringify(vector)
        }

        const memory = await this.memoriesRepo.create(supabase, record)
        memoriesCreated++
        if (!firstBrainId && memory?.brain_id) firstBrainId = memory.brain_id as string

        if (vector) {
          this.discoverConnections(
            supabase,
            memory.id as string,
            item.content,
            vector,
            input.ownerId,
            brainBilling,
          ).catch((e) => this.logger.warn(`Connection discovery failed: ${e}`))
        }

        this.emotionalTagging
          .tagMemory(supabase, memory.id as string, item.content, input.ownerId, input.orgId)
          .catch((e) => this.logger.warn(`Emotional tagging failed: ${e}`))
      }
    }

    this.logger.log(
      `Document ingestion complete: ${memoriesCreated} memories from "${input.sourceTitle ?? input.sourceType}"`,
    )

    if (memoriesCreated > 0 && firstBrainId && this.brainOpsHook) {
      this.brainOpsHook
        .onMemoriesSaved(firstBrainId, memoriesCreated)
        .catch((e) => this.logger.warn(`Brain ops hook failed: ${e}`))
    }

    return { memories_created: memoriesCreated }
  }

  private async resolveEmbedding(
    content: string,
    input: {
      mediaType?: MediaType
      mediaMimeType?: string
      mediaBase64?: string
      mediaCaption?: string
    },
    billing: { userId: string; orgId?: string | null },
  ): Promise<number[] | null> {
    const mediaType = input.mediaType ?? 'text'
    const mediaBase64 = input.mediaBase64?.trim()
    const mediaMimeType = input.mediaMimeType?.trim()
    const embedOpts = { taskType: 'RETRIEVAL_DOCUMENT' as const, billing }
    if (mediaType === 'text' || !mediaBase64 || !mediaMimeType) {
      return this.embedding.getEmbedding(content, embedOpts)
    }
    if (mediaType === 'pdf' && content.length > 12000) {
      return this.embedding.getEmbedding(content, embedOpts)
    }
    if ((mediaType === 'audio' || mediaType === 'video') && mediaBase64.length > 4_500_000) {
      return this.embedding.getEmbedding(content, embedOpts)
    }

    if (mediaType === 'image') {
      return this.embedding.getImageEmbedding(
        mediaBase64,
        mediaMimeType,
        input.mediaCaption,
        embedOpts,
      )
    }

    return this.embedding.getMultimodalEmbedding(
      [
        { text: `${input.mediaCaption ?? ''}\n${content}`.trim() || content },
        { inline_data: { mime_type: mediaMimeType, data: mediaBase64 } },
      ],
      embedOpts,
    )
  }

  private chunkText(text: string): string[] {
    const parts = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 30)

    const chunks: string[] = []
    let current = ''
    for (const part of parts) {
      if ((current + '\n\n' + part).length > 1800 && current.length > 0) {
        chunks.push(current)
        current = part
      } else {
        current = current ? `${current}\n\n${part}` : part
      }
    }
    if (current) chunks.push(current)

    return chunks.flatMap((chunk) => {
      if (chunk.length <= 1800) return [chunk]
      const result: string[] = []
      let remaining = chunk
      while (remaining.length > 1800) {
        let splitAt = remaining.lastIndexOf(' ', 1800)
        if (splitAt <= 0) splitAt = 1800
        result.push(remaining.slice(0, splitAt).trim())
        remaining = remaining.slice(splitAt).trim()
      }
      if (remaining) result.push(remaining)
      return result
    })
  }

  private async discoverConnections(
    supabase: SupabaseClient,
    memoryId: string,
    content: string,
    vector: number[],
    ownerId: string,
    billing: BrainGeminiBillingContext,
  ): Promise<void> {
    const similar = await this.memoriesRepo.search(supabase, vector, {
      limit: 5,
      threshold: 0.72,
      owner_id: ownerId,
    })

    const candidates = (similar as Array<{ id: string; content: string }>).filter(
      (m) => m.id !== memoryId,
    )
    if (candidates.length === 0) return

    const PROMPT = `Given two memories, determine if they are meaningfully related.

Memory A: {a}
Memory B: {b}

If related, return: { "related": true, "relationship": "supports|contradicts|elaborates|caused_by|evolved_from|related_to", "strength": 0.0-1.0 }
If NOT meaningfully related: { "related": false }

Be strict. Only flag genuine relationships, not vague topic overlap.`

    for (const candidate of candidates.slice(0, 3)) {
      try {
        const prompt = PROMPT.replace('{a}', content.slice(0, 500)).replace(
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

  private buildPrompt(chunk: string, contextBlock?: string): string {
    return `You are a knowledge extraction engine. Extract meaningful, reusable knowledge from the following text.

## EXTRACT these types:
- **insight** — Non-obvious realizations, conclusions, or lessons
- **framework** — Repeatable models, methodologies, mental models, or systems
- **fact** — Significant data points, statistics, or established truths
- **decision** — Choices made, strategies adopted, with reasoning
- **story** — Concrete examples, case studies, or narratives
- **preference** — Values, opinions, beliefs, or stances
- **event** — Specific occurrences or milestones

## RULES:
- Only extract self-contained, meaningful pieces of knowledge
- Each item must make sense on its own without the surrounding context
- Minimum significance: 0.5
- Skip filler, navigation text, headers without content, boilerplate
${contextBlock ? `\n${contextBlock}\n` : ''}
## OUTPUT:
Return a JSON array. Each item:
{ "content": "...", "type": "insight|framework|fact|decision|story|preference|event", "confidence": 0.0-1.0, "significance": 0.0-1.0, "tags": ["..."] }

Return EMPTY ARRAY [] if nothing qualifies.

TEXT:
${chunk}`
  }
}
