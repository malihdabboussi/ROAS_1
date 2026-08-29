import { describe, expect, it, vi } from 'vitest'
import { MeetingActionReconciliationService } from './meeting-action-reconciliation.service'

describe('MeetingActionReconciliationService', () => {
  it('marks only actionable candidates and remains idempotent', async () => {
    const now = new Date('2026-08-29T16:00:00.000Z')
    const repository = {
      listOpenMeetingActions: vi.fn().mockResolvedValue([
        {
          id: 'overdue',
          status: 'logged',
          due_date: '2026-08-20T00:00:00.000Z',
          custom_data: {},
          created_at: '2026-08-01T00:00:00.000Z',
          updated_at: null,
        },
        {
          id: 'current',
          status: 'logged',
          due_date: '2026-09-20T00:00:00.000Z',
          custom_data: {},
          created_at: '2026-08-20T00:00:00.000Z',
          updated_at: null,
        },
        {
          id: 'already-marked',
          status: 'logged',
          due_date: '2026-08-20T00:00:00.000Z',
          custom_data: {
            action_lifecycle: {
              review_state: 'needs_review',
              review_reason: 'overdue',
              review_requested_at: now.toISOString(),
            },
          },
          created_at: '2026-08-01T00:00:00.000Z',
          updated_at: null,
        },
      ]),
      markNeedsReview: vi.fn().mockResolvedValue(true),
    }
    const service = new MeetingActionReconciliationService(repository as never)

    await expect(service.reconcile(now)).resolves.toEqual({ checked: 3, marked: 1, unchanged: 2 })
    expect(repository.markNeedsReview).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'overdue' }),
      expect.objectContaining({ review_state: 'needs_review', review_reason: 'overdue' }),
    )
  })

  it('does not count a task that changed while reconciliation was running', async () => {
    const repository = {
      listOpenMeetingActions: vi.fn().mockResolvedValue([
        {
          id: 'changed',
          status: 'logged',
          due_date: '2026-08-20T00:00:00.000Z',
          custom_data: {},
          created_at: '2026-08-01T00:00:00.000Z',
          updated_at: '2026-08-01T00:00:00.000Z',
        },
      ]),
      markNeedsReview: vi.fn().mockResolvedValue(false),
    }
    const service = new MeetingActionReconciliationService(repository as never)

    await expect(service.reconcile(new Date('2026-08-29T16:00:00.000Z'))).resolves.toEqual({
      checked: 1,
      marked: 0,
      unchanged: 1,
    })
  })
})
