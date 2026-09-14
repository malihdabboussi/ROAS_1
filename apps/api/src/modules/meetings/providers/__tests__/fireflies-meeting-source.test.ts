import { describe, expect, it } from 'vitest'
import { normalizeFirefliesMeetingSource } from '../fireflies-meeting-source'

const transcript = {
  id: 'ff_1',
  title: 'Pricing sync',
  date: 1_760_000_000_000,
  duration: 30,
  transcript_url: 'https://app.fireflies.ai/view/ff_1',
  video_url: 'https://cdn.fireflies.ai/ff_1.mp4',
  host_email: 'Host@Example.com',
  organizer_email: 'host@example.com',
  participants: ['client@example.com', 'not-an-email'],
  meeting_attendees: [{ email: 'Second@Example.com', displayName: 'Second' }],
  sentences: [
    { index: 0, speaker_name: 'Host', text: 'Welcome everyone', start_time: 1.2, end_time: 3 },
    { index: 1, speaker_name: 'Client', text: 'We need a new price', start_time: 65, end_time: 70 },
    { index: 2, speaker_name: 'Client', text: '   ', start_time: 71, end_time: 72 },
  ],
  summary: {
    overview: 'The team agreed to revisit pricing.',
    keywords: ['pricing', 'renewal'],
    action_items: '**Nate**\n- Send the deck (12:34)\n**Dylan**\n- Book follow-up (40:02)',
  },
}

describe('normalizeFirefliesMeetingSource', () => {
  it('maps a Fireflies transcript into the shared transcript event', () => {
    const source = normalizeFirefliesMeetingSource(transcript)

    expect(source.provider).toBe('fireflies')
    expect(source.kind).toBe('meeting')
    expect(source.externalRecordingId).toBe('ff_1')
    expect(source.title).toBe('Pricing sync')
    expect(source.recordingStart).toBe(new Date(1_760_000_000_000).toISOString())
    expect(source.recordingEnd).toBe(new Date(1_760_000_000_000 + 30 * 60 * 1000).toISOString())
    expect(source.durationSeconds).toBe(1800)
    expect(source.recordingUrl).toBe('https://cdn.fireflies.ai/ff_1.mp4')
    expect(source.sourceUrl).toBe('https://app.fireflies.ai/view/ff_1')
    expect(source.mediaUrl).toBeNull()
    expect(source.hostEmail).toBe('host@example.com')
    expect(source.participantEmails).toEqual([
      'host@example.com',
      'client@example.com',
      'second@example.com',
    ])
  })

  it('turns sentences into speaker turns with clock timestamps and drops blank lines', () => {
    const source = normalizeFirefliesMeetingSource(transcript)
    expect(source.transcript).toEqual([
      { speakerName: 'Host', speakerEmail: null, timestamp: '00:01', text: 'Welcome everyone' },
      {
        speakerName: 'Client',
        speakerEmail: null,
        timestamp: '01:05',
        text: 'We need a new price',
      },
    ])
  })

  it('builds a provider summary from overview and keywords', () => {
    const source = normalizeFirefliesMeetingSource(transcript)
    expect(source.providerSummary).toBe(
      'The team agreed to revisit pricing.\n\nKeywords: pricing, renewal',
    )
  })

  it('parses the formatted action-items block into owned actions', () => {
    const source = normalizeFirefliesMeetingSource(transcript)
    expect(source.actions.map((a) => [a.assigneeName, a.sourceText, a.sourceKey])).toEqual([
      ['Nate', 'Send the deck', 'fireflies:ff_1:action:0'],
      ['Dylan', 'Book follow-up', 'fireflies:ff_1:action:1'],
    ])
  })

  it('accepts action items given as a list', () => {
    const source = normalizeFirefliesMeetingSource({
      ...transcript,
      summary: { action_items: ['Send the contract', 'Schedule QBR'] },
    })
    expect(source.actions.map((a) => a.sourceText)).toEqual(['Send the contract', 'Schedule QBR'])
    expect(source.providerSummary).toBeNull()
  })

  it('points mediaUrl at the audio when no sentences were returned', () => {
    const source = normalizeFirefliesMeetingSource({
      ...transcript,
      sentences: [],
      video_url: undefined,
      audio_url: 'https://cdn.fireflies.ai/ff_1.mp3',
    })
    expect(source.transcript).toEqual([])
    expect(source.mediaUrl).toBe('https://cdn.fireflies.ai/ff_1.mp3')
  })

  it('requires a transcript id', () => {
    expect(() => normalizeFirefliesMeetingSource({ title: 'x' })).toThrow(/id is required/)
  })
})
