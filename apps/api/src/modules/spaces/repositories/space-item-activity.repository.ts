import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SpaceItemActivityInput = {
  item_id: string
  space_id: string
  user_id: string
  org_id: string | null
  event_type: string
  payload: Record<string, unknown>
  actor_kind?: 'user' | 'agent' | 'automation' | 'system'
  agent_message_id?: string | null
  tool_call_id?: string | null
  snapshot?: Record<string, unknown> | null
}

@Injectable()
export class SpaceItemActivityRepository {
  async findActivityByItemId(supabase: SupabaseClient, spaceId: string, itemId: string) {
    const { data, error } = await supabase
      .from('space_item_activity')
      .select('*')
      .eq('space_id', spaceId)
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async findActivityById(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    activityId: string,
  ) {
    const { data, error } = await supabase
      .from('space_item_activity')
      .select('*')
      .eq('id', activityId)
      .eq('space_id', spaceId)
      .eq('item_id', itemId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async updateActivity(
    supabase: SupabaseClient,
    activityId: string,
    patch: { payload: Record<string, unknown> },
  ) {
    const { data, error } = await supabase
      .from('space_item_activity')
      .update(patch)
      .eq('id', activityId)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async deleteActivity(supabase: SupabaseClient, activityId: string) {
    const { error } = await supabase.from('space_item_activity').delete().eq('id', activityId)
    if (error) throw new BadRequestException(error.message)
    return { deleted: true }
  }

  async createActivity(supabase: SupabaseClient, input: SpaceItemActivityInput) {
    const { data, error } = await supabase
      .from('space_item_activity')
      .insert(input)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async createActivities(supabase: SupabaseClient, inputs: SpaceItemActivityInput[]) {
    if (inputs.length === 0) return
    const { error } = await supabase.from('space_item_activity').insert(inputs)
    if (error) throw new BadRequestException(error.message)
  }
}
