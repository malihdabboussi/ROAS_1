import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SpaceRetrievalRepository } from '../repositories/space-retrieval.repository'
import { SpaceSemanticEdgeWriterService } from './space-semantic-edge-writer.service'
import type { SpaceSemanticEdgeInput, SpaceSemanticEdgeType } from '../space-semantic-edge.types'

type StructuralAsset = {
  sourceType: string
  sourceId: string
  spaceId?: string | null
  campaignId?: string | null
  parentType?: string | null
  parentId?: string | null
}

@Injectable()
export class SpaceStructuralEdgeBuilderService {
  constructor(
    private readonly writer: SpaceSemanticEdgeWriterService,
    private readonly repository: SpaceRetrievalRepository,
  ) {}

  async replaceStructuralEdgesForSource(
    supabase: SupabaseClient,
    asset: StructuralAsset,
    row: Record<string, unknown>,
  ): Promise<{ written: number }> {
    const edges = await this.buildEdges(supabase, asset, row)
    return this.writer.replaceStructuralEdgesForSource(
      supabase,
      asset.sourceType,
      asset.sourceId,
      edges,
    )
  }

  private async buildEdges(
    supabase: SupabaseClient,
    asset: StructuralAsset,
    row: Record<string, unknown>,
  ): Promise<SpaceSemanticEdgeInput[]> {
    const edges: SpaceSemanticEdgeInput[] = []
    const linkedToView = await this.addViewEdge(supabase, edges, asset, row)
    this.addSpaceEdge(edges, asset, linkedToView)
    await this.addParentEdge(supabase, edges, asset, row)
    this.addArtifactEdges(edges, asset, row)
    return edges
  }

  private addSpaceEdge(
    edges: SpaceSemanticEdgeInput[],
    asset: StructuralAsset,
    linkedToView = false,
  ): void {
    if (!asset.spaceId || asset.sourceType === 'space') return
    // When the item is already linked under a Space view, keep a clean
    // Space → View → Item hierarchy instead of also drawing Space → Item.
    if (linkedToView) return
    edges.push({
      fromSourceType: 'space',
      fromSourceId: asset.spaceId,
      toSourceType: asset.sourceType,
      toSourceId: asset.sourceId,
      edgeType: this.spaceEdgeType(asset.sourceType),
      reason: 'Object belongs to this Space.',
    })
  }

  private async addViewEdge(
    supabase: SupabaseClient,
    edges: SpaceSemanticEdgeInput[],
    asset: StructuralAsset,
    row: Record<string, unknown>,
  ): Promise<boolean> {
    if (!asset.spaceId || asset.sourceType === 'space' || asset.sourceType === 'space_view')
      return false
    const customData = this.record(row.custom_data)
    // Prefer an explicit `_view_type` (social-research items set it); otherwise derive
    // the item's canonical view from its source type so generic docs/tasks/media also
    // hang under their Space view.
    const viewType = this.text(customData?._view_type) || this.canonicalViewType(asset.sourceType)
    if (!viewType) return false

    const viewSourceId = await this.resolveViewSourceId(supabase, asset.spaceId, viewType)
    if (!viewSourceId) return false

    edges.push({
      fromSourceType: 'space_view',
      fromSourceId: viewSourceId,
      toSourceType: asset.sourceType,
      toSourceId: asset.sourceId,
      edgeType: this.viewEdgeType(asset.sourceType),
      reason: 'Object is listed inside this Space view.',
      metadata: { view_type: viewType },
    })
    return true
  }

  /**
   * Canonical Space-view type for an item source type. Returns '' for sources that
   * have no dedicated view (they keep their direct Space/parent edge). An edge is
   * only created if the space's `schema.views` actually contains the resolved type.
   */
  private canonicalViewType(sourceType: string): string {
    if (sourceType === 'space_doc') return 'docs'
    if (sourceType === 'space_task') return 'kanban'
    if (sourceType === 'media_asset') return 'media'
    if (sourceType === 'funnel') return 'funnels'
    if (sourceType === 'offer') return 'offers'
    if (sourceType === 'presentation') return 'presentations'
    if (sourceType === 'avatar') return 'avatars'
    if (sourceType === 'sequence') return 'sequences'
    if (sourceType === 'email') return 'emails'
    if (sourceType === 'social_post') return 'social_posts'
    return ''
  }

  private async addParentEdge(
    supabase: SupabaseClient,
    edges: SpaceSemanticEdgeInput[],
    asset: StructuralAsset,
    row: Record<string, unknown>,
  ): Promise<void> {
    const parent = this.parentFor(asset, row)
    if (!parent) {
      if (asset.sourceType !== 'space_activity' && asset.sourceType !== 'space_deliverable') return
      const itemId = this.text(row.item_id)
      if (!itemId) return
      const itemSourceType = await this.resolveSourceTypeForSourceId(
        supabase,
        itemId,
        asset.spaceId,
      )
      if (!itemSourceType) return
      edges.push({
        fromSourceType: itemSourceType,
        fromSourceId: itemId,
        toSourceType: asset.sourceType,
        toSourceId: asset.sourceId,
        edgeType:
          asset.sourceType === 'space_activity' ? 'contains_activity' : 'contains_deliverable',
        reason: 'Object is attached to this Space item.',
      })
      return
    }

    edges.push({
      fromSourceType: parent.sourceType,
      fromSourceId: parent.sourceId,
      toSourceType: asset.sourceType,
      toSourceId: asset.sourceId,
      edgeType: parent.edgeType,
      reason: 'Object belongs to this parent source.',
    })
  }

  private addArtifactEdges(
    edges: SpaceSemanticEdgeInput[],
    asset: StructuralAsset,
    row: Record<string, unknown>,
  ): void {
    if (asset.sourceType === 'ad_set') {
      const campaignId = this.text(row.ad_campaign_id)
      if (campaignId) {
        edges.push({
          fromSourceType: 'ad_campaign',
          fromSourceId: campaignId,
          toSourceType: 'ad_set',
          toSourceId: asset.sourceId,
          edgeType: 'contains_ad_set',
          reason: 'Ad set belongs to this ad campaign.',
        })
      }
    }
    if (asset.sourceType === 'ad') {
      const adSetId = this.text(row.ad_set_id)
      if (adSetId) {
        edges.push({
          fromSourceType: 'ad_set',
          fromSourceId: adSetId,
          toSourceType: 'ad',
          toSourceId: asset.sourceId,
          edgeType: 'contains_ad',
          reason: 'Ad belongs to this ad set.',
        })
      }
    }
    if (asset.sourceType === 'social_post') {
      const mediaAssetId = this.text(row.media_asset_id)
      if (mediaAssetId) {
        edges.push({
          fromSourceType: 'social_post',
          fromSourceId: asset.sourceId,
          toSourceType: 'media_asset',
          toSourceId: mediaAssetId,
          edgeType: 'uses_media',
          reason: 'Social post uses this media asset.',
        })
      }
    }
  }

  private parentFor(
    asset: StructuralAsset,
    row: Record<string, unknown>,
  ): { sourceType: string; sourceId: string; edgeType: SpaceSemanticEdgeType } | null {
    if (asset.sourceType === 'funnel_page') {
      const sourceId = this.text(row.funnel_id) || asset.parentId
      return sourceId ? { sourceType: 'funnel', sourceId, edgeType: 'has_page' } : null
    }
    if (asset.sourceType === 'sequence_email') {
      const sourceId = this.text(row.sequence_id) || asset.parentId
      return sourceId ? { sourceType: 'sequence', sourceId, edgeType: 'has_email' } : null
    }
    if (asset.sourceType === 'mission_subtask') {
      const sourceId = this.text(row.mission_id) || asset.parentId
      return sourceId ? { sourceType: 'mission', sourceId, edgeType: 'has_subtask' } : null
    }
    if (asset.sourceType === 'mission_deliverable') {
      const sourceId = this.text(row.mission_id) || asset.parentId
      return sourceId ? { sourceType: 'mission', sourceId, edgeType: 'has_deliverable' } : null
    }
    if (asset.parentType && asset.parentId) {
      return {
        sourceType: asset.parentType,
        sourceId: asset.parentId,
        edgeType: this.parentEdgeType(asset.sourceType),
      }
    }
    return null
  }

  private async resolveViewSourceId(
    supabase: SupabaseClient,
    spaceId: string,
    viewType: string,
  ): Promise<string | null> {
    const { data, error } = await this.repository.getSpaceSchema(supabase, spaceId)
    if (error) throw new Error(`Failed to resolve Space view edge: ${error.message}`)
    const schema = this.record((data as Record<string, unknown> | null)?.schema)
    const views = Array.isArray(schema?.views) ? schema.views : []
    const view = views.find((candidate) => {
      const record = this.record(candidate)
      return record && this.text(record.type) === viewType && this.text(record.id)
    })
    const viewId = this.text(this.record(view)?.id)
    return viewId ? `${spaceId}:${viewId}` : null
  }

  private async resolveSourceTypeForSourceId(
    supabase: SupabaseClient,
    sourceId: string,
    spaceId?: string | null,
  ): Promise<string | null> {
    const { data, error } = await this.repository.findObjectSourceType(supabase, sourceId, spaceId)
    if (error) throw new Error(`Failed to resolve Space item edge: ${error.message}`)
    return this.text((data as Record<string, unknown> | null)?.source_type) || null
  }

  private spaceEdgeType(sourceType: string): SpaceSemanticEdgeType {
    if (sourceType === 'space_view') return 'contains_view'
    if (sourceType === 'space_doc') return 'contains_doc'
    if (sourceType === 'space_task') return 'contains_task'
    if (sourceType === 'space_activity') return 'contains_activity'
    if (sourceType === 'space_deliverable') return 'contains_deliverable'
    if (sourceType.endsWith('_research_item')) return 'contains_item'
    return 'contains_artifact'
  }

  private viewEdgeType(sourceType: string): SpaceSemanticEdgeType {
    if (sourceType === 'space_doc') return 'contains_doc'
    if (sourceType === 'space_task') return 'contains_task'
    return 'contains_item'
  }

  private parentEdgeType(sourceType: string): SpaceSemanticEdgeType {
    if (sourceType === 'space_activity') return 'contains_activity'
    if (sourceType === 'space_deliverable') return 'contains_deliverable'
    return 'contains_item'
  }

  private record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  }

  private text(value: unknown): string {
    return typeof value === 'string' && value.trim() ? value.trim() : ''
  }
}
