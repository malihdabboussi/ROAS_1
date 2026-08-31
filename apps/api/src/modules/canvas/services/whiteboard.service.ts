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

  async list(supabase: SupabaseClient, campaignId: string, userId: string) {
    await this.repository.assertCampaignAccessible(supabase, campaignId)
    await this.repository.getOrCreate(supabase, campaignId, userId)
    const boards = await this.repository.listBoards(supabase, campaignId)
    return { boards }
  }

  async create(supabase: SupabaseClient, campaignId: string, userId: string, title: string) {
    await this.repository.assertCampaignAccessible(supabase, campaignId)
    return { board: await this.repository.createBoard(supabase, campaignId, userId, title) }
  }

  async loadBoard(supabase: SupabaseClient, campaignId: string, boardId: string) {
    await this.repository.assertCampaignAccessible(supabase, campaignId)
    const board = await this.repository.getBoard(supabase, campaignId, boardId)
    const [items, connectors] = await Promise.all([
      this.repository.listItems(supabase, board.id),
      this.repository.listConnectors(supabase, board.id),
    ])
    return { board, items, connectors }
  }

  async applyBoardOperations(
    supabase: SupabaseClient,
    campaignId: string,
    boardId: string,
    userId: string,
    input: ApplyWhiteboardOperationsDto,
  ) {
    await this.repository.assertCampaignAccessible(supabase, campaignId)
    const board = await this.repository.getBoard(supabase, campaignId, boardId)
    return this.repository.applyOperations(supabase, {
      boardId: board.id,
      userId,
      baseRevision: input.base_revision,
      idempotencyKey: input.idempotency_key,
      operations: input.operations,
      actorAgentKey: input.actor_agent_key,
    })
  }

  async undoBoardOperation(
    supabase: SupabaseClient,
    campaignId: string,
    boardId: string,
    userId: string,
    operationId: string,
  ) {
    await this.repository.assertCampaignAccessible(supabase, campaignId)
    const board = await this.repository.getBoard(supabase, campaignId, boardId)
    return this.repository.undoOperation(supabase, { boardId: board.id, userId, operationId })
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
