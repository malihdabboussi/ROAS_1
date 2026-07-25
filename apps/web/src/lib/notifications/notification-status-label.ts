const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
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
  awaiting_human: 'Awaiting You',
  pending: 'Pending',
  revision: 'Revision',
  open: 'Open',
  suggestion: 'Suggestion',
  accepted: 'Accepted',
  dismissed: 'Dismissed',
}

export function formatNotificationStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  const normalized = status.trim()
  return (
    NOTIFICATION_STATUS_LABELS[normalized] ??
    normalized
      .split(/[_\s]+/g)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  )
}
