import { describe, expect, it } from 'vitest'
import { normalizeReadAiMeetingSource } from '../read-ai-meeting-source'

// The example payload from support.read.ai "Getting Started with Webhooks".
const payload = {
  session_id: 'SESSIONID',
  trigger: 'meeting_end',
  title: 'Meeting Title',
  start_time: '2026-01-01T00:00:00Z',
  end_time: '2026-01-01T01:00:00Z',
  participants: [
    {
      name: 'Participant One',
      first_name: 'Participant',
      last_name: 'One',
      email: 'participant_one@company.com',
    },
    { name: 'Participant Two', first_name: 'Participant', last_name: 'Two', email: null },
  ],
  owner: {
    name: 'Participant One',
    first_name: 'Participant',
    last_name: 'One',
    email: 'Participant_One@Company.com',
  },
  summary: 'Meeting summary goes here...',
  action_items: [{ text: 'Action item one' }, { text: 'Action item two' }],
  key_questions: [{ text: 'Key question one?' }, { text: 'Key question two?' }],
  topics: [{ text: 'Topic one' }, { text: 'Topic two' }],
  report_url: 'https://app.read.ai/analytics/meetings/SESSIONID',
  chapter_summaries: [
    {
      title: 'Chapter one',
      description: 'First chapter description',
      topics: [{ text: 'Topic one' }],
    },
    {
      title: 'Chapter two',
      description: 'Second chapter description',
      topics: [{ text: 'Topic two' }],
    },
  ],
  transcript: {
    speaker_blocks: [
      {
        start_time: String(Date.parse('2026-01-01T00:00:00Z') + 5_000),
        end_time: '1',
        speaker: { name: 'Speaker 1' },
        words: 'Good morning everyone!',
      },
      {
        start_time: String(Date.parse('2026-01-01T00:00:00Z') + 65_000),
        end_time: '2',
        speaker: { name: 'Speaker 2' },
        words: 'Hi!',
      },
      { start_time: '3', end_time: '4', speaker: { name: 'Speaker 2' }, words: '   ' },
    ],
    speakers: [{ name: 'Speaker 1' }, { name: 'Speaker 2' }],
  },
  platform_meeting_id: 'abc-defg-hij',
  platform: 'meet',
  request_id: '01KKVQZ19X57NMNFTS8YXJNZE4',
}

describe('normalizeReadAiMeetingSource', () => {
  it('maps the documented meeting_end payload into the shared transcript event', () => {
    const source = normalizeReadAiMeetingSource(payload)
    expect(source.provider).toBe('read_ai')
    expect(source.kind).toBe('meeting')
    expect(source.externalRecordingId).toBe('SESSIONID')
    expect(source.providerMeetingId).toBe('abc-defg-hij')
    expect(source.title).toBe('Meeting Title')
    expect(source.recordingStart).toBe('2026-01-01T00:00:00.000Z')
    expect(source.recordingEnd).toBe('2026-01-01T01:00:00.000Z')
    expect(source.durationSeconds).toBe(3600)
    expect(source.sourceUrl).toBe('https://app.read.ai/analytics/meetings/SESSIONID')
    expect(source.recordingUrl).toBeNull()
    expect(source.hostEmail).toBe('participant_one@company.com')
    expect(source.participantEmails).toEqual(['participant_one@company.com'])
  })

  it('turns speaker blocks into turns with offsets from the meeting start and skips empty words', () => {
    const source = normalizeReadAiMeetingSource(payload)
    expect(source.transcript).toEqual([
      {
        speakerName: 'Speaker 1',
        speakerEmail: null,
        timestamp: '00:05',
        text: 'Good morning everyone!',
      },
      { speakerName: 'Speaker 2', speakerEmail: null, timestamp: '01:05', text: 'Hi!' },
    ])
  })

  it('builds the summary from summary, chapters, key questions and topics', () => {
    const source = normalizeReadAiMeetingSource(payload)
    expect(source.providerSummary).toBe(
      [
        'Meeting summary goes here...',
        'Chapters:\n- Chapter one: First chapter description\n- Chapter two: Second chapter description',
        'Key questions:\n- Key question one?\n- Key question two?',
        'Topics: Topic one, Topic two',
      ].join('\n\n'),
    )
  })

  it('maps action items to unowned actions with stable keys', () => {
    const source = normalizeReadAiMeetingSource(payload)
    expect(source.actions.map((a) => [a.sourceKey, a.sourceText, a.assigneeName])).toEqual([
      ['read_ai:SESSIONID:action:0', 'Action item one', null],
      ['read_ai:SESSIONID:action:1', 'Action item two', null],
    ])
  })

  it('requires a session id', () => {
    expect(() => normalizeReadAiMeetingSource({ title: 'x' })).toThrow(/session_id/)
  })
})
