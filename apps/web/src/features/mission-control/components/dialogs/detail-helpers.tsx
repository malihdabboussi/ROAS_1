const EVENT_LABELS: Record<string, string> = {
  'mission.created': 'Mission created',
  'mission.progress': '',
  'mission.planning.started': 'Planning started',
  'mission.planning.blocked': 'Blocked during planning',
  'mission.planned': 'Plan created',
  'mission.execution.started': 'Execution started',
  'mission.step.completed': 'Step completed',
  'mission.execution.completed': 'Execution completed',
  'mission.review.started': 'Review started',
  'mission.review.approved': 'Approved',
  'mission.review.rejected': 'Sent back for revision',
  'mission.review.blocked': 'Blocked during review',
  'mission.failed': 'Failed',
  'mission.callback': 'Progress update',
  'mission.status.updated': 'Status updated',
  'mission.comment.triage.requested': 'Manager triage requested',
  'mission.retried': 'Retried',
  'mission.updated': 'Mission updated',
  'mission.trashed': 'Mission trashed',
  'mission.subtask.cancelled': 'Subtask cancelled',
  'mission.subtask.edited': 'Subtask edited',
  'mission.subtask.retried': 'Subtask retried',
  'mission.atlas.brain_routing_conflict': 'Brain routing conflict (triage)',
  'awareness.append_subtasks': 'Awareness: subtasks added',
  'awareness.cancel_subtask': 'Awareness: subtask cancelled',
  'awareness.edit_subtask': 'Awareness: subtask edited',
  'awareness.retry_subtask': 'Awareness: subtask retried',
  'awareness.replan': 'Awareness: replan requested',
  'awareness.pause_mission': 'Awareness: mission paused',
  'awareness.amend_mission': 'Awareness: mission amended',
  'user.comment': 'Comment',
  'mission.plan.pending_approval': 'Awaiting plan approval',
  'mission.plan.approved': 'Plan approved',
  'mission.plan.rejected': 'Plan rejected — replanning',
  'mission.comment.directive.completed': 'Directive applied',
  'mission.comment.directive.failed': 'Directive failed',
  'mission.comment.directive.empty': 'Acknowledged',
  'mission.scope.amend': 'Scope amended',
  'mission.scope.append_subtasks': 'Subtasks added',
  'mission.scope.replan': 'Full replan requested',
  'user.rating': 'Work rated',
}

const EVENT_DOT_CLASS: Record<string, string> = {
  'mission.review.approved': 'indicator-dot-glass-green',
  'mission.review.started': 'indicator-dot-glass-orange',
  'mission.step.completed': 'indicator-dot-glass-green',
  'mission.execution.completed': 'indicator-dot-glass-green',
  'mission.execution.started': 'indicator-dot-glass-blue',
  'mission.planning.started': 'indicator-dot-glass-blue',
  'mission.planned': 'indicator-dot-glass-blue',
  'mission.created': 'indicator-dot-glass-blue',
  'mission.review.rejected': 'indicator-dot-glass-orange',
  'mission.review.blocked': 'indicator-dot-glass-orange',
  'mission.planning.blocked': 'indicator-dot-glass-muted',
  'mission.failed': 'indicator-dot-glass-red',
  'mission.callback': 'indicator-dot-glass-blue',
  'mission.status.updated': 'indicator-dot-glass-blue',
  'mission.comment.triage.requested': 'indicator-dot-glass-orange',
  'mission.retried': 'indicator-dot-glass-orange',
  'mission.updated': 'indicator-dot-glass-blue',
  'mission.trashed': 'indicator-dot-glass-muted',
  'subtask.review': 'indicator-dot-glass-blue',
  'mission.subtask.cancelled': 'indicator-dot-glass-orange',
  'mission.subtask.edited': 'indicator-dot-glass-blue',
  'mission.subtask.retried': 'indicator-dot-glass-blue',
  'mission.atlas.brain_routing_conflict': 'indicator-dot-glass-orange',
  'awareness.append_subtasks': 'indicator-dot-glass-blue',
  'awareness.cancel_subtask': 'indicator-dot-glass-orange',
  'awareness.edit_subtask': 'indicator-dot-glass-blue',
  'awareness.retry_subtask': 'indicator-dot-glass-blue',
  'awareness.replan': 'indicator-dot-glass-orange',
  'awareness.pause_mission': 'indicator-dot-glass-muted',
  'awareness.amend_mission': 'indicator-dot-glass-blue',
  'user.comment': 'indicator-dot-glass-orange',
  'mission.plan.pending_approval': 'indicator-dot-glass-orange',
  'mission.plan.approved': 'indicator-dot-glass-green',
  'mission.plan.rejected': 'indicator-dot-glass-orange',
  'mission.comment.directive.completed': 'indicator-dot-glass-blue',
  'mission.comment.directive.failed': 'indicator-dot-glass-red',
  'mission.comment.directive.empty': 'indicator-dot-glass-muted',
  'mission.scope.amend': 'indicator-dot-glass-blue',
  'mission.scope.append_subtasks': 'indicator-dot-glass-blue',
  'mission.scope.replan': 'indicator-dot-glass-orange',
  'user.rating': 'indicator-dot-glass-orange',
}

export function formatEventType(eventType: string): string {
  return EVENT_LABELS[eventType] || eventType.replace(/^mission\./, '').replace(/\./g, ' ')
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function getEventDotClass(eventType: string): string {
  return EVENT_DOT_CLASS[eventType] ?? 'indicator-dot-glass-blue'
}
