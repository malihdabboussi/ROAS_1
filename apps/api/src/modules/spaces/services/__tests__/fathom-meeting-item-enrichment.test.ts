import { describe, expect, it } from 'vitest'
import {
  collectFathomAttendeesWithEmail,
  isHostOnlyAttendeeList,
  resolveFathomAttendeeLabels,
  upsertAttendeeTagOptions,
} from '../fathom-meeting-item-enrichment'
import {
  fallbackCeoMeetingTitle,
  provisionalFathomMeetingTitle,
  sanitizeCeoMeetingTitle,
  stripMeetingTitlePrefix,
} from '../fathom-meeting-title'

describe('fathom-meeting-item-enrichment', () => {
  it('treats host-only invitee lists as incomplete', () => {
    expect(
      isHostOnlyAttendeeList(
        [{ name: 'Dylan Vanas', email: 'dylan@dylanvanas.com' }],
        'dylan@dylanvanas.com',
      ),
    ).toBe(true)
    expect(
      isHostOnlyAttendeeList(
        [
          { name: 'Dylan Vanas', email: 'dylan@dylanvanas.com' },
          { name: 'Yasir Khan', email: 'yasir@example.com' },
        ],
        'dylan@dylanvanas.com',
      ),
    ).toBe(false)
  })

  it('defaults to transcript speakers even when invitees include multiple people', () => {
    const result = resolveFathomAttendeeLabels({
      attendees: [
        { name: 'Dylan Vanas', email: 'dylan@dylanvanas.com' },
        { name: 'Yasir Khan', email: 'yasir@example.com' },
        { name: 'Calendar Ghost', email: 'ghost@example.com' },
      ],
      transcript: [
        { speaker: { display_name: 'Dylan Vanas' }, text: 'Hey' },
        { speaker: { display_name: 'Nate Tilley' }, text: 'Quick update' },
        { speaker: { display_name: 'Dylan Vanas' }, text: 'Cool' },
        { speaker: { display_name: 'Starting transcription...' }, text: 'noise' },
      ],
      recordedByEmail: 'dylan@dylanvanas.com',
    })
    expect(result.usedSpeakers).toBe(true)
    expect(result.labels).toEqual(['Dylan Vanas', 'Nate Tilley'])
  })

  it('falls back to invitees when transcript speakers are unavailable', () => {
    const result = resolveFathomAttendeeLabels({
      attendees: [
        { name: 'Dylan Vanas', email: 'dylan@dylanvanas.com' },
        { name: 'Yasir Khan', email: 'yasir@example.com' },
      ],
      transcript: [{ speaker: { display_name: 'Speaker 2' }, text: 'Hi' }],
      recordedByEmail: 'dylan@dylanvanas.com',
    })
    expect(result.usedSpeakers).toBe(false)
    expect(result.labels).toEqual(['Dylan Vanas', 'Yasir Khan'])
  })

  it('parses Carol <> Dylan style titles when speakers and invitees are weak', () => {
    const result = resolveFathomAttendeeLabels({
      attendees: [{ name: 'Dylan Vanas', email: 'dylan@dylanvanas.com' }],
      transcript: [{ speaker: { display_name: 'Speaker 2' }, text: 'Hi' }],
      recordedByEmail: 'dylan@dylanvanas.com',
      titleHint: 'Carol <> Dylan',
    })
    expect(result.usedSpeakers).toBe(true)
    expect(result.labels).toEqual(['Carol', 'Dylan'])
  })

  it('collects unique attendees that have emails for People upsert', () => {
    expect(
      collectFathomAttendeesWithEmail([
        { name: 'Dylan Vanas', email: 'dylan@dylanvanas.com' },
        { name: 'Nate Tilley', email: 'nate@example.com' },
        { name: 'Speaker Only' },
        { name: 'Nate Dup', email: 'nate@example.com' },
      ]),
    ).toEqual([
      { email: 'dylan@dylanvanas.com', first_name: 'Dylan', last_name: 'Vanas' },
      { email: 'nate@example.com', first_name: 'Nate', last_name: 'Tilley' },
    ])
  })

  it('upserts multi_select attendee options and returns ids', () => {
    const schema = {
      fields: [{ id: 'attendees', type: 'multi_select', options: [] }],
    }
    const first = upsertAttendeeTagOptions(schema, ['Dylan Vanas', 'Nate Tilley'])
    expect(first.optionsChanged).toBe(true)
    expect(first.optionIds).toHaveLength(2)
    const second = upsertAttendeeTagOptions(first.nextSchema, ['Dylan Vanas', 'Yasir Khan'])
    expect(second.optionIds).toHaveLength(2)
    expect(second.optionsChanged).toBe(true)
    const attendeesField = (second.nextSchema?.fields as Array<{ options: unknown[] }>)[0]
    expect(attendeesField.options).toHaveLength(3)
  })

  it('strips Meeting:/Fathom prefixes and sanitizes CEO titles', () => {
    expect(stripMeetingTitlePrefix('Meeting: Weekly client update')).toBe('Weekly client update')
    expect(stripMeetingTitlePrefix('Fathom meeting: Sales call')).toBe('Sales call')
    expect(provisionalFathomMeetingTitle('Impromptu Zoom Meeting')).toBe('Call (naming…)')
    expect(provisionalFathomMeetingTitle('Meeting: ROAS - Yasir Khan')).toBe('ROAS - Yasir Khan')
    expect(sanitizeCeoMeetingTitle('Meeting: Sales call — Jason attention')).toBe(
      'Sales call — Jason attention',
    )
    expect(sanitizeCeoMeetingTitle('Impromptu Zoom Meeting')).toBeNull()
    expect(sanitizeCeoMeetingTitle('Here')).toBeNull()
    expect(sanitizeCeoMeetingTitle('Direct')).toBeNull()
    expect(sanitizeCeoMeetingTitle('{"title":"Nope"}')).toBeNull()
  })

  it('falls back to Meeting Purpose when AI naming is unavailable', () => {
    expect(
      fallbackCeoMeetingTitle({
        summary:
          'Meeting Purpose\n\nReview weekly wins and set personal goals for the upcoming week.\n\nKey Takeaways\n\n- Major Client Wins',
        calendarTitle: 'Impromptu Zoom Meeting',
        attendees: [{ name: 'Dylan Vanas' }],
      }),
    ).toBe('Review weekly wins and set personal goals for the upcoming week')
  })
})
