import type { MeetingPostCallReview } from '@/components/global-chat/store/use-global-chat-store'
import type { MeetingWorkspaceBundle } from '../services/meeting-workspace-api'

function text(...values: unknown[]): string {
  const found = values.find((value): value is string => typeof value === 'string' && !!value.trim())
  return found?.trim() ?? ''
}

export function buildMeetingPostCallReview(
  bundle: MeetingWorkspaceBundle,
  conversationId: string,
  meetingItemId: string,
  meetingTitle: string,
  attendees: string,
): MeetingPostCallReview {
  const custom = bundle.meeting.custom_data ?? {}
  const slackReview =
    custom.slack_follow_up_confirm && typeof custom.slack_follow_up_confirm === 'object'
      ? (custom.slack_follow_up_confirm as Record<string, unknown>)
      : {}
  const clientCampaign =
    custom.client_campaign && typeof custom.client_campaign === 'object'
      ? (custom.client_campaign as Record<string, unknown>)
      : {}
  const primaryRecording = bundle.recordings.find((recording) => recording.is_primary)
  const summary = text(
    slackReview.review_summary,
    custom.meeting_summary,
    custom.summary,
    primaryRecording?.provider_summary,
    bundle.meeting.description,
    meetingTitle,
  )
  const clientWorkspace = text(
    custom.client_workspace_name,
    custom.client_workspace,
    custom.client_name,
    custom.company_name,
    clientCampaign.client_workspace_name,
    clientCampaign.client_name,
    clientCampaign.client_label,
  )
  const followUps = bundle.actions
    .filter((action) => action.status !== 'dismissed')
    .map((action) => ({ id: action.id, title: action.title, status: action.status }))

  return {
    conversationId,
    meetingItemId,
    meetingTitle,
    summary,
    clientWorkspace,
    attendees,
    followUpCount: followUps.length,
    followUps,
    followUpMessage: text(slackReview.draft_message),
  }
}
