import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class TransferSpaceRepository {
  async moveSpaceRow(supabase: SupabaseClient, spaceId: string, targetOrgId: string | null) {
    return supabase.from('spaces').update({ org_id: targetOrgId, campaign_id: null }).eq('id', spaceId)
  }

  async moveSpaceOrgRows(
    supabase: SupabaseClient,
    table: string,
    spaceId: string,
    targetOrgId: string | null,
  ) {
    return supabase
      .from(table)
      .update({ org_id: targetOrgId }, { count: 'exact' })
      .eq('space_id', spaceId)
  }

  async deleteSpaceRows(supabase: SupabaseClient, table: string, spaceId: string) {
    return supabase.from(table).delete({ count: 'exact' }).eq('space_id', spaceId)
  }

  async copySpace(
    supabase: SupabaseClient,
    space: any,
    targetOrgId: string | null,
    userId: string,
  ) {
    const { id: _id, created_at: _ca, updated_at: _ua, share_token: _st, ...rest } = space
    return supabase
      .from('spaces')
      .insert({
        ...rest,
        org_id: targetOrgId,
        user_id: userId,
        campaign_id: null,
        title: `${space.title} (Copy)`,
        share_link_enabled: false,
        share_token: null,
      })
      .select()
      .single()
  }

  async listSpaceItems(supabase: SupabaseClient, sourceSpaceId: string) {
    return supabase.from('space_items').select('*').eq('space_id', sourceSpaceId)
  }

  async listSelectedSpaceItems(supabase: SupabaseClient, itemIds: string[]) {
    return supabase.from('space_items').select('*').in('id', itemIds)
  }

  async insertCopiedSpaceItem(supabase: SupabaseClient, copy: Record<string, any>) {
    return supabase.from('space_items').insert(copy).select('id').single()
  }

  async updateSpaceItem(
    supabase: SupabaseClient,
    itemId: string,
    update: Record<string, string>,
  ) {
    return supabase.from('space_items').update(update).eq('id', itemId)
  }

  async createSpaceForView(supabase: SupabaseClient, payload: Record<string, any>) {
    return supabase.from('spaces').insert(payload).select().single()
  }
}
