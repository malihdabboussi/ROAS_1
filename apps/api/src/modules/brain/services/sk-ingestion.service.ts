import { createHash } from 'crypto'
import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssetRef } from '@vibey/api-shared'
import { SkIngestionRepository } from '../repositories/sk-ingestion.repository'
import { BrainEvidenceIngestionService } from './brain-evidence-ingestion.service'
import { BrainOpsHookService } from './brain-ops-hook.service'
import { BrainPermissionsService } from './brain-permissions.service'
import { ContentDedupeService } from './content-dedupe.service'
import { EmbeddingService, type BrainGeminiBillingContext } from './embedding.service'
import { ScholarContextService } from './scholar-context.service'

interface ExtractedSkEntry {
  title: string
  content: string
  entry_type:
    | 'concept'
    | 'framework'
    | 'protocol'
    | 'principle'
    | 'technique'
    | 'quote'
    | 'case_study'
    | 'definition'
  domain?: string
  complexity?: 'foundational' | 'intermediate' | 'advanced' | 'expert'
  confidence?: number
  tags?: string[]
}

@Injectable()
export class SkIngestionService {
  private readonly logger = new Logger(SkIngestionService.name)

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly contentDedupe: ContentDedupeService,
    private readonly scholarContext: ScholarContextService,
    private readonly brainPermissions: BrainPermissionsService,
    private readonly skIngestionRepository: SkIngestionRepository,
    @Optional() private readonly evidenceIngestion?: BrainEvidenceIngestionService,
    @Optional() private readonly brainOpsHook?: BrainOpsHookService,
  ) {}

  async ingest(
    supabase: SupabaseClient,
    userId: string,
    input: {
      text: string
      sourceType: string
      title: string
      domain?: string
      brainId: string
      mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
      mediaUrl?: string
      mediaMimeType?: string
      mediaBase64?: string
      mediaCaption?: string
      assetId?: string | null
      assetRef?: AssetRef | null
    },
    orgId?: string | null,
    orgRole?: 'owner' | 'admin' | 'creator' | 'editor' | 'viewer' | null,
  ) {
    if (orgRole !== undefined || orgId !== undefined) {
      await this.brainPermissions.assertCanTrainBrain(
        supabase,
        userId,
        { orgId: orgId ?? null, orgRole: orgRole ?? null },
        input.brainId,
      )
    } else {
      const ownedBrain = await this.skIngestionRepository.findOwnedBrain(
        supabase,
        input.brainId,
        userId,
      )
      if (!ownedBrain) throw new Error('Brain not found')
    }

    const dedupe = await this.contentDedupe.registerForBrain(
      supabase,
      input.brainId,
      input.text,
      `sk:${input.sourceType}`,
    )
    if (dedupe.duplicate) {
      return { sourceId: '', entriesInserted: 0, duplicate: true }
    }

    const source = await this.skIngestionRepository.createSource(supabase, {
      brainId: input.brainId,
      sourceType: input.sourceType,
      title: input.title,
      domain: input.domain ?? null,
    })

    const billing: BrainGeminiBillingContext = { userId, orgId }
    const extractionContext = await this.scholarContext.gatherExtractionContext(
      supabase,
      userId,
      input.text.slice(0, 1000),
      input.sourceType ?? 'document',
      orgId,
    )
    const contextBlock = this.scholarContext.buildContextBlock(extractionContext)

    const chunks = this.chunkText(input.text)
    if (this.evidenceIngestion) {
      await this.evidenceIngestion.writeEvidenceChunks(supabase, {
        brainId: input.brainId,
        family: 'agent',
        orgId: orgId ?? null,
        ownerId: userId,
        sourceType: input.sourceType,
        sourceId: source.id,
        sourceTitle: input.title,
        ingestionPath: 'atlas_import',
        chunks,
      })
    }

    let inserted = 0
    for (const chunk of chunks) {
      const extracted = await this.extractChunk(chunk, input.domain, contextBlock, billing)
      for (const entry of extracted) {
        const contentHash = createHash('sha256')
          .update(`${entry.title}\n${entry.content}`.trim().toLowerCase())
          .digest('hex')
        const duplicate = await this.skIngestionRepository.findEntryByContentHash(
          supabase,
          input.brainId,
          contentHash,
        )
        if (duplicate) continue

        const safeTitle = this.sanitizeForPostgres(entry.title)
        const safeContent = this.sanitizeForPostgres(entry.content)
        const embedding = await this.resolveEmbedding(
          `${safeTitle}\n${safeContent}`,
          input,
          billing,
        )
        await this.skIngestionRepository.insertEntry(supabase, {
          brain_id: input.brainId,
          source_id: source.id,
          entry_type: entry.entry_type,
          title: safeTitle,
          content: safeContent,
          content_hash: contentHash,
          domain: entry.domain ?? input.domain ?? null,
          complexity: entry.complexity ?? 'foundational',
          confidence: entry.confidence ?? 0.8,
          mastery: 0.3,
          embedding: embedding ? `[${embedding.join(',')}]` : null,
          tags: entry.tags ?? [],
          metadata: {
            media_url: input.mediaUrl ?? null,
            media_caption: input.mediaCaption ?? null,
            asset_id: input.assetId ?? null,
            asset_ref: input.assetRef ?? null,
          },
          media_type: input.mediaType ?? 'text',
          media_url: input.mediaUrl ?? null,
          media_mime_type: input.mediaMimeType ?? null,
        })
        inserted++
      }
    }

    await this.skIngestionRepository.finalizeSource(supabase, source.id, inserted)

    if (inserted > 0 && input.brainId && this.brainOpsHook) {
      this.brainOpsHook
        .onMemoriesSaved(input.brainId, inserted)
        .catch((e) => this.logger.warn(`Brain ops hook failed: ${e}`))
    }

    return { sourceId: source.id, entriesInserted: inserted, duplicate: false }
  }

  private chunkText(text: string): string[] {
    const parts = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
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
    return chunks.flatMap((chunk) => this.splitLargeChunk(chunk))
  }

  private sanitizeForPostgres(s: string): string {
    return s.replace(/\x00/g, '')
  }

  private splitLargeChunk(chunk: string, maxLen = 1800): string[] {
    if (chunk.length <= maxLen) return [chunk]
    const result: string[] = []
    let remaining = chunk
    while (remaining.length > maxLen) {
      let splitAt = remaining.lastIndexOf(' ', maxLen)
      if (splitAt <= 0) splitAt = maxLen
      result.push(remaining.slice(0, splitAt).trim())
      remaining = remaining.slice(splitAt).trim()
    }
    if (remaining) result.push(remaining)
    return result
  }

  private async extractChunk(
    chunk: string,
    domain?: string,
    contextBlock?: string,
    billing?: BrainGeminiBillingContext,
  ): Promise<ExtractedSkEntry[]> {
    const contextSection = contextBlock ? `\n\n${contextBlock}\n\n` : ''
    const prompt = `You are the Brain Scholar's extraction engine. Extract high-quality knowledge entries from this source chunk.
${contextSection}
## Quality Tests
- The 6-Month Test: Would this still matter in 6 months? If no, reject.
- The Coffee Test: Would the user tell a friend this, or put it in a config file? If the latter, reject.

## What to Extract
- insight, framework, principle, decision, technique, concept, case_study, protocol, definition, quote
- Each entry must be self-contained, specific, and actionable
- Minimum significance: 0.5

## What to NEVER Extract
- Random anecdotes without lessons
- Filler, transitions, or conversational padding
- Time-bound information
- Implementation details
- Obvious statements

## Output
Return ONLY a JSON array. Each item:
{ "title": "...", "content": "...", "entry_type": "concept|framework|protocol|principle|technique|quote|case_study|definition", "domain": "${domain ?? ''}", "complexity": "foundational|intermediate|advanced|expert", "confidence": 0.0-1.0, "significance": 0.0-1.0, "tags": ["..."] }

Return EMPTY ARRAY [] if nothing qualifies.

Chunk:
${chunk}`
    const raw = await this.embedding.callGemini(prompt, undefined, billing)
    const parsed = this.safeParseJsonArray(raw)
    return (parsed as ExtractedSkEntry[]).filter(
      (entry) =>
        (entry as ExtractedSkEntry & { significance?: number }).significance === undefined ||
        (entry as ExtractedSkEntry & { significance?: number }).significance! >= 0.5,
    )
  }

  private safeParseJsonArray(raw: string): ExtractedSkEntry[] {
    const extractFromMarkdown = (s: string): string => {
      const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
      return m?.[1]?.trim() ?? s.trim()
    }
    const extractArray = (s: string): string | null => {
      const start = s.indexOf('[')
      if (start === -1) return null
      let depth = 0
      let inString = false
      let escape = false
      for (let i = start; i < s.length; i++) {
        const c = s[i]
        if (escape) {
          escape = false
          continue
        }
        if (c === '\\' && inString) {
          escape = true
          continue
        }
        if (!inString) {
          if (c === '"') inString = true
          else if (c === '[' || c === '{') depth++
          else if (c === ']' || c === '}') {
            depth--
            if (depth === 0 && c === ']') return s.slice(start, i + 1)
          }
        } else if (c === '"') inString = false
      }
      return null
    }
    const clean = (s: string): string =>
      s
        .replace(/^\uFEFF/, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/,(\s*[}\]])/g, '$1')
        .trim()

    for (const candidate of [raw, extractFromMarkdown(raw)]) {
      const arr = extractArray(candidate) ?? candidate
      for (const cleaned of [arr, clean(arr)]) {
        try {
          const p = JSON.parse(cleaned) as unknown
          if (Array.isArray(p)) return p
        } catch {
          // continue
        }
      }
    }
    return []
  }

  private async resolveEmbedding(
    content: string,
    input: {
      mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
      mediaMimeType?: string
      mediaBase64?: string
      mediaCaption?: string
    },
    billing: BrainGeminiBillingContext,
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
}
