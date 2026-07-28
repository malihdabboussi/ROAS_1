export type OrgPersonCalendarMatchStatus = 'unmatched' | 'suggested' | 'confirmed' | 'rejected'

export type OrgPersonCalendarSource =
  | 'manual'
  | 'directory_sync'
  | 'personal_calendar'
  | 'slack_email'
  | 'portal_email'

/** True only for Google Workspace Directory users (never Slack-only / external). */
export function isWorkspaceDirectoryIdentity(row: {
  source: OrgPersonCalendarSource | string
  google_workspace_user_id?: string | null
}): boolean {
  return row.source === 'directory_sync' || Boolean(row.google_workspace_user_id)
}

export type OrgPersonCalendarIdentity = {
  id: string
  org_id: string
  calendar_email: string
  display_name: string | null
  google_workspace_user_id: string | null
  channel_member_id: string | null
  vibey_user_id: string | null
  person_brain_id: string | null
  suggested_channel_member_id: string | null
  suggested_vibey_user_id: string | null
  suggested_person_brain_id: string | null
  match_status: OrgPersonCalendarMatchStatus
  match_method: string | null
  personal_connection_label: string | null
  source: OrgPersonCalendarSource
  metadata: Record<string, unknown>
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export type GoogleWorkspaceServiceAccount = {
  type?: string
  project_id?: string
  private_key_id?: string
  private_key: string
  client_email: string
  client_id?: string
  auth_uri?: string
  token_uri?: string
}

export type GoogleWorkspaceDirectoryUser = {
  id: string
  primaryEmail: string
  fullName: string | null
  suspended: boolean
}

export type GoogleWorkspaceAgendaEvent = {
  id: string
  title: string
  start: string
  end: string
  all_day: boolean
  location: string | null
  description: string | null
  video_url: string | null
  html_link: string | null
  ical_uid: string | null
  attendees: Array<{ name: string | null; email: string }>
  source: 'google_workspace'
  calendar_email: string
}
