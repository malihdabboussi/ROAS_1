import type { SlackShadowAction } from '../services/slack-people.service'

function metadataString(action: SlackShadowAction, key: string): string | null {
  const value = action.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function slackTimestampLabel(timestamp: string | null): string | null {
  if (!timestamp) return null
  const seconds = Number(timestamp.split('.')[0])
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  return new Date(seconds * 1000).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function slackSignalEvidence(action: SlackShadowAction) {
  const channelId = action.source_channel_id
  const messageTs = action.source_message_ts
  const confidence = action.metadata?.confidence
  return {
    channelName: metadataString(action, 'source_channel_name'),
    senderName: metadataString(action, 'source_sender_display_name'),
    senderSlackUserId: metadataString(action, 'source_sender_slack_user_id'),
    messageText: metadataString(action, 'source_message_text'),
    messageTime: slackTimestampLabel(messageTs),
    confidence:
      typeof confidence === 'number' && Number.isFinite(confidence)
        ? Math.round(confidence * 100)
        : null,
    slackUrl:
      channelId && messageTs
        ? `https://slack.com/archives/${channelId}/p${messageTs.replace('.', '')}`
        : null,
  }
}
