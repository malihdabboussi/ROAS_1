import type { SlackMessageAttachment } from '../types/slack.types'

export interface SlackForwardedMessageContext {
  channelId: string | null
  messageTs: string | null
  context: string
}

const SLACK_MESSAGE_URL_PATTERN = /\/archives\/([A-Z0-9]+)\/p(\d{10,})/i

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
    attachment.channel_name ?? attachment.footer?.match(/Posted in #([^\s|]+)/i)?.[1]
  const message = attachment.text ?? attachment.fallback
  const lines = ['[Forwarded Slack message]']

  if (attachment.author_name) lines.push(`From: ${attachment.author_name}`)
  if (channelName) lines.push(`Channel: #${channelName}`)
  if (attachment.title) lines.push(`Title: ${attachment.title}`)
  if (message) lines.push(`Message: ${message}`)
  if (attachment.title_link) lines.push(`Link: ${attachment.title_link}`)
  if (attachment.from_url) lines.push(`Source: ${attachment.from_url}`)

  return { channelId, messageTs, context: lines.join('\n') }
}

function isForwardedSlackMessage(attachment: SlackMessageAttachment): boolean {
  return Boolean(
    attachment.is_msg_unfurl ||
    attachment.from_url?.match(SLACK_MESSAGE_URL_PATTERN) ||
    attachment.footer?.match(/Posted in #[^\s|]+/i),
  )
}

function slackPermalinkDigitsToTimestamp(digits: string | undefined): string | null {
  if (!digits || digits.length <= 10) return null
  return `${digits.slice(0, 10)}.${digits.slice(10)}`
}
