import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactStrategyRepository {
  async canAccessCanvasCampaign(
    supabase: SupabaseClient,
    input: { campaignId: string; userId: string; level: 'view' | 'edit' },
  ): Promise<{ data: boolean | null; error: QueryError | null }> {
    return (await supabase.rpc('has_canvas_campaign_access_for_user', {
      p_user_id: input.userId,
      p_campaign_id: input.campaignId,
      p_min_level: input.level,
    })) as { data: boolean | null; error: QueryError | null }
  }

  async getOrCreateCanvas(
    supabase: SupabaseClient,
    input: { campaignId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    const existing = (await supabase
      .from('campaign_canvases')
      .select('*')
      .eq('campaign_id', input.campaignId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
    if (existing.error || existing.data) return existing
    return (await supabase
      .from('campaign_canvases')
      .insert({ campaign_id: input.campaignId, user_id: input.userId })
      .select('*')
      .single()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async getCanvasItems(supabase: SupabaseClient, boardId: string) {
    return supabase
      .from('canvas_items')
      .select('*')
      .eq('board_id', boardId)
      .order('z_index', { ascending: true })
  }

  async getCanvasConnectors(supabase: SupabaseClient, boardId: string) {
    return supabase
      .from('canvas_connectors')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true })
  }

  async applyCanvasOperations(
    supabase: SupabaseClient,
    input: {
      boardId: string
      userId: string
      baseRevision: number
      idempotencyKey: string
      operations: Array<Record<string, unknown>>
      actorAgentKey: string
    },
  ) {
    return supabase.rpc('apply_canvas_operations', {
      p_board_id: input.boardId,
      p_actor_user_id: input.userId,
      p_base_revision: input.baseRevision,
      p_idempotency_key: input.idempotencyKey,
      p_operations: input.operations,
      p_actor_agent_key: input.actorAgentKey,
    })
  }

  async createStrategyNode(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('campaign_strategy_nodes')
      .insert(payload)
      .select('*')
      .single()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async listStrategyNodes(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('campaign_strategy_nodes')
      .select('*')
      .eq('user_id', input.userId)
      .eq('campaign_id', input.campaignId)
      .order('created_at', { ascending: true })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }
}
