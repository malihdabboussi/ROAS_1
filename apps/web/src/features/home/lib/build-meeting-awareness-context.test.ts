import { describe, expect, it } from 'vitest'
import type {
  MeetingWorkspaceBundle,
  MeetingWorkspaceRecord,
} from '@/features/home/services/meeting-workspace-api'
import { buildMeetingAwarenessContext } from './build-meeting-awareness-context'

function bundle(
  phase: MeetingWorkspaceRecord['phase'],
  overrides?: Partial<MeetingWorkspaceBundle>,
): MeetingWorkspaceBundle {
  return {
    meeting: {
      id: 'meeting-1',
      title: 'Strategy call',
      description: null,
      custom_data: {},
    },
    workspace: {
      meeting_item_id: 'meeting-1',
      phase,
      conversation_id: 'conversation-1',
      agenda_doc_item_id: null,
      notes_doc_item_id: null,
      recap_doc_item_id: null,
      live_started_at: null,
    },
    recordings: [],
    actions: [],
    snippets: [],
    deliverables: [],
    context_links: [],
    continuity: { prior_meeting_item_id: null, unresolved_commitments: [] },
    ...overrides,
  }
}

describe('buildMeetingAwarenessContext', () => {
  it('forces short brain-dump replies while the call is live', () => {
    const context = buildMeetingAwarenessContext({
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      title: 'Strategy call',
      bundle: bundle('live'),
    })

    expect(context).toContain('LIVE CALL MODE')
    expect(context).toContain('1–3 short bullets')
    expect(context).toContain('Do not write essays')
    expect(context).toContain('Meeting phase: live')
  })

  it('does not force live brain-dump mode after the call ends', () => {
    const context = buildMeetingAwarenessContext({
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      title: 'Strategy call',
      bundle: bundle('processing'),
    })

    expect(context).not.toContain('LIVE CALL MODE')
    expect(context).toContain('Meeting phase: processing')
    expect(context).toContain('Prefer concise answers')
  })

  it('when recordings are empty, steers to Recordings + first then optional Fathom tools', () => {
    const context = buildMeetingAwarenessContext({
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      title: 'Aaron x Dylan x Nate',
      bundle: bundle('processing'),
    })

    expect(context).toContain('Linked recordings: none yet')
    expect(context).toContain('Recordings +')
    expect(context).toContain('list_meetings')
    expect(context).toContain('get_transcript')
    expect(context).toContain('Do not invent a vague “check now” clarification')
    expect(context).toContain('do not say “Fathom isn’t connected”')
  })

  it('lists linked recordings when present', () => {
    const context = buildMeetingAwarenessContext({
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      title: 'Aaron x Dylan x Nate',
      bundle: bundle('complete', {
        recordings: [
          {
            id: 'rec-1',
            title: 'Aaron x Dylan x Nate',
            provider: 'fathom',
            external_recording_id: 'fathom-99',
            recording_url: 'https://fathom.video/calls/99',
            duration_seconds: 1800,
            is_primary: true,
            provider_summary: null,
            transcript_doc_item_id: null,
          },
        ],
      }),
    })

    expect(context).toContain('Linked recordings (1)')
    expect(context).toContain('external_id=fathom-99')
    expect(context).not.toContain('Linked recordings: none yet')
  })

  it('steers agenda prep to the editable Space Doc on the right', () => {
    const context = buildMeetingAwarenessContext({
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      title: 'Meeting W/ Nate',
      bundle: bundle('scheduled', {
        workspace: {
          meeting_item_id: 'meeting-1',
          phase: 'scheduled',
          conversation_id: 'conversation-1',
          agenda_doc_item_id: 'agenda-doc-1',
          notes_doc_item_id: null,
          recap_doc_item_id: null,
          live_started_at: null,
        },
      }),
    })

    expect(context).toContain('space_item_id=agenda-doc-1')
    expect(context).toContain('update_document')
    expect(context).toContain('Do not only use a draft fence')
  })
})
