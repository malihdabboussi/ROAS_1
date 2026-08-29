import { describe, expect, it } from 'vitest'
import { buildTaskReviewPatch, taskNeedsReview } from './task-lifecycle-review'
import type { TaskRollupItem } from './tasks-api'

const item = {
  id: 'task-1',
  title: 'Confirm budget',
  status: 'todo',
  due_at: null,
  assignee_user_id: 'user-1',
  assignees: [{ type: 'human', id: 'user-1' }],
  space_id: 'space-1',
  space_title: 'Meetings',
  campaign_id: null,
  campaign_name: null,
  program_id: null,
  program_name: null,
  source_url: '/spaces?space=space-1&item=task-1',
  custom_data: {
    action_lifecycle: { review_state: 'needs_review', review_reason: 'overdue' },
    provider_evidence: { id: 'a1' },
  },
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: null,
} satisfies TaskRollupItem

describe('task lifecycle review', () => {
  it('recognizes a canonical task awaiting owner review', () => {
    expect(taskNeedsReview(item)).toBe(true)
  })

  it('keeps explicit evidence when the owner marks the task done', () => {
    expect(buildTaskReviewPatch(item, 'done', new Date('2026-08-29T16:00:00.000Z'))).toEqual({
      status: 'done',
      custom_data: expect.objectContaining({
        provider_evidence: { id: 'a1' },
        completion_origin: {
          kind: 'owner_review',
          completed_at: '2026-08-29T16:00:00.000Z',
        },
        action_lifecycle: expect.objectContaining({ review_state: 'resolved' }),
      }),
    })
  })
})
