import type { InteractionEnvelopeV1 } from '@vibey/api-shared'
import { countTextTokens } from '@vibey/context-breakdown'

// Channel adapters for the customer signal loop: conversation rows + message
// rows in, normalized interaction envelopes out. Pure functions — the sweeper
// owns all I/O. A null return means "not ingestable" (nothing worth extracting),
// never an error.

export interface SignalConversationRow {
  id: string
  user_id: string
  org_id: string | null
  title: string | null
  metadata: Record<string, unknown> | null
  contact_id?: string | null
  last_extracted_message_at?: string | null
}

export interface SignalMessageRow {
  id: string
  role: string
  content: string | null
  created_at: string
}

interface TranscriptResult {
  text: string
  messageCount: number
  from: string
  to: string
  lastMessageId: string
}

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

// Only customer-facing dialogue carries signal; system prompts and tool calls
// would pollute extraction.
function buildTranscript(messages: SignalMessageRow[]): TranscriptResult | null {
  const lines: string[] = []
  let from: string | null = null
  let to: string | null = null
  let lastMessageId: string | null = null
  let messageCount = 0

  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue
    const content = (message.content ?? '').trim()
    if (!content) continue
    lines.push(`${message.role === 'user' ? 'Customer' : 'Assistant'}: ${content}`)
    messageCount += 1
    from ??= message.created_at
    to = message.created_at
    lastMessageId = message.id
  }

  if (!from || !to || !lastMessageId || lines.length === 0) return null
  return { text: lines.join('\n'), messageCount, from, to, lastMessageId }
}

export function buildTelegramEnvelope(
  conversation: SignalConversationRow,
  messages: SignalMessageRow[],
): InteractionEnvelopeV1 | null {
  const telegramChatId = metadataString(conversation.metadata, 'telegram_chat_id')
  if (!telegramChatId) return null

  const transcript = buildTranscript(messages)
  if (!transcript) return null

  return {
    v: 1,
    channel: 'telegram',
    source_id: conversation.id,
    title: conversation.title?.trim() || 'Telegram chat',
    window: { from: transcript.from, to: transcript.to },
    participants: [
      {
        role: 'customer',
        name: null,
        identifiers: [{ kind: 'telegram_chat_id', value: telegramChatId }],
      },
    ],
    content: {
      format: 'transcript',
      text: transcript.text,
      message_count: transcript.messageCount,
    },
  }
}

export function buildWidgetEnvelope(
  conversation: SignalConversationRow,
  messages: SignalMessageRow[],
): InteractionEnvelopeV1 | null {
  const visitorId = metadataString(conversation.metadata, 'visitor_id')
  const email =
    metadataString(conversation.metadata, 'visitor_email') ??
    metadataString(conversation.metadata, 'extracted_email')

  const transcript = buildTranscript(messages)
  if (!transcript) return null

  const identifiers = [
    ...(email ? [{ kind: 'email', value: email.toLowerCase() }] : []),
    ...(visitorId ? [{ kind: 'visitor_id', value: visitorId }] : []),
  ]

  return {
    v: 1,
    channel: 'widget',
    source_id: conversation.id,
    title: conversation.title?.trim() || 'Widget chat',
    window: { from: transcript.from, to: transcript.to },
    participants: [
      {
        role: 'customer',
        name: metadataString(conversation.metadata, 'visitor_name'),
        identifiers,
      },
    ],
    content: {
      format: 'transcript',
      text: transcript.text,
      message_count: transcript.messageCount,
    },
  }
}

export function estimateEnvelopeTokens(envelope: InteractionEnvelopeV1): number {
  return countTextTokens(envelope.content.text)
}
