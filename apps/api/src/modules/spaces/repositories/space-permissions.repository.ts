import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpaceShareEntityType, SpaceShareLevel } from '../dto'
import type {
  SpaceItemRow,
  SpaceItemShareRow,
  SpaceRow,
  SpaceShareRow,
} from '../services/space-permissions.types'

export type SpaceViewShareRow = {
  view_id: string
  org_id: string | null
  entity_type: SpaceShareEntityType
  entity_id: string
  level: SpaceShareLevel
}

@Injectable()
export class SpacePermissionsRepository {
  async loadSpace(
    supabase: SupabaseClient,
    spaceId: string,
    orgId?: string | null,
  ): Promise<SpaceRow | null> {
    let query = supabase
      .from('spaces')
      .select('id, org_id, user_id, campaign_id, visibility, share_link_enabled, share_token')
      .eq('id', spaceId)
    if (orgId) {
      query = query.eq('org_id', orgId)
    }
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(error.message)
    return data as SpaceRow | null
  }

  async loadSpaceForAccess(supabase: SupabaseClient, spaceId: string): Promise<SpaceRow | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('id, org_id, user_id, campaign_id, visibility, share_link_enabled, share_token')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as SpaceRow | null
  }

  async loadItem(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
  ): Promise<SpaceItemRow | null> {
    const { data, error } = await supabase
      .from('space_items')
      .select(
        'id, space_id, org_id, user_id, parent_item_id, is_private, share_link_enabled, share_token',
      )
      .eq('space_id', spaceId)
      .eq('id', itemId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as SpaceItemRow | null
  }

  async listItemShares(
    supabase: SupabaseClient,
    spaceId: string,
    itemIds: string[],
  ): Promise<SpaceItemShareRow[]> {
    const { data, error } = await supabase
      .from('space_item_shares')
      .select(
        'id, item_id, space_id, org_id, entity_type, entity_id, level, inherit_to_children, created_by, created_at',
      )
      .eq('space_id', spaceId)
      .in('item_id', itemIds)
    if (error) throw new Error(error.message)
    return (data ?? []) as SpaceItemShareRow[]
  }

  async listSpaceShares(supabase: SupabaseClient, spaceId: string): Promise<SpaceShareRow[]> {
    const { data, error } = await supabase
      .from('space_shares')
      .select(
        'id, space_id, org_id, entity_type, entity_id, level, allowed_view_ids, created_by, created_at',
      )
      .eq('space_id', spaceId)
    if (error) throw new Error(error.message)
    return (data ?? []) as SpaceShareRow[]
  }

  async listSpaceViewShares(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<SpaceViewShareRow[]> {
    const { data, error } = await supabase
      .from('space_view_shares')
      .select('id, space_id, view_id, org_id, entity_type, entity_id, level')
      .eq('space_id', spaceId)
    if (error) throw new Error(error.message)
    return (data ?? []) as SpaceViewShareRow[]
  }
}
