import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeetingMergeSurvivorPatch } from '../domain/meeting-merge-plan'

export interface MergeMeetingItemsInput {
  spaceId: string
  survivorItemId: string
  duplicateItemIds: string[]
  survivorPatch: MeetingMergeSurvivorPatch
}

@Injectable()
export class MeetingMergeRepository {
  async listMeetingItems(
    supabase: SupabaseClient,
    spaceId: string,
    itemIds: string[],
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .in('id', itemIds)
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  async mergeMeetingItems(
    supabase: SupabaseClient,
    input: MergeMeetingItemsInput,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.rpc('merge_meeting_items', {
      p_space_id: input.spaceId,
      p_survivor_item_id: input.survivorItemId,
      p_duplicate_item_ids: input.duplicateItemIds,
      p_survivor_patch: input.survivorPatch,
    })
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>) ?? {}
  }
}
