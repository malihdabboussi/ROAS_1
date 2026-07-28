import { describe, expect, it } from 'vitest'
import {
  normalizeFathomMeetingSource,
  renderFathomTranscriptDocument,
} from './fathom-meeting-source'

describe('Fathom meeting source normalization', () => {
  it('preserves recording windows, participants, summary, and stable provider actions', () => {
    const source = normalizeFathomMeetingSource({
      recording_id: 'rec-1',
      title: 'Client strategy',
      url: 'https://fathom.video/share/rec-1',
      scheduled_start_time: '2026-07-28T17:00:00.000Z',
      scheduled_end_time: '2026-07-28T18:00:00.000Z',
      recording_start_time: '2026-07-28T17:01:00.000Z',
      recording_end_time: '2026-07-28T17:51:00.000Z',
      calendar_invitees: [
        { email: 'Dylan@DylanVanas.com', name: 'Dylan Vanas' },
        { email: 'alex@example.com', name: 'Alex Rivera' },
        { email: 'alex@example.com', name: 'Alex' },
      ],
      default_summary: {
        template_name: 'General',
        markdown_formatted: '## Key takeaways\nStrong meeting.',
      },
      action_items: [
        {
          description: 'Dylan to send the revised page',
          recording_timestamp: '00:42:10',
          recording_playback_url: 'https://fathom.video/share/rec-1?t=2530',
          assignee: { name: 'Dylan', email: 'dylan@dylanvanas.com' },
        },
      ],
      transcript: [
        {
          speaker: {
            display_name: 'Alex Rivera',
            matched_calendar_invitee_email: 'alex@example.com',
          },
          timestamp: '00:00:10',
          text: 'Let us review the page.',
        },
      ],
    })

    expect(source.externalRecordingId).toBe('rec-1')
    expect(source.durationSeconds).toBe(3000)
    expect(source.participantEmails).toEqual(['dylan@dylanvanas.com', 'alex@example.com'])
    expect(source.providerSummary).toContain('Key takeaways')
    expect(source.actions).toEqual([
      expect.objectContaining({
        sourceKey: 'fathom:rec-1:action:0',
        sourceText: 'Dylan to send the revised page',
        assigneeName: 'Dylan',
        assigneeEmail: 'dylan@dylanvanas.com',
        recordingTimestamp: '00:42:10',
      }),
    ])
  })

  it('renders every supplied transcript turn and escapes provider text', () => {
    const transcript = Array.from({ length: 500 }, (_, index) => ({
      speaker: { display_name: index % 2 === 0 ? 'Alex <Admin>' : 'Dylan & Team' },
      timestamp: `00:${String(index).padStart(2, '0')}`,
      text: `Turn ${index}: <script>alert("x")</script> & context`,
    }))
    const source = normalizeFathomMeetingSource({
      id: 'rec-long',
      title: 'Long call',
      transcript,
    })

    const document = renderFathomTranscriptDocument(source)

    expect(source.transcript).toHaveLength(500)
    expect(document).toContain('Turn 0')
    expect(document).toContain('Turn 499')
    expect(document).not.toContain('<script>')
    expect(document).toContain('&lt;script&gt;')
    expect(document).toContain('Alex &lt;Admin&gt;')
    expect(document).toContain('Dylan &amp; Team')
  })

  it('does not invent a duration when provider timestamps are invalid', () => {
    const source = normalizeFathomMeetingSource({
      call_id: 'rec-invalid',
      title: 'Invalid timestamp call',
      recording_start_time: 'invalid',
      recording_end_time: '2026-07-28T17:30:00.000Z',
    })

    expect(source.durationSeconds).toBeNull()
  })
})
