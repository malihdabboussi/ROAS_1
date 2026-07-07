import { createHash, randomUUID } from 'node:crypto'
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainOpsHookService } from '../../brain/services/brain-ops-hook.service'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { LinkExtractionService } from '../../brain/services/link-extraction.service'
import type { MeetingTranscriptEntry } from '../../brain/types/brain.types'
import { FirefliesApiService } from '../../integrations/fireflies/services/fireflies-api.service'
import { MissionAgentGatewayService } from '../../missions/services/gateways/mission-agent-gateway.service'
import { CampaignsRepository } from '../repositories/campaigns.repository'
import { CampaignsServiceBase02 } from './campaigns-service-02.base'

export abstract class CampaignsServiceBase03 extends CampaignsServiceBase02 {
  async syncKnowledgeFromAssets(supabase: SupabaseClient, userId: string, campaignId: string) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')

    const [offers, avatars, themes, deliverables] = await Promise.all([
      this.campaignsRepo.listKnowledgeSyncOffers(supabase, campaignId),
      this.campaignsRepo.listKnowledgeSyncAvatars(supabase, campaignId),
      this.campaignsRepo.listKnowledgeSyncThemes(supabase, campaignId),
      this.campaignsRepo.listKnowledgeSyncDeliverables(supabase, campaignId),
    ])

    const created: Record<string, number> = { offer: 0, avatar: 0, theme: 0, deliverable: 0 }

    for (const item of offers) {
      const content = JSON.stringify({ step1: item.step1_data, step2: item.step2_data })
      const count = await this.upsertAssetNode(
        supabase,
        userId,
        campaignId,
        'offer',
        'auto_sync',
        item.id,
        item.name || 'Offer',
        content,
      )
      created.offer += count
    }
    for (const item of avatars) {
      const content = JSON.stringify(item.persona_data ?? {})
      const count = await this.upsertAssetNode(
        supabase,
        userId,
        campaignId,
        'avatar',
        'auto_sync',
        item.id,
        item.name || 'Avatar',
        content,
      )
      created.avatar += count
    }
    for (const item of themes) {
      const content = JSON.stringify({ voice: item.brand_voice, values: item.brand_values })
      const count = await this.upsertAssetNode(
        supabase,
        userId,
        campaignId,
        'theme',
        'auto_sync',
        item.id,
        item.name || 'Theme',
        content,
      )
      created.theme += count
    }
    for (const item of deliverables) {
      const content =
        String(item.content || '') ||
        (item.content_json ? JSON.stringify(item.content_json, null, 2) : '') ||
        String(item.file_url || '')
      const count = await this.upsertAssetNode(
        supabase,
        userId,
        campaignId,
        'deliverable',
        'mission',
        item.id,
        item.title || 'Deliverable',
        content,
        { deliverable_type: item.type, agent_key: item.agent_key },
      )
      created.deliverable += count
    }

    return { created }
  }

  async organizeKnowledgeGraph(supabase: SupabaseClient, userId: string, campaignId: string) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')

    const nodes = await this.campaignsRepo.listKnowledgeNodes(supabase, campaignId, { limit: 200 })
    let createdEdges = 0

    for (const node of nodes) {
      if (!node.content_embedding) continue
      const related = await this.campaignsRepo.matchKnowledgeNodes(
        supabase,
        campaignId,
        node.content_embedding,
        6,
        0.72,
      )
      for (const rel of related) {
        if (rel.id === node.id) continue
        await this.campaignsRepo.createKnowledgeEdge(supabase, {
          campaign_id: campaignId,
          user_id: userId,
          from_node_id: node.id,
          to_node_id: rel.id,
          edge_type: 'connected',
          strength: Number(rel.similarity || 0.7),
          auto_generated: true,
          metadata: { organizer: 'campaigns.service' },
        })
        createdEdges += 1
      }
    }

    return { created_edges: createdEdges }
  }

  protected async upsertAssetNode(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    nodeType: 'deliverable' | 'offer' | 'avatar' | 'theme',
    sourceType: 'mission' | 'auto_sync',
    sourceId: string,
    title: string,
    content: string,
    metadata: Record<string, unknown> = {},
  ) {
    const existing = await this.campaignsRepo.findKnowledgeNodeBySource(
      supabase,
      campaignId,
      sourceType,
      sourceId,
    )
    if (existing) return 0

    const domain = this.NODE_TYPE_DOMAIN_MAP[nodeType] ?? 'general'
    await this.ingestKnowledgePayload(supabase, userId, campaignId, {
      nodeType,
      title,
      content: content.slice(0, 20000),
      sourceType,
      sourceId,
      metadata,
      domain,
    })
    return 1
  }

  protected async ingestKnowledgePayload(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    input: {
      nodeType:
        | 'deliverable'
        | 'document'
        | 'offer'
        | 'avatar'
        | 'theme'
        | 'agent_learning'
        | 'user_upload'
        | 'url_import'
      title: string
      content: string
      sourceType: 'mission' | 'upload' | 'drive' | 'dropbox' | 'url' | 'auto_sync'
      sourceId?: string | null
      sourceUri?: string | null
      metadata?: Record<string, unknown>
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
      mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
      mediaUrl?: string | null
      mediaMimeType?: string | null
      mediaBase64?: string | null
      mediaCaption?: string | null
    },
  ) {
    const campaignRow = await this.campaignsRepo.findById(supabase, campaignId)
    const knowledgeBilling = {
      userId,
      orgId: (campaignRow?.org_id as string | null) ?? null,
    }
    const normalizedFull = this.normalizeKnowledgeText(input.content)
    const importJobId = randomUUID()
    const chunks = this.splitIntoChunks(normalizedFull)
    const validChunks = chunks.filter(
      (chunk) =>
        chunk.length >= CampaignsServiceBase03.MIN_CHUNK_CHARS && !this.isLikelyNoiseChunk(chunk),
    )

    let matchedChunks = 0
    const novelChunks: string[] = []

    for (let idx = 0; idx < validChunks.length; idx += 1) {
      const chunk = validChunks[idx]
      const chunkHash = this.hashKnowledgeText(chunk)
      const exact = await this.campaignsRepo.findKnowledgeNodeByHash(
        supabase,
        campaignId,
        chunkHash,
      )
      if (exact) {
        matchedChunks += 1
        await this.campaignsRepo.createKnowledgeNodeSource(supabase, {
          campaign_id: campaignId,
          user_id: userId,
          node_id: String(exact.id),
          source_type: input.sourceType,
          source_id: input.sourceId ?? null,
          source_uri: input.sourceUri ?? null,
          source_title: input.title,
          chunk_index: idx,
          metadata: { dedupe_reason: 'exact_hash', import_job_id: importJobId },
        })
        continue
      }

      const chunkVector = await this.embeddingService.getEmbedding(chunk, {
        billing: knowledgeBilling,
      })
      if (chunkVector) {
        const topDuplicate = await this.campaignsRepo.matchKnowledgeNodes(
          supabase,
          campaignId,
          JSON.stringify(chunkVector),
          1,
          CampaignsServiceBase03.DUPLICATE_SIMILARITY_THRESHOLD,
        )
        const top = topDuplicate[0]
        if (top?.id) {
          matchedChunks += 1
          await this.campaignsRepo.createKnowledgeNodeSource(supabase, {
            campaign_id: campaignId,
            user_id: userId,
            node_id: String(top.id),
            source_type: input.sourceType,
            source_id: input.sourceId ?? null,
            source_uri: input.sourceUri ?? null,
            source_title: input.title,
            chunk_index: idx,
            metadata: {
              dedupe_reason: 'semantic_match',
              similarity: Number(top.similarity || 0),
              import_job_id: importJobId,
            },
          })
          continue
        }

        const topPartial = await this.campaignsRepo.matchKnowledgeNodes(
          supabase,
          campaignId,
          JSON.stringify(chunkVector),
          1,
          CampaignsServiceBase03.PARTIAL_SIMILARITY_THRESHOLD,
        )
        if (topPartial[0]?.id) {
          matchedChunks += 1
          await this.campaignsRepo.createKnowledgeNodeSource(supabase, {
            campaign_id: campaignId,
            user_id: userId,
            node_id: String(topPartial[0].id),
            source_type: input.sourceType,
            source_id: input.sourceId ?? null,
            source_uri: input.sourceUri ?? null,
            source_title: input.title,
            chunk_index: idx,
            metadata: {
              dedupe_reason: 'partial_match',
              similarity: Number(topPartial[0].similarity || 0),
              import_job_id: importJobId,
            },
          })
          continue
        }
      }

      novelChunks.push(chunk)
    }

    const totalChecked = validChunks.length
    const overlapRatio = totalChecked > 0 ? matchedChunks / totalChecked : 0

    if (novelChunks.length === 0) {
      const fallbackHash = this.hashKnowledgeText(normalizedFull)
      const fallback = await this.campaignsRepo.findKnowledgeNodeByHash(
        supabase,
        campaignId,
        fallbackHash,
      )
      if (fallback) return fallback
      throw new ConflictException('Import blocked: no novel knowledge found')
    }

    const mergedNovelContent = novelChunks.join('\n\n').slice(0, 20000)
    const finalHash = this.hashKnowledgeText(mergedNovelContent)
    const existingFinal = await this.campaignsRepo.findKnowledgeNodeByHash(
      supabase,
      campaignId,
      finalHash,
    )
    if (existingFinal) {
      await this.campaignsRepo.createKnowledgeNodeSource(supabase, {
        campaign_id: campaignId,
        user_id: userId,
        node_id: String(existingFinal.id),
        source_type: input.sourceType,
        source_id: input.sourceId ?? null,
        source_uri: input.sourceUri ?? null,
        source_title: input.title,
        metadata: { dedupe_reason: 'full_payload_hash', import_job_id: importJobId },
      })
      return existingFinal
    }

    const embedding = await this.resolveKnowledgeEmbedding(
      mergedNovelContent,
      input.mediaType,
      input.mediaMimeType,
      input.mediaBase64,
      input.mediaCaption,
      knowledgeBilling,
    )
    const inserted = await this.campaignsRepo.createKnowledgeNode(supabase, {
      campaign_id: campaignId,
      user_id: userId,
      node_type: input.nodeType,
      title: input.title,
      content: mergedNovelContent,
      content_embedding: embedding ? JSON.stringify(embedding) : undefined,
      media_type: input.mediaType ?? 'text',
      media_url: input.mediaUrl ?? null,
      media_mime_type: input.mediaMimeType ?? null,
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        media_caption: input.mediaCaption ?? null,
        import_job_id: importJobId,
        dedupe: {
          total_chunks: totalChecked,
          matched_chunks: matchedChunks,
          novel_chunks: novelChunks.length,
          overlap_ratio: Number(overlapRatio.toFixed(4)),
          status:
            overlapRatio >= CampaignsServiceBase03.NEAR_FULL_IMPORT_OVERLAP_THRESHOLD
              ? 'near_full_duplicate'
              : overlapRatio >= CampaignsServiceBase03.PARTIAL_IMPORT_OVERLAP_THRESHOLD
                ? 'partially_duplicate'
                : 'novel',
        },
      },
      domain: await this.resolveDomain(input.domain, mergedNovelContent, knowledgeBilling),
      content_hash: finalHash,
      novelty_score: Number((1 - overlapRatio).toFixed(4)),
      duplicate_kind:
        overlapRatio >= CampaignsServiceBase03.PARTIAL_IMPORT_OVERLAP_THRESHOLD ? 'partial' : null,
      canonical_node_id: null,
      chunk_index: null,
      import_job_id: importJobId,
    })

    await this.campaignsRepo.createKnowledgeNodeSource(supabase, {
      campaign_id: campaignId,
      user_id: userId,
      node_id: String(inserted.id),
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
      source_uri: input.sourceUri ?? null,
      source_title: input.title,
      metadata: { import_job_id: importJobId, role: 'canonical' },
    })

    await this.autoConnectNode(supabase, campaignId, userId, inserted.id, embedding)

    if (this.brainOpsHook) {
      this.resolveOrCreateCampaignBrain(supabase, campaignId, userId)
        .then((campaignBrainId) => {
          if (campaignBrainId) {
            return this.brainOpsHook!.onMemoriesSaved(campaignBrainId, 1)
          }
        })
        .catch((e) => this.logger.warn(`Campaign brain ops hook failed: ${e}`))
    }

    return inserted
  }

  protected async resolveOrCreateCampaignBrain(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
  ): Promise<string | null> {
    const existing = await this.campaignAccessRepo.findCampaignBrain(supabase, campaignId)
    if (existing?.id) return String(existing.id)

    const campaign = await this.campaignsRepo.findById(supabase, campaignId)

    const { data: created, error } = await this.campaignAccessRepo.createCampaignBrainReturningId(
      supabase,
      {
        owner_id: userId,
        org_id: campaign?.org_id ?? null,
        campaign_id: campaignId,
        name: `${campaign?.name ?? 'Campaign'} Brain`,
        is_default: false,
      },
    )

    if (error) {
      const raced = await this.campaignAccessRepo.findCampaignBrain(supabase, campaignId)
      return raced?.id ? String(raced.id) : null
    }
    return created?.id ? String(created.id) : null
  }

  protected async resolveKnowledgeEmbedding(
    content: string,
    mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal',
    mediaMimeType?: string | null,
    mediaBase64?: string | null,
    mediaCaption?: string | null,
    billing?: { userId: string; orgId?: string | null },
  ): Promise<number[] | null> {
    const embedOpts = { taskType: 'RETRIEVAL_DOCUMENT' as const, billing }
    if (!mediaType || mediaType === 'text' || !mediaBase64 || !mediaMimeType) {
      return this.embeddingService.getEmbedding(content, embedOpts)
    }
    if (mediaType === 'pdf' && content.length > 12000) {
      return this.embeddingService.getEmbedding(content, embedOpts)
    }
    if ((mediaType === 'audio' || mediaType === 'video') && mediaBase64.length > 4_500_000) {
      return this.embeddingService.getEmbedding(content, embedOpts)
    }

    if (mediaType === 'image') {
      return this.embeddingService.getImageEmbedding(
        mediaBase64,
        mediaMimeType,
        mediaCaption ?? undefined,
        embedOpts,
      )
    }

    return this.embeddingService.getMultimodalEmbedding(
      [
        { text: `${mediaCaption ?? ''}\n${content}`.trim() || content },
        { inline_data: { mime_type: mediaMimeType, data: mediaBase64 } },
      ],
      embedOpts,
    )
  }

  protected async autoConnectNode(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
    nodeId: string,
    vector: number[] | null,
  ) {
    if (!vector) return
    const similar = await this.campaignsRepo.matchKnowledgeNodes(
      supabase,
      campaignId,
      JSON.stringify(vector),
      6,
      0.7,
    )
    for (const item of similar) {
      if (item.id === nodeId) continue
      await this.campaignsRepo.createKnowledgeEdge(supabase, {
        campaign_id: campaignId,
        user_id: userId,
        from_node_id: nodeId,
        to_node_id: item.id,
        edge_type: 'connected',
        strength: Number(item.similarity || 0.7),
        auto_generated: true,
        metadata: { source: 'auto-connect' },
      })
    }
  }

  protected decodeHtmlEntities(text: string): string {
    return text
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
  }
}
