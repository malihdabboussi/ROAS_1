import type { MissionSubtask } from './mission-types'

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

/**
 * A step is a human gate when it is assigned to a person rather than an agent.
 * There is no `requires_approval` flag in the schema — the assignee is the
 * gate, and the worker parks the mission at `awaiting_human` when it reaches
 * one. So a gate is a property of the step; whether it is *currently* holding
 * the mission up is a property of its status.
 */
export function isHumanGateSubtask(subtask: Pick<MissionSubtask, 'assignee_type'>): boolean {
  return subtask.assignee_type === 'human'
}

export function isBlockingHumanGate(
  subtask: Pick<MissionSubtask, 'assignee_type' | 'status'>,
): boolean {
  return isHumanGateSubtask(subtask) && subtask.status === 'awaiting_human'
}

/** A step whose dependencies have not finished cannot start yet. */
export function isDependencyBlocked(
  subtask: Pick<MissionSubtask, 'depends_on' | 'status'>,
  byId: Map<string, Pick<MissionSubtask, 'status'>>,
): boolean {
  if (subtask.status !== 'pending') return false
  return (subtask.depends_on ?? []).some((id) => byId.get(id)?.status !== 'done')
}
