import { CHAT_TOAST_ERRORS } from './chat-toast-errors.config'

/** Shared stable codes emitted on chat SSE `error` events — keep in sync with agent-api chat-stream-errors.ts */
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
  | 'temporary_unavailable'
  | 'busy'
  | 'no_answer'
  | 'workspace_blocked'
  | 'provider_billing'
  | 'stream_interrupted'
  | 'reconnect_required'
  | 'openai_codex_not_connected'
  | 'anthropic_claude_not_connected'
  | 'generic'

export type ChatStreamFailureCategory = 'transport' | 'runtime' | 'model' | 'request' | 'unknown'

export interface ChatStreamFailure {
  code: ChatStreamErrorCode
  userMessage: string
  category: ChatStreamFailureCategory
  retryable: boolean
  autoRecover: boolean
  showInterruptedBar: boolean
  bannerAction: 'resume' | 'reconnect'
  reconnectProvider?: 'openai_codex'
}

export const CHAT_STREAM_ERRORS: Record<ChatStreamErrorCode, { userMessage: string }> = {
  image_too_large: {
    userMessage: 'That image is too large. Use a file under 15 MB or compress it.',
  },
  unsupported_image_type: {
    userMessage: 'That image type is not supported. Use JPG, PNG, GIF, or WebP.',
  },
  invalid_image: {
    userMessage: "That image couldn't be read. Try uploading it again.",
  },
  image_load_failed: {
    userMessage: "That image couldn't be loaded. Try uploading it again.",
  },
  model_no_images: {
    userMessage:
      'This model cannot read images. Choose an image-capable model or remove the image.',
  },
  model_settings_invalid: {
    userMessage:
      'Those model settings are not available for this model. Adjust settings and try again.',
  },
  agent_deactivated: {
    userMessage: 'This agent is turned off. Choose another agent or turn it back on.',
  },
  agent_access_denied: {
    userMessage: "This agent can't be used from here. Try another agent or channel.",
  },
  document_parse_failed: {
    userMessage: "That file couldn't be read. Try a different format or a smaller file.",
  },
  gateway_connection: {
    userMessage: 'The assistant is temporarily unavailable. Try again in a minute.',
  },
  context_window_exceeded: {
    userMessage:
      'I hit the context limit while finishing. Resume to compact the work and continue.',
  },
  temporary_unavailable: {
    userMessage: 'The assistant is temporarily unavailable. Try again in a minute.',
  },
  busy: {
    userMessage: 'The model is busy right now. Try again shortly or switch models.',
  },
  no_answer: {
    userMessage: "I didn't get a full answer this time. Send it again and I'll retry.",
  },
  workspace_blocked: {
    userMessage: "This workspace can't send more messages right now. Check billing in Settings.",
  },
  provider_billing: {
    userMessage:
      "I hit a model billing limit, so I couldn't answer. Switch models or ask an admin to check the provider.",
  },
  stream_interrupted: {
    userMessage: 'The response was interrupted. Resume to reconnect.',
  },
  reconnect_required: {
    userMessage: 'This integration needs to be reconnected',
  },
  openai_codex_not_connected: {
    userMessage: 'OpenAI Codex needs to be connected before I can use this model.',
  },
  anthropic_claude_not_connected: {
    userMessage: 'Ask an admin to connect Claude Subscription in Settings before using this model.',
  },
  generic: {
    userMessage: CHAT_TOAST_ERRORS.CHAT_SEND_ERROR.userMessage,
  },
}

export class ChatStreamUserError extends Error {
  readonly code: ChatStreamErrorCode
  readonly failure: ChatStreamFailure

  constructor(message: string, code: ChatStreamErrorCode = 'generic', failure?: ChatStreamFailure) {
    super(message)
    this.name = 'ChatStreamUserError'
    this.code = code
    this.failure = failure ?? resolveChatStreamFailure({ code, message })
  }
}

function classifyChatStreamErrorFromMessage(message: string): ChatStreamErrorCode {
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
  if (msg.includes("couldn't get your agent ready") || msg.includes('agent ready yet')) {
    return 'temporary_unavailable'
  }
  if (msg.includes('service unavailable')) {
    return 'temporary_unavailable'
  }
  if (
    msg.includes('credits_exhausted') ||
    msg.includes('org_credit_limit_reached') ||
    msg.includes('agent request failed (402)')
  ) {
    return 'workspace_blocked'
  }
  if (
    msg.includes('provider_billing') ||
    msg.includes('api provider returned a billing error') ||
    msg.includes('provider returned a billing error') ||
    msg.includes('insufficient balance') ||
    msg.includes("provider's billing dashboard") ||
    msg.includes('top up or switch to a different api key')
  ) {
    return 'provider_billing'
  }
  if (
    msg.includes('busy:') ||
    msg.includes('temporarily overloaded') ||
    msg.includes('overloaded') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  ) {
    return 'busy'
  }
  if (msg.includes('gateway connection error') || msg.includes('gateway error')) {
    return 'gateway_connection'
  }
  if (
    msg.includes('empty_agent_response') ||
    msg.includes('stream_stalled') ||
    msg.includes('no response') ||
    msg.includes('empty response')
  ) {
    return 'no_answer'
  }
  if (
    msg === 'terminated' ||
    msg.includes('network stream interrupted') ||
    msg.includes('response was interrupted') ||
    msg.includes('connection dropped') ||
    msg.includes('stream interrupted')
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

  return 'generic'
}

const PROXY_SSE_ERROR_CODES: Record<string, ChatStreamErrorCode> = {
  MACHINE_CHAT_UNAVAILABLE: 'temporary_unavailable',
  MACHINE_CHAT_EMPTY_STREAM: 'temporary_unavailable',
  MACHINE_WARMUP_FAILED: 'temporary_unavailable',
}

const CHAT_STREAM_FAILURE_BEHAVIOR: Record<
  ChatStreamErrorCode,
  Omit<ChatStreamFailure, 'code' | 'userMessage'>
> = {
  image_too_large: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  unsupported_image_type: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  invalid_image: {
    category: 'request',
    retryable: true,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  image_load_failed: {
    category: 'runtime',
    retryable: true,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  model_no_images: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  model_settings_invalid: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  agent_deactivated: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  agent_access_denied: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  document_parse_failed: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  gateway_connection: {
    category: 'runtime',
    retryable: true,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  context_window_exceeded: {
    category: 'model',
    retryable: true,
    autoRecover: false,
    showInterruptedBar: true,
    bannerAction: 'resume',
  },
  temporary_unavailable: {
    category: 'runtime',
    retryable: true,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  busy: {
    category: 'model',
    retryable: true,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  no_answer: {
    category: 'model',
    retryable: true,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  workspace_blocked: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  provider_billing: {
    category: 'model',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  stream_interrupted: {
    category: 'transport',
    retryable: true,
    autoRecover: true,
    showInterruptedBar: true,
    bannerAction: 'resume',
  },
  reconnect_required: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: true,
    bannerAction: 'reconnect',
    reconnectProvider: 'openai_codex',
  },
  openai_codex_not_connected: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: true,
    bannerAction: 'reconnect',
    reconnectProvider: 'openai_codex',
  },
  anthropic_claude_not_connected: {
    category: 'request',
    retryable: false,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
  generic: {
    category: 'unknown',
    retryable: true,
    autoRecover: false,
    showInterruptedBar: false,
    bannerAction: 'resume',
  },
}

export function resolveChatStreamFailure(input: {
  code?: string | null
  message?: string | null
}): ChatStreamFailure {
  const codeFromEvent =
    typeof input.code === 'string' && input.code in CHAT_STREAM_ERRORS
      ? (input.code as ChatStreamErrorCode)
      : null

  if (codeFromEvent) {
    return {
      code: codeFromEvent,
      userMessage: CHAT_STREAM_ERRORS[codeFromEvent].userMessage,
      ...CHAT_STREAM_FAILURE_BEHAVIOR[codeFromEvent],
    }
  }

  const proxyAlias = typeof input.code === 'string' ? PROXY_SSE_ERROR_CODES[input.code] : undefined
  if (proxyAlias) {
    const message = input.message?.trim() ?? ''
    return {
      code: proxyAlias,
      userMessage: message || CHAT_STREAM_ERRORS[proxyAlias].userMessage,
      ...CHAT_STREAM_FAILURE_BEHAVIOR[proxyAlias],
    }
  }

  const message = input.message?.trim() ?? ''
  if (message) {
    const classified = classifyChatStreamErrorFromMessage(message)
    return {
      code: classified,
      userMessage: CHAT_STREAM_ERRORS[classified].userMessage,
      ...CHAT_STREAM_FAILURE_BEHAVIOR[classified],
    }
  }

  return {
    code: 'generic',
    userMessage: CHAT_STREAM_ERRORS.generic.userMessage,
    ...CHAT_STREAM_FAILURE_BEHAVIOR.generic,
  }
}

export function resolveChatStreamErrorToast(input: {
  code?: string | null
  message?: string | null
}): { userMessage: string; code: ChatStreamErrorCode } {
  const failure = resolveChatStreamFailure(input)
  return { code: failure.code, userMessage: failure.userMessage }
}

export function toastMessageForChatSendError(err: unknown): string {
  if (err instanceof ChatStreamUserError) return err.message
  if (err instanceof Error && err.message === '__CREDITS_EXHAUSTED__') {
    return CHAT_TOAST_ERRORS.CHAT_CREDITS_EXHAUSTED.userMessage
  }
  return CHAT_TOAST_ERRORS.CHAT_SEND_ERROR.userMessage
}
