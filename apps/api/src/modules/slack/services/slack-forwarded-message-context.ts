import type { SlackMessageAttachment } from '../types/slack.types'

export interface SlackForwardedMessageContext {
  channelId: string | null
  /** Channel name from the unfurl (footer / channel_name) when Slack omits the id. */
  channelName: string | null
  messageTs: string | null
  /** Parent thread ts when the forwarded message is a thread reply. */
  threadTs: string | null
  context: string
}

const SLACK_MESSAGE_URL_PATTERN = /\/archives\/([A-Z0-9]+)\/p(\d{10,})/i
const SLACK_THREAD_TS_PATTERN = /[?&]thread_ts=(\d{10}\.\d{1,6})/i
/** "Posted in #chan", "From a thread in #chan", "Shared from #chan" — Slack varies the footer by unfurl kind. */
const SLACK_FOOTER_CHANNEL_PATTERN =
  /(?:Posted in|From a thread in|Shared from|Thread in)\s+#([^\s|]+)/i

export function parseSlackForwardedMessage(
  attachments: SlackMessageAttachment[] | undefined,
): SlackForwardedMessageContext | null {
  const attachment = attachments?.find(isForwardedSlackMessage)
  if (!attachment) return null

  const sourceMatch = attachment.from_url?.match(SLACK_MESSAGE_URL_PATTERN)
  const channelId = attachment.channel_id ?? sourceMatch?.[1] ?? null
  const messageTs =
    attachment.message_ts ?? attachment.ts ?? slackPermalinkDigitsToTimestamp(sourceMatch?.[2])
  const channelName =
    attachment.channel_name ?? attachment.footer?.match(SLACK_FOOTER_CHANNEL_PATTERN)?.[1] ?? null
  const threadTs = attachment.from_url?.match(SLACK_THREAD_TS_PATTERN)?.[1] ?? null
  const message = attachment.text ?? attachment.fallback
  const lines = ['[Forwarded Slack message]']

  if (attachment.author_name) lines.push(`From: ${attachment.author_name}`)
  if (channelName) lines.push(`Channel: #${channelName}`)
  if (threadTs && threadTs !== messageTs) lines.push('Kind: reply inside a thread')
  if (attachment.title) lines.push(`Title: ${attachment.title}`)
  if (message) lines.push(`Message: ${message}`)
  if (attachment.title_link) lines.push(`Link: ${attachment.title_link}`)
  if (attachment.from_url) lines.push(`Source: ${attachment.from_url}`)

  return { channelId, channelName, messageTs, threadTs, context: lines.join('\n') }
}

function isForwardedSlackMessage(attachment: SlackMessageAttachment): boolean {
  return Boolean(
    attachment.is_msg_unfurl ||
    attachment.from_url?.match(SLACK_MESSAGE_URL_PATTERN) ||
    attachment.footer?.match(SLACK_FOOTER_CHANNEL_PATTERN),
  )
}

function slackPermalinkDigitsToTimestamp(digits: string | undefined): string | null {
  if (!digits || digits.length <= 10) return null
  return `${digits.slice(0, 10)}.${digits.slice(10)}`
}
