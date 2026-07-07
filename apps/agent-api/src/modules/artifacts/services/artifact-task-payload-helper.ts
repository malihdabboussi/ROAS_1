const TASK_RESERVED_FIELDS = [
  'title',
  'status',
  'priority',
  'assignee_type',
  'assignee_id',
  'start_date',
  'due_date',
  'description',
  'notes',
  'parent_item_id',
  'sort_order',
  'recurrence',
] as const

export function pickTaskPayload(data: Record<string, unknown>, includeTitle: boolean) {
  const payload: Record<string, unknown> = {}
  for (const key of TASK_RESERVED_FIELDS) {
    if (!includeTitle && key === 'title') continue
    if (data[key] !== undefined) payload[key] = data[key]
  }
  if (data.custom_data !== undefined) payload.custom_data = data.custom_data
  return payload
}
