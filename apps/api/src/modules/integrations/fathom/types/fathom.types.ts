export interface FathomOAuthTokenResponse {
  access_token: string
  refresh_token?: string
}

export interface FathomMeetingSpeaker {
  display_name: string
  matched_calendar_invitee_email?: string
}

export interface FathomTranscriptEntry {
  speaker: FathomMeetingSpeaker
  text: string
  timestamp: string
}

export interface FathomActionItem {
  description: string
  user_generated: boolean
  completed: boolean
  recording_timestamp?: string
  recording_playback_url?: string
  assignee?: {
    name: string
    email: string
    team?: string
  }
}

export interface FathomMeeting {
  id?: string
  recording_id?: string
  call_id?: string
  title: string
  meeting_title?: string
  url: string
  share_url?: string
  created_at: string
  scheduled_start_time?: string
  scheduled_end_time?: string
  recording_start_time?: string
  recording_end_time?: string
  meeting_type?: string
  transcript_language?: string
  calendar_invitees?: Array<{
    is_external: boolean
    name: string
    email: string
  }>
  recorded_by?: {
    name: string
    email: string
    team?: string
  }
  transcript?: FathomTranscriptEntry[]
  default_summary?: {
    template_name: string
    markdown_formatted: string
  }
  action_items?: FathomActionItem[]
}

export interface FathomMeetingList {
  items: FathomMeeting[]
  limit: number
  next_cursor?: string
}

export interface FathomWebhook {
  id: string
  url: string
  secret: string
  created_at: string
  include_transcript: boolean
  include_crm_matches: boolean
  include_summary: boolean
  include_action_items: boolean
  triggered_for: string[]
}

export interface FathomUserIntegration {
  id: string
  user_id: string
  integration_id: string
  provider: string
  status: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  metadata: {
    email?: string
    display_name?: string
  } | null
}
