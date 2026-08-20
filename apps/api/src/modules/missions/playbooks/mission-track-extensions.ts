import { MISSION_MESSAGES } from '../config/messages.config'
import type { ManagerAppendSubtasksDto } from '../dto'
import { findAgentForWebinarRole } from '../lib/webinar-fulfillment-team'

export const CLIENT_STRATEGY_PLAYBOOK_ID = 'client-strategy'
export const WEBINAR_FULFILLMENT_PLAYBOOK_ID = 'webinar-fulfillment'
export const POST_CALL_STRATEGY_ACTION = 'post-call-strategy'
export const POST_CALL_TRANSCRIPT_TITLE = 'Task 3 — Atlas call and transcript intake'
export const POST_CALL_STRATEGY_TITLE = 'Task 4 — Post-call strategy map'
export const POST_CALL_DOC_TITLE = 'Post-Call Strategy Map'

const CLIENT_WRITING_RULE =
  'CLIENT WRITING RULE: For client-facing text, load dylans-super-voice as the only voice authority. Do not load human-written-copy or dylans-voice.'

const PRE_CALL_TITLE_RE = /pre-call strategy map|client strategy map/i
const POST_CALL_TITLE_RE = /post-call strategy map/i
const WEBINAR_SIGNAL_RE = /webinar fulfillment|copy package|launch bible|deck bones|media plan/i

export type MissionTrackActionId = typeof POST_CALL_STRATEGY_ACTION

type MissionLike = {
  input?: Record<string, unknown> | null
  title?: string | null
}

type SubtaskLike = { title?: string | null; status?: string | null }

type AgentLike = { agent_key?: string | null; name?: string | null; role?: string | null }

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

export function hasPostCallStrategySteps(subtasks: SubtaskLike[]): boolean {
  return subtasks.some((subtask) => POST_CALL_TITLE_RE.test(String(subtask.title || '')))
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

export function listAvailableTrackActions(
  mission: MissionLike,
  subtasks: SubtaskLike[],
): MissionTrackActionId[] {
  if (!isClientStrategyTrack(mission, subtasks)) return []
  if (hasPostCallStrategySteps(subtasks)) return []
  return [POST_CALL_STRATEGY_ACTION]
}

export function assertTrackActionAvailable(
  mission: MissionLike,
  subtasks: SubtaskLike[],
  action: string,
): asserts action is MissionTrackActionId {
  if (action !== POST_CALL_STRATEGY_ACTION) {
    throw new Error(MISSION_MESSAGES.TRACK_UNKNOWN_ACTION)
  }
  if (hasPostCallStrategySteps(subtasks)) {
    throw new Error(MISSION_MESSAGES.TRACK_ALREADY_EXTENDED)
  }
  if (!isClientStrategyTrack(mission, subtasks)) {
    throw new Error(MISSION_MESSAGES.TRACK_NOT_AVAILABLE)
  }
}

export function resolveTrackAgentKeys(agents: AgentLike[]): {
  atlas: string
  strategist: string
} {
  const keys = agents.map((agent) => String(agent.agent_key || '').trim()).filter(Boolean)
  const atlas = keys.includes('atlas') ? 'atlas' : ''
  const strategist =
    findAgentForWebinarRole(agents, 'strategist')?.agent_key ||
    keys.find((key) => key === 'nate' || key === 'reed' || key === 'strategist') ||
    ''
  if (!atlas || !strategist) {
    throw new Error(MISSION_MESSAGES.TRACK_MISSING_AGENTS)
  }
  return { atlas, strategist }
}

function readKickoffBits(input: Record<string, unknown> | null | undefined): string {
  const raw =
    input?.playbook_kickoff && typeof input.playbook_kickoff === 'object'
      ? (input.playbook_kickoff as Record<string, unknown>)
      : {}
  return [
    typeof raw.client_context === 'string' ? `Client context: ${raw.client_context}` : null,
    typeof raw.transcript_url === 'string' ? `Transcript/call: ${raw.transcript_url}` : null,
    typeof raw.drive_links === 'string' ? `Drive/links: ${raw.drive_links}` : null,
    typeof raw.notes === 'string' ? `Notes: ${raw.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildPostCallStrategySubtasks(input: {
  atlas: string
  strategist: string
  missionInput?: Record<string, unknown> | null
}): ManagerAppendSubtasksDto['subtasks'] {
  const kickoffBits = readKickoffBits(input.missionInput)
  const kickoffBlock = (kickoffBits || '(none)').slice(0, 1500)
  return [
    {
      id: 'st-atlas-transcript',
      title: POST_CALL_TRANSCRIPT_TITLE,
      assignTo: input.atlas,
      dependsOn: [],
      assertionKeys: ['A-track-transcript'],
      intent: {
        why: 'Turn the real onboarding call into trusted context before strategy is corrected.',
        story: 'Atlas locates the Fathom call or uses the supplied transcript source.',
        sensory: 'Call context keeps source links, speakers, decisions, objections, and promises.',
        endState: 'Reed has a grounded transcript source for post-call strategy.',
        ecology: `If Fathom is connected, list recent meetings and select the highest-confidence client match. Prefer calendar invitee email and client domain, then names, title, and time. Confirm with transcript mentions of the client or offer. Retrieve the winning transcript and preserve its meeting ID and source URL. If Fathom is unavailable, use a pasted transcript, recording, or notes. Never invent call content.\nKickoff:\n${kickoffBlock}`,
      },
    },
    {
      id: 'st-strategy-v2',
      title: POST_CALL_STRATEGY_TITLE,
      assignTo: input.strategist,
      dependsOn: ['st-atlas-transcript'],
      assertionKeys: ['A-track-strategy'],
      intent: {
        why: 'Correct the proposed strategy using what the client actually said.',
        story: 'Reed diffs the pre-call map against the call and writes Strategy v2.',
        sensory: `"${POST_CALL_DOC_TITLE}" shows CONFIRMED, CORRECTED, NEW, and OPEN.`,
        endState:
          'A native post-call strategy map exists with portal details and an unsent client message.',
        ecology: `Load skill auto-skill-2-roas-strategy-adjust. Confirm it loaded. Then load dylans-super-voice as the only client-facing voice authority. Use Atlas call context and the Pre-Call / Client Strategy Map. Diff CONFIRMED / CORRECTED / NEW / OPEN. Budget unresolved = first OPEN item, bolded. Produce Strategy v2 + delta, portal campaign details, and the client Slack strategy message. Do not post the Slack message. Save exactly "${POST_CALL_DOC_TITLE}" as a native editable Space Doc. Never create a PDF. ${CLIENT_WRITING_RULE}`,
      },
      outputContract: {
        artifact_kind: 'document_artifact',
        required_action: 'save_document',
        required_artifact_type: 'doc',
        expected: { title: POST_CALL_DOC_TITLE },
      },
    },
  ]
}
