import { describe, expect, it } from 'vitest'
import type { MeetingAction } from '@/features/home/services/meeting-workspace-api'
import { meetingActionToTaskRollupItem } from './meeting-action-to-task-rollup'

function action(overrides: Partial<MeetingAction> = {}): MeetingAction {
  return {
    id: 'action-1',
    title: 'Send recap to Nate',
    source_type: 'provider',
    status: 'confirmed',
    canonical_assignee_name: 'Nate Tilley',
    canonical_assignee_email: null,
    evidence: { origin: 'meetings_space_follow_up' },
    ...overrides,
  }
}

describe('meetingActionToTaskRollupItem', () => {
  it('maps follow-up fields onto the All Tasks row contract', () => {
    const item = meetingActionToTaskRollupItem(
      action({
        task_status: 'logged',
        priority: 'high',
        due_at: '2026-08-31T16:59:00.000Z',
        assignee_type: 'human',
        assignee_id: 'user-1',
        assignees: [{ type: 'human', id: 'user-1' }],
      }),
      { spaceId: 'space-1', spaceTitle: 'Meetings', campaignName: 'General' },
    )

    expect(item).toEqual(
      expect.objectContaining({
        id: 'action-1',
        title: 'Send recap to Nate',
        status: 'logged',
        priority: 'high',
        due_at: '2026-08-31T16:59:00.000Z',
        assignee_id: 'user-1',
        space_id: 'space-1',
        space_title: 'Meetings',
        campaign_name: 'General',
        source: 'fathom',
      }),
    )
  })

  it('falls back to done/logged from the meeting status when task_status is missing', () => {
    expect(
      meetingActionToTaskRollupItem(action({ status: 'resolved' }), {
        spaceId: 'space-1',
        spaceTitle: 'Meetings',
        campaignName: null,
      }).status,
    ).toBe('done')
  })

  it('preserves lifecycle review state in the canonical task row', () => {
    const lifecycle = { review_state: 'needs_review', review_reason: 'inactive' }
    const item = meetingActionToTaskRollupItem(action({ action_lifecycle: lifecycle }), {
      spaceId: 'space-1',
      spaceTitle: 'Meetings',
      campaignName: null,
    })
    expect(item.custom_data).toEqual({ action_lifecycle: lifecycle })
  })
})
