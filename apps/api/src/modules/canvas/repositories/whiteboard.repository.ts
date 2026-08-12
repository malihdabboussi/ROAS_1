import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CampaignWhiteboardRow,
  CanvasConnectorRow,
  CanvasItemRow,
} from '../types/whiteboard.types'

@Injectable()
export class WhiteboardRepository {
  async assertCampaignAccessible(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<void> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .maybeSingle()
    if (error || !data?.id) throw new NotFoundException('Campaign not found')
  }

  async getOrCreate(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
  ): Promise<CampaignWhiteboardRow> {
    const { data: existing, error: readError } = await supabase
      .from('campaign_canvases')
      .select('*')
      .eq('campaign_id', campaignId)
      .maybeSingle()
    if (readError) throw new BadRequestException(readError.message)
    if (existing) return existing as CampaignWhiteboardRow

    const { data, error } = await supabase
      .from('campaign_canvases')
      .insert({ campaign_id: campaignId, user_id: userId })
      .select('*')
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as CampaignWhiteboardRow
  }

  async listItems(supabase: SupabaseClient, boardId: string): Promise<CanvasItemRow[]> {
    const { data, error } = await supabase
      .from('canvas_items')
      .select('*')
      .eq('board_id', boardId)
      .order('z_index', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as CanvasItemRow[]
  }

  async listConnectors(
    supabase: SupabaseClient,
    boardId: string,
  ): Promise<CanvasConnectorRow[]> {
    const { data, error } = await supabase
      .from('canvas_connectors')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as CanvasConnectorRow[]
  }

  async applyOperations(
    supabase: SupabaseClient,
    input: {
      boardId: string
      userId: string
      baseRevision: number
      idempotencyKey: string
      operations: Array<Record<string, unknown>>
      actorAgentKey?: string
    },
  ): Promise<{
    operation_id: string
    committed_revision: number
    idempotent_replay: boolean
    affected_bounds: { x: number; y: number; width: number; height: number } | null
  }> {
    const { data, error } = await supabase.rpc('apply_canvas_operations', {
      p_board_id: input.boardId,
      p_actor_user_id: input.userId,
      p_base_revision: input.baseRevision,
      p_idempotency_key: input.idempotencyKey,
      p_operations: input.operations,
      p_actor_agent_key: input.actorAgentKey ?? null,
    })
    if (error?.message.includes('CANVAS_REVISION_CONFLICT')) {
      throw new ConflictException(error.message)
    }
    if (error) throw new BadRequestException(error.message)
    return data as {
      operation_id: string
      committed_revision: number
      idempotent_replay: boolean
      affected_bounds: { x: number; y: number; width: number; height: number } | null
    }
  }

  async undoOperation(
    supabase: SupabaseClient,
    input: { boardId: string; userId: string; operationId: string },
  ) {
    const { data, error } = await supabase.rpc('undo_canvas_operation', {
      p_board_id: input.boardId,
      p_actor_user_id: input.userId,
      p_operation_id: input.operationId,
      p_actor_agent_key: null,
    })
    if (error?.message.includes('CANVAS_UNDO_NOT_LATEST')) {
      throw new ConflictException(error.message)
    }
    if (error) throw new BadRequestException(error.message)
    return data as { operation_id: string; committed_revision: number; idempotent_replay: boolean }
  }
}
