import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactStrategyRepository {
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
