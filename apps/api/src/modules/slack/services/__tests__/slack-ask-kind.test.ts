import { describe, expect, it } from 'vitest'
import {
  classifySlackAskKind,
  formatSlackAskKindContext,
  SLACK_ASK_KIND_HEADER,
} from '../slack-ask-kind'

const base = {
  hasChannelClientStamp: false,
  hasQuotedClientChannel: false,
  threadParentIsPixel: false,
  isDirectMessage: true,
}

describe('classifySlackAskKind — general asks never open Portal', () => {
  it.each([
    ["What's on my task list today?", 'my tasks'],
    ['How many calls do I have today, and when is the first one?', 'my calls'],
    ['Check my brain and give me 5 content ideas', 'my brain'],
    ['Remind me tomorrow 9am to send the 1DS VSL review', 'reminder'],
  ])('%s → general', (text, signal) => {
    const result = classifySlackAskKind({ ...base, text })
    expect(result.kind).toBe('general')
    expect(result.signals).toContain(signal)
  })

  it('stays general even inside a client-mapped channel', () => {
    const result = classifySlackAskKind({
      ...base,
      text: "What's on my task list today?",
      hasChannelClientStamp: true,
      isDirectMessage: false,
    })
    expect(result.kind).toBe('general')
  })
})

describe('classifySlackAskKind — team asks do not bind one client', () => {
  it.each([
    'Find all open tasks for my clients across the team and tell me what is at risk for launch',
    'Check all team work across all clients and tell me what is at risk',
    'How many active clients do I have right now?',
  ])('%s → team', (text) => {
    expect(classifySlackAskKind({ ...base, text }).kind).toBe('team')
  })
})

describe('classifySlackAskKind — client asks', () => {
  it('names a client channel → client', () => {
    const result = classifySlackAskKind({
      ...base,
      text: 'need this edited VSL style asap #roas-1ds-collective-llc-939',
    })
    expect(result.kind).toBe('client')
    expect(result.signals).toContain('#roas- channel named')
  })

  it('a quoted client thread in a group DM is client, not the DM', () => {
    const result = classifySlackAskKind({
      ...base,
      text: 'need this edited VSL style asap',
      hasQuotedClientChannel: true,
    })
    expect(result.kind).toBe('client')
    expect(result.signals).toContain('quoted client channel')
  })

  it('performance vocabulary in a client-mapped channel → client', () => {
    const result = classifySlackAskKind({
      ...base,
      text: 'How are Meta ads performing last 7 days?',
      hasChannelClientStamp: true,
      isDirectMessage: false,
    })
    expect(result.kind).toBe('client')
  })

  it('what did I promise Yasir last call → client (call memory)', () => {
    const result = classifySlackAskKind({ ...base, text: 'What did I promise Yasir last call?' })
    expect(result.kind).toBe('client')
    expect(result.signals).toContain('client call memory')
  })

  it('mixed ask (client facts, my voice) resolves to client with voice-only signal', () => {
    const result = classifySlackAskKind({
      ...base,
      text: 'Help me rewrite my message to Yasir about the webinar delay',
    })
    expect(result.kind).toBe('client')
    expect(result.signals.some((s) => s.includes('voice only'))).toBe(true)
  })

  it('a client-mapped channel with no other signal is still the client', () => {
    const result = classifySlackAskKind({
      ...base,
      text: 'any update?',
      hasChannelClientStamp: true,
      isDirectMessage: false,
    })
    expect(result.kind).toBe('client')
    expect(result.signals).toContain('client-mapped channel')
  })
})

describe('classifySlackAskKind — continuation and unclear', () => {
  it('a short reply on a Pixel thread continues that process', () => {
    const result = classifySlackAskKind({ ...base, text: 'approve', threadParentIsPixel: true })
    expect(result.kind).toBe('continuation')
  })

  it('"is that still open?" on a digest thread is continuation, not a new lookup', () => {
    const result = classifySlackAskKind({
      ...base,
      text: 'is that still open?',
      threadParentIsPixel: true,
    })
    expect(result.kind).toBe('continuation')
    expect(result.signals).toContain('follow-up on Pixel item')
  })

  it('a long new client ask on a Pixel thread still resolves as client', () => {
    const text =
      'Actually, separate thing — can you pull the Speak Like a CEO webinar campaign spend for the last 7 days and compare it to the target CPA we set in the brain?'
    const result = classifySlackAskKind({ ...base, text, threadParentIsPixel: true })
    expect(result.kind).toBe('client')
    expect(result.signals).toContain('reply on Pixel thread')
  })

  it('live-audit shapes: "make a task … ASAP" / "need this edited by EOW" over a forwarded message → client', () => {
    // 2026-08-18 audit: 175/228 DM asks fell to "unclear"; most were Service Request
    // intents over forwarded client content ("need to make a task to edit these videos ASAP").
    expect(
      classifySlackAskKind({
        ...base,
        text: 'Can you make this a task for CRM for @Harry M.',
      }),
    ).toMatchObject({ kind: 'client', signals: expect.arrayContaining(['service request intent']) })
    expect(
      classifySlackAskKind({ ...base, text: 'need to make a task to edit these videos ASAP' }),
    ).toMatchObject({ kind: 'client' })
    expect(
      classifySlackAskKind({ ...base, text: 'Can you turn this into a task for GHL?' }),
    ).toMatchObject({ kind: 'client', signals: expect.arrayContaining(['service request intent']) })
    expect(classifySlackAskKind({ ...base, text: 'task this for CRM' })).toMatchObject({
      kind: 'client',
      signals: expect.arrayContaining(['service request intent']),
    })
    expect(
      classifySlackAskKind({ ...base, text: 'need this edited VSL style by EOW' }),
    ).toMatchObject({
      kind: 'client',
    })
    expect(
      classifySlackAskKind({
        ...base,
        text: 'Prepping for call with <#C0B5MKP7Y30> today.. what should i have ready',
      }),
    ).toMatchObject({
      kind: 'client',
      signals: expect.arrayContaining(['Slack channel referenced']),
    })
    expect(
      classifySlackAskKind({
        ...base,
        text: 'Can you draft monday morning update for me for the client Yasir Khan',
      }),
    ).toMatchObject({ kind: 'client' })
    expect(classifySlackAskKind({ ...base, text: 'Any campaigns off kpi?' })).toMatchObject({
      kind: 'team',
    })
    expect(
      classifySlackAskKind({
        ...base,
        text: 'hey give me a full breakdown of everything client wise on KPIs',
      }),
    ).toMatchObject({ kind: 'team' })
  })

  it('no signals → unclear (ask whether to create a task, never default to client)', () => {
    expect(classifySlackAskKind({ ...base, text: 'thoughts?' }).kind).toBe('unclear')
    expect(formatSlackAskKindContext({ kind: 'unclear', signals: [] })).toContain(
      'Did you want me to create a task for this?',
    )
  })
})

describe('formatSlackAskKindContext', () => {
  it('renders the header, kind, signals and the per-kind ladder', () => {
    const block = formatSlackAskKindContext({ kind: 'general', signals: ['my tasks'] })
    expect(block.startsWith(SLACK_ASK_KIND_HEADER)).toBe(true)
    expect(block).toContain('Kind: general')
    expect(block).toContain('Signals: my tasks')
    expect(block).toContain('Do not call list_clients')
  })

  it('tells Pixel to assume task-create language is a Service Request', () => {
    expect(formatSlackAskKindContext({ kind: 'client', signals: ['service request intent'] })).toContain(
      'If they asked to make/create a task, that is a Service Request',
    )
    expect(formatSlackAskKindContext({ kind: 'client', signals: ['service request intent'] })).toContain(
      'Did you want me to create a task for this?',
    )
  })
})
