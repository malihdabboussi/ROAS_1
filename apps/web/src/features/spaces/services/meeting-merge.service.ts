import { backendPost } from '@/lib/api/backend-client'

export interface MergeMeetingItemsInput {
  survivor_item_id: string
  duplicate_item_ids: string[]
}

export interface MergeMeetingItemsResult {
  survivor_item_id: string
  duplicates_merged: number
  recordings_moved?: number
  actions_moved?: number
  children_moved?: number
}

export async function mergeMeetingItems(
  spaceId: string,
  input: MergeMeetingItemsInput,
): Promise<MergeMeetingItemsResult> {
  return backendPost<MergeMeetingItemsResult>(`/api/spaces/${spaceId}/meetings/merge`, input)
}
