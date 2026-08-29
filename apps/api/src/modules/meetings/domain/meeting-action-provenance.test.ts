import { describe, expect, it } from 'vitest'
import { attachFathomActionEvidence, summarizeActionProvenance } from './meeting-action-provenance'

describe('meeting action provenance', () => {
  it('attaches the nearest transcript turn to a timestamped Fathom action', () => {
    const actions = attachFathomActionEvidence({
      actions: [
        {
          sourceKey: 'fathom:rec-1:action:0',
          sourceText: 'Send Curtis the revised proposal',
          assigneeName: 'Dylan',
          assigneeEmail: null,
          recordingTimestamp: '00:42',
          recordingPlaybackUrl: 'https://fathom.video/share/rec-1?t=42',
          completed: false,
          userGenerated: false,
          raw: {},
        },
      ],
      transcript: [
        { speakerName: 'Curtis', speakerEmail: null, timestamp: '00:10', text: 'Hello.' },
        {
          speakerName: 'Dylan',
          speakerEmail: 'dylan@example.com',
          timestamp: '00:41',
          text: 'I will send you the revised proposal this afternoon.',
        },
      ],
    })

    expect(actions[0]?.evidence).toEqual({
      sourceKind: 'meeting_transcript',
      excerpt: 'Dylan: I will send you the revised proposal this afternoon.',
      speakerName: 'Dylan',
      timestamp: '00:41',
      transcriptTurnIndex: 1,
    })
  })

  it('falls back to provider summary evidence when no transcript turn exists', () => {
    const actions = attachFathomActionEvidence({
      actions: [
        {
          sourceKey: 'fathom:rec-1:summary-action:0',
          sourceText: 'Send the revised proposal',
          assigneeName: null,
          assigneeEmail: null,
          recordingTimestamp: null,
          recordingPlaybackUrl: null,
          completed: false,
          userGenerated: false,
          raw: { source: 'summary_next_steps', line: '- Send the revised proposal' },
        },
      ],
      transcript: [],
    })

    expect(actions[0]?.evidence).toEqual({
      sourceKind: 'meeting_summary',
      excerpt: 'Send the revised proposal',
      speakerName: null,
      timestamp: null,
      transcriptTurnIndex: null,
    })
  })

  it('reports sourced and missing action coverage', () => {
    expect(
      summarizeActionProvenance([
        { evidence: { action_provenance: { source_kind: 'meeting_transcript' } } },
        { evidence: { action_provenance: { source_kind: 'manual_note' } } },
        { evidence: {} },
      ]),
    ).toEqual({
      total_actions: 3,
      sourced_actions: 2,
      missing_source_actions: 1,
      coverage_percent: 67,
      by_source_kind: { meeting_transcript: 1, manual_note: 1 },
    })
  })
})
