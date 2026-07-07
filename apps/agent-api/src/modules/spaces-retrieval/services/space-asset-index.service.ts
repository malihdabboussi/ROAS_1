import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SpaceAssetIndexInput,
  SpaceAssetIndexResult,
  SpaceSemanticSourceType,
} from '../types/space-retrieval.types'
import { SpacesRetrievalRepository } from '../repositories/spaces-retrieval.repository'
import { SpaceAssetIndexRegistry } from './space-asset-index.registry'
import { SpaceSemanticChunkWriterService } from './space-semantic-chunk-writer.service'
import { SpaceStructuralEdgeBuilderService } from './space-structural-edge-builder.service'

@Injectable()
export class SpaceAssetIndexService {
  private readonly logger = new Logger(SpaceAssetIndexService.name)

  constructor(
    private readonly registry: SpaceAssetIndexRegistry,
    private readonly writer: SpaceSemanticChunkWriterService,
    @Optional()
    private readonly structuralEdges: SpaceStructuralEdgeBuilderService | undefined = undefined,
    private readonly repository: SpacesRetrievalRepository = new SpacesRetrievalRepository(),
  ) {}

  async indexSource(
    supabase: SupabaseClient,
    input: SpaceAssetIndexInput,
  ): Promise<SpaceAssetIndexResult> {
    if (process.env.SPACE_ASSET_INDEXING !== '1' && process.env.SPACE_SEMANTIC_RETRIEVAL !== '1') {
      return {
        indexed: 0,
        skipped: 1,
        source_type: input.sourceType,
        source_id: input.sourceId,
      }
    }

    const row = input.row ?? (await this.loadSourceRow(supabase, input.sourceType, input.sourceId))
    if (!row) {
      await this.writer.deleteSource(supabase, input.sourceType, input.sourceId)
      return {
        indexed: 0,
        skipped: 1,
        source_type: input.sourceType,
        source_id: input.sourceId,
      }
    }

    const asset = this.registry.toAsset(input.sourceType, row, input)
    if (!asset || !asset.content.trim()) {
      await this.writer.deleteSource(supabase, input.sourceType, input.sourceId)
      return {
        indexed: 0,
        skipped: 1,
        source_type: input.sourceType,
        source_id: input.sourceId,
      }
    }

    const result = await this.writer.replaceSource(supabase, asset)
    await this.structuralEdges?.replaceStructuralEdgesForSource(supabase, asset, row)
    this.logger.log(
      JSON.stringify({
        feature: 'space_retrieval_index',
        source_type: input.sourceType,
        source_id: input.sourceId,
        indexed: result.indexed,
        skipped: result.skipped,
      }),
    )
    return {
      ...result,
      source_type: input.sourceType,
      source_id: input.sourceId,
    }
  }

  async deleteSource(
    supabase: SupabaseClient,
    sourceType: SpaceSemanticSourceType,
    sourceId: string,
  ): Promise<{ deleted: true }> {
    return this.writer.deleteSource(supabase, sourceType, sourceId)
  }

  private async loadSourceRow(
    supabase: SupabaseClient,
    sourceType: SpaceSemanticSourceType,
    sourceId: string,
  ): Promise<Record<string, unknown> | null> {
    if (sourceType === 'space') return this.loadSingle(supabase, 'spaces', sourceId)
    if (sourceType === 'space_view') return null
    if (sourceType === 'space_doc' || sourceType === 'space_task') {
      return this.loadSingle(supabase, 'space_items', sourceId)
    }
    if (
      sourceType === 'instagram_research_item' ||
      sourceType === 'tiktok_research_item' ||
      sourceType === 'youtube_research_item' ||
      sourceType === 'twitter_research_item'
    ) {
      return this.loadSingle(supabase, 'space_items', sourceId)
    }
    if (sourceType === 'space_activity')
      return this.loadSingle(supabase, 'space_item_activity', sourceId)
    if (sourceType === 'space_deliverable') {
      return this.loadSingle(supabase, 'space_item_deliverables', sourceId)
    }
    if (sourceType === 'mission') return this.loadSingle(supabase, 'missions', sourceId)
    if (sourceType === 'mission_subtask') return this.loadMissionSubtask(supabase, sourceId)
    if (sourceType === 'mission_deliverable') return this.loadMissionDeliverable(supabase, sourceId)
    if (sourceType === 'conversation_document')
      return this.loadConversationDocument(supabase, sourceId)
    if (sourceType === 'contact') return this.loadSingle(supabase, 'contacts', sourceId)
    if (sourceType === 'channel') return this.loadSingle(supabase, 'channels', sourceId)
    if (sourceType === 'channel_message')
      return this.loadSingle(supabase, 'channel_messages', sourceId)
    if (sourceType === 'media_asset') return this.loadSingle(supabase, 'media_assets', sourceId)
    if (sourceType === 'funnel') return this.loadSingle(supabase, 'funnels', sourceId)
    if (sourceType === 'funnel_page') return this.loadFunnelPage(supabase, sourceId)
    if (sourceType === 'form') return this.loadSingle(supabase, 'forms', sourceId)
    if (sourceType === 'form_response') return this.loadSingle(supabase, 'form_responses', sourceId)
    if (sourceType === 'offer') return this.loadSingle(supabase, 'offers', sourceId)
    if (sourceType === 'email') return this.loadSingle(supabase, 'emails', sourceId)
    if (sourceType === 'sequence') return this.loadSingle(supabase, 'sequences', sourceId)
    if (sourceType === 'sequence_email') return this.loadSequenceEmail(supabase, sourceId)
    if (sourceType === 'presentation') return this.loadSingle(supabase, 'presentations', sourceId)
    if (sourceType === 'avatar') return this.loadSingle(supabase, 'avatars', sourceId)
    if (sourceType === 'social_post') return this.loadSingle(supabase, 'social_posts', sourceId)
    if (sourceType === 'ad_campaign') return this.loadSingle(supabase, 'ad_campaigns', sourceId)
    if (sourceType === 'ad_set') return this.loadSingle(supabase, 'ad_sets', sourceId)
    if (sourceType === 'ad') return this.loadSingle(supabase, 'ads', sourceId)
    if (sourceType === 'blog_post') return this.loadSingle(supabase, 'blog_posts', sourceId)
    return null
  }

  private async loadSingle(
    supabase: SupabaseClient,
    table: string,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    return this.repository.findSourceRow(supabase, table, id)
  }

  private async loadMissionSubtask(
    supabase: SupabaseClient,
    id: string,
  ): Promise<Record<string, unknown> | null> {
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

  private async loadMissionDeliverable(
    supabase: SupabaseClient,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const row = await this.loadSingle(supabase, 'mission_deliverables', id)
    if (!row?.mission_id) return row
    const mission = await this.loadSingle(supabase, 'missions', String(row.mission_id))
    return {
      ...row,
      space_id: row.space_id ?? mission?.space_id ?? mission?.source_space_item_id ?? null,
      campaign_id: row.campaign_id ?? mission?.campaign_id ?? null,
      org_id: row.org_id ?? mission?.org_id ?? null,
    }
  }

  private async loadConversationDocument(
    supabase: SupabaseClient,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const row = await this.loadSingle(supabase, 'conversation_documents', id)
    if (!row) return null
    const data = await this.repository.findConversationDocumentSpaceItem(supabase, id)
    return {
      ...row,
      space_id: row.space_id ?? data?.space_id ?? null,
      org_id: row.org_id ?? data?.org_id ?? null,
      parent_id: row.parent_id ?? data?.id ?? null,
      parent_type: data?.id ? 'space_doc' : row.parent_type,
    }
  }

  private async loadFunnelPage(
    supabase: SupabaseClient,
    id: string,
  ): Promise<Record<string, unknown> | null> {
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

  private async loadSequenceEmail(
    supabase: SupabaseClient,
    id: string,
  ): Promise<Record<string, unknown> | null> {
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
}
