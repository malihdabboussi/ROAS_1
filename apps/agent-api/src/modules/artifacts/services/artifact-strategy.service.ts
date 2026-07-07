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
    }
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
