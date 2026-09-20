import { describe, expect, it } from 'vitest'
import { normalizeMappedMeetingSource, summarizeMappedSource } from '../mapped-meeting-source'
import type { NoteTakerFieldMap } from '../note-taker-definition.schema'

// A Read-AI-shaped report mapped through a definition instead of the Read AI plug-in.
const readAiLikeMap: NoteTakerFieldMap = {
  externalId: 'session_id',
  title: 'title',
  startTime: 'start_time',
  endTime: 'end_time',
  hostEmail: 'owner.email',
  sourceUrl: 'report_url',
  summary: 'summary',
  participants: { path: 'participants[]', email: 'email' },
  transcript: { path: 'transcript.speaker_blocks[]', speaker: 'speaker.name', text: 'words' },
  actions: { path: 'action_items[]', text: 'text' },
}

const readAiLikePayload = {
  session_id: 'S1',
  title: 'Kickoff',
  start_time: '2026-01-01T00:00:00Z',
  end_time: '2026-01-01T00:30:00Z',
  owner: { email: 'Host@Example.com' },
  report_url: 'https://app.example.com/r/S1',
  summary: 'We agreed on the plan.',
  participants: [{ email: 'a@example.com' }, { email: null }, { email: 'Host@Example.com' }],
  transcript: {
    speaker_blocks: [
      { speaker: { name: 'Host' }, words: 'Welcome' },
      { speaker: { name: 'Guest' }, words: '   ' },
      { speaker: { name: 'Guest' }, words: 'Thanks' },
    ],
  },
  action_items: [{ text: 'Send the deck' }, { text: '' }],
}

const definition = { slug: 'nt_otter' as const, displayName: 'Otter', fieldMap: readAiLikeMap }

describe('normalizeMappedMeetingSource', () => {
  it('maps a nested payload onto the shared transcript shape', () => {
    const source = normalizeMappedMeetingSource(readAiLikePayload, definition)
    expect(source).toMatchObject({
      provider: 'nt_otter',
      providerDisplayName: 'Otter',
      kind: 'meeting',
      externalRecordingId: 'S1',
      title: 'Kickoff',
      hostEmail: 'host@example.com',
      sourceUrl: 'https://app.example.com/r/S1',
      recordingStart: '2026-01-01T00:00:00.000Z',
      recordingEnd: '2026-01-01T00:30:00.000Z',
      durationSeconds: 1800,
      providerSummary: 'We agreed on the plan.',
    })
    expect(source.participantEmails).toEqual(['host@example.com', 'a@example.com'])
    expect(source.transcript).toEqual([
      { speakerName: 'Host', speakerEmail: null, timestamp: null, text: 'Welcome' },
      { speakerName: 'Guest', speakerEmail: null, timestamp: null, text: 'Thanks' },
    ])
    expect(source.actions).toHaveLength(1)
    expect(source.actions[0]).toMatchObject({
      sourceKey: 'nt_otter:S1:action:0',
      sourceText: 'Send the deck',
      raw: { text: 'Send the deck' },
    })
    expect(source.raw).toBe(readAiLikePayload)
  })

  it('handles flat payloads, string lists, epoch times and missing optionals', () => {
    const flatMap: NoteTakerFieldMap = {
      externalId: 'id',
      startTime: 'started',
      endTime: 'ended',
      participants: { path: 'emails[]' },
      transcript: { path: 'lines[]', text: 'said', speaker: 'who', timestamp: 'at' },
      actions: { path: 'todos[]', text: 'text' },
    }
    const source = normalizeMappedMeetingSource(
      {
        id: 7,
        started: 1700000000,
        ended: '1700000600000',
        emails: ['P@Example.com', 'not-an-email'],
        lines: [{ who: 'A', said: 'hi', at: '00:01' }, { said: 'no speaker' }],
        todos: ['Ship it', ''],
      },
      { slug: 'nt_flat', displayName: 'Flat', fieldMap: flatMap },
    )
    expect(source.externalRecordingId).toBe('7')
    expect(source.title).toBe('Untitled Meeting')
    expect(source.recordingStart).toBe('2023-11-14T22:13:20.000Z')
    expect(source.recordingEnd).toBe('2023-11-14T22:23:20.000Z')
    expect(source.durationSeconds).toBe(600)
    expect(source.participantEmails).toEqual(['p@example.com'])
    expect(source.transcript).toEqual([
      { speakerName: 'A', speakerEmail: null, timestamp: '00:01', text: 'hi' },
      { speakerName: 'Speaker', speakerEmail: null, timestamp: null, text: 'no speaker' },
    ])
    expect(source.actions.map((a) => a.sourceText)).toEqual(['Ship it'])
    expect(source.hostEmail).toBeNull()
    expect(source.providerSummary).toBeNull()
  })

  it('throws when the meeting id path finds nothing', () => {
    expect(() => normalizeMappedMeetingSource({ title: 'x' }, definition)).toThrow(
      /no meeting id at "session_id"/,
    )
  })

  it('summarizes a source for the admin preview without the raw body', () => {
    const summary = summarizeMappedSource(
      normalizeMappedMeetingSource(readAiLikePayload, definition),
    )
    expect(summary).toEqual({
      externalId: 'S1',
      title: 'Kickoff',
      recordingStart: '2026-01-01T00:00:00.000Z',
      recordingEnd: '2026-01-01T00:30:00.000Z',
      hostEmail: 'host@example.com',
      participantEmails: ['host@example.com', 'a@example.com'],
      transcriptTurns: 2,
      firstTurn: { speakerName: 'Host', speakerEmail: null, timestamp: null, text: 'Welcome' },
      actions: ['Send the deck'],
      summaryPreview: 'We agreed on the plan.',
      sourceUrl: 'https://app.example.com/r/S1',
    })
    expect(JSON.stringify(summary)).not.toContain('speaker_blocks')
  })
})
