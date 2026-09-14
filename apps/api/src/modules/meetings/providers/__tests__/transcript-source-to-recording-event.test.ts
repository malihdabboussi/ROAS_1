import { describe, expect, it } from 'vitest'
import { normalizeFathomMeetingSource } from '../fathom-meeting-source'
import { normalizeFirefliesMeetingSource } from '../fireflies-meeting-source'
import { normalizeReadAiMeetingSource } from '../read-ai-meeting-source'
import { readEmbeddedSource, toRecordingEvent } from '../transcript-source-to-recording-event'

describe('toRecordingEvent', () => {
  it('passes a Fathom event through untouched and embeds the normalized source', () => {
    const raw = {
      recording_id: 'rec_1',
      title: 'Call',
      recorded_by: { email: 'host@example.com', name: 'Host' },
      transcript: [{ speaker: { display_name: 'Host' }, text: 'hi', timestamp: '1' }],
      some_fathom_only_field: true,
    }
    const source = normalizeFathomMeetingSource(raw)
    const event = toRecordingEvent(source)
    expect(event).toMatchObject({ ...raw, provider: 'fathom' })
    expect(readEmbeddedSource(event)).toBe(source)
  })

  it('bridges a Fireflies transcript into the Fathom-shaped fields the Meetings route reads', () => {
    const source = normalizeFirefliesMeetingSource({
      id: 'ff_1',
      title: 'Pricing sync',
      date: 1_760_000_000_000,
      duration: 10,
      host_email: 'host@example.com',
      participants: ['client@example.com'],
      sentences: [{ speaker_name: 'Host', text: 'Welcome', start_time: 0 }],
      summary: { overview: 'Agreed.', action_items: ['**Nate**', '- Send the deck (01:00)'] },
    })
    const event = toRecordingEvent(source)
    expect(event).toMatchObject({
      provider: 'fireflies',
      id: 'ff_1',
      recording_id: 'ff_1',
      title: 'Pricing sync',
      recording_start_time: new Date(1_760_000_000_000).toISOString(),
      recorded_by: { email: 'host@example.com' },
      calendar_invitees: [{ email: 'host@example.com' }, { email: 'client@example.com' }],
      transcript: [{ speaker: { display_name: 'Host' }, text: 'Welcome', timestamp: '00:00' }],
      default_summary: { markdown_formatted: 'Agreed.' },
      action_items: [
        { description: 'Send the deck', assignee: { name: 'Nate', email: '' }, completed: false },
      ],
    })
    expect(readEmbeddedSource(event)?.provider).toBe('fireflies')
  })

  it('bridges a Read AI report and keeps the report link as the recording url', () => {
    const source = normalizeReadAiMeetingSource({
      session_id: 'S1',
      title: 'Standup',
      report_url: 'https://app.read.ai/analytics/meetings/S1',
      owner: { email: 'owner@example.com' },
      transcript: { speaker_blocks: [{ speaker: { name: 'A' }, words: 'hello' }] },
    })
    const event = toRecordingEvent(source)
    expect(event).toMatchObject({
      provider: 'read_ai',
      recording_id: 'S1',
      url: 'https://app.read.ai/analytics/meetings/S1',
      recorded_by: { email: 'owner@example.com' },
    })
  })

  it('readEmbeddedSource returns null for events without a valid embedded source', () => {
    expect(readEmbeddedSource({ recording_id: 'x' })).toBeNull()
    expect(readEmbeddedSource({ transcript_source: { provider: 'fathom' } })).toBeNull()
    expect(readEmbeddedSource(null)).toBeNull()
  })
})
