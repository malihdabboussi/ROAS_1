import type { SpaceItem } from '@/lib/spaces'

export function spaceItemFromRecord(
  row: Record<string, unknown> | null | undefined,
  fallbackSpaceId: string,
): SpaceItem | null {
  if (!row || typeof row !== 'object') return null
  const id = String(row.id ?? '').trim()
  if (!id) return null
  const custom =
    row.custom_data && typeof row.custom_data === 'object' && !Array.isArray(row.custom_data)
      ? (row.custom_data as Record<string, unknown>)
      : {}
  return {
    id,
    space_id: String(row.space_id ?? fallbackSpaceId),
    org_id: String(row.org_id ?? ''),
    user_id: String(row.user_id ?? ''),
    title: String(row.title ?? ''),
    status: String(row.status ?? 'todo') as SpaceItem['status'],
    priority: (row.priority as SpaceItem['priority']) ?? null,
    assignee_type: (row.assignee_type as SpaceItem['assignee_type']) ?? 'unassigned',
    assignee_id: typeof row.assignee_id === 'string' ? row.assignee_id : null,
    assignees: Array.isArray(row.assignees) ? (row.assignees as SpaceItem['assignees']) : [],
    start_date: typeof row.start_date === 'string' ? row.start_date : null,
    due_date: typeof row.due_date === 'string' ? row.due_date : null,
    recurrence: null,
    parent_item_id: typeof row.parent_item_id === 'string' ? row.parent_item_id : null,
    recurrence_parent_id: null,
    description: typeof row.description === 'string' ? row.description : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    doc_body: null,
    source: (row.source as SpaceItem['source']) ?? 'manual',
    linked_mission_id: typeof row.linked_mission_id === 'string' ? row.linked_mission_id : null,
    form_id: typeof row.form_id === 'string' ? row.form_id : null,
    task_execution_status: null,
    is_private: row.is_private === true,
    share_link_enabled: false,
    share_token: null,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
    custom_data: custom,
    created_at: String(row.created_at ?? '1970-01-01T00:00:00.000Z'),
    updated_at: String(row.updated_at ?? row.created_at ?? '1970-01-01T00:00:00.000Z'),
  }
}
