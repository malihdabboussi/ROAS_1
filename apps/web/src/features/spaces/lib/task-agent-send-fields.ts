export const TASK_AGENT_SEND_FIELDS = [
  { id: 'title', label: 'Title', defaultOn: true, locked: true },
  { id: 'notes', label: 'Description / Notes', defaultOn: true, locked: false },
  { id: 'status', label: 'Status', defaultOn: true, locked: false },
  { id: 'priority', label: 'Priority', defaultOn: true, locked: false },
  { id: 'due_date', label: 'Due date / Start date', defaultOn: false, locked: false },
  { id: 'tags', label: 'Tags', defaultOn: false, locked: false },
  { id: 'subtasks', label: 'Subtasks', defaultOn: false, locked: false },
  { id: 'custom_fields', label: 'Custom fields', defaultOn: false, locked: false },
] as const

export function defaultTaskAgentSendInclude(): Record<string, boolean> {
  const map: Record<string, boolean> = {}
  for (const f of TASK_AGENT_SEND_FIELDS) map[f.id] = f.defaultOn
  return map
}
