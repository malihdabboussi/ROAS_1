export type SlackObservationSource = 'webhook' | 'reconciliation' | 'backfill' | 'page_grader'

export type SlackObservationEventInput = {
  orgId: string
  slackTeamId: string
  channelId: string
  channelName: string | null
  messageTs: string
  threadTs: string | null
  senderSlackUserId: string | null
  text: string
  isBot: boolean
  source: SlackObservationSource
  metadata?: Record<string, unknown>
}

export type SlackObservationMessage = {
  channel_id: string
  channel_name: string
  message_ts: string
  thread_ts: string | null
  sender_slack_user_id: string | null
  text: string
  is_bot: boolean
  observed_at: string
  metadata: Record<string, unknown>
}

export type SlackObservationCursor = {
  channel_id: string
  last_message_ts: string | null
  last_reconciled_at: string | null
}

export type SlackObservationChannelSetting = SlackObservationCursor & {
  channel_name: string
  is_private: boolean
  is_member: boolean
  is_excluded: boolean
  exclusion_reason: string | null
  join_status: 'discovered' | 'joined' | 'observed' | 'excluded' | 'inaccessible'
  join_error: string | null
  archive_oldest_ts: string | null
  archive_backfilled_at: string | null
}
