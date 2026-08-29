import { describe, expect, it } from 'vitest'
import {
  isFollowUpSpaceItem,
  isMeetingAgendaSpaceItem,
  mapFollowUpSpaceItemToMeetingAction,
  meetingActionStatusToFollowUpStatus,
} from './meeting-follow-up-actions'

describe('meeting-follow-up-actions', () => {
  it('maps a Meetings follow_up space_item into workspace action shape', () => {
    const action = mapFollowUpSpaceItemToMeetingAction({
      id: 'fu-1',
      title: 'Send the page',
      source: 'agent_suggested',
      status: 'logged',
      priority: 'high',
      due_date: '2026-08-31T16:59:00.000Z',
      assignee_type: 'human',
      assignee_id: 'user-1',
      assignees: [{ type: 'human', id: 'user-1' }],
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
        task_status: 'logged',
        priority: 'high',
        due_at: '2026-08-31T16:59:00.000Z',
        assignee_id: 'user-1',
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

  it('keeps meeting agenda docs out of attachments', () => {
    expect(
      isMeetingAgendaSpaceItem({
        source: 'manual',
        custom_data: { entry_type: 'meeting_agenda' },
      }),
    ).toBe(true)
    expect(
      isMeetingAgendaSpaceItem({
        source: 'fathom',
        custom_data: { entry_type: 'meeting_recap' },
      }),
    ).toBe(false)
  })

  it('identifies Fathom follow-ups as provider actions', () => {
    const action = mapFollowUpSpaceItemToMeetingAction({
      id: 'fu-fathom',
      title: 'Send the recap',
      source: 'fathom',
      status: 'logged',
      custom_data: { entry_type: 'follow_up' },
    })

    expect(action).toEqual(expect.objectContaining({ source_type: 'provider' }))
  })

  it('maps checked and unchecked meeting states to reversible Space task statuses', () => {
    expect(meetingActionStatusToFollowUpStatus('resolved')).toBe('done')
    expect(meetingActionStatusToFollowUpStatus('confirmed')).toBe('logged')
  })

  it('preserves a dismissed follow-up in the meeting action shape', () => {
    const action = mapFollowUpSpaceItemToMeetingAction({
      id: 'follow-up-1',
      title: 'Skip this',
      status: 'logged',
      custom_data: { entry_type: 'follow_up', dismissed_at: '2026-08-27T20:00:00.000Z' },
    })
    expect(action.status).toBe('dismissed')
  })

  it('exposes canonical lifecycle review state to meeting consumers', () => {
    const action = mapFollowUpSpaceItemToMeetingAction({
      id: 'follow-up-review',
      title: 'Confirm whether this is done',
      status: 'logged',
      custom_data: {
        entry_type: 'follow_up',
        action_lifecycle: { review_state: 'needs_review', review_reason: 'inactive' },
      },
    })
    expect(action.action_lifecycle).toEqual({
      review_state: 'needs_review',
      review_reason: 'inactive',
    })
  })
})
