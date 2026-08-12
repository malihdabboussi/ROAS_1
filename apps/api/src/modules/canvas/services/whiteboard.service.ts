import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApplyWhiteboardOperationsDto } from '../dto'
import { WhiteboardRepository } from '../repositories/whiteboard.repository'

@Injectable()
export class WhiteboardService {
  constructor(private readonly repository: WhiteboardRepository) {}

  async load(supabase: SupabaseClient, campaignId: string, userId: string) {
    await this.repository.assertCampaignAccessible(supabase, campaignId)
    const board = await this.repository.getOrCreate(supabase, campaignId, userId)
    const [items, connectors] = await Promise.all([
      this.repository.listItems(supabase, board.id),
      this.repository.listConnectors(supabase, board.id),
    ])
    return { board, items, connectors }
  }

  async applyOperations(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
    input: ApplyWhiteboardOperationsDto,
  ) {
    await this.repository.assertCampaignAccessible(supabase, campaignId)
    const board = await this.repository.getOrCreate(supabase, campaignId, userId)
    return this.repository.applyOperations(supabase, {
      boardId: board.id,
      userId,
      baseRevision: input.base_revision,
      idempotencyKey: input.idempotency_key,
      operations: input.operations,
      actorAgentKey: input.actor_agent_key,
    })
  }

  async undoOperation(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
    operationId: string,
  ) {
    await this.repository.assertCampaignAccessible(supabase, campaignId)
    const board = await this.repository.getOrCreate(supabase, campaignId, userId)
    return this.repository.undoOperation(supabase, {
      boardId: board.id,
      userId,
      operationId,
    })
  }
}
