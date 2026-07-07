import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class TransferViewRepository {
  async moveSpaceItemsToSpace(
    supabase: SupabaseClient,
    itemIds: string[],
    targetSpaceId: string,
    targetOrgId: string | null,
  ) {
    return supabase
      .from('space_items')
      .update({ org_id: targetOrgId, space_id: targetSpaceId }, { count: 'exact' })
      .in('id', itemIds)
  }

  async updateSpaceSchema(supabase: SupabaseClient, spaceId: string, schema: any) {
    return supabase.from('spaces').update({ schema }).eq('id', spaceId)
  }
}
