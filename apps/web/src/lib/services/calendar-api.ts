import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export type CalendarProvider = 'google_calendar' | 'outlook'

export type CalendarAttendee = {
  name: string | null
  email: string
  status: 'accepted' | 'declined' | 'tentative' | 'needsAction' | 'unknown'
}

export type CalendarAgendaPrep = {
  status: 'pending' | 'ready' | 'failed'
  space_item_id: string
  space_id: string
  title: string | null
}

export type CalendarAgendaRelatedFollowUp = {
  id: string
  title: string
  status: string
  assignee_id?: string | null
  assignee_type?: string | null
}

export type CalendarAgendaRelatedCall = {
  space_id: string
  call_item_id: string
  title: string
  summary?: string | null
  has_transcript?: boolean
  recording_url: string | null
  follow_ups: CalendarAgendaRelatedFollowUp[]
}

export type CalendarAgendaEvent = {
  id: string
  title: string
  start: string
  end: string
  all_day: boolean
  location?: string | null
  video_url: string | null
  video_label: string | null
  html_link: string | null
  color_id: string | null
  attendees: CalendarAttendee[]
  source: CalendarProvider | 'fathom'
  ical_uid?: string | null
  account_id?: string | null
  account_label?: string | null
  prep?: CalendarAgendaPrep | null
  related?: CalendarAgendaRelatedCall | null
}

export async function runMeetingsPrecallPrepToday(input: {
  spaceId: string
  timezone?: string
  refresh?: boolean
}): Promise<{
  created: number
  refreshed: number
  skipped: number
  failed: number
  day_key: string
}> {
  // Prep writes follow the Meetings space org (resolved by the client).
  return backendPost(`/api/spaces/${input.spaceId}/precall-prep/today`, {
    timezone: input.timezone,
    refresh: input.refresh !== false,
  })
}

export async function runMeetingsPrecallPrepEvent(input: {
  spaceId: string
  calendarEventId: string
  timezone?: string
  refresh?: boolean
}): Promise<{
  calendar_event_id: string
  space_item_id: string
  title: string
  status: 'pending' | 'ready' | 'failed'
  kind: 'created' | 'refreshed' | 'skipped'
}> {
  // Prep writes follow the Meetings space org (resolved by the client).
  return backendPost(`/api/spaces/${input.spaceId}/precall-prep/event`, {
    calendar_event_id: input.calendarEventId,
    timezone: input.timezone,
    refresh: input.refresh !== false,
  })
}

export type CalendarAgendaAccount = {
  userIntegrationId: string
  composioAccountId: string
  label: string
  isDefault: boolean
  provider: CalendarProvider
}

export type CalendarAgendaResponse = {
  success: boolean
  events: CalendarAgendaEvent[]
  connected: { google_calendar: boolean; outlook: boolean }
  accounts?: CalendarAgendaAccount[]
  team_available?: boolean
  error?: string
}

export async function fetchCalendarAgenda(params: {
  start: string
  end: string
  timezone: string
  provider?: CalendarProvider
  scope?: 'personal' | 'team'
  /** Explicit org for Team Agenda / team_available; defaults to active org session. */
  orgId?: string | null
}): Promise<CalendarAgendaResponse> {
  const sp = new URLSearchParams({
    start: params.start,
    end: params.end,
    timezone: params.timezone,
  })
  if (params.provider) sp.set('provider', params.provider)
  if (params.scope) sp.set('scope', params.scope)
  const hasOrgOverride = Object.prototype.hasOwnProperty.call(params, 'orgId')
  return backendGet<CalendarAgendaResponse>(`/api/integrations/calendar/agenda?${sp.toString()}`, {
    ...(hasOrgOverride ? { orgId: params.orgId ?? null } : {}),
  })
}

export async function fetchGoogleWorkspaceStatus(orgId: string | null): Promise<{
  success: boolean
  connected: boolean
  status?: string | null
  clientEmail?: string | null
}> {
  return backendGet('/api/integrations/google-workspace/status', { orgId })
}

export type CalendarEventAttendeeInput = {
  email: string
  name?: string
  optional?: boolean
}

export type CalendarCreateEventPayload = {
  provider: CalendarProvider
  title: string
  start: string
  end: string
  timezone?: string
  description?: string | null
  location?: string | null
  attendees?: CalendarEventAttendeeInput[]
  calendar_id?: string
  create_video_meeting?: boolean
}

export type CalendarUpdateEventPayload = Partial<Omit<CalendarCreateEventPayload, 'provider'>>

export type CalendarMutationResponse = {
  success: boolean
  event?: CalendarAgendaEvent | null
  error?: string
}

export async function createCalendarEvent(
  payload: CalendarCreateEventPayload,
): Promise<CalendarMutationResponse> {
  return backendPost<CalendarMutationResponse>('/api/integrations/calendar/events', payload)
}

export async function updateCalendarEvent(
  provider: CalendarProvider,
  eventId: string,
  payload: CalendarUpdateEventPayload,
): Promise<CalendarMutationResponse> {
  return backendPatch<CalendarMutationResponse>(
    `/api/integrations/calendar/events/${provider}/${encodeURIComponent(eventId)}`,
    payload,
  )
}

export async function deleteCalendarEvent(
  provider: CalendarProvider,
  eventId: string,
  options?: { calendar_id?: string },
): Promise<CalendarMutationResponse> {
  const sp = new URLSearchParams()
  if (options?.calendar_id) sp.set('calendar_id', options.calendar_id)
  const suffix = sp.size > 0 ? `?${sp.toString()}` : ''
  return backendDelete<CalendarMutationResponse>(
    `/api/integrations/calendar/events/${provider}/${encodeURIComponent(eventId)}${suffix}`,
  )
}

export async function connectCalendarIntegration(
  integrationId: 'google_calendar' | 'outlook',
): Promise<void> {
  const redirectTo = typeof window !== 'undefined' ? window.location.href : ''
  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/proxy/integrations/composio/callback?redirect_to=${encodeURIComponent(redirectTo)}&integration_id=${encodeURIComponent(integrationId)}`
      : ''
  const res = await backendPost<{ success: boolean; redirect_url?: string; error?: string }>(
    '/api/integrations/composio/connect',
    {
      integration_id: integrationId,
      callback_url: callbackUrl || redirectTo,
      long_redirect_url: true,
    },
  )
  if (!res?.success) throw new Error(res?.error || 'Failed to start calendar connection')
  if (!res.redirect_url) throw new Error('Missing redirect URL')
  window.open(res.redirect_url, '_blank', 'noopener,noreferrer')
}
