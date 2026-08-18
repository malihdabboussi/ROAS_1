import type { GoogleWorkspaceAgendaEvent } from '../google-workspace/types/google-workspace.types'
import type { CalendarConnectionRef } from './integrations-calendar-connections'
import type { CalendarAgendaEvent } from './integrations-calendar.service'

export function workspaceIdentityAgendaLabel(identity: {
  display_name?: string | null
  calendar_email?: string | null
}): string {
  return identity.display_name?.trim() || identity.calendar_email?.trim() || 'Teammate'
}

export function mapWorkspaceEventToAgendaEvent(
  identity: { id: string; display_name?: string | null; calendar_email?: string | null },
  event: GoogleWorkspaceAgendaEvent,
  accountLabel?: string,
): CalendarAgendaEvent {
  const videoUrl = event.video_url
  let videoLabel: string | null = null
  if (videoUrl) {
    if (videoUrl.includes('zoom.us')) videoLabel = 'Zoom'
    else if (videoUrl.includes('teams.microsoft')) videoLabel = 'Teams'
    else if (videoUrl.includes('meet.google')) videoLabel = 'Google Meet'
    else videoLabel = 'Meet'
  }
  const label = accountLabel ?? workspaceIdentityAgendaLabel(identity)
  return {
    id: `workspace:${identity.id}:${event.id}`,
    title: event.title,
    start: event.start,
    end: event.end,
    all_day: event.all_day,
    location: event.location,
    description: event.description,
    video_url: videoUrl,
    video_label: videoLabel,
    html_link: event.html_link,
    color_id: null,
    attendees: event.attendees.map((attendee) => ({
      name: attendee.name,
      email: attendee.email,
      status: 'unknown' as const,
    })),
    source: 'google_calendar',
    account_id: identity.id,
    account_label: label,
    prep: null,
    related: null,
    ...(event.ical_uid ? { ical_uid: event.ical_uid } : {}),
  }
}

export function workspaceIdentityAccount(identity: {
  id: string
  calendar_email: string
  display_name?: string | null
}): CalendarConnectionRef {
  return {
    userIntegrationId: identity.id,
    composioAccountId: identity.calendar_email,
    label: workspaceIdentityAgendaLabel(identity),
    isDefault: false,
    provider: 'google_calendar',
  }
}
