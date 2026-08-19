import type { Logger } from '@nestjs/common'
import type { SlackAskKind } from './slack-ask-kind'

/**
 * Per-turn Slack Pixel telemetry (North Star §11.0).
 *
 * `slack_pixel_turns` is what the nightly R-catalog harness and the "did Pixel
 * look deep enough" metrics read from: ask kind, how the client was resolved,
 * ordered tool calls, duration, and whether the reply asked a question the
 * platform could have answered itself.
 */

export type SlackTurnClientSource = 'stamp' | 'quote' | 'hint' | 'named' | 'none'

export type SlackTurnToolCall = {
  name: string
  action?: string
  status?: 'start' | 'update' | 'end'
}

export type SlackPixelTurnRow = {
  org_id: string | null
  slack_team_id: string
  channel_id: string
  thread_ts: string | null
  message_ts: string | null
  slack_user_id: string | null
  agent_key: string
  conversation_id: string | null
  ask_kind: SlackAskKind
  kind_signals: string[]
  client_source: SlackTurnClientSource | null
  client_id: string | null
  tool_calls: Array<{ name: string; action?: string }>
  tool_count: number
  message_chars: number
  reply_chars: number
  duration_ms: number | null
  outcome: 'replied' | 'no_answer' | 'error'
  error: string | null
  forbidden_ask: boolean
}

/**
 * Replies that hand the job back to the human when the platform could have
 * answered. Only counted on client-class turns where a client was resolved —
 * on `unclear` turns one question is the *right* move.
 */
const FORBIDDEN_ASK_PATTERNS: RegExp[] = [
  /\bwhich (client|campaign|account)\b/i,
  /\b(send|share|drop|paste|attach)( me)? (a |the )?(screenshot|dashboard|transcript|recording|report)\b/i,
  /\bpoint me to (the )?(slack )?channel\b/i,
  /\bwhich (slack )?channel\b/i,
  /\bif you (can )?(share|remember|point me|tell me) (where|which)\b/i,
  /\b(tag|paste|send|drop)( me)? (the )?(likely |right )?#?channel\b/i,
  // "Is this for Andy Elliott or Krista?" — a which-client fork phrased as names.
  /\b(is (this|it|that)|for) [A-Z][\w.'-]*(?: [A-Z][\w.'-]*)? or [A-Z][\w.'-]*(?: [A-Z][\w.'-]*)?\?/,
]

export function detectForbiddenAsk(input: {
  reply: string | null
  askKind: SlackAskKind
  clientResolved: boolean
}): boolean {
  if (!input.reply) return false
  if (input.askKind !== 'client' || !input.clientResolved) return false
  return FORBIDDEN_ASK_PATTERNS.some((re) => re.test(input.reply as string))
}

/** Collapse start/update/end events into one ordered entry per tool span. */
export function collapseToolCalls(
  events: SlackTurnToolCall[],
): Array<{ name: string; action?: string }> {
  const out: Array<{ name: string; action?: string }> = []
  for (const event of events) {
    if (event.status === 'end' || event.status === 'update') continue
    const last = out[out.length - 1]
    if (last && last.name === event.name && (last.action ?? '') === (event.action ?? '')) continue
    out.push(event.action ? { name: event.name, action: event.action } : { name: event.name })
  }
  return out
}

export function buildSlackPixelTurnRow(input: {
  orgId: string | null | undefined
  slackTeamId: string
  channelId: string
  threadTs: string | undefined
  messageTs: string | undefined
  slackUserId: string | null | undefined
  agentKey: string
  conversationId: string | null | undefined
  askKind: SlackAskKind
  kindSignals: string[]
  clientSource: SlackTurnClientSource | null
  clientId: string | null | undefined
  toolEvents: SlackTurnToolCall[]
  messageChars: number
  reply: string | null
  startedAt: number
  finishedAt: number
  outcome: 'replied' | 'no_answer' | 'error'
  error?: string | null
}): SlackPixelTurnRow {
  const tool_calls = collapseToolCalls(input.toolEvents)
  return {
    org_id: input.orgId ?? null,
    slack_team_id: input.slackTeamId,
    channel_id: input.channelId,
    thread_ts: input.threadTs ?? null,
    message_ts: input.messageTs ?? null,
    slack_user_id: input.slackUserId ?? null,
    agent_key: input.agentKey,
    conversation_id: input.conversationId ?? null,
    ask_kind: input.askKind,
    kind_signals: input.kindSignals.slice(0, 12),
    client_source: input.clientSource,
    client_id: input.clientId ?? null,
    tool_calls,
    tool_count: tool_calls.length,
    message_chars: input.messageChars,
    reply_chars: input.reply?.length ?? 0,
    duration_ms: Math.max(0, Math.round(input.finishedAt - input.startedAt)),
    outcome: input.outcome,
    error: input.error ? String(input.error).slice(0, 500) : null,
    forbidden_ask: detectForbiddenAsk({
      reply: input.reply,
      askKind: input.askKind,
      clientResolved: Boolean(input.clientId),
    }),
  }
}

export type SlackTurnSeed = {
  askKind: SlackAskKind
  kindSignals: string[]
  clientSource: SlackTurnClientSource
  clientId: string | null
  slackUserId: string | null
}

/** Fire-and-forget: telemetry must never delay or fail a Slack reply. */
export function recordSlackPixelTurn(input: {
  repo: { insertPixelTurn(row: SlackPixelTurnRow): Promise<void> }
  logger: Pick<Logger, 'warn'>
  params: {
    orgId?: string | null
    teamId: string
    channelId: string
    threadTs?: string
    messageTs?: string
    agentKey: string
    message: string
  }
  turn: SlackTurnSeed
  result: {
    content: string | null
    toolEvents: SlackTurnToolCall[]
    conversationId: string | null
  } | null
  startedAt: number
  outcome: 'replied' | 'no_answer' | 'error'
  error: string | null
}): void {
  const row = buildSlackPixelTurnRow({
    orgId: input.params.orgId,
    slackTeamId: input.params.teamId,
    channelId: input.params.channelId,
    threadTs: input.params.threadTs,
    messageTs: input.params.messageTs,
    slackUserId: input.turn.slackUserId,
    agentKey: input.params.agentKey,
    conversationId: input.result?.conversationId ?? null,
    askKind: input.turn.askKind,
    kindSignals: input.turn.kindSignals,
    clientSource: input.turn.clientSource,
    clientId: input.turn.clientId,
    toolEvents: input.result?.toolEvents ?? [],
    messageChars: input.params.message.length,
    reply: input.result?.content ?? null,
    startedAt: input.startedAt,
    finishedAt: Date.now(),
    outcome: input.outcome,
    error: input.error,
  })
  void input.repo
    .insertPixelTurn(row)
    .catch((err) =>
      input.logger.warn(
        `[TRACE] slack_pixel_turns insert skipped: ${err instanceof Error ? err.message : String(err)}`,
      ),
    )
}
