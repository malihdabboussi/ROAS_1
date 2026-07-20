import { createHash } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { SpaceRetrievalRepository } from '../repositories/space-retrieval.repository'
import { SpaceStructuralEdgeBuilderService } from './space-structural-edge-builder.service'

type SourceType =
  | 'space'
  | 'space_view'
  | 'space_doc'
  | 'space_task'
  | 'space_activity'
  | 'space_deliverable'
  | 'instagram_research_item'
  | 'tiktok_research_item'
  | 'youtube_research_item'
  | 'twitter_research_item'
  | 'mission'
  | 'mission_subtask'
  | 'mission_deliverable'
  | 'conversation_document'
  | 'contact'
  | 'channel'
  | 'channel_message'
  | 'media_asset'
  | 'funnel'
  | 'funnel_page'
  | 'form'
  | 'form_response'
  | 'offer'
  | 'email'
  | 'sequence'
  | 'sequence_email'
  | 'presentation'
  | 'avatar'
  | 'social_post'
  | 'ad_campaign'
  | 'ad_set'
  | 'ad'
  | 'blog_post'
  | 'campaign_overview_snapshot'
  | 'social_reporting_snapshot'
  | 'funnel_analytics_snapshot'
  | 'email_analytics_snapshot'
  | 'ads_performance_snapshot'
  | 'finance_overview_snapshot'

type IndexInput = {
  sourceType: SourceType
  sourceId: string
  userId: string
  orgId?: string | null
  spaceId?: string | null
  row?: Record<string, unknown>
  /** When true, index even if SPACE_* env flags are off (Page Grader dual-write). */
  force?: boolean
}

@Injectable()
export class SpaceRetrievalIndexService {
  private readonly logger = new Logger(SpaceRetrievalIndexService.name)

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly structuralEdges: SpaceStructuralEdgeBuilderService,
    private readonly repository: SpaceRetrievalRepository,
  ) {}

  async indexSource(supabase: SupabaseClient, input: IndexInput): Promise<{ indexed: number }> {
    if (
      !input.force &&
      process.env.SPACE_ASSET_INDEXING !== '1' &&
      process.env.SPACE_SEMANTIC_RETRIEVAL !== '1'
    ) {
      return { indexed: 0 }
    }
    const row = input.row ?? (await this.loadRow(supabase, input.sourceType, input.sourceId))
    if (!row) {
      await this.deleteSource(supabase, input.sourceType, input.sourceId)
      return { indexed: 0 }
    }
    const asset = this.assetFromRow(input.sourceType, row, input)
    if (!asset.content.trim()) {
      await this.deleteSource(supabase, input.sourceType, input.sourceId)
      return { indexed: 0 }
    }
    const chunks = this.chunkText(asset.content)
    await this.deleteSource(supabase, input.sourceType, input.sourceId)
    const objectHash = this.hash(`${asset.title}\n${asset.content}`)
    const { data: objectRow, error: objectError } = await this.repository.upsertSemanticObject(
      supabase,
      {
        scope_type: asset.orgId ? 'org' : 'personal',
        user_id: input.userId,
        org_id: asset.orgId,
        space_id: asset.spaceId,
        campaign_id: asset.campaignId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        parent_type: asset.parentType,
        parent_id: asset.parentId,
        title: asset.title,
        summary: asset.content.slice(0, 240),
        metadata: asset.metadata,
        content_hash: objectHash,
        source_updated_at: asset.sourceUpdatedAt,
        indexed_at: new Date().toISOString(),
      },
    )
    if (objectError)
      throw new Error(`Failed to upsert Space semantic object: ${objectError.message}`)

    let indexed = 0
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i]!
      const contextualPrefix = this.contextualPrefix(asset, chunk)
      const embeddedText = `${contextualPrefix}\n\n${chunk}`
      const vector = await this.embedding.getEmbedding(embeddedText, {
        taskType: 'RETRIEVAL_DOCUMENT',
        billing: { userId: input.userId, orgId: asset.orgId },
      })
      const contentHash = this.hash(embeddedText)
      const metadata = {
        ...asset.metadata,
        search_terms: this.searchTerms(`${asset.title} ${chunk}`),
        entities: this.entities(`${asset.title} ${chunk}`),
        aliases: [asset.title].filter(Boolean),
        retrieve_via: asset.retrieveVia,
        source_updated_at: asset.sourceUpdatedAt,
        content_hash: contentHash,
        chunk_index: i,
      }
      const { error } = await this.repository.insertSemanticChunk(supabase, {
        space_object_id: objectRow.id,
        scope_type: asset.orgId ? 'org' : 'personal',
        user_id: input.userId,
        org_id: asset.orgId,
        space_id: asset.spaceId,
        campaign_id: asset.campaignId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        source_title: asset.title,
        chunk_index: i,
        title: asset.title,
        contextual_prefix: contextualPrefix,
        content: chunk,
        embedding: vector ? `[${vector.join(',')}]` : null,
        metadata,
        content_hash: contentHash,
        source_updated_at: asset.sourceUpdatedAt,
      })
      if (error) throw new Error(`Failed to insert Space semantic chunk: ${error.message}`)
      indexed += 1
    }
    this.logger.log(
      JSON.stringify({
        feature: 'space_retrieval_index',
        source_type: input.sourceType,
        source_id: input.sourceId,
        indexed,
      }),
    )
    await this.structuralEdges.replaceStructuralEdgesForSource(
      supabase,
      {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        spaceId: asset.spaceId,
        campaignId: asset.campaignId,
        parentType: asset.parentType,
        parentId: asset.parentId,
      },
      row,
    )
    return { indexed }
  }

  async deleteSource(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<{ deleted: true }> {
    const { error } = await this.repository.deleteSemanticSource(supabase, sourceType, sourceId)
    if (error) throw new Error(`Failed to delete Space semantic source: ${error.message}`)
    return { deleted: true }
  }

  private async loadRow(
    supabase: SupabaseClient,
    sourceType: SourceType,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    if (sourceType === 'space') return this.loadSingle(supabase, 'spaces', id)
    if (sourceType === 'space_view') return null
    if (
      sourceType === 'space_doc' ||
      sourceType === 'space_task' ||
      this.isSocialResearchSourceType(sourceType)
    )
      return this.loadSingle(supabase, 'space_items', id)
    if (sourceType === 'space_activity') return this.loadSingle(supabase, 'space_item_activity', id)
    if (sourceType === 'space_deliverable')
      return this.loadSingle(supabase, 'space_item_deliverables', id)
    if (sourceType === 'mission') return this.loadSingle(supabase, 'missions', id)
    if (sourceType === 'mission_subtask') return this.loadMissionSubtask(supabase, id)
    if (sourceType === 'mission_deliverable') return this.loadMissionDeliverable(supabase, id)
    if (sourceType === 'conversation_document') return this.loadConversationDocument(supabase, id)
    if (sourceType === 'contact') return this.loadSingle(supabase, 'contacts', id)
    if (sourceType === 'channel') return this.loadSingle(supabase, 'channels', id)
    if (sourceType === 'channel_message') return this.loadSingle(supabase, 'channel_messages', id)
    if (sourceType === 'media_asset') return this.loadSingle(supabase, 'media_assets', id)
    if (sourceType === 'funnel') return this.loadSingle(supabase, 'funnels', id)
    if (sourceType === 'funnel_page') return this.loadFunnelPage(supabase, id)
    if (sourceType === 'form') return this.loadSingle(supabase, 'forms', id)
    if (sourceType === 'form_response') return this.loadSingle(supabase, 'form_responses', id)
    if (sourceType === 'offer') return this.loadSingle(supabase, 'offers', id)
    if (sourceType === 'email') return this.loadSingle(supabase, 'emails', id)
    if (sourceType === 'sequence') return this.loadSingle(supabase, 'sequences', id)
    if (sourceType === 'sequence_email') return this.loadSequenceEmail(supabase, id)
    if (sourceType === 'presentation') return this.loadSingle(supabase, 'presentations', id)
    if (sourceType === 'avatar') return this.loadSingle(supabase, 'avatars', id)
    if (sourceType === 'social_post') return this.loadSingle(supabase, 'social_posts', id)
    if (sourceType === 'ad_campaign') return this.loadSingle(supabase, 'ad_campaigns', id)
    if (sourceType === 'ad_set') return this.loadSingle(supabase, 'ad_sets', id)
    if (sourceType === 'ad') return this.loadSingle(supabase, 'ads', id)
    if (sourceType === 'blog_post') return this.loadSingle(supabase, 'blog_posts', id)
    return null
  }

  private async loadSingle(
    supabase: SupabaseClient,
    table: string,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.repository.loadSingle(supabase, table, id)
    if (error) throw new Error(`Failed to load ${table}: ${error.message}`)
    return (data as Record<string, unknown> | null) ?? null
  }

  private async loadMissionDeliverable(supabase: SupabaseClient, id: string) {
    const row = await this.loadSingle(supabase, 'mission_deliverables', id)
    if (!row?.mission_id) return row
    const mission = await this.loadSingle(supabase, 'missions', String(row.mission_id))
    return {
      ...row,
      space_id: row.space_id ?? mission?.space_id ?? null,
      campaign_id: row.campaign_id ?? mission?.campaign_id ?? null,
      org_id: row.org_id ?? mission?.org_id ?? null,
    }
  }

  private async loadMissionSubtask(supabase: SupabaseClient, id: string) {
    const row = await this.loadSingle(supabase, 'mission_subtasks', id)
    if (!row?.mission_id) return row
    const mission = await this.loadSingle(supabase, 'missions', String(row.mission_id))
    return {
      ...row,
      space_id: row.space_id ?? mission?.space_id ?? mission?.source_space_item_id ?? null,
      campaign_id: row.campaign_id ?? mission?.campaign_id ?? null,
      org_id: row.org_id ?? mission?.org_id ?? null,
    }
  }

  private async loadFunnelPage(supabase: SupabaseClient, id: string) {
    const row = await this.loadSingle(supabase, 'funnel_pages', id)
    if (!row?.funnel_id) return row
    const funnel = await this.loadSingle(supabase, 'funnels', String(row.funnel_id))
    return {
      ...row,
      space_id: row.space_id ?? funnel?.space_id ?? null,
      campaign_id: row.campaign_id ?? funnel?.campaign_id ?? null,
      org_id: row.org_id ?? funnel?.org_id ?? null,
      parent_type: 'funnel',
      parent_id: row.funnel_id,
    }
  }

  private async loadSequenceEmail(supabase: SupabaseClient, id: string) {
    const row = await this.loadSingle(supabase, 'sequence_emails', id)
    if (!row?.sequence_id) return row
    const sequence = await this.loadSingle(supabase, 'sequences', String(row.sequence_id))
    return {
      ...row,
      space_id: row.space_id ?? sequence?.space_id ?? null,
      campaign_id: row.campaign_id ?? sequence?.campaign_id ?? null,
      org_id: row.org_id ?? sequence?.org_id ?? null,
      parent_type: 'sequence',
      parent_id: row.sequence_id,
    }
  }

  private async loadConversationDocument(supabase: SupabaseClient, id: string) {
    const row = await this.loadSingle(supabase, 'conversation_documents', id)
    if (!row) return null
    const { data } = await this.repository.findSpaceItemForConversationDocument(supabase, id)
    return {
      ...row,
      space_id: data?.space_id ?? null,
      org_id: data?.org_id ?? null,
      parent_type: data?.id ? 'space_doc' : null,
      parent_id: data?.id ?? null,
    }
  }

  private assetFromRow(sourceType: SourceType, row: Record<string, unknown>, input: IndexInput) {
    const title = this.titleForSource(sourceType, row)
    const custom = this.record(row.custom_data) ?? {}
    const metadata = this.record(row.metadata) ?? {}
    const content = [
      title,
      sourceType,
      this.text(row.description),
      this.text(row.brief),
      this.text(row.progress_notes),
      this.text(row.notes),
      this.htmlToPlainText(this.text(row.doc_body)),
      this.text(row.content),
      this.text(row.body),
      this.text(row.subject),
      this.text(row.caption),
      this.text(row.headline),
      this.text(row.primary_text),
      this.text(row.generated_html),
      this.text(row.generated_css),
      this.text(row.summary),
      this.socialResearchSummary(sourceType, custom),
      this.stringify(row.content_json),
      this.stringify(row.content),
      this.stringify(row.output),
      this.stringify(row.schema),
      this.stringify(row.settings),
      this.stringify(row.metrics),
      this.stringify(row.rows),
      this.stringify(row.persona_data),
      this.stringify(row.generated_tsx),
      this.stringify(row.carousel_slides),
      this.stringify(row.targeting),
      this.stringify(row.seo),
      this.stringify(custom),
      this.stringify(metadata),
    ]
      .filter(Boolean)
      .join('\n')
    return {
      title,
      content,
      orgId: this.text(row.org_id) || input.orgId || null,
      spaceId: this.text(row.space_id) || input.spaceId || null,
      campaignId: this.text(row.campaign_id),
      parentType: this.text(row.parent_type),
      parentId: this.text(row.parent_id ?? row.parent_item_id ?? row.item_id ?? row.mission_id),
      sourceUpdatedAt: this.text(row.updated_at ?? row.created_at),
      metadata,
      retrieveVia: this.retrieveVia(sourceType, row),
    }
  }

  private retrieveVia(sourceType: SourceType, row: Record<string, unknown>) {
    if (sourceType === 'space_doc')
      return {
        action: 'read_space_document',
        data: { space_id: row.space_id, document_id: row.id },
      }
    if (sourceType === 'space_task')
      return { action: 'get_task', data: { space_id: row.space_id, task_id: row.id } }
    if (sourceType === 'mission') return { action: 'get_mission', data: { mission_id: row.id } }
    if (sourceType === 'mission_deliverable')
      return { action: 'get_mission_deliverables', data: { mission_id: row.mission_id } }
    if (sourceType === 'conversation_document')
      return { action: 'get_document', data: { document_id: row.id } }
    return { action: 'search_space_context', data: { source_id: row.id, source_type: sourceType } }
  }

  private contextualPrefix(
    asset: {
      title: string
      spaceId: string | null
      campaignId: string | null
      parentId: string | null
    },
    chunk: string,
  ) {
    return [
      `Source: ${asset.title}.`,
      asset.spaceId ? `Space ID: ${asset.spaceId}.` : '',
      asset.campaignId ? `Campaign ID: ${asset.campaignId}.` : '',
      asset.parentId ? `Related source ID: ${asset.parentId}.` : '',
      `Important terms: ${this.searchTerms(`${asset.title} ${chunk}`).slice(0, 8).join(', ')}.`,
    ]
      .filter(Boolean)
      .join(' ')
  }

  private chunkText(text: string): string[] {
    const clean = text.trim()
    if (!clean) return []
    const out: string[] = []
    let remaining = clean
    while (remaining.length > 1800) {
      let splitAt = remaining.lastIndexOf(' ', 1800)
      if (splitAt <= 0) splitAt = 1800
      out.push(remaining.slice(0, splitAt).trim())
      remaining = remaining.slice(splitAt).trim()
    }
    if (remaining) out.push(remaining)
    return out
  }

  private searchTerms(text: string): string[] {
    const stop = new Set(['the', 'and', 'for', 'with', 'space', 'task', 'mission', 'document'])
    return [
      ...new Set(
        text
          .toLowerCase()
          .split(/[^a-z0-9_-]+/)
          .filter((t) => t.length >= 3 && !stop.has(t)),
      ),
    ].slice(0, 48)
  }

  private entities(text: string): string[] {
    return [
      ...new Set(text.match(/\b[A-Z][A-Za-z0-9_-]{2,}(?:\s+[A-Z][A-Za-z0-9_-]{2,}){0,4}\b/g) ?? []),
    ].slice(0, 24)
  }

  private htmlToPlainText(value: string): string {
    return value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') return value
    if (value == null) return ''
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  private text(value: unknown): string {
    return typeof value === 'string' && value.trim() ? value.trim() : ''
  }

  private titleForSource(sourceType: SourceType, row: Record<string, unknown>) {
    return (
      this.text(row.title) ||
      this.text(row.name) ||
      this.text(row.subject) ||
      this.text(row.headline) ||
      this.text(row.slug) ||
      sourceType.replace(/_/g, ' ')
    )
  }

  private isSocialResearchSourceType(sourceType: SourceType) {
    return (
      sourceType === 'instagram_research_item' ||
      sourceType === 'tiktok_research_item' ||
      sourceType === 'youtube_research_item' ||
      sourceType === 'twitter_research_item'
    )
  }

  private socialResearchSummary(sourceType: SourceType, custom: Record<string, unknown>) {
    if (!this.isSocialResearchSourceType(sourceType)) return ''
    return [
      this.text(custom._platform) ? `Platform: ${this.text(custom._platform)}` : '',
      this.text(custom._handle) ? `Handle: @${this.text(custom._handle)}` : '',
      this.text(custom.media_type) ? `Format: ${this.text(custom.media_type)}` : '',
      this.text(custom.post_url) ? `URL: ${this.text(custom.post_url)}` : '',
      this.text(custom.caption) ? `Caption: ${this.text(custom.caption)}` : '',
      this.text(custom.hook) ? `Hook: ${this.text(custom.hook)}` : '',
      this.text(custom.transcript) ? `Transcript: ${this.text(custom.transcript)}` : '',
      custom.play_count != null ? `Views: ${String(custom.play_count)}` : '',
      custom.outlier_score != null ? `Outlier score: ${String(custom.outlier_score)}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  private record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  }

  private hash(value: string): string {
    return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
  }
}
