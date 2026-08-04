import type { SlackApiIntegration } from '../integrations/slack-api.integration'
import type { SlackHistoryMessage, SlackWorkspaceChannel } from '../types/slack.types'

const DEFAULT_LOOKBACK_DAYS = 120
const MAX_UNSCOPED_CHANNELS = 30
const MAX_THREADS_TO_EXPAND = 50

const SEARCH_STOP_WORDS = new Set([
  'a',
  'about',
  'an',
  'and',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
])

type SlackSearchMatch = {
  text?: string
  user?: string
  ts?: string
  thread_ts?: string
  channel?: { id?: string; name?: string }
  permalink?: string
}

export type SearchWindow = {
  channelNeedle: string | null
  terms: string[]
  oldestTs: string
  latestTs: string | null
}

function dateToSlackTs(value: string): string | null {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(timestamp) ? String(timestamp / 1000) : null
}

export function parseSlackSearchWindow(query: string, now: Date): SearchWindow {
  const channelNeedle = query.match(/\bin:#?([a-z0-9_-]+)\b/i)?.[1]?.toLowerCase() ?? null
  const explicitOldest = query.match(/\bafter:(\d{4}-\d{2}-\d{2})\b/i)?.[1]
  const explicitLatest = query.match(/\bbefore:(\d{4}-\d{2}-\d{2})\b/i)?.[1]
  const defaultOldest = new Date(now.getTime() - DEFAULT_LOOKBACK_DAYS * 86_400_000)
  const terms =
    query
      .replace(/\b(?:in:#?[a-z0-9_-]+|after:\d{4}-\d{2}-\d{2}|before:\d{4}-\d{2}-\d{2})\b/gi, ' ')
      .toLowerCase()
      .match(/[a-z0-9$]+/g)
      ?.filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term)) ?? []

  return {
    channelNeedle,
    terms: [...new Set(terms)],
    oldestTs:
      (explicitOldest && dateToSlackTs(explicitOldest)) || String(defaultOldest.getTime() / 1000),
    latestTs: explicitLatest ? dateToSlackTs(explicitLatest) : null,
  }
}

function scoreMessage(message: SlackHistoryMessage, terms: string[]): number {
  if (terms.length === 0) return 1
  const text = String(message.text ?? '').toLowerCase()
  const matchedTerms = terms.filter((term) => text.includes(term))
  if (matchedTerms.length === 0) return 0
  const coverage = matchedTerms.length / terms.length
  const phraseBonus = terms.length > 1 && text.includes(terms.join(' ')) ? 2 : 0
  const linkBonus = /https?:\/\//i.test(text) ? 0.5 : 0
  return coverage * 10 + phraseBonus + linkBonus
}

function toMatch(message: SlackHistoryMessage, channel: SlackWorkspaceChannel): SlackSearchMatch {
  return {
    text: message.text,
    user: message.user,
    ts: message.ts,
    thread_ts: message.thread_ts,
    channel: { id: channel.id, name: channel.name },
  }
}

export async function searchSlackChannelHistory(input: {
  slackApi: SlackApiIntegration
  botToken: string
  query: string
  count: number
  now?: Date
}): Promise<{
  ok: true
  search_mode: 'channel_history_fallback'
  coverage: {
    status: 'complete' | 'partial'
    channels_scanned: number
    messages_scanned: number
    threads_expanded: number
    oldest_ts: string
  }
  messages: { total: number; matches: SlackSearchMatch[] }
}> {
  const window = parseSlackSearchWindow(input.query, input.now ?? new Date())
  const visibleChannels = await input.slackApi.listConversations(input.botToken)
  const channels = window.channelNeedle
    ? visibleChannels.filter(
        (channel) =>
          channel.id.toLowerCase() === window.channelNeedle ||
          channel.name.toLowerCase() === window.channelNeedle,
      )
    : visibleChannels.slice(0, MAX_UNSCOPED_CHANNELS)
  const scored: Array<{ score: number; match: SlackSearchMatch }> = []
  let messagesScanned = 0
  let threadsExpanded = 0
  let skippedThreads = 0

  for (const channel of channels) {
    const history = window.channelNeedle
      ? await input.slackApi.getChannelHistorySince(input.botToken, channel.id, window.oldestTs)
      : await input.slackApi.getChannelHistory(input.botToken, channel.id, 100)
    const inWindow = history.filter(
      (message) => !window.latestTs || Number(message.ts ?? 0) < Number(window.latestTs),
    )
    messagesScanned += inWindow.length

    const messages = [...inWindow]
    const threaded = inWindow.filter((message) => Number(message.reply_count ?? 0) > 0)
    for (const root of threaded) {
      if (!root.ts || threadsExpanded >= MAX_THREADS_TO_EXPAND) {
        skippedThreads += 1
        continue
      }
      const replies = await input.slackApi.conversationsRepliesAll(
        input.botToken,
        channel.id,
        root.ts,
      )
      threadsExpanded += 1
      messagesScanned += Math.max(0, replies.length - 1)
      messages.push(...replies.slice(1))
    }

    for (const message of messages) {
      const score = scoreMessage(message, window.terms)
      if (score <= 0) continue
      scored.push({ score, match: toMatch(message, channel) })
    }
  }

  const deduped = new Map<string, { score: number; match: SlackSearchMatch }>()
  for (const candidate of scored) {
    const key = `${candidate.match.channel?.id ?? ''}:${candidate.match.ts ?? ''}`
    const current = deduped.get(key)
    if (!current || candidate.score > current.score) deduped.set(key, candidate)
  }
  const selected = [...deduped.values()]
    .sort(
      (left, right) => right.score - left.score || Number(right.match.ts) - Number(left.match.ts),
    )
    .slice(0, input.count)
    .map((candidate) => candidate.match)
  const matches = await Promise.all(
    selected.map(async (match) => {
      if (!match.channel?.id || !match.ts) return match
      const permalink = await input.slackApi.getPermalink?.(
        input.botToken,
        match.channel.id,
        match.ts,
      )
      return permalink ? { ...match, permalink } : match
    }),
  )

  return {
    ok: true,
    search_mode: 'channel_history_fallback',
    coverage: {
      status:
        window.channelNeedle && skippedThreads === 0 && channels.length === 1
          ? 'complete'
          : 'partial',
      channels_scanned: channels.length,
      messages_scanned: messagesScanned,
      threads_expanded: threadsExpanded,
      oldest_ts: window.oldestTs,
    },
    messages: { total: matches.length, matches },
  }
}
