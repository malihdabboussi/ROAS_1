import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpaceShareEntityType, SpaceShareLevel } from '../dto'
import type {
  SpaceItemRow,
  SpaceItemShareRow,
  SpaceRow,
  SpaceShareRow,
} from '../services/space-permissions.types'

@Injectable()
export class SpaceShareManagementRepository {
  async listSpaceShares(
    supabase: SupabaseClient,
    spaceId: string,
    orgId?: string | null,
  ): Promise<SpaceShareRow[]> {
    let query = supabase
      .from('space_shares')
      .select(
        'id, space_id, org_id, entity_type, entity_id, level, allowed_view_ids, created_by, created_at',
      )
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true })
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as SpaceShareRow[]
  }

  async upsertSpaceShare(
    supabase: SupabaseClient,
    payload: {
      space_id: string
      org_id: string | null
      entity_type: SpaceShareEntityType
      entity_id: string
      level: SpaceShareLevel
      allowed_view_ids: string[] | null
      created_by: string
    },
  ): Promise<SpaceShareRow> {
    const { data, error } = await supabase
      .from('space_shares')
      .upsert(payload, { onConflict: 'space_id,entity_type,entity_id' })
      .select(
        'id, space_id, org_id, entity_type, entity_id, level, allowed_view_ids, created_by, created_at',
      )
      .single()
    if (error) throw new Error(error.message)
    return data as SpaceShareRow
  }

  async deleteSpaceShare(
    supabase: SupabaseClient,
    spaceId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase.from('space_shares').delete().eq('id', shareId).eq('space_id', spaceId)
    if (orgId) query = query.eq('org_id', orgId)
    const { error } = await query
    if (error) throw new Error(error.message)
  }

  async listSpaceViewShares(
    supabase: SupabaseClient,
    spaceId: string,
    viewId: string | null,
    orgId?: string | null,
  ) {
    let query = supabase
      .from('space_view_shares')
      .select(
        'id, space_id, view_id, org_id, entity_type, entity_id, level, created_by, created_at',
      )
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true })
    if (viewId) query = query.eq('view_id', viewId)
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as Array<{
      id: string
      space_id: string
      view_id: string
      org_id: string | null
      entity_type: SpaceShareEntityType
      entity_id: string
      level: SpaceShareLevel
      created_by: string
      created_at: string
    }>
  }

  async upsertSpaceViewShare(
    supabase: SupabaseClient,
    payload: {
      space_id: string
      view_id: string
      org_id: string | null
      entity_type: SpaceShareEntityType
      entity_id: string
      level: SpaceShareLevel
      created_by: string
    },
  ) {
    const { data, error } = await supabase
      .from('space_view_shares')
      .upsert(payload, { onConflict: 'space_id,view_id,entity_type,entity_id' })
      .select(
        'id, space_id, view_id, org_id, entity_type, entity_id, level, created_by, created_at',
      )
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  async deleteSpaceViewShare(
    supabase: SupabaseClient,
    spaceId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('space_view_shares')
      .delete()
      .eq('id', shareId)
      .eq('space_id', spaceId)
    if (orgId) query = query.eq('org_id', orgId)
    const { error } = await query
    if (error) throw new Error(error.message)
  }

  async setSpaceVisibility(
    supabase: SupabaseClient,
    spaceId: string,
    visibility: 'private' | 'team',
    orgId?: string | null,
  ): Promise<SpaceRow> {
    let query = supabase.from('spaces').update({ visibility }).eq('id', spaceId)
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query
      .select('id, org_id, user_id, visibility, share_link_enabled, share_token')
      .single()
    if (error) throw new Error(error.message)
    return data as SpaceRow
  }

  async listItemShares(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    orgId?: string | null,
  ): Promise<SpaceItemShareRow[]> {
    let query = supabase
      .from('space_item_shares')
      .select(
        'id, item_id, space_id, org_id, entity_type, entity_id, level, inherit_to_children, created_by, created_at',
      )
      .eq('space_id', spaceId)
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as SpaceItemShareRow[]
  }

  async upsertItemShare(
    supabase: SupabaseClient,
    payload: {
      item_id: string
      space_id: string
      org_id: string | null
      entity_type: SpaceShareEntityType
      entity_id: string
      level: SpaceShareLevel
      inherit_to_children: boolean
      created_by: string
    },
  ): Promise<SpaceItemShareRow> {
    const { data, error } = await supabase
      .from('space_item_shares')
      .upsert(payload, { onConflict: 'item_id,entity_type,entity_id' })
      .select(
        'id, item_id, space_id, org_id, entity_type, entity_id, level, inherit_to_children, created_by, created_at',
      )
      .single()
    if (error) throw new Error(error.message)
    return data as SpaceItemShareRow
  }

  async deleteItemShare(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('space_item_shares')
      .delete()
      .eq('id', shareId)
      .eq('space_id', spaceId)
      .eq('item_id', itemId)
    if (orgId) query = query.eq('org_id', orgId)
    const { error } = await query
    if (error) throw new Error(error.message)
  }

  async updateItemShareLink(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    payload: { share_link_enabled: boolean; share_token: string | null },
    orgId?: string | null,
  ): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
    let query = supabase
      .from('space_items')
      .update(payload)
      .eq('space_id', spaceId)
      .eq('id', itemId)
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query.select('share_link_enabled, share_token').single()
    if (error) throw new Error(error.message)
    return data as { share_link_enabled: boolean; share_token: string | null }
  }

  async loadSpace(
    supabase: SupabaseClient,
    spaceId: string,
    orgId?: string | null,
  ): Promise<SpaceRow | null> {
    let query = supabase
      .from('spaces')
      .select('id, org_id, user_id, visibility, share_link_enabled, share_token')
      .eq('id', spaceId)
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(error.message)
    return data as SpaceRow | null
  }

  async updateSpaceShareLink(
    supabase: SupabaseClient,
    spaceId: string,
    payload: { share_link_enabled: boolean; share_token: string | null },
    orgId?: string | null,
  ): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
    let query = supabase.from('spaces').update(payload).eq('id', spaceId)
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query.select('share_link_enabled, share_token').single()
    if (error) throw new Error(error.message)
    return data as { share_link_enabled: boolean; share_token: string | null }
  }

  async deleteItemEmailInvite(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    normalizedEmail: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('space_item_shares')
      .delete()
      .eq('space_id', spaceId)
      .eq('item_id', itemId)
      .eq('entity_type', 'email')
      .eq('invited_email', normalizedEmail)
    if (orgId) query = query.eq('org_id', orgId)
    const { error } = await query
    if (error) throw new Error(error.message)
  }

  async createItemEmailInvite(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<SpaceItemShareRow> {
    const { data, error } = await supabase
      .from('space_item_shares')
      .insert(payload)
      .select(
        'id, item_id, space_id, org_id, entity_type, entity_id, level, inherit_to_children, created_by, created_at, invite_token, invited_email, invite_expires_at',
      )
      .single()
    if (error) throw new Error(error.message)
    return data as SpaceItemShareRow
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
}
