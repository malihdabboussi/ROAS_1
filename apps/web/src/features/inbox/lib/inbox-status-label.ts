/**
 * Human-readable labels for raw inbox / mission / subtask status values.
 * Aligns phrasing with mission list where the same status exists.
 */
const INBOX_STATUS_LABELS: Record<string, string> = {
  // Mission list–aligned
  inbox: 'Inbox',
  backlog: 'Backlog',
  planning: 'Planning',
  pending_approval: 'Pending Approval',
  awaiting_access_approval: 'Access Needed',
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  blocked: 'Blocked',
  done: 'Done',
  archived: 'Archived',
  error: 'Error',
  failed: 'Failed',
  dead_letter: 'Failed',
  // Subtasks / your-turn
  awaiting_human: 'Awaiting You',
  pending: 'Pending',
  revision: 'Revision',
  // List / other
  open: 'Open',
  suggestion: 'Suggestion',
  accepted: 'Accepted',
  dismissed: 'Dismissed',
}

function titleCaseFromSnake(raw: string): string {
  return raw
    .split(/[_\s]+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function formatInboxStatusLabel(status: string | null | undefined): string {
  if (status == null || status === '') return '—'
  const s = String(status).trim()
  if (INBOX_STATUS_LABELS[s]) return INBOX_STATUS_LABELS[s]
  return titleCaseFromSnake(s)
}
