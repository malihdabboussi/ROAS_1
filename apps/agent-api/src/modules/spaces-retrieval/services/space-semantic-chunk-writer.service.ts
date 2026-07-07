import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { SpacesRetrievalRepository } from '../repositories/spaces-retrieval.repository'
import type { SpaceSemanticAsset } from '../types/space-retrieval.types'
import { SpaceKeywordContextService } from './space-keyword-context.service'

@Injectable()
export class SpaceSemanticChunkWriterService {
  constructor(
    private readonly embedding: EmbeddingService,
    private readonly keywordContext: SpaceKeywordContextService,
    private readonly repository: SpacesRetrievalRepository = new SpacesRetrievalRepository(),
  ) {}

  async replaceSource(
    supabase: SupabaseClient,
    asset: SpaceSemanticAsset,
  ): Promise<{ indexed: number; skipped: number }> {
    await this.deleteSource(supabase, asset.sourceType, asset.sourceId)
    const safeAsset = this.sanitizeAsset(asset)
    const chunks = this.chunkText(safeAsset.content)
    if (chunks.length === 0) return { indexed: 0, skipped: 1 }

    const objectHash = this.keywordContext.build(safeAsset, safeAsset.content, 0).contentHash
    const objectRow = await this.repository.upsertSemanticObject(supabase, {
      scope_type: safeAsset.orgId ? 'org' : 'personal',
      user_id: safeAsset.userId,
      org_id: safeAsset.orgId ?? null,
      space_id: safeAsset.spaceId ?? null,
      campaign_id: safeAsset.campaignId ?? null,
      source_type: safeAsset.sourceType,
      source_id: safeAsset.sourceId,
      parent_type: safeAsset.parentType ?? null,
      parent_id: safeAsset.parentId ?? null,
      title: safeAsset.title,
      summary: safeAsset.summary ?? '',
      metadata: safeAsset.metadata ?? {},
      content_hash: objectHash,
      source_updated_at: safeAsset.sourceUpdatedAt ?? null,
      indexed_at: new Date().toISOString(),
    })

    let indexed = 0
    for (let index = 0; index < chunks.length; index += 1) {
      const content = chunks[index]!
      const context = this.keywordContext.build(safeAsset, content, index)
      const embeddedText = `${context.contextualPrefix}\n\n${content}`
      const embedding = await this.embedding.getEmbedding(embeddedText, {
        taskType: 'RETRIEVAL_DOCUMENT',
        billing: { userId: safeAsset.userId, orgId: safeAsset.orgId },
      })
      await this.repository.insertSemanticChunk(supabase, {
        space_object_id: objectRow.id,
        scope_type: safeAsset.orgId ? 'org' : 'personal',
        user_id: safeAsset.userId,
        org_id: safeAsset.orgId ?? null,
        space_id: safeAsset.spaceId ?? null,
        campaign_id: safeAsset.campaignId ?? null,
        source_type: safeAsset.sourceType,
        source_id: safeAsset.sourceId,
        source_title: safeAsset.title,
        chunk_index: index,
        title: safeAsset.title,
        contextual_prefix: context.contextualPrefix,
        content,
        embedding: embedding ? `[${embedding.join(',')}]` : null,
        metadata: context.metadata,
        content_hash: context.contentHash,
        source_updated_at: safeAsset.sourceUpdatedAt ?? null,
      })
      indexed += 1
    }

    return { indexed, skipped: 0 }
  }

  async deleteSource(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<{ deleted: true }> {
    await this.repository.deleteSemanticObjectSource(supabase, sourceType, sourceId)
    return { deleted: true }
  }

  private chunkText(text: string): string[] {
    const parts = text
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    const chunks: string[] = []
    let current = ''
    for (const part of parts.length > 0 ? parts : [text.trim()]) {
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

  private splitLargeChunk(chunk: string): string[] {
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
  }

  private sanitizeAsset(asset: SpaceSemanticAsset): SpaceSemanticAsset {
    return {
      ...asset,
      title: this.sanitizeText(asset.title),
      summary: asset.summary ? this.sanitizeText(asset.summary) : asset.summary,
      content: this.sanitizeText(asset.content),
      metadata: this.sanitizeJson(asset.metadata ?? {}),
    }
  }

  private sanitizeText(value: string): string {
    return value.replace(/\u0000/g, '').replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
  }

  private sanitizeJson(value: unknown): Record<string, unknown> {
    const json = JSON.stringify(value, (_key, inner) => {
      if (typeof inner === 'string') return this.sanitizeText(inner)
      if (typeof inner === 'number') return Number.isFinite(inner) ? inner : null
      if (typeof inner === 'bigint') return inner.toString()
      if (inner === undefined) return null
      return inner
    })
    return JSON.parse(json || '{}') as Record<string, unknown>
  }
}
