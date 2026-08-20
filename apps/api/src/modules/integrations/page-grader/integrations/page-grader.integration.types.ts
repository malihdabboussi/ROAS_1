export type PageGraderClient = {
  id: string
  name: string
  status: string
  display_name?: string
  pipeline_stage?: string
  website_url?: string | null
  logo_url?: string | null
  industry?: string | null
  overview?: string | null
  happy_factor?: number | null
  account_manager?: { id: string; name: string; email: string | null } | null
  counts?: { campaigns: number; open_tasks: number; open_requests: number }
  [key: string]: unknown
}

export type PageGraderClientCampaign = {
  id: string
  client_id: string
  name: string
  status: string | null
  platform_status: string
  start_date: string | null
  end_date: string | null
  event_date: string | null
  budget_amount: number | null
  budget_type: string | null
  currency: string | null
  next_action: string | null
  clients?: Record<string, unknown>
  [key: string]: unknown
}

export type PageGraderLaunch = {
  id: string
  kind: string
  day_key: string
  starts_at?: string | null
  name: string
  campaign_id?: string | null
  campaign_name?: string | null
  campaign_type?: string | null
  campaign_status?: string | null
  client_id: string
  client_name?: string | null
  client_logo_url?: string | null
  assigned_user_id?: string | null
  assignee_name?: string | null
  event_time?: string | null
  contact_name?: string | null
  calendar_name?: string | null
  portal_path?: string | null
  [key: string]: unknown
}

export type PageGraderClientWorkspace = {
  client: PageGraderClient & Record<string, unknown>
  campaigns: PageGraderClientCampaign[]
  tasks: Array<Record<string, unknown>>
  requests: Array<Record<string, unknown>>
  launches?: PageGraderLaunch[]
  provenance: { source: 'page_grader'; generated_at: string }
}

export type PageGraderWorkResult = {
  id: string
  kind: string
  client_id: string
  url: string
  clickup_task_id?: string | null
  clickup_task_url?: string | null
  assignee_resolution: Array<{
    email: string
    status: 'mapped' | 'unmapped'
    page_grader_user_id?: string
  }>
}

export type PageGraderTaskType = {
  id: string
  label: string
  hint: string
}

export type PageGraderAssignee = {
  id: string
  name: string
  email: string | null
}

export type PageGraderClientPackage = Record<string, unknown>

export type PageGraderMetaContext = {
  client: { id: string; name: string }
  connected: boolean
  accounts: Array<{
    mapping_id: string | null
    account_db_id: string | null
    ad_account_id: string
    name: string | null
    currency: string | null
    timezone: string | null
    account_status: number | null
    active: boolean
    last_synced_at: string | null
    sync_error: string | null
    notes: string | null
  }>
  recommended_ad_account_id: string | null
  pages: Array<Record<string, unknown>>
  pixels: Array<Record<string, unknown>>
  campaigns: Array<Record<string, unknown>>
  provenance: { source: 'page_grader'; generated_at: string }
}

export type PageGraderMeetingUpsert = {
  source_meeting_id: string
  meeting_title: string
  meeting_date: string
  meeting_duration_minutes?: number | null
  attendees?: Array<Record<string, unknown>>
  source_url?: string | null
  transcript?: string | null
  summary?: string | null
  ai_summary?: string | null
  action_items?: Array<Record<string, unknown>>
  roas_space_id?: string | null
  roas_space_item_id?: string | null
  matched_by?: string
  sync_hash?: string
}

export type PageGraderMeetingResult = {
  id: string
  client_id: string
  meeting_title?: string
  meeting_date?: string
  source_url?: string | null
}

export type PageGraderAgendaSections = {
  agenda: string
  this_week?: string
  thisWeek?: string
  next_week?: string
  nextWeek?: string
  performance?: string
  performance_data?: string
  wins: string
  campaign_notes?: string
  campaignNotes?: string
  needs_blockers?: string
  needsBlockers?: string
}

export type PageGraderMeetingAgendaWrite = {
  meeting_date: string
  sections: PageGraderAgendaSections
  insert_ad_previews?: boolean
  roas_prep_item_id?: string | null
  notes?: string | null
}

export type PageGraderMeetingAgendaResult = {
  doc_id: string | null
  doc_link: string | null
  tab_id: string | null
  tab_name: string | null
  meeting_agenda_id: string | null
  source?: string | null
}

export type PageGraderMeetingPrepContext = Record<string, unknown>

export type PageGraderQcActionResult = {
  success: true
  finding_id: string
  action: 'acknowledge' | 'resolve' | 'snooze_tomorrow'
  confirmation: string
}

export function isPageGraderMetaContext(value: unknown): value is PageGraderMetaContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  const client = row.client as Record<string, unknown> | undefined
  const provenance = row.provenance as Record<string, unknown> | undefined
  return (
    typeof client?.id === 'string' &&
    typeof client.name === 'string' &&
    typeof row.connected === 'boolean' &&
    Array.isArray(row.accounts) &&
    row.accounts.every(
      (account) =>
        account &&
        typeof account === 'object' &&
        !Array.isArray(account) &&
        typeof (account as Record<string, unknown>).ad_account_id === 'string' &&
        typeof (account as Record<string, unknown>).active === 'boolean',
    ) &&
    (row.recommended_ad_account_id === null || typeof row.recommended_ad_account_id === 'string') &&
    Array.isArray(row.pages) &&
    Array.isArray(row.pixels) &&
    Array.isArray(row.campaigns) &&
    provenance?.source === 'page_grader' &&
    typeof provenance.generated_at === 'string'
  )
}
