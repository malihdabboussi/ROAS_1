import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactEmailsRepository {
  async listEmails(
    supabase: SupabaseClient,
    input: {
      campaignId: string | null
      spaceId: string
      sourceItemId: string
      status: string
      limit: number
    },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase.from('emails').select('*').order('created_at', { ascending: false })
    if (input.campaignId) query = query.eq('campaign_id', input.campaignId)
    if (input.spaceId) query = query.eq('space_id', input.spaceId)
    if (input.sourceItemId) query = query.eq('source_item_id', input.sourceItemId)
    if (input.status) query = query.eq('status', input.status)
    return (await query.limit(input.limit)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findSourceSpaceItem(
    supabase: SupabaseClient,
    input: { sourceItemId: string; spaceId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('space_items')
      .select('id, space_id, custom_data')
      .eq('id', input.sourceItemId)
      .eq('space_id', input.spaceId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async findSpaceCampaignId(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<string | null> {
    const { data } = await supabase
      .from('spaces')
      .select('campaign_id')
      .eq('id', spaceId)
      .maybeSingle()
    return typeof (data as Record<string, unknown> | null)?.campaign_id === 'string'
      ? String((data as Record<string, unknown>).campaign_id)
      : null
  }

  async createEmail(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('emails').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateSpaceItemCustomData(
    supabase: SupabaseClient,
    input: { sourceItemId: string; spaceId: string; customData: Record<string, unknown> },
  ): Promise<void> {
    await supabase
      .from('space_items')
      .update({ custom_data: input.customData })
      .eq('id', input.sourceItemId)
      .eq('space_id', input.spaceId)
  }

  async findEmail(
    supabase: SupabaseClient,
    input: { emailId: string; columns: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('emails')
      .select(input.columns)
      .eq('id', input.emailId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async updateEmail(
    supabase: SupabaseClient,
    input: { emailId: string; updates: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('emails')
      .update(input.updates)
      .eq('id', input.emailId)
      .select()
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }
}
