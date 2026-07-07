export type AgentTurnFeedbackTargetKind =
  | 'conversation_message'
  | 'space_item_activity'
  | 'mission_log'

export type AgentTurnFeedbackTag =
  | 'helpful'
  | 'clear'
  | 'wrong'
  | 'missed_context'
  | 'tool_problem'
  | 'too_slow'
  | 'tone_issue'

export interface AgentTurnFeedbackTarget {
  target_kind: AgentTurnFeedbackTargetKind
  target_id: string
}

export interface AgentTurnFeedbackPayload extends AgentTurnFeedbackTarget {
  thumbs_up: boolean
  tags?: AgentTurnFeedbackTag[]
  feedback_text?: string | null
  source_surface: string
}

export interface AgentTurnFeedbackRow extends AgentTurnFeedbackPayload {
  id: string
  user_id?: string
  org_id?: string | null
  agent_key?: string
  tags: AgentTurnFeedbackTag[]
  feedback_text: string | null
  created_at?: string
  updated_at?: string
}

export interface AgentTurnFeedbackLookupResponse {
  feedback: AgentTurnFeedbackRow[]
}

export const AGENT_TURN_FEEDBACK_POSITIVE_CHIPS: Array<{
  value: AgentTurnFeedbackTag
  label: string
}> = [
  { value: 'helpful', label: 'Helpful' },
  { value: 'clear', label: 'Clear' },
]

export const AGENT_TURN_FEEDBACK_NEGATIVE_CHIPS: Array<{
  value: AgentTurnFeedbackTag
  label: string
}> = [
  { value: 'wrong', label: 'Wrong' },
  { value: 'missed_context', label: 'Missed context' },
  { value: 'tool_problem', label: 'Tool issue' },
  { value: 'too_slow', label: 'Too slow' },
  { value: 'tone_issue', label: 'Tone' },
]

/** @deprecated Use AGENT_TURN_FEEDBACK_POSITIVE_CHIPS / AGENT_TURN_FEEDBACK_NEGATIVE_CHIPS. */
export const AGENT_TURN_FEEDBACK_CHIPS = [
  ...AGENT_TURN_FEEDBACK_POSITIVE_CHIPS,
  ...AGENT_TURN_FEEDBACK_NEGATIVE_CHIPS,
]

export function agentTurnFeedbackChipsForThumb(thumbsUp: boolean) {
  return thumbsUp ? AGENT_TURN_FEEDBACK_POSITIVE_CHIPS : AGENT_TURN_FEEDBACK_NEGATIVE_CHIPS
}

export function filterAgentTurnFeedbackTagsForThumb(
  tags: AgentTurnFeedbackTag[],
  thumbsUp: boolean,
): AgentTurnFeedbackTag[] {
  const allowed = new Set(agentTurnFeedbackChipsForThumb(thumbsUp).map((chip) => chip.value))
  return tags.filter((tag) => allowed.has(tag))
}
