import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type StrategyNodeRow = {
  id: string
  user_id: string
  campaign_id: string
  node_type: string
  text: string
  color: string
  artifact_hint: string | null
  linked_artifact_id: string | null
  linked_artifact_type: string | null
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

@Injectable()
export class StrategyNodesRepository {
  async listByCampaign(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<StrategyNodeRow[]> {
    const { data, error } = await supabase
      .from('campaign_strategy_nodes')
      .select('*')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as StrategyNodeRow[]
  }

  async create(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    input: {
      node_type: string
      text: string
      color: string
      artifact_hint?: string
      position_x: number
      position_y: number
    },
  ): Promise<StrategyNodeRow> {
    const { data, error } = await supabase
      .from('campaign_strategy_nodes')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        node_type: input.node_type,
        text: input.text,
        color: input.color,
        artifact_hint: input.artifact_hint ?? null,
        position_x: input.position_x,
        position_y: input.position_y,
      })
      .select('*')
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data as StrategyNodeRow
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
  ): Promise<StrategyNodeRow> {
    const { data, error } = await supabase
      .from('campaign_strategy_nodes')
      .update(input)
      .eq('id', nodeId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data as StrategyNodeRow
  }

  async delete(supabase: SupabaseClient, userId: string, nodeId: string): Promise<void> {
    const { error } = await supabase
      .from('campaign_strategy_nodes')
      .delete()
      .eq('id', nodeId)
      .eq('user_id', userId)

    if (error) throw new Error(`DB error: ${error.message}`)
  }
}
