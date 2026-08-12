import { Injectable } from '@nestjs/common'
import { ArtifactStrategyRepository } from '../repositories/artifact-strategy.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'

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
    const campaignId = target.resolveCampaignId(data, sessionKey)
    if (!campaignId) return { error: 'A campaign context is required to access Canvas.' }
    const supabase = await target.getServiceSupabase()
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

  private async createStrategyNode(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getServiceSupabase()
    const campaignId = target.resolveCampaignId(data, sessionKey)

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
    const supabase = await target.getServiceSupabase()
    const campaignId = target.resolveCampaignId(data, sessionKey)

    const { data: nodes, error } = await this.repository.listStrategyNodes(supabase, {
      userId,
      campaignId,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, strategy_nodes: nodes ?? [] }
  }
}
