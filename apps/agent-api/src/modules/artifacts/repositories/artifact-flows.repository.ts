import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactFlowsRepository {
  async findSpace(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('spaces')
      .select('id, user_id, org_id')
      .eq('id', spaceId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async listFlows(
    supabase: SupabaseClient,
    input: { spaceId: string; limit: number },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('space_automations')
      .select('*')
      .eq('space_id', input.spaceId)
      .order('created_at', { ascending: true })
      .limit(input.limit)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findFlow(
    supabase: SupabaseClient,
    input: { spaceId: string; automationId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('space_automations')
      .select('*')
      .eq('space_id', input.spaceId)
      .eq('id', input.automationId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async createFlowDraft(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('space_automations').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateFlow(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      automationId: string
      patch: Record<string, unknown>
    },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('space_automations')
      .update(input.patch)
      .eq('space_id', input.spaceId)
      .eq('id', input.automationId)
      .select()
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
