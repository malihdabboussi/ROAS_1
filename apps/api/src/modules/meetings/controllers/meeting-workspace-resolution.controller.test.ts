import { describe, expect, it } from 'vitest'
import { ScheduledMeetingSchema } from './meeting-workspace-resolution.controller'

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

  it('continues to reject timestamps without timezone information', () => {
    expect(() =>
      ScheduledMeetingSchema.parse({
        ...scheduledMeeting,
        start: '2026-07-29T11:00:00',
      }),
    ).toThrow()
  })
})
