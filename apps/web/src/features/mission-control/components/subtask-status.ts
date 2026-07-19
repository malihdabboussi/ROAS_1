export function formatSubtaskStatusLabel(
  status: string,
  opts?: { dependencyBlocked?: boolean; executionStatus?: string },
): string {
  if (opts?.dependencyBlocked) return 'Waiting'
  const labels: Record<string, string> = {
    done: 'Done',
    in_progress: 'Working',
    blocked: 'Blocked',
    revision: 'Revision',
    awaiting_human: 'Your turn',
    cancelled: 'Cancelled',
  }
  if (status === 'pending') return opts?.executionStatus === 'queued' ? 'Queued' : 'Pending'
  return labels[status] ?? status.replace(/_/g, ' ')
}
