import { createHash } from 'crypto'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeTemporalPayload,
  temporalInsertFields,
  type BrainTemporalPayload,
} from '@vibey/api-shared'
import { BrainRuntimeRepository } from '../repositories/brain-runtime.repository'
import { EmbeddingService } from './embedding.service'

export interface BrainEvidenceChunkInput {
  brainId: string
  family: 'user' | 'agent' | 'customer' | 'company'
  orgId?: string | null
  ownerId: string
  sourceType: string
  sourceId?: string | null
  sourceTitle?: string | null
  ingestionPath: 'direct_tool' | 'atlas_import' | 'api' | 'worker' | 'manual'
  chunks: string[]
  temporal?: BrainTemporalPayload | null
}

@Injectable()
export class BrainEvidenceIngestionService {
  constructor(
    private readonly embedding: EmbeddingService,
    private readonly repository: BrainRuntimeRepository = new BrainRuntimeRepository(),
  ) {}

  async writeEvidenceChunks(
    supabase: SupabaseClient,
    input: BrainEvidenceChunkInput,
  ): Promise<{ chunks_inserted: number; episode_id: string | null }> {
    if (process.env.BRAIN_EVIDENCE_CHUNKS !== '1') return { chunks_inserted: 0, episode_id: null }

    let inserted = 0
    const sourceId =
      input.sourceId ??
      this.hash(`${input.sourceType}:${input.sourceTitle ?? ''}:${input.chunks.join('\n')}`)
    const temporal = normalizeTemporalPayload(input.temporal)
    const episodeId = await this.upsertEpisode(supabase, input, sourceId, temporal)
    const temporalFields = temporalInsertFields({ ...temporal, episode_id: episodeId })
    for (let index = 0; index < input.chunks.length; index++) {
      const content = input.chunks[index]?.trim()
      if (!content) continue

      const contextualPrefix = this.contextualPrefix(input)
      const contentHash = this.hash(`${contextualPrefix}\n${content}`)
      const embedding = await this.embedding.getEmbedding(`${contextualPrefix}\n${content}`, {
        taskType: 'RETRIEVAL_DOCUMENT',
        billing: { userId: input.ownerId, orgId: input.orgId },
      })

      const error = await this.repository.upsertEvidenceChunk(supabase, {
        brain_id: input.brainId,
        source_type: input.sourceType,
        source_id: sourceId,
        source_title: input.sourceTitle ?? null,
        chunk_index: index,
        contextual_prefix: contextualPrefix,
        content,
        ...temporalFields,
        embedding: embedding ? `[${embedding.join(',')}]` : null,
        metadata: {
          brain_id: input.brainId,
          brain_scope: input.family,
          org_id: input.orgId ?? null,
          owner_id: input.ownerId,
          ingestion_path: input.ingestionPath,
          content_hash: contentHash,
          embedding_status: embedding ? 'embedded' : 'missing',
          indexed_at: new Date().toISOString(),
          temporal,
        },
        content_hash: contentHash,
      })
      if (error) throw new Error(`Failed to write Brain evidence chunk: ${error.message}`)
      inserted++
    }

    return { chunks_inserted: inserted, episode_id: episodeId }
  }

  private contextualPrefix(input: BrainEvidenceChunkInput): string {
    const temporal = normalizeTemporalPayload(input.temporal)
    const happened = temporal.occurred_at ? ` Happened: ${temporal.occurred_at}.` : ''
    return `Source: ${input.sourceTitle || input.sourceType}. Type: ${input.sourceType}. Brain family: ${input.family}.${happened} This chunk was indexed as source evidence for later retrieval.`
  }

  private async upsertEpisode(
    supabase: SupabaseClient,
    input: BrainEvidenceChunkInput,
    sourceId: string,
    temporal: BrainTemporalPayload,
  ): Promise<string | null> {
    const { data, error } = await this.repository.upsertBrainEpisode(supabase, {
      brain_id: input.brainId,
      source_type: input.sourceType,
      source_id: sourceId,
      source_title: input.sourceTitle ?? null,
      occurred_at: temporal.occurred_at ?? null,
      occurred_until: temporal.occurred_until ?? null,
      asserted_at: temporal.asserted_at ?? new Date().toISOString(),
      temporal_confidence: temporal.temporal_confidence ?? 1,
      temporal_source: temporal.temporal_source ?? 'source_payload',
      participants: [],
      metadata: {
        brain_scope: input.family,
        org_id: input.orgId ?? null,
        owner_id: input.ownerId,
        ingestion_path: input.ingestionPath,
      },
    })
    if (error) throw new Error(`Failed to upsert Brain episode: ${error.message}`)
    return typeof data?.id === 'string' ? data.id : null
  }

  private hash(value: string): string {
    return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
  }
}
