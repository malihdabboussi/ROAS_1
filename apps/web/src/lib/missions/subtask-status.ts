import type { Mission, MissionSubtask } from './mission-types'

/**
 * A mission is "live" until it reaches a resting state. `error`/`failed`/
 * `dead_letter` are terminal for the worker but still need a person, so they
 * stay live here — hiding them would hide the ones that need attention most.
 */
const MISSION_RESTING_STATUSES = new Set(['done', 'archived'])

export function isLiveMission(mission: Pick<Mission, 'status'>): boolean {
  return !MISSION_RESTING_STATUSES.has(mission.status)
}

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
