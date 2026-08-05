import { describe, expect, it, vi } from 'vitest'
import { MeetingProviderActionsRepository } from './meeting-provider-actions.repository'

describe('MeetingProviderActionsRepository provider action dedupe', () => {
  it('merges recording actions into matching live manual rows instead of duplicating', async () => {
    const existingQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(async () => ({
        data: [
          {
            id: 'manual-1',
            title: 'Send recap to Nate',
            source_text: 'Send recap to Nate',
            source_type: 'manual',
            source_recording_id: null,
            canonical_assignee_type: null,
            canonical_assignee_id: null,
            canonical_assignee_name: null,
            canonical_assignee_email: null,
            evidence: { origin: 'manual_workspace' },
          },
        ],
        error: null,
      })),
    }
    existingQuery.select.mockReturnValue(existingQuery)
    existingQuery.eq.mockReturnValue(existingQuery)

    const updateEqMeeting = vi.fn(async () => ({ error: null }))
    const updateEqId = vi.fn(() => ({ eq: updateEqMeeting }))
    const update = vi.fn(() => ({ eq: updateEqId }))
    const upsert = vi.fn()

    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'meeting_actions') throw new Error(`Unexpected table: ${table}`)
        return {
          select: existingQuery.select,
          eq: existingQuery.eq,
          neq: existingQuery.neq,
          update,
          upsert,
        }
      }),
    }
    const repository = new MeetingProviderActionsRepository()

    const ids = await repository.upsertProviderActions(supabase as never, {
      meetingItemId: 'meeting-1',
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: 'org-1',
      recordingId: 'recording-1',
      actions: [
        {
          sourceKey: 'fathom:rec-1:action:0',
          sourceText: 'Send recap to Nate!',
          assigneeName: 'Dylan',
          assigneeEmail: 'dylan@roas.co',
          completed: false,
          recordingTimestamp: '00:12',
          recordingPlaybackUrl: 'https://fathom.example/1',
          userGenerated: false,
          raw: {},
        },
      ],
      assignees: new Map(),
    })

    expect(ids).toEqual(['manual-1'])
    expect(upsert).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        source_recording_id: 'recording-1',
        evidence: expect.objectContaining({
          cross_referenced_from: 'provider_recording',
          provider_source_key: 'fathom:rec-1:action:0',
        }),
      }),
    )
  })
})
