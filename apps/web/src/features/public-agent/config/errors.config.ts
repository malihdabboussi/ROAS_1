export type PublicAgentStreamErrorCode =
  | 'busy'
  | 'gateway_connection'
  | 'no_answer'
  | 'temporary_unavailable'
  | 'workspace_blocked'
  | 'provider_billing'
  | 'reconnect_required'
  | 'generic'

const PUBLIC_AGENT_STREAM_ERRORS: Record<PublicAgentStreamErrorCode, string> = {
  busy: 'The model is busy right now. Try again shortly.',
  gateway_connection: 'The assistant is temporarily unavailable. Try again in a minute.',
  no_answer: "I didn't get a full answer this time. Send it again and I'll retry.",
  temporary_unavailable: 'The assistant is temporarily unavailable. Try again in a minute.',
  workspace_blocked: "This assistant can't send more messages right now.",
  provider_billing: "I hit a model billing limit, so I couldn't answer.",
  reconnect_required: 'This integration needs to be reconnected',
  generic: 'Message failed to send. Try again.',
}

function isPublicAgentStreamErrorCode(value: unknown): value is PublicAgentStreamErrorCode {
  return typeof value === 'string' && value in PUBLIC_AGENT_STREAM_ERRORS
}

export function resolvePublicAgentStreamErrorMessage(event: Record<string, unknown>): string {
  if (typeof event.message === 'string' && event.message.trim()) return event.message.trim()
  if (isPublicAgentStreamErrorCode(event.code)) return PUBLIC_AGENT_STREAM_ERRORS[event.code]
  return PUBLIC_AGENT_STREAM_ERRORS.generic
}
