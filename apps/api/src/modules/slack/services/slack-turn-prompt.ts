import { classifySlackAskKind, formatSlackAskKindContext, type SlackAskKindResult } from './slack-ask-kind'
import { formatSlackAskIdentityContext, type SlackAskClientStamp } from './slack-ask-identity-context'
import type { SlackTurnClientSource } from './slack-turn-telemetry'

/**
 * Assembles the prompt for one inbound Slack Pixel turn in the North Star order:
 *
 *   [Slack thread context]      (only when replying in a thread)
 *   [Current message]
 *     [Ask kind]                ← N0, first thing the model reads
 *     [Slack channel identity]  ← softened on general asks
 *     [Client context]          ← bundle (channels/brains) on client asks
 *     <human text>
 *     [Forwarded Slack message] (+ its source-channel identity)
 *     [Files]
 *
 * Pure: no I/O, so the prompt shape is unit-testable per R-catalog case.
 */
export type SlackTurnPromptInput = {
  text: string
  currentStamp: SlackAskClientStamp | null
  forwardedContext: string
  threadContext: string
  threadParentIsPixel: boolean
  isDirectMessage: boolean
  fileContext?: string
  hasDocuments: boolean
  /** §11.11 Client Context Bundle. Injected after identity on client asks only. */
  clientContextBlock?: string
  namedClientId?: string | null
}

export type SlackTurnPrompt = {
  fullMessage: string
  askKind: SlackAskKindResult
  clientSource: SlackTurnClientSource
  clientId: string | null
}

const QUOTED_CLIENT_CHANNEL = /Channel: #roas-|\[Slack channel identity\]/

export function buildInboundSlackTurnPrompt(input: SlackTurnPromptInput): SlackTurnPrompt {
  const askKind = classifySlackAskKind({
    text: input.text,
    hasChannelClientStamp: Boolean(input.currentStamp?.pageGraderClientId),
    hasQuotedClientChannel: QUOTED_CLIENT_CHANNEL.test(input.forwardedContext),
    threadParentIsPixel: input.threadParentIsPixel,
    isDirectMessage: input.isDirectMessage,
  })

  const parts: string[] = [formatSlackAskKindContext(askKind)]
  if (input.currentStamp) {
    parts.push(formatSlackAskIdentityContext(input.currentStamp, { askKind: askKind.kind }))
  }
  if (
    input.clientContextBlock &&
    (askKind.kind === 'client' || askKind.kind === 'unclear')
  ) {
    parts.push(input.clientContextBlock)
  }
  if (input.text) parts.push(input.text)
  if (input.forwardedContext) parts.push(input.forwardedContext)
  if (input.fileContext) parts.push(input.fileContext)
  if (!input.text && input.hasDocuments) parts.push('[User sent a file]')

  let fullMessage = parts.join('\n\n')
  if (input.threadContext) {
    fullMessage = `[Slack thread context]\n${input.threadContext}\n\n[Current message]\n${fullMessage}`
  }

  const stampClientId = input.currentStamp?.pageGraderClientId ?? null
  const namedClientId = input.namedClientId ?? null
  const clientId = stampClientId ?? namedClientId
  const clientSource: SlackTurnClientSource = stampClientId
    ? 'stamp'
    : askKind.signals.includes('quoted client channel')
      ? 'quote'
      : namedClientId
        ? 'named'
        : input.currentStamp?.channelName
          ? 'hint'
          : 'none'

  return { fullMessage, askKind, clientSource, clientId }
}
