import { describe, expect, it } from 'vitest'
import { normalizeFathomMeetingSource } from '../fathom-meeting-source'
import { buildTranscriptEnvelope } from '../transcript-envelope'

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

describe('buildTranscriptEnvelope', () => {
  it('builds a v1 envelope from a normalized transcript with participants and window', () => {
    const envelope = buildTranscriptEnvelope(normalizeFathomMeetingSource(fullEvent))

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

  it('tags the host as team and everyone else as unknown with lowercased email identifiers', () => {
    const envelope = buildTranscriptEnvelope(normalizeFathomMeetingSource(fullEvent))

    const host = envelope?.participants.find((p) => p.role === 'team')
    const client = envelope?.participants.find((p) => p.role === 'unknown')

    expect(host?.identifiers).toEqual([{ kind: 'email', value: 'host@example.com' }])
    expect(client?.identifiers).toEqual([{ kind: 'email', value: 'client@example.com' }])
    expect(client?.name).toBe('Client One')
  })

  it('returns null when the transcript has no usable text', () => {
    expect(
      buildTranscriptEnvelope(normalizeFathomMeetingSource({ ...fullEvent, transcript: [] })),
    ).toBeNull()
    expect(
      buildTranscriptEnvelope(
        normalizeFathomMeetingSource({
          ...fullEvent,
          transcript: [{ speaker: { display_name: 'A' }, text: '   ' }],
        }),
      ),
    ).toBeNull()
  })

  it('handles events without calendar invitees', () => {
    const envelope = buildTranscriptEnvelope(
      normalizeFathomMeetingSource({ ...fullEvent, calendar_invitees: undefined }),
    )
    expect(envelope).not.toBeNull()
    expect(envelope?.participants).toEqual([
      { role: 'team', name: null, identifiers: [{ kind: 'email', value: 'host@example.com' }] },
    ])
  })
})
