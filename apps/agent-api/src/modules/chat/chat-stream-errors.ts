export type ChatStreamErrorCode =
  | 'image_too_large'
  | 'unsupported_image_type'
  | 'invalid_image'
  | 'image_load_failed'
  | 'model_no_images'
  | 'model_settings_invalid'
  | 'agent_deactivated'
  | 'agent_access_denied'
  | 'document_parse_failed'
  | 'gateway_connection'
  | 'context_window_exceeded'
  | 'stream_interrupted'
  | 'temporary_unavailable'
  | 'reconnect_required'
  | 'openai_codex_not_connected'
  | 'anthropic_claude_not_connected'
  | 'busy'
  | 'no_answer'
  | 'workspace_blocked'
  | 'provider_billing'
  | 'generic'

export function classifyChatStreamError(message: string): ChatStreamErrorCode {
  const msg = message.toLowerCase()

  if (msg.includes('image too large')) return 'image_too_large'
  if (msg.includes('unsupported image type')) return 'unsupported_image_type'
  if (msg.includes('invalid image data') || msg.includes('missing image file url')) {
    return 'invalid_image'
  }
  if (msg.includes('could not load image')) return 'image_load_failed'
  if (msg.includes('does not support images')) return 'model_no_images'
  if (
    msg.includes('model settings are not available') ||
    msg.includes('does not support fast mode') ||
    msg.includes('fast mode is not available') ||
    msg.includes('does not support that context window') ||
    (msg.includes('does not support') && msg.includes('reasoning'))
  ) {
    return 'model_settings_invalid'
  }
  if (msg.includes('is deactivated')) return 'agent_deactivated'
  if (msg.includes('does not grant channel')) return 'agent_access_denied'
  if (msg.includes('failed to parse')) return 'document_parse_failed'
  if (msg.includes('gateway connection error') || msg.includes('gateway error')) {
    return 'gateway_connection'
  }
  if (
    msg.includes('context_window_exceeded') ||
    msg.includes('context length exceeded') ||
    msg.includes('context window exceeded') ||
    msg.includes('maximum context length') ||
    msg.includes('exceeds the context window') ||
    msg.includes('input is too long') ||
    msg.includes('too many input tokens')
  ) {
    return 'context_window_exceeded'
  }
  if (
    msg === 'terminated' ||
    msg.includes('stream_interrupted') ||
    msg.includes('bridge interrupted') ||
    msg.includes('stream was interrupted') ||
    msg.includes('connection was interrupted')
  ) {
    return 'stream_interrupted'
  }
  if (
    msg.includes('openai_codex_not_connected') ||
    msg.includes('openai codex subscription is not connected')
  ) {
    return 'openai_codex_not_connected'
  }
  if (
    msg.includes('anthropic_claude_not_connected') ||
    msg.includes('claude subscription is not connected')
  ) {
    return 'anthropic_claude_not_connected'
  }
  if (
    msg.includes('authentication token has been invalidated') ||
    msg.includes('token has been invalidated') ||
    msg.includes('token invalidated') ||
    msg.includes('please try signing in again') ||
    msg.includes('needs reconnect') ||
    msg.includes('needs reconnecting') ||
    msg.includes('please reconnect') ||
    msg.includes('reconnect required')
  ) {
    return 'reconnect_required'
  }

  if (
    msg.includes('credits_exhausted') ||
    msg.includes('org_credit_limit_reached') ||
    msg.includes('agent request failed (402)')
  ) {
    return 'workspace_blocked'
  }
  if (
    msg.includes('api provider returned a billing error') ||
    msg.includes('provider returned a billing error') ||
    msg.includes('insufficient balance') ||
    msg.includes("provider's billing dashboard") ||
    msg.includes('top up or switch to a different api key')
  ) {
    return 'provider_billing'
  }
  if (
    msg.includes('temporarily overloaded') ||
    msg.includes('overloaded') ||
    msg.includes('try again in a moment') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('service unavailable')
  ) {
    return 'busy'
  }
  if (
    msg.includes('empty_agent_response') ||
    msg.includes('stream_stalled') ||
    msg.includes('no response') ||
    msg.includes('empty response')
  ) {
    return 'no_answer'
  }

  return 'generic'
}

export function isChatStreamRateLimitMessage(message: string): boolean {
  const code = classifyChatStreamError(message)
  return code === 'busy'
}
