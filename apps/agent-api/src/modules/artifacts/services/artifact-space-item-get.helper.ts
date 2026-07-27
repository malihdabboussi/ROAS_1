import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArtifactTasksRepository } from '../repositories/artifact-tasks.repository'
import type { ArtifactTaskSchemaHelper } from './artifact-task-schema-helper'
import {
  buildSpaceItemMeetingHydration,
  shouldIncludeSpaceItemHydrationFlag,
} from './artifact-space-item-hydrate.helper'

type LoadTask = (
  supabase: SupabaseClient,
  spaceId: string,
  taskId: string,
) => Promise<Record<string, unknown> | null>

type LoadSpace = (
  supabase: SupabaseClient,
  spaceId: string,
) => Promise<Record<string, unknown> | null>

/** Assembles get_space_item payload with meeting/deliverable/action-item hydration. */
export async function buildHydratedSpaceItemResponse(input: {
  supabase: SupabaseClient
  spaceId: string
  itemId: string
  query: Record<string, unknown>
  tasksRepository: ArtifactTasksRepository
  taskSchema: ArtifactTaskSchemaHelper
  loadTask: LoadTask
  loadSpace: LoadSpace
}): Promise<Record<string, unknown>> {
  const item = await input.loadTask(input.supabase, input.spaceId, input.itemId)
  if (!item) return { success: false, error: 'Space item not found' }

  const space = await input.loadSpace(input.supabase, input.spaceId)
  const schema = space ? input.taskSchema.schemaFromSpace(space) : null
  const decorated = schema ? input.taskSchema.decorateSpaceItemForAgent(item, schema) : item

  const includeMeeting = shouldIncludeSpaceItemHydrationFlag(input.query, 'include_meeting')
  const includeDeliverables = shouldIncludeSpaceItemHydrationFlag(
    input.query,
    'include_deliverables',
  )
  const includeActionItems = shouldIncludeSpaceItemHydrationFlag(
    input.query,
    'include_action_items',
  )
  const includeActivity = shouldIncludeSpaceItemHydrationFlag(input.query, 'include_activity')

  const meeting = includeMeeting ? buildSpaceItemMeetingHydration(item) : null

  let deliverables: Record<string, unknown>[] = []
  if (includeDeliverables) {
    const { data, error } = await input.tasksRepository.listItemDeliverables(input.supabase, {
      spaceId: input.spaceId,
      itemId: input.itemId,
    })
    if (error) throw error
    deliverables = (data ?? []) as Record<string, unknown>[]
  }

  let actionItems: Record<string, unknown>[] = []
  if (includeActionItems) {
    const { data, error } = await input.tasksRepository.listSubtasks(input.supabase, {
      spaceId: input.spaceId,
      parentItemId: input.itemId,
    })
    if (error) throw error
    actionItems = ((data ?? []) as Record<string, unknown>[]).map((row) =>
      schema ? input.taskSchema.decorateSpaceItemForAgent(row, schema) : row,
    )
  }

  const payload: Record<string, unknown> = {
    success: true,
    item: decorated,
    ...(meeting ? { meeting } : {}),
    ...(includeDeliverables ? { deliverables } : {}),
    ...(includeActionItems ? { action_items: actionItems } : {}),
  }

  if (!includeActivity) return payload

  const { data: activity, error: activityError } = await input.tasksRepository.listActivity(
    input.supabase,
    { spaceId: input.spaceId, itemId: input.itemId },
  )
  if (activityError) throw activityError
  return { ...payload, activity: activity ?? [] }
}
