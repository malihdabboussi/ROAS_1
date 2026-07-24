import { describe, expect, it } from 'vitest'
import {
  assignRelatedCallsExclusive,
  assignSoleNearStartRelatedCalls,
  buildFathomAgendaEvent,
  callDateInAgendaWindow,
  emailFromAttendeeSlug,
  isEligiblePrecallEvent,
  localDayBounds,
  mapPrepItemToAgendaLink,
  resolvePreferredMeetingsSpaceId,
  scoreRelatedCallMatch,
} from '../meetings-precall-prep.helpers'

describe('meetings-precall-prep.helpers', () => {
  it('requires timed events with attendees or video', () => {
    expect(
      isEligiblePrecallEvent({
        id: '1',
        title: 'All day',
        start: '2026-07-16T00:00:00.000Z',
        end: '2026-07-17T00:00:00.000Z',
        all_day: true,
        video_url: null,
        attendees: [{ email: 'a@b.com' }],
      }),
    ).toBe(false)

    expect(
      isEligiblePrecallEvent({
        id: '2',
        title: 'Quick',
        start: '2026-07-16T16:00:00.000Z',
        end: '2026-07-16T16:10:00.000Z',
        all_day: false,
        video_url: 'https://meet.google.com/x',
        attendees: [],
      }),
    ).toBe(false)

    expect(
      isEligiblePrecallEvent({
        id: '3',
        title: 'Weekly',
        start: '2026-07-16T16:00:00.000Z',
        end: '2026-07-16T16:45:00.000Z',
        all_day: false,
        video_url: null,
        attendees: [{ email: 'nate@example.com', name: 'Nate' }],
      }),
    ).toBe(true)
  })

  it('maps prep item to agenda link', () => {
    expect(
      mapPrepItemToAgendaLink({
        id: 'item-1',
        space_id: 'space-1',
        title: 'Prep — Weekly',
        custom_data: { prep_status: 'ready', calendar_event_id: 'google:abc' },
      }),
    ).toEqual({
      status: 'ready',
      space_item_id: 'item-1',
      space_id: 'space-1',
      title: 'Prep — Weekly',
    })
  })

  it('reconciles pending prep to failed when task execution failed', () => {
    expect(
      mapPrepItemToAgendaLink({
        id: 'item-2',
        space_id: 'space-1',
        title: 'Prep — Stuck',
        custom_data: { prep_status: 'pending' },
        task_execution_status: 'failed',
      }).status,
    ).toBe('failed')
  })

  it('computes local day bounds', () => {
    const { dayKey, startIso, endIso } = localDayBounds(
      new Date('2026-07-16T20:00:00.000Z'),
      'America/Los_Angeles',
    )
    expect(dayKey).toBe('2026-07-16')
    expect(new Date(startIso).getTime()).toBeLessThan(new Date(endIso).getTime())
  })

  it('prefers the organization Meetings space and falls back to personal', async () => {
    const meetings = (id: string) => [
      {
        id,
        title: 'Meetings',
        schema: { icon: 'video', fields: [{ id: 'entry_type' }] },
      },
    ]
    const orgResult = await resolvePreferredMeetingsSpaceId({
      orgId: 'org-1',
      loadSpaces: async (orgId) => meetings(orgId ? 'org-meetings' : 'personal-meetings'),
    })
    expect(orgResult).toBe('org-meetings')

    const fallbackResult = await resolvePreferredMeetingsSpaceId({
      orgId: 'org-1',
      loadSpaces: async (orgId) => (orgId ? [] : meetings('personal-meetings')),
    })
    expect(fallbackResult).toBe('personal-meetings')
  })

  it('scores related call matches by attendee overlap and time', () => {
    const event = {
      id: 'google:1',
      title: 'Nate Tilley & Dylan — Weekly Check-In',
      start: '2026-07-16T23:00:00.000Z',
      end: '2026-07-16T23:45:00.000Z',
      all_day: false,
      video_url: 'https://meet.google.com/x',
      attendees: [
        { email: 'nate@example.com', name: 'Nate' },
        { email: 'dylan@dylanvanas.com', name: 'Dylan' },
      ],
    }
    expect(
      scoreRelatedCallMatch(event, {
        title: 'Nate Tilley weekly',
        call_date: '2026-07-16T23:05:00.000Z',
        attendees: ['Nate Tilley <nate@example.com>', 'dylan@dylanvanas.com'],
      }),
    ).toBeGreaterThanOrEqual(20)
    expect(
      scoreRelatedCallMatch(event, {
        title: 'Unrelated',
        call_date: '2026-07-16T23:05:00.000Z',
        attendees: ['other@example.com'],
      }),
    ).toBe(0)
  })

  it('does not match when only a shared attendee overlaps', () => {
    const rajEvent = {
      id: 'google:raj',
      title: 'Dylan Vanas and Raj | Zoom Call',
      start: '2026-07-21T18:00:00.000Z',
      end: '2026-07-21T18:30:00.000Z',
      all_day: false,
      video_url: 'https://www.dylanvanas.com/zoom',
      attendees: [
        { email: 'rajivsankarlall@gmail.com', name: null },
        { email: 'dylan@dylanvanas.com', name: null },
      ],
    }
    expect(
      scoreRelatedCallMatch(rajEvent, {
        title: 'Nate and Dylan ops priorities and AM support workflow',
        call_date: '2026-07-21T18:05:00.000Z',
        attendees: ['nate@example.com', 'dylan@dylanvanas.com'],
      }),
    ).toBe(0)
  })

  it('does not match on wrong title with weak attendee overlap', () => {
    const event = {
      id: 'google:2',
      title: 'Dylan Vanas and Raj | Zoom Call',
      start: '2026-07-21T18:00:00.000Z',
      end: '2026-07-21T18:30:00.000Z',
      all_day: false,
      video_url: null,
      attendees: [
        { email: 'rajivsankarlall@gmail.com', name: null },
        { email: 'dylan@dylanvanas.com', name: null },
      ],
    }
    expect(
      scoreRelatedCallMatch(event, {
        title: 'Completely different ops priorities meeting',
        call_date: '2026-07-21T18:10:00.000Z',
        attendees: ['dylan@dylanvanas.com'],
      }),
    ).toBe(0)
  })

  it('rejects calls outside the event time window', () => {
    const event = {
      id: 'google:3',
      title: 'Nate Tilley & Dylan — Weekly Check-In',
      start: '2026-07-21T18:00:00.000Z',
      end: '2026-07-21T18:30:00.000Z',
      all_day: false,
      video_url: null,
      attendees: [
        { email: 'nate@example.com', name: 'Nate' },
        { email: 'dylan@dylanvanas.com', name: 'Dylan' },
      ],
    }
    expect(
      scoreRelatedCallMatch(event, {
        title: 'Nate Tilley & Dylan — Weekly Check-In',
        call_date: '2026-07-21T12:00:00.000Z',
        attendees: ['nate@example.com', 'dylan@dylanvanas.com'],
      }),
    ).toBe(0)
  })

  it('assigns each Fathom call to at most one calendar event', () => {
    const assigned = assignRelatedCallsExclusive([
      { eventId: 'raj', callId: 'nate-call', score: 25 },
      { eventId: 'nate', callId: 'nate-call', score: 55 },
      { eventId: 'other', callId: 'other-call', score: 40 },
    ])
    expect(assigned.get('nate')).toBe('nate-call')
    expect(assigned.has('raj')).toBe(false)
    expect(assigned.get('other')).toBe('other-call')
  })

  it('parses Fathom attendee slugs into emails', () => {
    expect(emailFromAttendeeSlug('att_dylan_dylanvanas_com')).toBe('dylan@dylanvanas.com')
    expect(emailFromAttendeeSlug('att_speaker_1')).toBeNull()
  })

  it('attaches unmatched AI-titled Fathom calls to the sole near-start invite', () => {
    const assigned = assignSoleNearStartRelatedCalls({
      events: [
        {
          id: 'google:joey',
          start: '2026-07-21T23:30:00.000Z',
        },
      ],
      calls: [
        {
          id: 'mortgage',
          call_date: '2026-07-21T23:33:11.000Z',
        },
      ],
      alreadyAssigned: new Map(),
    })
    expect(assigned.get('google:joey')).toBe('mortgage')
  })

  it('does not sole-near-start attach when two invites compete', () => {
    const assigned = assignSoleNearStartRelatedCalls({
      events: [
        { id: 'raj', start: '2026-07-21T18:00:00.000Z' },
        { id: 'nate', start: '2026-07-21T18:05:00.000Z' },
      ],
      calls: [{ id: 'nate-call', call_date: '2026-07-21T18:03:00.000Z' }],
      alreadyAssigned: new Map(),
    })
    expect(assigned.size).toBe(0)
  })

  it('builds a Fathom-only agenda row for unmatched calls', () => {
    const row = buildFathomAgendaEvent({
      spaceId: 'space-1',
      callItemId: 'call-1',
      title: 'Weekly sync',
      callDate: '2026-07-16T23:00:00.000Z',
      recordingUrl: 'https://fathom.video/x',
    })
    expect(row.source).toBe('fathom')
    expect(row.id).toBe('fathom:call-1')
    expect(row.related.call_item_id).toBe('call-1')
    expect(row.video_label).toBe('Fathom')
    expect(new Date(row.end).getTime()).toBeGreaterThan(new Date(row.start).getTime())
  })

  it('filters call dates to the agenda window', () => {
    expect(
      callDateInAgendaWindow(
        '2026-07-16T12:00:00.000Z',
        '2026-07-16T00:00:00.000Z',
        '2026-07-17T00:00:00.000Z',
      ),
    ).toBe(true)
    expect(
      callDateInAgendaWindow(
        '2026-07-15T12:00:00.000Z',
        '2026-07-16T00:00:00.000Z',
        '2026-07-17T00:00:00.000Z',
      ),
    ).toBe(false)
  })
})
