import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StrategyNodesRepository } from '../repositories/strategy-nodes.repository'

@Injectable()
export class StrategyNodesService {
  constructor(private readonly repo: StrategyNodesRepository) {}

  async list(supabase: SupabaseClient, userId: string, campaignId: string) {
    return this.repo.listByCampaign(supabase, userId, campaignId)
  }

  async create(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    input: {
      node_type: string
      text: string
      color?: string
      artifact_hint?: string
      position_x: number
      position_y: number
    },
  ) {
    return this.repo.create(supabase, userId, campaignId, {
      node_type: input.node_type,
      text: input.text,
      color: input.color ?? 'yellow',
      artifact_hint: input.artifact_hint,
      position_x: input.position_x,
      position_y: input.position_y,
    })
  }

  async update(
    supabase: SupabaseClient,
    userId: string,
    nodeId: string,
    input: Partial<{
      text: string
      color: string
      artifact_hint: string
      linked_artifact_id: string | null
      linked_artifact_type: string | null
      position_x: number
      position_y: number
    }>,
  ) {
    return this.repo.update(supabase, userId, nodeId, input)
  }

  async delete(supabase: SupabaseClient, userId: string, nodeId: string) {
    return this.repo.delete(supabase, userId, nodeId)
  }
}
