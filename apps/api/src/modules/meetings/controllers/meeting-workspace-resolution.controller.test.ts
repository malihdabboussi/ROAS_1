import { describe, expect, it } from 'vitest'
import {
  InstantMeetingSchema,
  ScheduledMeetingSchema,
} from './meeting-workspace-resolution.controller'

const scheduledMeeting = {
  calendar_event_id: 'google:event-1',
  title: 'ROAS - Impact Elite Coaching',
  start: '2026-07-29T11:00:00-07:00',
  end: '2026-07-29T11:45:00-07:00',
  attendees: [],
}

describe('ScheduledMeetingSchema', () => {
  it('accepts calendar timestamps with timezone offsets and normalizes them to UTC', () => {
    const parsed = ScheduledMeetingSchema.parse(scheduledMeeting)

    expect(parsed.start).toBe('2026-07-29T18:00:00.000Z')
    expect(parsed.end).toBe('2026-07-29T18:45:00.000Z')
  })

  it('accepts the stable ical_uid natural key and keeps it optional', () => {
    expect(
      ScheduledMeetingSchema.parse({ ...scheduledMeeting, ical_uid: 'uid-1@google.com' }).ical_uid,
    ).toBe('uid-1@google.com')
    expect(ScheduledMeetingSchema.parse({ ...scheduledMeeting, ical_uid: null }).ical_uid).toBe(
      null,
    )
    expect(ScheduledMeetingSchema.parse(scheduledMeeting).ical_uid).toBeUndefined()
  })

  it('accepts an organizer host identity', () => {
    expect(
      ScheduledMeetingSchema.parse({
        ...scheduledMeeting,
        organizer: { email: 'dylan@roas.co', name: 'Dylan' },
      }).organizer,
    ).toEqual({ email: 'dylan@roas.co', name: 'Dylan' })
  })

  it('continues to reject timestamps without timezone information', () => {
    expect(() =>
      ScheduledMeetingSchema.parse({
        ...scheduledMeeting,
        start: '2026-07-29T11:00:00',
      }),
    ).toThrow()
  })
})

describe('InstantMeetingSchema', () => {
  it('accepts a titled impromptu call with optional participant emails', () => {
    expect(
      InstantMeetingSchema.parse({
        title: 'Client strategy call',
        attendee_emails: ['client@example.com'],
      }),
    ).toEqual({
      title: 'Client strategy call',
      attendee_emails: ['client@example.com'],
    })
  })

  it('defaults the title and participants for a one-click call', () => {
    expect(InstantMeetingSchema.parse({})).toEqual({
      title: 'Impromptu call',
      attendee_emails: [],
    })
  })
})
