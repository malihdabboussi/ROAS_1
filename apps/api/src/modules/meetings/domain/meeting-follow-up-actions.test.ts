import { describe, expect, it } from 'vitest'
import {
  isFollowUpSpaceItem,
  mapFollowUpSpaceItemToMeetingAction,
} from './meeting-follow-up-actions'

describe('meeting-follow-up-actions', () => {
  it('maps a Meetings follow_up space_item into workspace action shape', () => {
    const action = mapFollowUpSpaceItemToMeetingAction({
      id: 'fu-1',
      title: 'Send the page',
      source: 'agent_suggested',
      status: 'logged',
      custom_data: {
        entry_type: 'follow_up',
        suggested_assignee_name: 'Dylan',
        suggestion_origin: { source_action: 'agent_suggest_tasks' },
      },
      created_at: '2026-08-04T12:00:00.000Z',
    })

    expect(action).toEqual(
      expect.objectContaining({
        id: 'fu-1',
        title: 'Send the page',
        source_type: 'ai',
        status: 'confirmed',
        canonical_assignee_name: 'Dylan',
        evidence: expect.objectContaining({ origin: 'meetings_space_follow_up' }),
      }),
    )
  })

  it('detects follow_up rows for deliverable filtering', () => {
    expect(
      isFollowUpSpaceItem({
        source: 'fathom',
        custom_data: { entry_type: 'follow_up' },
      }),
    ).toBe(true)
    expect(
      isFollowUpSpaceItem({
        source: 'fathom',
        custom_data: { entry_type: 'call' },
      }),
    ).toBe(false)
  })
})
