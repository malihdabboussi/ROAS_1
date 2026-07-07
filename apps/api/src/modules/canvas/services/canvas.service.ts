import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsService } from '../../campaigns/services/artifacts.service'
import type { CreateCanvasNodeDto, SaveCanvasGraphDto, UpdateCanvasNodeDto } from '../dto'
import { CanvasRepository } from '../repositories/canvas.repository'
import type {
  AdCreativeCanvasRow,
  AdCreativeNodeRow,
  ReactFlowGraph,
  ReactFlowNode,
} from '../types'

@Injectable()
export class CanvasService {
  constructor(
    private readonly canvasRepo: CanvasRepository,
    private readonly artifactsService: ArtifactsService,
  ) {}

  async loadCanvasGraph(
    supabase: SupabaseClient,
    adSetId: string,
    userId: string,
    orgId?: string | null,
  ) {
    await this.artifactsService.getAdSet(supabase, adSetId)

    let canvas = await this.canvasRepo.getCanvasByAdSetId(supabase, adSetId, userId, orgId)
    if (!canvas) {
      canvas = await this.seedCanvasFromAdSet(supabase, adSetId, userId, orgId)
    }

    const nodes = await this.canvasRepo.listNodes(supabase, canvas.id)
    const graph = this.hydrateReactFlowGraph(canvas, nodes)

    return { canvas, nodes, graph }
  }

  async saveCanvasGraph(
    supabase: SupabaseClient,
    adSetId: string,
    userId: string,
    body: SaveCanvasGraphDto,
    orgId?: string | null,
  ) {
    const canvas = await this.canvasRepo.getCanvasByAdSetId(supabase, adSetId, userId, orgId)
    if (!canvas) throw new NotFoundException('Canvas not found')

    const updated = await this.canvasRepo.updateCanvasLayout(
      supabase,
      canvas.id,
      body.graph,
      body.viewport,
      body.default_model_id,
    )

    await this.syncNodePositionsFromGraph(supabase, body.graph)

    return { canvas: updated, graph: body.graph }
  }

  async createNode(
    supabase: SupabaseClient,
    userId: string,
    input: CreateCanvasNodeDto,
    orgId?: string | null,
  ) {
    const canvas = await this.canvasRepo.getCanvasById(supabase, input.canvas_id, userId)
    if (!canvas) throw new NotFoundException('Canvas not found')

    return this.canvasRepo.createNode(supabase, {
      canvas_id: input.canvas_id,
      user_id: userId,
      org_id: orgId ?? canvas.org_id,
      kind: input.kind,
      status: input.status,
      parent_node_id: input.parent_node_id,
      parent_image_node_id: input.parent_image_node_id,
      ad_id: input.ad_id,
      image_asset_id: input.image_asset_id,
      payload: input.payload,
      position_x: input.position_x,
      position_y: input.position_y,
    })
  }

  async updateNode(
    supabase: SupabaseClient,
    nodeId: string,
    userId: string,
    patch: UpdateCanvasNodeDto,
  ) {
    const node = await this.canvasRepo.getNode(supabase, nodeId)
    if (!node || node.user_id !== userId) throw new NotFoundException('Node not found')
    return this.canvasRepo.updateNode(supabase, nodeId, patch)
  }

  async deleteNode(supabase: SupabaseClient, nodeId: string, userId: string) {
    const node = await this.canvasRepo.getNode(supabase, nodeId)
    if (!node || node.user_id !== userId) throw new NotFoundException('Node not found')
    await this.canvasRepo.deleteNode(supabase, nodeId)
    return { success: true }
  }

  async promoteNodeToAd(
    supabase: SupabaseClient,
    nodeId: string,
    userId: string,
    orgId?: string | null,
  ) {
    const node = await this.canvasRepo.getNode(supabase, nodeId)
    if (!node || node.user_id !== userId) throw new NotFoundException('Node not found')
    if (
      node.kind !== 'ad' &&
      node.kind !== 'image' &&
      node.kind !== 'carousel' &&
      node.kind !== 'copy'
    ) {
      throw new BadRequestException(
        'Only ad, image, carousel, or copy nodes can be promoted to ads',
      )
    }

    const canvas = await this.canvasRepo.getCanvasById(supabase, node.canvas_id, userId)
    if (!canvas) throw new NotFoundException('Canvas not found')

    const adSet = await this.artifactsService.getAdSet(supabase, canvas.ad_set_id)
    const adCampaign = await this.artifactsService.getAdCampaign(
      supabase,
      String(adSet.ad_campaign_id),
    )
    const campaignId = (adCampaign as Record<string, unknown>).campaign_id as string | null

    const payload = node.payload ?? {}
    const adFields = {
      headline: String(payload.headline ?? payload.title ?? 'Untitled'),
      primary_text: String(payload.primary_text ?? payload.copy ?? ''),
      description: payload.description != null ? String(payload.description) : null,
      cta_type: payload.cta_type != null ? String(payload.cta_type) : 'LEARN_MORE',
      cta_text: payload.cta_text != null ? String(payload.cta_text) : null,
      destination_url: String(payload.destination_url ?? payload.url ?? ''),
      display_link: payload.display_link != null ? String(payload.display_link) : null,
      image_url: payload.image_url != null ? String(payload.image_url) : null,
      image_asset_id: node.image_asset_id ?? (payload.image_asset_id as string | null) ?? null,
      generated_tsx: payload.generated_tsx != null ? String(payload.generated_tsx) : null,
      ad_format: payload.ad_format != null ? String(payload.ad_format) : undefined,
      metadata: {
        canvas_node_id: node.id,
        ...(typeof payload.metadata === 'object' && payload.metadata
          ? (payload.metadata as Record<string, unknown>)
          : {}),
      },
    }

    if (node.ad_id) {
      const ad = await this.artifactsService.updateAd(supabase, node.ad_id, adFields)
      await this.canvasRepo.patchNodePayload(supabase, nodeId, {
        promoted_at: new Date().toISOString(),
      })
      return { ad, created: false }
    }

    const ad = await this.canvasRepo.createPromotedAd(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      ad_set_id: canvas.ad_set_id,
      platform: 'meta',
      placement: String(payload.placement ?? 'feed'),
      headline: adFields.headline,
      primary_text: adFields.primary_text,
      description: adFields.description,
      cta_type: adFields.cta_type,
      cta_text: adFields.cta_text,
      destination_url: adFields.destination_url,
      display_link: adFields.display_link,
      image_url: adFields.image_url,
      image_asset_id: adFields.image_asset_id,
      generated_tsx: adFields.generated_tsx,
      metadata: adFields.metadata,
      org_id: orgId ?? canvas.org_id,
    })

    await this.canvasRepo.updateNode(supabase, nodeId, {
      ad_id: ad.id as string,
      status: 'ready',
      payload: {
        ...payload,
        promoted_at: new Date().toISOString(),
      },
    })

    return { ad, created: true }
  }

  async seedCanvasFromAdSet(
    supabase: SupabaseClient,
    adSetId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<AdCreativeCanvasRow> {
    const adSet = await this.artifactsService.getAdSet(supabase, adSetId)
    const canvas = await this.canvasRepo.getOrCreateCanvas(supabase, adSetId, userId, orgId)

    const existingNodes = await this.canvasRepo.listNodes(supabase, canvas.id)
    if (existingNodes.length > 0) return canvas

    const adSetMeta = (adSet.metadata as Record<string, unknown> | null) ?? {}
    const briefNode = await this.canvasRepo.createNode(supabase, {
      canvas_id: canvas.id,
      user_id: userId,
      org_id: orgId ?? canvas.org_id,
      kind: 'brief',
      status: 'ready',
      position_x: 0,
      position_y: 0,
      payload: {
        title: adSet.name,
        brief: adSetMeta.brief ?? adSetMeta.description ?? '',
      },
    })

    const ads = await this.artifactsService.listAdsByAdSet(supabase, adSetId)
    const rfNodes: ReactFlowNode[] = [this.toReactFlowNode(briefNode)]
    const rfEdges: ReactFlowGraph['edges'] = []

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i] as Record<string, unknown>
      const adNode = await this.canvasRepo.createNode(supabase, {
        canvas_id: canvas.id,
        user_id: userId,
        org_id: orgId ?? canvas.org_id,
        kind: 'ad',
        status: 'ready',
        ad_id: String(ad.id),
        image_asset_id: (ad.image_asset_id as string | null) ?? null,
        parent_node_id: briefNode.id,
        position_x: 320 * (i + 1),
        position_y: 0,
        payload: {
          headline: ad.headline,
          primary_text: ad.primary_text,
          description: ad.description,
          cta_type: ad.cta_type,
          destination_url: ad.destination_url,
          image_url: ad.image_url,
          image_asset_id: ad.image_asset_id,
          metadata: ad.metadata,
        },
      })
      rfNodes.push(this.toReactFlowNode(adNode))
      rfEdges.push({
        id: `e-${briefNode.id}-${adNode.id}`,
        source: briefNode.id,
        target: adNode.id,
      })
    }

    const graph: ReactFlowGraph = { nodes: rfNodes, edges: rfEdges }
    return this.canvasRepo.updateCanvasLayout(
      supabase,
      canvas.id,
      graph,
      canvas.viewport ?? { x: 0, y: 0, zoom: 1 },
    )
  }

  hydrateReactFlowGraph(canvas: AdCreativeCanvasRow, nodes: AdCreativeNodeRow[]): ReactFlowGraph {
    const stored = (canvas.graph ?? { nodes: [], edges: [] }) as ReactFlowGraph
    const storedNodeMap = new Map(stored.nodes?.map((n) => [n.id, n]) ?? [])

    const rfNodes = nodes.map((node) => {
      const storedNode = storedNodeMap.get(node.id)
      return this.toReactFlowNode(node, storedNode?.position)
    })

    const nodeIds = new Set(nodes.map((n) => n.id))
    const edges = (stored.edges ?? []).filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))

    return { nodes: rfNodes, edges }
  }

  private toReactFlowNode(
    node: AdCreativeNodeRow,
    positionOverride?: { x: number; y: number },
  ): ReactFlowNode {
    return {
      id: node.id,
      type: node.kind,
      position: positionOverride ?? { x: node.position_x, y: node.position_y },
      data: {
        ...node.payload,
        kind: node.kind,
        status: node.status,
        adId: node.ad_id,
        imageAssetId: node.image_asset_id,
        parentNodeId: node.parent_node_id,
        parentImageNodeId: node.parent_image_node_id,
      },
    }
  }

  private async syncNodePositionsFromGraph(
    supabase: SupabaseClient,
    graph: ReactFlowGraph,
  ): Promise<void> {
    for (const rfNode of graph.nodes ?? []) {
      await this.canvasRepo.updateNode(supabase, rfNode.id, {
        position_x: rfNode.position.x,
        position_y: rfNode.position.y,
      })
    }
  }
}
