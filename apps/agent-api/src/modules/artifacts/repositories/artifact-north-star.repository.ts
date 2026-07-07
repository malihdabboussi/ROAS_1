import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactNorthStarRepository {
  async createAwarenessPoint(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('agent_awareness_points')
      .insert(payload)
      .select('*')
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findAgentConfig(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; orgId: string | null | undefined },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('agents_registry')
      .select('config')
      .eq('user_id', input.userId)
      .eq('agent_key', input.agentKey)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateAgentConfig(
    supabase: SupabaseClient,
    input: {
      userId: string
      agentKey: string
      orgId: string | null | undefined
      config: Record<string, unknown>
    },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('agents_registry')
      .update({ config: input.config })
      .eq('user_id', input.userId)
      .eq('agent_key', input.agentKey)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    return (await query.select('agent_key, config').maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
