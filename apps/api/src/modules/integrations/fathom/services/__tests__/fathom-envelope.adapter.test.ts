import { describe, expect, it } from 'vitest'
import { buildFathomEnvelope } from '../fathom-envelope.adapter'

const fullEvent = {
  id: 'meeting_1',
  title: 'Strategy call',
  started_at: '2026-06-10T10:00:00.000Z',
  recorded_by: { email: 'Host@Example.com', name: 'Host Person' },
  calendar_invitees: [
    { email: 'host@example.com', name: 'Host Person' },
    { email: 'Client@Example.com', matched_speaker_display_name: 'Client One' },
  ],
  transcript: [
    { speaker: { display_name: 'Host Person' }, text: 'Welcome to the call', timestamp: '1' },
    { speaker: { display_name: 'Client One' }, text: 'I want help scaling', timestamp: '2' },
    { speaker: { display_name: 'Client One' }, text: '', timestamp: '3' },
  ],
}

describe('buildFathomEnvelope', () => {
  it('builds a v1 fathom envelope with transcript, participants, and window', () => {
    const envelope = buildFathomEnvelope(fullEvent, 'meeting_1')

    expect(envelope).not.toBeNull()
    expect(envelope?.v).toBe(1)
    expect(envelope?.channel).toBe('fathom')
    expect(envelope?.source_id).toBe('meeting_1')
    expect(envelope?.title).toBe('Strategy call')
    expect(envelope?.window.from).toBe('2026-06-10T10:00:00.000Z')
    expect(envelope?.content.format).toBe('transcript')
    expect(envelope?.content.text).toBe(
      'Host Person: Welcome to the call\nClient One: I want help scaling',
    )
    expect(envelope?.content.message_count).toBe(2)
  })

  it('tags the recorded_by attendee as team and others as unknown with lowercased email identifiers', () => {
    const envelope = buildFathomEnvelope(fullEvent, 'meeting_1')

    const host = envelope?.participants.find((p) => p.role === 'team')
    const client = envelope?.participants.find((p) => p.role === 'unknown')

    expect(host?.identifiers).toEqual([{ kind: 'email', value: 'host@example.com' }])
    expect(client?.identifiers).toEqual([{ kind: 'email', value: 'client@example.com' }])
    expect(client?.name).toBe('Client One')
  })

  it('falls back to meeting_title and recorded_at', () => {
    const envelope = buildFathomEnvelope(
      {
        ...fullEvent,
        title: undefined,
        meeting_title: 'Fallback title',
        started_at: undefined,
        recorded_at: '2026-06-09T09:00:00.000Z',
      },
      'meeting_2',
    )

    expect(envelope?.title).toBe('Fallback title')
    expect(envelope?.window.from).toBe('2026-06-09T09:00:00.000Z')
  })

  it('returns null when the event has no usable transcript', () => {
    expect(buildFathomEnvelope({ ...fullEvent, transcript: undefined }, 'meeting_3')).toBeNull()
    expect(buildFathomEnvelope({ ...fullEvent, transcript: [] }, 'meeting_3')).toBeNull()
    expect(
      buildFathomEnvelope(
        {
          ...fullEvent,
          transcript: [{ speaker: { display_name: 'A' }, text: '   ' }],
        },
        'meeting_3',
      ),
    ).toBeNull()
  })

  it('handles events without calendar invitees', () => {
    const envelope = buildFathomEnvelope(
      { ...fullEvent, calendar_invitees: undefined },
      'meeting_4',
    )
    expect(envelope).not.toBeNull()
    expect(envelope?.participants).toEqual([])
  })
})
