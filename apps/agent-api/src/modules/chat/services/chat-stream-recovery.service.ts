import { Injectable } from '@nestjs/common'
import { classifyChatStreamError, type ChatStreamErrorCode } from '../chat-stream-errors'

@Injectable()
export class ChatStreamRecoveryService {
  isRetryableProviderError(failureMessage: string | undefined): boolean {
    if (!failureMessage) return false
    const msg = failureMessage.toLowerCase()
    return (
      msg.includes('temporarily overloaded') ||
      msg.includes('overloaded') ||
      msg.includes('try again in a moment') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests')
    )
  }

  classifyAgentStreamFailure(failureMessage: string | undefined): {
    code: ChatStreamErrorCode
  } {
    if (!failureMessage) return { code: 'generic' }

    if (this.isContextWindowExceededFailure(failureMessage)) {
      return { code: 'context_window_exceeded' }
    }

    const msg = failureMessage.toLowerCase()
    if (
      msg.includes('credits_exhausted') ||
      msg.includes('org_credit_limit_reached') ||
      msg.includes('agent request failed (402)')
    ) {
      return { code: 'workspace_blocked' }
    }
    if (this.isRetryableProviderError(failureMessage)) {
      return { code: 'busy' }
    }
    if (
      msg.includes('empty_agent_response') ||
      msg.includes('stream_stalled') ||
      msg.includes('no response') ||
      msg.includes('empty response')
    ) {
      return { code: 'no_answer' }
    }

    const classified = classifyChatStreamError(failureMessage)
    return { code: classified === 'generic' ? 'temporary_unavailable' : classified }
  }

  isContextWindowExceededFailure(
    failureMessage: string | undefined,
    result?: {
      truncated?: boolean
      lastCallInputTokens?: number
      contextWindowTokens?: number
    },
  ): boolean {
    if (!failureMessage) return false
    const msg = failureMessage.toLowerCase()
    if (
      msg.includes('context_window_exceeded') ||
      msg.includes('context overflow') ||
      msg.includes('context length exceeded') ||
      msg.includes('context window exceeded') ||
      msg.includes('maximum context length') ||
      msg.includes('exceeds the context window') ||
      msg.includes('prompt too large') ||
      msg.includes('input is too long') ||
      msg.includes('too many input tokens')
    ) {
      return true
    }
    const inputTokens = result?.lastCallInputTokens
    const windowTokens = result?.contextWindowTokens
    return Boolean(
      result?.truncated &&
      typeof inputTokens === 'number' &&
      typeof windowTokens === 'number' &&
      windowTokens > 0 &&
      inputTokens >= Math.floor(windowTokens * 0.95),
    )
  }
}
