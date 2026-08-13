import { describe, expect, it } from 'vitest'
import {
  assignRelatedCallsExclusive,
  assignSoleNearStartRelatedCalls,
  buildGoogleDocTabLink,
  buildMeetingAgendaEvent,
  buildPrecallPrompt,
  buildRelatedCallCandidates,
  callDateInAgendaWindow,
  emailFromAttendeeSlug,
  isEligiblePrecallEvent,
  localDayBounds,
  mapPrepItemToAgendaLink,
  matchUniqueClientByEventTitle,
  parsePrepDocToAgendaSections,
  RELATED_CALL_RECORDING_BONUS,
  resolveAgendaCallSummary,
  resolveAgendaExternalRecordingId,
  resolveAgendaHasTranscript,
  resolveAgendaRecordingUrl,
  resolvePreferredMeetingsSpaceId,
  scoreRelatedCallMatch,
  toAgendaRelatedCall,
  validateMeetingReadyAgendaSections,
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
      agenda_doc_link: null,
      agenda_tab_id: null,
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

  it('rewards recording presence only after the match gates pass', () => {
    const event = {
      id: 'google:rec',
      title: 'Nate Tilley & Dylan — Weekly Check-In',
      start: '2026-07-16T23:00:00.000Z',
      end: '2026-07-16T23:45:00.000Z',
      all_day: false,
      video_url: null,
      attendees: [
        { email: 'nate@example.com', name: 'Nate' },
        { email: 'dylan@dylanvanas.com', name: 'Dylan' },
      ],
    }
    const call = {
      title: 'Nate Tilley & Dylan — Weekly Check-In',
      call_date: '2026-07-16T23:05:00.000Z',
      attendees: ['nate@example.com', 'dylan@dylanvanas.com'],
    }
    const withRecording = scoreRelatedCallMatch(event, { ...call, has_recording: true })
    const withoutRecording = scoreRelatedCallMatch(event, call)
    expect(withRecording - withoutRecording).toBe(RELATED_CALL_RECORDING_BONUS)

    expect(
      scoreRelatedCallMatch(event, {
        title: 'Unrelated',
        call_date: '2026-07-16T23:05:00.000Z',
        attendees: ['other@example.com'],
        has_recording: true,
      }),
    ).toBe(0)
  })

  it('scores the recording-bearing call row above its recording-less duplicate', () => {
    const event = {
      id: 'google:dup',
      title: 'Nate Tilley & Dylan — Weekly Check-In',
      start: '2026-07-16T23:00:00.000Z',
      end: '2026-07-16T23:45:00.000Z',
      all_day: false,
      video_url: null,
      attendees: [
        { email: 'nate@example.com', name: 'Nate' },
        { email: 'dylan@dylanvanas.com', name: 'Dylan' },
      ],
    }
    const shared = {
      title: 'Nate Tilley & Dylan — Weekly Check-In',
      custom_data: {
        call_date: '2026-07-16T23:05:00.000Z',
        attendees: ['nate@example.com', 'dylan@dylanvanas.com'],
      },
    }
    const candidates = buildRelatedCallCandidates(
      [event],
      [
        { id: 'call-stub', ...shared },
        {
          id: 'call-fathom',
          ...shared,
          custom_data: { ...shared.custom_data, recording_url: 'https://fathom.video/calls/123' },
        },
      ],
    )
    const byCall = new Map(candidates.map((c) => [c.callId, c.score]))
    expect(byCall.get('call-fathom')!).toBeGreaterThan(byCall.get('call-stub')!)
  })

  it('populates external_recording_id from external automation metadata', () => {
    expect(resolveAgendaExternalRecordingId({ external_automation: { meeting_id: 987654 } })).toBe(
      '987654',
    )
    expect(
      resolveAgendaExternalRecordingId({ external_automation: { meeting_id: ' rec-1 ' } }),
    ).toBe('rec-1')
    expect(resolveAgendaExternalRecordingId({ external_automation: {} })).toBeNull()
    expect(resolveAgendaExternalRecordingId(null)).toBeNull()

    const related = toAgendaRelatedCall({
      call: {
        id: 'call-1',
        space_id: 'space-1',
        title: 'Weekly sync',
        custom_data: {
          recording_url: 'https://fathom.video/calls/123',
          external_automation: { meeting_id: 987654 },
        },
      },
      followUps: [],
    })
    expect(related.external_recording_id).toBe('987654')

    const bare = toAgendaRelatedCall({
      call: { id: 'call-2', space_id: 'space-1', custom_data: {} },
      followUps: [],
    })
    expect(bare.external_recording_id).toBeNull()
  })

  it('carries the external recording id onto synthetic agenda rows', () => {
    const row = buildMeetingAgendaEvent({
      spaceId: 'space-1',
      callItemId: 'call-1',
      title: 'Weekly sync',
      callDate: '2026-07-16T23:00:00.000Z',
      recordingUrl: 'https://fathom.video/calls/123',
      externalRecordingId: '987654',
    })
    expect(row.related.external_recording_id).toBe('987654')
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

  it('matches a clearly identified call that was pushed later the same day', () => {
    expect(
      scoreRelatedCallMatch(
        {
          id: 'calendar-john',
          title: 'Dylan Vanas and John Hyland | Zoom Call',
          start: '2026-08-05T21:30:00.000Z',
          end: '2026-08-05T22:00:00.000Z',
          all_day: false,
          video_url: null,
          location: null,
          attendees: [
            { email: 'dylan@example.com', name: 'Dylan' },
            { email: 'john@example.com', name: 'John' },
          ],
        },
        {
          title: 'Dylan and John Zoom call',
          call_date: '2026-08-06T00:00:00.000Z',
          attendees: ['dylan@example.com', 'john@example.com'],
        },
      ),
    ).toBeGreaterThan(0)
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
    const row = buildMeetingAgendaEvent({
      spaceId: 'space-1',
      callItemId: 'call-1',
      title: 'Weekly sync',
      callDate: '2026-07-16T23:00:00.000Z',
      recordingUrl: 'https://fathom.video/x',
      summary: 'Align on launch readiness.',
      hasTranscript: true,
    })
    expect(row.source).toBe('fathom')
    expect(row.id).toBe('fathom:call-1')
    expect(row.related.call_item_id).toBe('call-1')
    expect(row.related.summary).toBe('Align on launch readiness.')
    expect(row.related.has_transcript).toBe(true)
    expect(row.video_label).toBe('Fathom')
    expect(new Date(row.end).getTime()).toBeGreaterThan(new Date(row.start).getTime())
  })

  it('builds a Meetings agenda row before an impromptu call receives its recording', () => {
    const row = buildMeetingAgendaEvent({
      spaceId: 'space-1',
      callItemId: 'call-instant',
      title: 'Impromptu call',
      callDate: '2026-07-30T17:00:00.000Z',
      source: 'manual',
      recordingUrl: null,
    })

    expect(row.source).toBe('manual')
    expect(row.id).toBe('meeting:call-instant')
    expect(row.account_label).toBe('Meetings')
    expect(row.video_label).toBeNull()
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

  it('resolves recording url from recording_url or fathom_url', () => {
    expect(resolveAgendaRecordingUrl({ recording_url: 'https://fathom.video/a' })).toBe(
      'https://fathom.video/a',
    )
    expect(resolveAgendaRecordingUrl({ fathom_url: 'https://fathom.video/b' })).toBe(
      'https://fathom.video/b',
    )
    expect(resolveAgendaRecordingUrl({ recording_url: 'not-a-url' })).toBeNull()
  })

  it('keeps short summaries and drops transcript-like descriptions', () => {
    expect(
      resolveAgendaCallSummary({
        description: null,
        custom: { summary: 'Bridge AM and builders.' },
      }),
    ).toBe('Bridge AM and builders.')
    expect(
      resolveAgendaCallSummary({
        description: `${'x'.repeat(2000)}\nDylan: hello\nNate: hi`,
        custom: {},
      }),
    ).toBeNull()
  })

  it('flags transcript availability from custom_data or legacy description', () => {
    expect(
      resolveAgendaHasTranscript({
        description: null,
        custom: { transcript_text: 'Dylan: hi' },
      }),
    ).toBe(true)
    expect(
      resolveAgendaHasTranscript({
        description: 'Short purpose note',
        custom: {},
      }),
    ).toBe(false)
  })

  it('parses prep markdown into Drive agenda sections', () => {
    const sections = parsePrepDocToAgendaSections(`## What's on the agenda?
- Review lead quality
- Review new creative

## What we worked on this week
- Launched the new landing page

## What we're working on next week
- Launch the approved creative test

## Raw performance data
- Funnel: 59 leads at $11.88 CPL

## Wins
- CPL down 12%

## Campaign notes
- Evergreen scaling

## Needs / blockers
- Need offer approval
`)
    expect(sections.agenda).toContain('Review lead quality')
    expect(sections.this_week).toContain('landing page')
    expect(sections.next_week).toContain('creative test')
    expect(sections.performance).toContain('59 leads')
    expect(sections.wins).toContain('CPL down')
    expect(sections.campaign_notes).toContain('Evergreen')
    expect(sections.needs_blockers).toContain('offer approval')
  })

  it('accepts the common campaign recommendations heading variant', () => {
    const sections = parsePrepDocToAgendaSections(`## Campaign Notes / Recommendations
- Webinar: 42 leads at $18 CPL from Aug 5–11; hold budget through the event.`)

    expect(sections.campaign_notes).toContain('42 leads at $18 CPL')
  })

  it('parses the rich HTML body produced by save_document', () => {
    const sections =
      parsePrepDocToAgendaSections(`<h2>What's on the agenda?</h2><ol><li>Review lead quality and targeting.</li></ol>
<h2>What we worked on this week</h2><ul><li>Launched the new testimonial creative.</li></ul>
<h2>What we're working on next week</h2><ul><li>Scale the winning testimonial creative.</li></ul>
<h2>Performance</h2><ul><li>Meta snapshot Aug 3–9: $4,200 spend, 84 leads, $50 CPL; CPL increased 18% week over week.</li></ul>
<h2>Wins</h2><ul><li>New testimonial creative produced 14 qualified leads.</li></ul>
<h2>Campaign notes</h2><ul><li>Evergreen prospecting: shift 20% of budget to the testimonial ad.</li></ul>
<h2>Needs / blockers</h2><ul><li>Client — approve webinar angle — Aug 14.</li></ul>`)

    expect(sections.agenda).toContain('lead quality and targeting')
    expect(sections.performance).toContain('$4,200 spend')
    expect(sections.campaign_notes).toContain('shift 20%')
    expect(validateMeetingReadyAgendaSections(sections)).toEqual([])
  })

  it('frames the prep as a screen-share-ready client meeting and preserves operator notes', () => {
    const prompt = buildPrecallPrompt({
      event: {
        id: 'pg-agenda:client-1:2026-08-17T17:00:00.000Z',
        title: 'Acme — Meeting',
        start: '2026-08-17T17:00:00.000Z',
        end: '2026-08-17T18:00:00.000Z',
        all_day: false,
        video_url: null,
        operator_notes: 'Resolve the offer decision and agree the launch owner.',
        attendees: [{ name: 'Acme' }],
      },
      pageGraderClientName: 'Acme',
      pageGraderContext: '{"latest_meta_performance":{"available":true}}',
    })

    expect(prompt).toContain('screen-shared with the client')
    expect(prompt).toContain('Resolve the offer decision')
    expect(prompt).toContain("## What's on the agenda?")
    expect(prompt).toContain('## What we worked on this week')
    expect(prompt).toContain("## What we're working on next week")
    expect(prompt).toContain('Do not add timestamps')
    expect(prompt).toContain('Never mention another client')
    expect(prompt).not.toContain('say exactly which source is unavailable')
  })

  it('rejects a polished template filled with lazy placeholders', () => {
    const sections = parsePrepDocToAgendaSections(`## What's on the agenda?
- 0–5 minutes: Review weekly performance
## What we worked on this week
- No current CRM source was supplied
## What we're working on next week
- Lock commitments and measurement
## Performance
- See Portal Meta dashboards for the latest week
## Wins
- (none captured)
## Campaign notes
- (none captured)
## Needs / blockers
- Discuss blockers`)

    expect(validateMeetingReadyAgendaSections(sections).length).toBeGreaterThan(0)
  })

  it('accepts a concise client-ready agenda without source caveats or meeting theatre', () => {
    const sections = parsePrepDocToAgendaSections(`## What's on the agenda?
- Weekly progress recap
- Campaign performance
- Next week's priorities
## What we worked on this week
- Launched three new static ads into the established funnel campaign.
## What we're working on next week
- Review early creative results and move budget toward the strongest ads.
## Raw performance data
- Established funnel: 59 leads at $11.88 CPL on $700.92 spend.
## Wins
- Lead costs stayed stable while the account produced 193 leads.
## Campaign notes / recommendations
- Keep the established funnel running and introduce the approved creative before scaling.
## Needs / blockers
- Creative approval is the only item needed to keep testing on schedule.`)

    expect(validateMeetingReadyAgendaSections(sections)).toEqual([])
  })

  it('builds a Google Docs native-tab link without duplicating the prefix', () => {
    expect(
      buildGoogleDocTabLink(
        'https://docs.google.com/document/d/doc-id/edit?usp=drivesdk#tab=t.old',
        't.new-tab',
      ),
    ).toBe('https://docs.google.com/document/d/doc-id/edit?usp=drivesdk&tab=t.new-tab')
  })

  it('matches a unique client name in the event title', () => {
    expect(
      matchUniqueClientByEventTitle('Acme Corp Weekly Sync', [
        { id: '1', name: 'Acme Corp' },
        { id: '2', name: 'Beta Inc' },
      ]),
    ).toEqual({ id: '1', name: 'Acme Corp' })
    expect(
      matchUniqueClientByEventTitle('Weekly Sync', [
        { id: '1', name: 'Acme Corp' },
        { id: '2', name: 'Beta Inc' },
      ]),
    ).toBeNull()
  })
})
