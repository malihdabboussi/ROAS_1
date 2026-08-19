export const POST_CALL_STRATEGY_ACTION = 'post-call-strategy' as const

export type MissionTrackActionId = typeof POST_CALL_STRATEGY_ACTION

export type MissionTrackAction = {
  id: MissionTrackActionId
  title: string
  description: string
}

const CLIENT_STRATEGY_PLAYBOOK_ID = 'client-strategy'
const WEBINAR_FULFILLMENT_PLAYBOOK_ID = 'webinar-fulfillment'
const PRE_CALL_TITLE_RE = /pre-call strategy map|client strategy map/i
const POST_CALL_TITLE_RE = /post-call strategy map/i
const WEBINAR_SIGNAL_RE = /webinar fulfillment|copy package|launch bible|deck bones|media plan/i

const POST_CALL_ACTION: MissionTrackAction = {
  id: POST_CALL_STRATEGY_ACTION,
  title: 'Post-call strategy',
  description: 'Diff the call against the map and write Strategy v2 on this same mission.',
}

export const RERUNNABLE_SUBTASK_STATUSES = ['done', 'blocked', 'revision'] as const

type MissionLike = {
  input?: Record<string, unknown> | null
  title?: string | null
}

type SubtaskLike = { title?: string | null; status?: string | null }

export function resolveMissionPlaybookId(
  input: Record<string, unknown> | null | undefined,
): string {
  if (!input) return ''
  const kickoff =
    input.playbook_kickoff &&
    typeof input.playbook_kickoff === 'object' &&
    !Array.isArray(input.playbook_kickoff)
      ? (input.playbook_kickoff as Record<string, unknown>)
      : {}
  for (const value of [input.playbook_id, input.playbook, kickoff.playbook_id, kickoff.playbook]) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function hasWebinarSignals(mission: MissionLike, subtasks: SubtaskLike[]): boolean {
  if (WEBINAR_SIGNAL_RE.test(String(mission.title || ''))) return true
  return subtasks.some((subtask) => WEBINAR_SIGNAL_RE.test(String(subtask.title || '')))
}

export function isClientStrategyTrack(mission: MissionLike, subtasks: SubtaskLike[]): boolean {
  const playbookId = resolveMissionPlaybookId(mission.input ?? null)
  if (playbookId === WEBINAR_FULFILLMENT_PLAYBOOK_ID) return false
  if (playbookId === CLIENT_STRATEGY_PLAYBOOK_ID) return true
  if (hasWebinarSignals(mission, subtasks)) return false
  if (PRE_CALL_TITLE_RE.test(String(mission.title || ''))) return true
  return subtasks.some((subtask) => PRE_CALL_TITLE_RE.test(String(subtask.title || '')))
}

export function listMissionTrackActions(
  mission: MissionLike,
  subtasks: SubtaskLike[],
): MissionTrackAction[] {
  if (!isClientStrategyTrack(mission, subtasks)) return []
  if (subtasks.some((subtask) => POST_CALL_TITLE_RE.test(String(subtask.title || '')))) return []
  return [POST_CALL_ACTION]
}

export function canRerunSubtask(status: string | null | undefined): boolean {
  return (RERUNNABLE_SUBTASK_STATUSES as readonly string[]).includes(String(status || ''))
}
