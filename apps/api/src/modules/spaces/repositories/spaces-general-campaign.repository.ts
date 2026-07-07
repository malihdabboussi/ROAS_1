import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SpacesGeneralCampaignRepository {
  async findOrCreateGeneralCampaignId(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    const lookup = this.generalCampaignQuery(supabase, userId, orgId)
    const { data: existing, error: lookupErr } = await lookup.maybeSingle()
    if (lookupErr) throw new BadRequestException(lookupErr.message)
    if (existing?.id) return String(existing.id)

    const { data: created, error: createErr } = await supabase
      .from('campaigns')
      .insert({
        user_id: userId,
        org_id: orgId ?? null,
        name: 'General',
        campaign_type: 'get-more-leads',
        config: {
          system_kind: 'general',
          isPinned: true,
          isSystem: true,
          icon: 'folder-kanban',
        },
      })
      .select('id')
      .single()
    if (createErr) {
      const { data: retry } = await lookup.maybeSingle()
      if (retry?.id) return String(retry.id)
      throw new BadRequestException(createErr.message)
    }
    return String(created.id)
  }

  private generalCampaignQuery(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    let query = supabase
      .from('campaigns')
      .select('id')
      .is('deleted_at', null)
      .contains('config', { system_kind: 'general' })
      .neq('status', 'archived')
      .order('created_at', { ascending: true })
      .limit(1)
    query = orgId ? query.eq('org_id', orgId) : query.eq('user_id', userId).is('org_id', null)
    return query
  }
}
