import { Injectable } from '@nestjs/common'
import { ArtifactStrategyRepository } from '../repositories/artifact-strategy.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { buildCampaignBlueprintOperations } from './campaign-blueprint-operations'

@Injectable()
export class ArtifactStrategyService {
  constructor(
    private readonly repository: ArtifactStrategyRepository = new ArtifactStrategyRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      create_strategy_node: (data, sessionKey) => this.createStrategyNode(target, data, sessionKey),
      list_strategy_nodes: (data, sessionKey) => this.listStrategyNodes(target, data, sessionKey),
      get_canvas_board: (data, sessionKey) => this.getCanvasBoard(target, data, sessionKey),
      build_campaign_blueprint: (data, sessionKey) =>
        this.buildCampaignBlueprint(target, data, sessionKey),
      complete_canvas_placeholder: (data, sessionKey) =>
        this.completeCanvasPlaceholder(target, data, sessionKey),
      apply_canvas_operations: (data, sessionKey) =>
        this.applyCanvasOperations(target, data, sessionKey),
    }
  }

  private async resolveCanvas(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = target.serviceClient
    const campaignId = await target.resolveCampaignId(supabase, data, userId, sessionKey)
    if (!campaignId) return { error: 'A campaign context is required to access Canvas.' }
    const access = await this.repository.canAccessCanvasCampaign(supabase, {
      campaignId,
      userId,
      level: 'view',
    })
    if (access.error || access.data !== true) {
      return { error: 'You do not have access to this campaign Canvas.' }
    }
    const result = await this.repository.getOrCreateCanvas(supabase, { campaignId, userId })
    if (result.error || !result.data) {
      return { error: result.error?.message ?? 'Canvas could not be loaded.' }
    }
    return { supabase, board: result.data, userId }
  }

  private async getCanvasBoard(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCanvas(target, data, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const boardId = resolved.board.id as string
    const [items, connectors] = await Promise.all([
      this.repository.getCanvasItems(resolved.supabase, boardId),
      this.repository.getCanvasConnectors(resolved.supabase, boardId),
    ])
    if (items.error || connectors.error) {
      return { success: false, error: items.error?.message ?? connectors.error?.message }
    }
    return {
      success: true,
      board: resolved.board,
      items: items.data ?? [],
      connectors: connectors.data ?? [],
    }
  }

  private async applyCanvasOperations(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCanvas(target, data, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const operations = Array.isArray(data.operations)
      ? (data.operations as Array<Record<string, unknown>>)
      : []
    if (operations.length === 0 || operations.length > 100) {
      return { success: false, error: 'Provide between 1 and 100 Canvas operations.' }
    }
    const baseRevision = data.base_revision
    if (typeof baseRevision !== 'number' || !Number.isInteger(baseRevision)) {
      return { success: false, error: 'base_revision must be the current integer board revision.' }
    }
    const actorAgentKey = target.resolveAgentKey?.(sessionKey) ?? 'pixel'
    const result = await this.repository.applyCanvasOperations(resolved.supabase, {
      boardId: resolved.board.id as string,
      userId: resolved.userId,
      baseRevision,
      idempotencyKey:
        typeof data.idempotency_key === 'string' ? data.idempotency_key : crypto.randomUUID(),
      operations,
      actorAgentKey,
    })
    if (result.error) return { success: false, error: result.error.message }
    return { success: true, ...(result.data as Record<string, unknown>) }
  }

  private async buildCampaignBlueprint(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCanvas(target, data, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const blueprintId = typeof data.blueprint_id === 'string' ? data.blueprint_id.trim() : ''
    if (!blueprintId) return { success: false, error: 'blueprint_id is required.' }
    const campaignLabel = typeof data.campaign_label === 'string' ? data.campaign_label.trim() : ''
    if (!campaignLabel) return { success: false, error: 'campaign_label is required.' }

    let operations: Array<Record<string, unknown>>
    try {
      operations = buildCampaignBlueprintOperations({
        blueprintId,
        campaignLabel,
        stages: Array.isArray(data.stages) ? (data.stages as never[]) : [],
        connections: Array.isArray(data.connections) ? (data.connections as never[]) : undefined,
        assets: Array.isArray(data.assets) ? (data.assets as never[]) : [],
        gaps: Array.isArray(data.gaps) ? (data.gaps as never[]) : [],
        originX: typeof data.origin_x === 'number' ? data.origin_x : undefined,
        originY: typeof data.origin_y === 'number' ? data.origin_y : undefined,
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Campaign blueprint is invalid.',
      }
    }

    const actorAgentKey = target.resolveAgentKey?.(sessionKey) ?? 'pixel'
    const idempotencyKey =
      typeof data.idempotency_key === 'string'
        ? data.idempotency_key
        : `campaign-blueprint:${blueprintId}`
    const batches = [
      operations.filter(
        (operation) =>
          operation.op === 'create_item' &&
          (operation.item as Record<string, unknown> | undefined)?.kind === 'frame',
      ),
      operations.filter(
        (operation) =>
          operation.op === 'create_item' &&
          (operation.item as Record<string, unknown> | undefined)?.kind !== 'frame',
      ),
      operations.filter((operation) => operation.op === 'create_connector'),
    ].filter((batch) => batch.length > 0)
    let revision = Number(resolved.board.revision ?? 0)
    let committed: Record<string, unknown> = {}
    for (const [batchIndex, batch] of batches.entries()) {
      const result = await this.repository.applyCanvasOperations(resolved.supabase, {
        boardId: resolved.board.id as string,
        userId: resolved.userId,
        baseRevision: revision,
        idempotencyKey: `${idempotencyKey}:batch:${batchIndex + 1}`,
        operations: batch,
        actorAgentKey,
      })
      if (result.error) return { success: false, error: result.error.message }
      committed = result.data as Record<string, unknown>
      revision = Number(committed.committed_revision ?? revision + 1)
    }
    return {
      success: true,
      blueprint_id: blueprintId,
      campaign_label: campaignLabel,
      item_count: operations.filter((operation) => operation.op === 'create_item').length,
      connector_count: operations.filter((operation) => operation.op === 'create_connector').length,
      batch_count: batches.length,
      ...committed,
    }
  }

  private async completeCanvasPlaceholder(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCanvas(target, data, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const items = await this.repository.getCanvasItems(
      resolved.supabase,
      resolved.board.id as string,
    )
    if (items.error) return { success: false, error: items.error.message }
    const nodeId = String(data.node_id ?? '')
    const item = (items.data ?? []).find((candidate) => candidate.id === nodeId) as
      | Record<string, any>
      | undefined
    if (!item) return { success: false, error: 'Canvas placeholder was not found.' }
    if (item.content?.semantic_type !== 'asset_placeholder') {
      return { success: false, error: 'The selected Canvas node is not an asset placeholder.' }
    }
    const { placeholder: _placeholder, ...previousContent } = item.content as Record<
      string,
      unknown
    >
    const resourceId = typeof data.resource_id === 'string' ? data.resource_id : null
    const resourceType = typeof data.resource_type === 'string' ? data.resource_type : null
    const url = typeof data.url === 'string' ? data.url : undefined
    const operations = [
      { op: 'delete_item', item_id: nodeId },
      {
        op: 'create_item',
        item: {
          id: nodeId,
          kind: resourceId ? 'resource_card' : 'card',
          position_x: item.position_x,
          position_y: item.position_y,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
          z_index: item.z_index,
          parent_id: item.parent_id,
          content: {
            ...previousContent,
            title: String(data.title),
            text: typeof data.source_label === 'string' ? data.source_label : 'Created by Pixel',
            semantic_type: 'existing_asset',
            status: 'ready',
            source: {
              kind: resourceId ? 'campaign_resource' : 'url',
              label: typeof data.source_label === 'string' ? data.source_label : 'Created by Pixel',
              ...(url ? { url } : {}),
            },
          },
          style: item.style,
          locked: item.locked,
          ...(resourceType ? { resource_type: resourceType } : {}),
          ...(resourceId ? { resource_id: resourceId } : {}),
        },
      },
    ]
    const result = await this.repository.applyCanvasOperations(resolved.supabase, {
      boardId: resolved.board.id as string,
      userId: resolved.userId,
      baseRevision: Number(resolved.board.revision ?? 0),
      idempotencyKey:
        typeof data.idempotency_key === 'string'
          ? data.idempotency_key
          : `complete-placeholder:${nodeId}:${resourceId ?? url ?? data.title}`,
      operations,
      actorAgentKey: target.resolveAgentKey?.(sessionKey) ?? 'pixel',
    })
    if (result.error) return { success: false, error: result.error.message }
    return {
      success: true,
      node_id: nodeId,
      resource_type: resourceType,
      resource_id: resourceId,
      ...(result.data as Record<string, unknown>),
    }
  }

  private async createStrategyNode(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = target.serviceClient
    const campaignId = await target.resolveCampaignId(supabase, data, userId, sessionKey)

    const nodeType = (data.node_type as string) ?? 'sticky_note'
    const text = (data.text as string) ?? ''
    const color = (data.color as string) ?? 'yellow'
    const artifactHint = (data.artifact_hint as string) ?? null
    const positionX = typeof data.position_x === 'number' ? data.position_x : 0
    const positionY = typeof data.position_y === 'number' ? data.position_y : 0

    const { data: created, error } = await this.repository.createStrategyNode(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      node_type: nodeType,
      text,
      color,
      artifact_hint: artifactHint,
      position_x: positionX,
      position_y: positionY,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, strategy_node: created }
  }

  private async listStrategyNodes(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = target.serviceClient
    const campaignId = await target.resolveCampaignId(supabase, data, userId, sessionKey)

    const { data: nodes, error } = await this.repository.listStrategyNodes(supabase, {
      userId,
      campaignId,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, strategy_nodes: nodes ?? [] }
  }
}
