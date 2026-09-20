import { describe, expect, it } from 'vitest'
import { normalizeMappedMeetingSource } from '../mapped-meeting-source'
import { NoteTakerDefinitionInputSchema } from '../note-taker-definition.schema'
import { NOTE_TAKER_TEMPLATES } from '../note-taker-templates'
import { suggestFieldMap } from '../suggest-field-map'

const readAiSample = {
  session_id: 'S1',
  trigger: 'meeting_end',
  request_id: 'req-1',
  title: 'Kickoff',
  start_time: '2026-01-01T00:00:00Z',
  end_time: '2026-01-01T01:00:00Z',
  participants: [{ name: 'Ana', email: 'ana@example.com' }],
  owner: { name: 'Host', email: 'host@example.com' },
  summary: 'A summary long enough to count as a summary of the call.',
  action_items: [{ text: 'Send the deck' }],
  report_url: 'https://app.read.ai/r/S1',
  transcript: {
    speaker_blocks: [{ start_time: 0, end_time: 5, speaker: { name: 'Host' }, words: 'Welcome' }],
    speakers: [{ name: 'Host' }],
  },
}

describe('suggestFieldMap', () => {
  it('maps a Read AI style report end to end', () => {
    const suggestion = suggestFieldMap(readAiSample)
    expect(suggestion.missing).toEqual([])
    expect(suggestion.fieldMap).toEqual({
      externalId: 'session_id',
      title: 'title',
      startTime: 'start_time',
      endTime: 'end_time',
      hostEmail: 'owner.email',
      sourceUrl: 'report_url',
      summary: 'summary',
      participants: { path: 'participants[]', email: 'email', name: 'name' },
      transcript: {
        path: 'transcript.speaker_blocks[]',
        text: 'words',
        speaker: 'speaker.name',
        timestamp: 'start_time',
      },
      actions: { path: 'action_items[]', text: 'text' },
    })
    expect(suggestion.event).toEqual({
      eventTypePath: 'trigger',
      acceptValues: ['meeting_end'],
      deliveryIdPath: 'request_id',
    })
    expect(suggestion.detected.length).toBeGreaterThan(5)

    // The suggestion is a working definition: run it through the normalizer.
    const source = normalizeMappedMeetingSource(readAiSample, {
      slug: 'nt_test',
      displayName: 'Test',
      fieldMap: suggestion.fieldMap as never,
    })
    expect(source.transcript).toEqual([
      { speakerName: 'Host', speakerEmail: null, timestamp: '0', text: 'Welcome' },
    ])
    expect(source.participantEmails).toEqual(['host@example.com', 'ana@example.com'])
  })

  it('handles a flat payload with different names, string lists and epoch times', () => {
    const suggestion = suggestFieldMap({
      id: 42,
      event_type: 'transcript.ready',
      name: 'Weekly sync',
      started_at: 1700000000,
      ended_at: 1700003600,
      host_email: 'lead@example.com',
      attendees: ['a@example.com', 'b@example.com'],
      utterances: [{ speaker_name: 'A', content: 'hi', offset: 12 }],
      todos: ['Ship it'],
      link: 'https://tool.example.com/m/42',
    })
    expect(suggestion.fieldMap).toMatchObject({
      externalId: 'id',
      title: 'name',
      startTime: 'started_at',
      endTime: 'ended_at',
      hostEmail: 'host_email',
      sourceUrl: 'link',
      participants: { path: 'attendees[]' },
      transcript: {
        path: 'utterances[]',
        text: 'content',
        speaker: 'speaker_name',
        timestamp: 'offset',
      },
      actions: { path: 'todos[]', text: 'text' },
    })
    expect(suggestion.event).toEqual({
      eventTypePath: 'event_type',
      acceptValues: ['transcript.ready'],
    })
    expect(suggestion.missing).toEqual([])
  })

  it('reports what it could not find instead of guessing', () => {
    const suggestion = suggestFieldMap({ hello: 'world', items: [1, 2, 3] })
    expect(suggestion.fieldMap).toEqual({})
    expect(suggestion.missing).toEqual(['externalId', 'transcript'])
    expect(suggestion.detected).toEqual([])
  })

  it('does not mistake a list without text for the transcript', () => {
    const suggestion = suggestFieldMap({
      meeting_id: 'm1',
      participants: [{ email: 'x@example.com' }],
      chapters: [{ title: 'Intro' }],
    })
    expect(suggestion.fieldMap.transcript).toBeUndefined()
    expect(suggestion.missing).toEqual(['transcript'])
  })
})

describe('NOTE_TAKER_TEMPLATES', () => {
  it('every template is a valid definition once a name is added', () => {
    for (const template of NOTE_TAKER_TEMPLATES) {
      const parsed = NoteTakerDefinitionInputSchema.safeParse({
        displayName: template.label,
        ...template.definition,
      })
      expect(parsed.success, template.key).toBe(true)
    }
  })

  it('the Read AI template maps the Read AI sample', () => {
    const template = NOTE_TAKER_TEMPLATES.find((t) => t.key === 'read_ai_report')!
    const source = normalizeMappedMeetingSource(readAiSample, {
      slug: 'nt_read',
      displayName: 'Read',
      fieldMap: template.definition.fieldMap,
    })
    expect(source.externalRecordingId).toBe('S1')
    expect(source.transcript).toHaveLength(1)
    expect(source.actions.map((a) => a.sourceText)).toEqual(['Send the deck'])
  })
})
