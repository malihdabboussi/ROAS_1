// Customer signal loop — interaction envelope contract.
//
// Every channel (telegram, widget, fathom, future gmail/whatsapp/...) normalizes
// its raw payload into this envelope inside a thin channel adapter. The brain-ops
// worker consumes ONLY this shape via `customer_interaction_route` outbox events,
// so adding a new ingestion channel never touches the worker.
// See .docs/plans/customer-signal-loop.md for the full architecture.

export const INTERACTION_CHANNELS = ['telegram', 'widget', 'fathom'] as const

export type InteractionChannel = (typeof INTERACTION_CHANNELS)[number]

export const INTERACTION_PARTICIPANT_ROLES = ['customer', 'team', 'unknown'] as const

export type InteractionParticipantRole = (typeof INTERACTION_PARTICIPANT_ROLES)[number]

export interface InteractionIdentifier {
  /** A contact_identifiers `kind` (email, phone, telegram_chat_id, ...). */
  kind: string
  value: string
}

export interface InteractionParticipant {
  role: InteractionParticipantRole
  name: string | null
  identifiers: InteractionIdentifier[]
}

export interface InteractionEnvelopeV1 {
  v: 1
  channel: InteractionChannel
  /** Stable id of the interaction source: conversation id or meeting id. */
  source_id: string
  title: string
  window: { from: string; to: string }
  participants: InteractionParticipant[]
  content: { format: 'transcript'; text: string; message_count: number }
}

export const CUSTOMER_INTERACTION_ROUTE_EVENT = 'customer_interaction_route'

/**
 * Dedupe key for `brain_ops_outbox` rows carrying an envelope. `lastUnitId` is
 * the cursor end (last message id for chats, the meeting id itself for calls),
 * which makes re-emission after a crash or sweep re-run idempotent.
 */
export function buildInteractionDedupeKey(
  brainId: string,
  sourceId: string,
  lastUnitId: string,
): string {
  return `interaction-${brainId}-${sourceId}-${lastUnitId}`
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function parseIdentifier(value: unknown): InteractionIdentifier | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (!isNonEmptyString(candidate.kind) || !isNonEmptyString(candidate.value)) return null
  return { kind: candidate.kind, value: candidate.value }
}

function parseParticipant(value: unknown): InteractionParticipant | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (
    !INTERACTION_PARTICIPANT_ROLES.includes(candidate.role as InteractionParticipantRole) ||
    !Array.isArray(candidate.identifiers)
  ) {
    return null
  }
  const identifiers = candidate.identifiers.map(parseIdentifier)
  if (identifiers.some((identifier) => identifier === null)) return null
  return {
    role: candidate.role as InteractionParticipantRole,
    name: typeof candidate.name === 'string' && candidate.name ? candidate.name : null,
    identifiers: identifiers as InteractionIdentifier[],
  }
}

/**
 * Validates an untrusted outbox payload into an envelope. Returns null on any
 * shape mismatch — the worker treats that as a permanently failed event rather
 * than guessing at channel-specific fields.
 */
export function parseInteractionEnvelope(value: unknown): InteractionEnvelopeV1 | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (candidate.v !== 1) return null
  if (!INTERACTION_CHANNELS.includes(candidate.channel as InteractionChannel)) return null
  if (!isNonEmptyString(candidate.source_id) || !isNonEmptyString(candidate.title)) return null

  const window = candidate.window as Record<string, unknown> | undefined
  if (!window || !isNonEmptyString(window.from) || !isNonEmptyString(window.to)) return null

  if (!Array.isArray(candidate.participants)) return null
  const participants = candidate.participants.map(parseParticipant)
  if (participants.some((participant) => participant === null)) return null

  const content = candidate.content as Record<string, unknown> | undefined
  if (
    !content ||
    content.format !== 'transcript' ||
    typeof content.text !== 'string' ||
    typeof content.message_count !== 'number'
  ) {
    return null
  }

  return {
    v: 1,
    channel: candidate.channel as InteractionChannel,
    source_id: candidate.source_id,
    title: candidate.title,
    window: { from: window.from as string, to: window.to as string },
    participants: participants as InteractionParticipant[],
    content: {
      format: 'transcript',
      text: content.text,
      message_count: content.message_count,
    },
  }
}
