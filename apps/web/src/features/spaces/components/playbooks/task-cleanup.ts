export const TASK_CLEANUP_PLAYBOOK_ID = 'task-cleanup' as const

export type TaskCleanupWindow = 'this_week' | 'last_7d' | 'today'

export type TaskCleanupKickoffFields = {
  window: TaskCleanupWindow
  client_context: string
  notes: string
}

export const EMPTY_TASK_CLEANUP_FIELDS: TaskCleanupKickoffFields = {
  window: 'this_week',
  client_context: '',
  notes: '',
}

export function buildTaskCleanupMissionPayload(fields: TaskCleanupKickoffFields) {
  const title = 'Task Cleanup'
  const windowLabel =
    fields.window === 'today'
      ? 'today'
      : fields.window === 'last_7d'
        ? 'the last 7 days'
        : 'this week'
  const briefParts = [
    `Audit ${windowLabel} of calls for promises and agreements, compare to open tasks, then wait for approval before creating native platform tasks.`,
    fields.client_context.trim() ? `Optional client filter: ${fields.client_context.trim()}` : null,
    fields.notes.trim() ? `Notes: ${fields.notes.trim()}` : null,
  ].filter(Boolean)

  return {
    title,
    brief: briefParts.join('\n'),
    priority: 'high' as const,
    input: {
      playbook_id: TASK_CLEANUP_PLAYBOOK_ID,
      playbook_kickoff: {
        window: fields.window,
        client_context: fields.client_context.trim() || undefined,
        notes: fields.notes.trim() || undefined,
      },
    },
  }
}
