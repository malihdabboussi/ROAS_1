import { describe, expect, it } from 'vitest'
import { buildInteractionDedupeKey, parseInteractionEnvelope } from '@vibey/api-shared'
import {
  buildTelegramEnvelope,
  buildWidgetEnvelope,
  estimateEnvelopeTokens,
  type SignalConversationRow,
  type SignalMessageRow,
} from './customer-interaction-envelope'

function conv(overrides: Partial<SignalConversationRow> = {}): SignalConversationRow {
  return {
    id: 'conv-1',
    user_id: 'user-1',
    org_id: 'org-1',
    title: 'Telegram Chat',
    metadata: { telegram_chat_id: '12345', source: 'telegram' },
    contact_id: null,
    ...overrides,
  }
}

function msg(overrides: Partial<SignalMessageRow> = {}): SignalMessageRow {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'I want to scale my coaching business',
    created_at: '2026-06-10T10:00:00.000Z',
    ...overrides,
  }
}

describe('buildTelegramEnvelope', () => {
  it('builds a v1 envelope with telegram_chat_id identifier and role-mapped transcript', () => {
    const messages = [
      msg({
        id: 'm1',
        role: 'user',
        content: 'I want to scale',
        created_at: '2026-06-10T10:00:00.000Z',
      }),
      msg({
        id: 'm2',
        role: 'assistant',
        content: 'Tell me more',
        created_at: '2026-06-10T10:01:00.000Z',
      }),
      msg({
        id: 'm3',
        role: 'system',
        content: 'internal prompt',
        created_at: '2026-06-10T10:02:00.000Z',
      }),
      msg({
        id: 'm4',
        role: 'tool',
        content: '{"result":true}',
        created_at: '2026-06-10T10:03:00.000Z',
      }),
      msg({
        id: 'm5',
        role: 'user',
        content: 'Budget is 2k/month',
        created_at: '2026-06-10T10:04:00.000Z',
      }),
    ]

    const envelope = buildTelegramEnvelope(conv(), messages)

    expect(envelope).not.toBeNull()
    expect(envelope?.v).toBe(1)
    expect(envelope?.channel).toBe('telegram')
    expect(envelope?.source_id).toBe('conv-1')
    expect(envelope?.participants).toEqual([
      {
        role: 'customer',
        name: null,
        identifiers: [{ kind: 'telegram_chat_id', value: '12345' }],
      },
    ])
    expect(envelope?.content.format).toBe('transcript')
    expect(envelope?.content.text).toBe(
      'Customer: I want to scale\nAssistant: Tell me more\nCustomer: Budget is 2k/month',
    )
    expect(envelope?.content.message_count).toBe(3)
    expect(envelope?.window).toEqual({
      from: '2026-06-10T10:00:00.000Z',
      to: '2026-06-10T10:04:00.000Z',
    })
  })

  it('returns null when the conversation has no telegram_chat_id', () => {
    const envelope = buildTelegramEnvelope(conv({ metadata: { source: 'telegram' } }), [msg()])
    expect(envelope).toBeNull()
  })

  it('returns null when there are no user/assistant messages with content', () => {
    const envelope = buildTelegramEnvelope(conv(), [
      msg({ role: 'system', content: 'x' }),
      msg({ role: 'user', content: '' }),
    ])
    expect(envelope).toBeNull()
  })
})

describe('buildWidgetEnvelope', () => {
  it('uses visitor_email as email identifier and visitor_name as participant name', () => {
    const envelope = buildWidgetEnvelope(
      conv({
        id: 'conv-w',
        title: 'Widget Chat',
        metadata: {
          public: true,
          visitor_id: 'vis-1',
          visitor_email: 'Lead@Example.com',
          visitor_name: 'Lead One',
        },
      }),
      [msg({ id: 'm1' })],
    )

    expect(envelope?.channel).toBe('widget')
    expect(envelope?.participants[0]).toEqual({
      role: 'customer',
      name: 'Lead One',
      identifiers: [
        { kind: 'email', value: 'lead@example.com' },
        { kind: 'visitor_id', value: 'vis-1' },
      ],
    })
  })

  it('falls back to extracted_email when visitor_email is absent', () => {
    const envelope = buildWidgetEnvelope(
      conv({
        id: 'conv-w2',
        metadata: { public: true, visitor_id: 'vis-2', extracted_email: 'found@example.com' },
      }),
      [msg()],
    )
    expect(envelope?.participants[0]?.identifiers).toEqual([
      { kind: 'email', value: 'found@example.com' },
      { kind: 'visitor_id', value: 'vis-2' },
    ])
  })

  it('uses visitor_id as the source identity when no email is captured', () => {
    const envelope = buildWidgetEnvelope(
      conv({ id: 'conv-anon', metadata: { public: true, visitor_id: 'vis-3' } }),
      [msg()],
    )
    expect(envelope?.participants[0]).toEqual({
      role: 'customer',
      name: null,
      identifiers: [{ kind: 'visitor_id', value: 'vis-3' }],
    })
  })
})

describe('estimateEnvelopeTokens', () => {
  it('returns a positive token estimate for transcript content', () => {
    const envelope = buildTelegramEnvelope(conv(), [
      msg({ content: 'I believe authenticity beats polish every time and I want help with that.' }),
    ])
    expect(envelope).not.toBeNull()
    expect(estimateEnvelopeTokens(envelope!)).toBeGreaterThan(0)
  })
})

describe('buildInteractionDedupeKey', () => {
  it('builds the canonical interaction dedupe key', () => {
    expect(buildInteractionDedupeKey('brain-1', 'conv-1', 'msg-9')).toBe(
      'interaction-brain-1-conv-1-msg-9',
    )
  })
})

describe('parseInteractionEnvelope', () => {
  const valid = {
    v: 1,
    channel: 'telegram',
    source_id: 'conv-1',
    title: 'Telegram Chat',
    window: { from: '2026-06-10T10:00:00.000Z', to: '2026-06-10T10:04:00.000Z' },
    participants: [
      { role: 'customer', name: null, identifiers: [{ kind: 'telegram_chat_id', value: '12345' }] },
    ],
    content: { format: 'transcript', text: 'Customer: hello', message_count: 1 },
  }

  it('accepts a valid v1 envelope', () => {
    const parsed = parseInteractionEnvelope(valid)
    expect(parsed).not.toBeNull()
    expect(parsed?.channel).toBe('telegram')
    expect(parsed?.participants[0]?.identifiers[0]?.kind).toBe('telegram_chat_id')
  })

  it('rejects unsupported versions', () => {
    expect(parseInteractionEnvelope({ ...valid, v: 2 })).toBeNull()
  })

  it('rejects missing channel', () => {
    const { channel: _channel, ...rest } = valid
    expect(parseInteractionEnvelope(rest)).toBeNull()
  })

  it('rejects non-array participants', () => {
    expect(parseInteractionEnvelope({ ...valid, participants: 'nope' })).toBeNull()
  })

  it('rejects non-objects', () => {
    expect(parseInteractionEnvelope(null)).toBeNull()
    expect(parseInteractionEnvelope('{}')).toBeNull()
  })
})
