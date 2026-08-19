import { describe, expect, it } from 'vitest'
import {
  buildSlackPixelTurnRow,
  collapseToolCalls,
  detectForbiddenAsk,
} from '../slack-turn-telemetry'

describe('detectForbiddenAsk', () => {
  it('flags "which client" / screenshot / channel asks on a resolved client turn', () => {
    expect(
      detectForbiddenAsk({
        reply: 'Is this for Andy Elliott or Krista?',
        askKind: 'client',
        clientResolved: true,
      }),
    ).toBe(true)
    expect(
      detectForbiddenAsk({
        reply: 'Which client is this for?',
        askKind: 'client',
        clientResolved: true,
      }),
    ).toBe(true)
    expect(
      detectForbiddenAsk({
        reply: 'Send me a dashboard screenshot and I will pull it together.',
        askKind: 'client',
        clientResolved: true,
      }),
    ).toBe(true)
    expect(
      detectForbiddenAsk({
        reply: "I can't confirm Yasir's channel — tag or paste the likely #channel here.",
        askKind: 'client',
        clientResolved: true,
      }),
    ).toBe(true)
  })

  it('does not flag when the kind is unclear or no client was resolved (one question is correct there)', () => {
    expect(
      detectForbiddenAsk({
        reply: 'Which client is this for?',
        askKind: 'unclear',
        clientResolved: false,
      }),
    ).toBe(false)
    expect(
      detectForbiddenAsk({
        reply: 'Which client is this for?',
        askKind: 'client',
        clientResolved: false,
      }),
    ).toBe(false)
    expect(detectForbiddenAsk({ reply: null, askKind: 'client', clientResolved: true })).toBe(false)
  })
})

describe('collapseToolCalls', () => {
  it('keeps ordered starts, drops update/end and immediate duplicates', () => {
    expect(
      collapseToolCalls([
        { name: 'vibey_backend', action: 'search_user_brain', status: 'start' },
        { name: 'vibey_backend', action: 'search_user_brain', status: 'update' },
        { name: 'vibey_backend', action: 'search_user_brain', status: 'end' },
        { name: 'vibey_backend', action: 'search_campaign_brain', status: 'start' },
        { name: 'search_slack_messages', status: 'start' },
        { name: 'search_slack_messages', status: 'start' },
      ]),
    ).toEqual([
      { name: 'vibey_backend', action: 'search_user_brain' },
      { name: 'vibey_backend', action: 'search_campaign_brain' },
      { name: 'search_slack_messages' },
    ])
  })
})

describe('buildSlackPixelTurnRow', () => {
  it('builds the row the harness reads: kind, client source, tools, duration, forbidden ask', () => {
    const row = buildSlackPixelTurnRow({
      orgId: 'org-1',
      slackTeamId: 'T1',
      channelId: 'D1',
      threadTs: '1.1',
      messageTs: '1.1',
      slackUserId: 'U1',
      agentKey: 'pixel',
      conversationId: 'conv-1',
      askKind: 'client',
      kindSignals: ['client work vocabulary'],
      clientSource: 'stamp',
      clientId: 'client-yasir',
      toolEvents: [
        { name: 'vibey_backend', action: 'search_user_brain', status: 'start' },
        { name: 'search_slack_messages', status: 'start' },
      ],
      messageChars: 40,
      reply: "I can't confirm Yasir's exact Slack channel. Which channel is it?",
      startedAt: 1_000,
      finishedAt: 4_250,
      outcome: 'replied',
    })
    expect(row).toMatchObject({
      org_id: 'org-1',
      ask_kind: 'client',
      client_source: 'stamp',
      client_id: 'client-yasir',
      tool_count: 2,
      reply_chars: 65,
      duration_ms: 3_250,
      outcome: 'replied',
      forbidden_ask: true,
      error: null,
    })
    expect(row.tool_calls[0]).toEqual({ name: 'vibey_backend', action: 'search_user_brain' })
  })

  it('records errors and no-answer outcomes without a reply', () => {
    const row = buildSlackPixelTurnRow({
      orgId: null,
      slackTeamId: 'T1',
      channelId: 'C1',
      threadTs: undefined,
      messageTs: '2.2',
      slackUserId: undefined,
      agentKey: 'pixel',
      conversationId: undefined,
      askKind: 'general',
      kindSignals: ['my tasks'],
      clientSource: 'none',
      clientId: null,
      toolEvents: [],
      messageChars: 20,
      reply: null,
      startedAt: 10,
      finishedAt: 5,
      outcome: 'error',
      error: 'Agent API returned 502',
    })
    expect(row).toMatchObject({
      org_id: null,
      thread_ts: null,
      duration_ms: 0,
      outcome: 'error',
      error: 'Agent API returned 502',
      forbidden_ask: false,
      tool_count: 0,
      reply_chars: 0,
    })
  })
})
