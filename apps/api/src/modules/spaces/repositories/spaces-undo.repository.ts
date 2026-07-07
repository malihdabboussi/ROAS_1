import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type UndoActivityRow = {
  id: string
  item_id: string
  space_id: string
  user_id: string
  org_id: string | null
  event_type: string
  payload: Record<string, unknown>
  snapshot: Record<string, unknown> | null
  agent_message_id: string | null
  reverted_at: string | null
  created_at: string
}

@Injectable()
export class SpacesUndoRepository {
  async listAgentActivityRows(
    supabase: SupabaseClient,
    spaceId: string,
    agentMessageId: string,
    ascending: boolean,
  ): Promise<UndoActivityRow[]> {
    const { data, error } = await supabase
      .from('space_item_activity')
      .select('*')
      .eq('space_id', spaceId)
      .eq('actor_kind', 'agent')
      .eq('agent_message_id', agentMessageId)
      .order('created_at', { ascending })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as UndoActivityRow[]
  }

  async loadItem(supabase: SupabaseClient, spaceId: string, itemId: string) {
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .eq('id', itemId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async loadItems(supabase: SupabaseClient, spaceId: string, itemIds: string[]) {
    if (itemIds.length === 0) return []
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .in('id', itemIds)
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async hasChildren(supabase: SupabaseClient, itemId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('space_items')
      .select('id', { count: 'exact', head: true })
      .eq('parent_item_id', itemId)
    if (error) throw new BadRequestException(error.message)
    return (count ?? 0) > 0
  }

  async updateItem(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    patch: Record<string, unknown>,
  ) {
    const { data, error } = await supabase
      .from('space_items')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('space_id', spaceId)
      .eq('id', itemId)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async deleteItem(supabase: SupabaseClient, spaceId: string, itemId: string): Promise<void> {
    const { error } = await supabase
      .from('space_items')
      .delete()
      .eq('space_id', spaceId)
      .eq('id', itemId)
    if (error) throw new BadRequestException(error.message)
  }

  async createItemFromSnapshot(
    supabase: SupabaseClient,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('space_items').insert(snapshot)
    if (error) throw new BadRequestException(error.message)
  }

  async createUndoActivity(
    supabase: SupabaseClient,
    input: {
      item_id: string
      space_id: string
      user_id: string
      org_id: string | null
      actor_kind: 'user'
      event_type: string
      payload: Record<string, unknown>
    },
  ) {
    const { data, error } = await supabase
      .from('space_item_activity')
      .insert(input)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as { id: string }
  }

  async setActivityRevertedState(
    supabase: SupabaseClient,
    activityId: string,
    payload: { reverted_at: string | null; reverted_by_activity_id: string | null },
  ): Promise<void> {
    const { error } = await supabase
      .from('space_item_activity')
      .update(payload)
      .eq('id', activityId)
    if (error) throw new BadRequestException(error.message)
  }
}
