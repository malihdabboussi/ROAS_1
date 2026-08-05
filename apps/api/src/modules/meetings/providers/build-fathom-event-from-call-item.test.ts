import { describe, expect, it } from 'vitest'
import { buildFathomEventFromCallItem } from './build-fathom-event-from-call-item'

describe('buildFathomEventFromCallItem', () => {
  it('builds an ingest event from Fathom custom_data', () => {
    const event = buildFathomEventFromCallItem({
      title: 'Weekly sync',
      source: 'fathom',
      custom_data: {
        recording_url: 'https://fathom.video/calls/1',
        summary: 'Ship the launch.',
        call_date: '2026-08-04T17:00:00.000Z',
        external_automation: {
          provider: 'fathom',
          meeting_id: '170082749',
          transcript_entries: [{ text: 'Hello', speaker: { display_name: 'Dylan' } }],
        },
      },
    })

    expect(event).toMatchObject({
      recording_id: '170082749',
      title: 'Weekly sync',
      url: 'https://fathom.video/calls/1',
      summary: 'Ship the launch.',
    })
    expect(Array.isArray(event?.transcript)).toBe(true)
  })

  it('returns null for calendar-only call items without a Fathom id', () => {
    expect(
      buildFathomEventFromCallItem({
        title: 'AARON X DYLAN X NATE',
        source: 'calendar',
        custom_data: {
          entry_type: 'call',
          calendar_event_id: 'google:abc',
          call_date: '2026-08-04T17:00:00.000Z',
        },
      }),
    ).toBeNull()
  })
})
