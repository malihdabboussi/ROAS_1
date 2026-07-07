import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { YourTurnItem, YourTurnKind } from '../dto'

@Injectable()
export class YourTurnRepository {
  async findActiveOrgMembership(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
  ): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data as { id: string } | null
  }

  async listSpaceIdsForCampaign(supabase: SupabaseClient, campaignId: string): Promise<string[]> {
    const { data, error } = await supabase.from('spaces').select('id').eq('campaign_id', campaignId)
    if (error) throw new BadRequestException(error.message)
    return (data ?? []).map((space: { id: string }) => space.id)
  }

  async listYourTurnItems(
    supabase: SupabaseClient,
    input: { kind?: YourTurnKind; since?: string; limit: number },
  ): Promise<YourTurnItem[]> {
    let query = supabase.from('your_turn_items').select('*')
    if (input.kind) query = query.eq('kind', input.kind)
    if (input.since) query = query.gt('updated_at', input.since)
    query = query.order('updated_at', { ascending: false, nullsFirst: false }).limit(input.limit)

    const { data, error } = await query
    if (error) throw new Error(`Failed to list your_turn_items: ${error.message}`)
    return (data || []) as YourTurnItem[]
  }
}
