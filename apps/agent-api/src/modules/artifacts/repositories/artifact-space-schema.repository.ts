import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactSpaceSchemaRepository {
  async findSpace(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('spaces')
      .select('id,title,schema,updated_at')
      .eq('id', spaceId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async updateSpaceSchema(
    supabase: SupabaseClient,
    input: { spaceId: string; schema: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('spaces')
      .update({ schema: input.schema, updated_at: new Date().toISOString() })
      .eq('id', input.spaceId)
      .select('id,title,schema,updated_at')
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async findSpaceSchema(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('spaces')
      .select('id, schema')
      .eq('id', spaceId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async patchSpaceSchema(
    supabase: SupabaseClient,
    input: { spaceId: string; schema: Record<string, unknown> },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('spaces')
      .update({ schema: input.schema })
      .eq('id', input.spaceId)) as { error: QueryError | null }
  }

  async findLatestCampaignSpace(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('spaces')
      .select('id, updated_at')
      .eq('campaign_id', campaignId)
      .order('updated_at', { ascending: false })
      .limit(1)) as { data: Array<Record<string, unknown>> | null; error: QueryError | null }
  }
}
