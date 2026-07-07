import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SpaceFlowDefinitionsRepository {
  async listInstallationsForOrg(
    supabase: SupabaseClient,
    orgId: string,
    filters: { campaignId?: string | null; spaceId?: string | null },
  ): Promise<Record<string, unknown>[]> {
    let query = supabase
      .from('flow_installations')
      .select(
        [
          '*',
          'flow_definitions!inner(*)',
          'spaces!inner(id, title, campaign_id, org_id)',
          'space_automations!flow_installations_automation_id_fkey(*)',
        ].join(', '),
      )
      .eq('spaces.org_id', orgId)

    if (filters.spaceId) query = query.eq('space_id', filters.spaceId)
    if (filters.campaignId) query = query.eq('spaces.campaign_id', filters.campaignId)

    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as unknown as Record<string, unknown>[]
  }

  async listInstallationsForPersonalUser(
    supabase: SupabaseClient,
    userId: string,
    filters: { campaignId?: string | null; spaceId?: string | null },
  ): Promise<Record<string, unknown>[]> {
    let query = supabase
      .from('flow_installations')
      .select(
        [
          '*',
          'flow_definitions!inner(*)',
          'spaces!inner(id, title, campaign_id, org_id, user_id)',
          'space_automations!flow_installations_automation_id_fkey(*)',
        ].join(', '),
      )
      .eq('spaces.user_id', userId)
      .is('spaces.org_id', null)

    if (filters.spaceId) query = query.eq('space_id', filters.spaceId)
    if (filters.campaignId) query = query.eq('spaces.campaign_id', filters.campaignId)

    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as unknown as Record<string, unknown>[]
  }
}
