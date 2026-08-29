import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactTasksRepository } from '../repositories/artifact-tasks.repository'
import { ArtifactTaskSchemaHelper } from './artifact-task-schema-helper'
import { shouldIncludeSpaceItemCount } from './space-item-query.util'

export async function listTasksForAgent(input: {
  supabase: SupabaseClient
  query: Record<string, unknown>
  userId: string
  orgId: string | null
  limit: number
  repository: ArtifactTasksRepository
  schema: ArtifactTaskSchemaHelper
  loadSpace: (spaceId: string) => Promise<Record<string, unknown> | null>
}) {
  const spaceId = String(input.query.space_id ?? '').trim()
  const assignedToMe = input.query.assigned_to_me === true || input.query.assigned_to_me === 'true'
  if (!spaceId && !assignedToMe) {
    return { success: false, error: 'space_id is required unless assigned_to_me is true' }
  }
  if (assignedToMe) return listAssignedTasksAcrossSpaces(input)
  const space = await input.loadSpace(spaceId)
  if (!space) return { success: false, error: 'Space not found' }
  const schema = input.schema.schemaFromSpace(space)
  const normalized = input.schema.normalizeListInputAgainstSchema(schema, input.query)
  if (normalized.error) return { success: false, error: normalized.error }
  const queryInput = normalized.input ?? input.query
  const statusField = input.schema.fieldsById(schema).get('status')
  const { data, error, count } = await input.repository.listTasks(input.supabase, {
    spaceId,
    queryInput,
    userId: input.userId,
    closedStatusIds: input.schema.closedStatusIds(statusField),
    limit: input.limit,
  })
  if (error) throw error
  const tasks = ((data ?? []) as unknown as Record<string, unknown>[]).map((task) =>
    input.schema.decorateSpaceItemForAgent(task, schema),
  )
  return {
    success: true,
    schema_summary: input.schema.taskSchemaSummary(schema),
    tasks,
    ...(shouldIncludeSpaceItemCount(input.query) ? { total_count: count ?? tasks.length } : {}),
  }
}

async function listAssignedTasksAcrossSpaces(input: {
  supabase: SupabaseClient
  query: Record<string, unknown>
  userId: string
  orgId: string | null
  limit: number
  repository: ArtifactTasksRepository
  schema: ArtifactTaskSchemaHelper
  loadSpace?: (spaceId: string) => Promise<Record<string, unknown> | null>
}) {
  const queryInput = { ...input.query, assigned_to_me: true }
  const { data, error } = await input.repository.listAssignedTasksAcrossSpaces(input.supabase, {
    queryInput,
    userId: input.userId,
    orgId: input.orgId,
    limit: Math.min(250, input.limit * 3),
  })
  if (error) throw error
  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const spaceIds = [...new Set(rows.map((row) => String(row.space_id ?? '')).filter(Boolean))]
  const { data: spaces, error: spacesError } = await input.repository.listSpacesByIds(
    input.supabase,
    spaceIds,
  )
  if (spacesError) throw spacesError
  const spacesById = new Map((spaces ?? []).map((space) => [String(space.id), space]))
  const includeClosed =
    input.query.include_closed === true || input.query.include_closed === 'true'
  const matchingTasks = rows
    .filter((task) => {
      if (includeClosed) return true
      const space = spacesById.get(String(task.space_id ?? ''))
      if (!space) return false
      const statusField = input.schema.fieldsById(input.schema.schemaFromSpace(space)).get('status')
      return !input.schema.closedStatusIds(statusField).has(String(task.status ?? ''))
    })
    .map((task) => {
      const space = spacesById.get(String(task.space_id ?? ''))!
      return {
        ...input.schema.decorateSpaceItemForAgent(task, input.schema.schemaFromSpace(space)),
        space_title: String(space.title ?? 'Space'),
        campaign_id: typeof space.campaign_id === 'string' ? space.campaign_id : null,
      }
    })
  const tasks = matchingTasks.slice(0, input.limit)
  return {
    success: true,
    scope: 'assigned_to_me',
    tasks,
    ...(shouldIncludeSpaceItemCount(input.query) ? { total_count: matchingTasks.length } : {}),
  }
}
