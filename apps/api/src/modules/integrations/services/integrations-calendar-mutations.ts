import { BadRequestException } from '@nestjs/common'

type CalendarProvider = 'google_calendar' | 'outlook'

type CalendarEventAttendeeInput = {
  email: string
  name?: string
  optional?: boolean
}

type CalendarCreateEventInput = {
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

type CalendarUpdateEventInput = Partial<CalendarCreateEventInput>

export function assertCalendarProvider(provider: string): CalendarProvider {
  const normalized = provider?.trim().toLowerCase()
  if (normalized === 'google_calendar' || normalized === 'outlook') return normalized
  throw new BadRequestException('provider must be google_calendar or outlook')
}

export function assertTimedRange(start: string, end: string): void {
  if (!isTimedDateTime(start)) {
    throw new BadRequestException('start must be a timed ISO 8601 datetime')
  }
  if (!isTimedDateTime(end)) {
    throw new BadRequestException('end must be a timed ISO 8601 datetime')
  }
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    throw new BadRequestException('start and end must be valid ISO 8601 datetimes')
  }
  if (endMs <= startMs) {
    throw new BadRequestException('end must be after start')
  }
}

export function assertOptionalTimedRange(input: CalendarUpdateEventInput): void {
  if (input.start && input.end) assertTimedRange(input.start, input.end)
  if (input.start && !isTimedDateTime(input.start)) {
    throw new BadRequestException('start must be a timed ISO 8601 datetime')
  }
  if (input.end && !isTimedDateTime(input.end)) {
    throw new BadRequestException('end must be a timed ISO 8601 datetime')
  }
}

export function isTimedDateTime(value: string): boolean {
  return Boolean(value?.trim()) && !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

export function ensureZSuffix(iso: string): string {
  if (/[zZ]$/.test(iso)) return iso
  if (/[+-]\d{2}:\d{2}$/.test(iso)) {
    const date = new Date(iso)
    if (!Number.isNaN(date.getTime())) return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
  }
  return `${iso.endsWith('Z') ? iso.slice(0, -1) : iso}Z`
}

export function normalizeProviderEventId(provider: CalendarProvider, rawEventId: string): string {
  const decoded = decodeURIComponent(rawEventId ?? '').trim()
  const prefix = provider === 'google_calendar' ? 'google:' : 'outlook:'
  const eventId = decoded.startsWith(prefix) ? decoded.slice(prefix.length) : decoded
  if (!eventId) throw new BadRequestException('eventId is required')
  return eventId
}

export function buildGoogleCreateParams(input: CalendarCreateEventInput): Record<string, unknown> {
  return compact({
    calendar_id: input.calendar_id?.trim() || 'primary',
    summary: input.title,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
    start_datetime: input.start,
    end_datetime: input.end,
    timezone: input.timezone?.trim() || 'UTC',
    attendees: buildGoogleAttendees(input.attendees),
    create_meeting_room: input.create_video_meeting === true ? true : undefined,
  })
}

export function buildGoogleUpdateParams(
  eventId: string,
  input: CalendarUpdateEventInput,
): Record<string, unknown> {
  return compact({
    calendar_id: input.calendar_id?.trim() || 'primary',
    event_id: eventId,
    summary: input.title,
    description: nullableText(input.description),
    location: nullableText(input.location),
    start_time: input.start,
    end_time: input.end,
    timezone: input.timezone?.trim() || undefined,
    attendees: buildGoogleAttendees(input.attendees),
    create_meeting_room: input.create_video_meeting === true ? true : undefined,
  })
}

export function buildOutlookCreateParams(input: CalendarCreateEventInput): Record<string, unknown> {
  const timezone = input.timezone?.trim() || 'UTC'
  return compact({
    user_id: 'me',
    subject: input.title,
    start: { dateTime: input.start, timeZone: timezone },
    end: { dateTime: input.end, timeZone: timezone },
    body:
      input.description === null || input.description === undefined
        ? undefined
        : { contentType: 'text', content: input.description },
    location:
      input.location === null || input.location === undefined
        ? undefined
        : { displayName: input.location },
    attendees: buildOutlookAttendees(input.attendees),
    isOnlineMeeting: input.create_video_meeting === true ? true : undefined,
    onlineMeetingProvider: input.create_video_meeting === true ? 'teamsForBusiness' : undefined,
  })
}

export function buildOutlookUpdateParams(
  eventId: string,
  input: CalendarUpdateEventInput,
): Record<string, unknown> {
  return compact({
    user_id: 'me',
    event_id: eventId,
    subject: input.title,
    start_datetime: input.start,
    end_datetime: input.end,
    time_zone: input.timezone?.trim() || undefined,
    body: nullableText(input.description),
    location: nullableText(input.location),
    attendees: buildOutlookAttendees(input.attendees),
    isOnlineMeeting: input.create_video_meeting === true ? true : undefined,
    onlineMeetingProvider: input.create_video_meeting === true ? 'teamsForBusiness' : undefined,
  })
}

export function buildGoogleDeleteParams(calendarId: string | undefined, eventId: string) {
  return compact({
    calendar_id: calendarId?.trim() || 'primary',
    event_id: eventId,
  })
}

export function buildOutlookDeleteParams(eventId: string) {
  return compact({
    user_id: 'me',
    event_id: eventId,
  })
}

function buildGoogleAttendees(
  attendees: CalendarEventAttendeeInput[] | undefined,
): Array<Record<string, unknown>> | undefined {
  if (!attendees || attendees.length === 0) return undefined
  return attendees.map((attendee) =>
    compact({
      email: attendee.email,
      displayName: attendee.name,
      optional: attendee.optional === true ? true : undefined,
    }),
  )
}

function buildOutlookAttendees(
  attendees: CalendarEventAttendeeInput[] | undefined,
): Array<Record<string, unknown>> | undefined {
  if (!attendees || attendees.length === 0) return undefined
  return attendees.map((attendee) =>
    compact({
      emailAddress: {
        address: attendee.email,
        name: attendee.name?.trim() || attendee.email,
      },
      type: attendee.optional === true ? 'optional' : 'required',
    }),
  )
}

function nullableText(value: string | null | undefined): string | undefined {
  if (value === null) return ''
  return value
}

function compact(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
}
