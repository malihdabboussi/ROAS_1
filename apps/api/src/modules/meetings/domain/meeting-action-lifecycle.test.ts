import { describe, expect, it } from 'vitest'
import {
  applyMeetingActionReviewDecision,
  deriveMeetingActionReview,
} from './meeting-action-lifecycle'

const now = new Date('2026-08-29T16:00:00.000Z')

describe('meeting action lifecycle', () => {
  it('marks an overdue open task for review without changing its task status', () => {
    expect(
      deriveMeetingActionReview(
        { status: 'logged', due_date: '2026-08-28T23:59:59.000Z', custom_data: {} },
        now,
      ),
    ).toEqual({
      review_state: 'needs_review',
      review_reason: 'overdue',
      review_requested_at: now.toISOString(),
    })
  })

  it('marks an undated task only after thirty inactive days', () => {
    expect(
      deriveMeetingActionReview(
        { status: 'logged', updated_at: '2026-07-30T16:00:00.000Z', custom_data: {} },
        now,
      )?.review_reason,
    ).toBe('inactive')
    expect(
      deriveMeetingActionReview(
        { status: 'logged', updated_at: '2026-08-01T16:00:00.000Z', custom_data: {} },
        now,
      ),
    ).toBeNull()
  })

  it('is idempotent and preserves the original review request time', () => {
    const lifecycle = deriveMeetingActionReview(
      {
        status: 'logged',
        due_date: '2026-08-20T00:00:00.000Z',
        custom_data: {
          action_lifecycle: {
            review_state: 'needs_review',
            review_requested_at: '2026-08-28T16:00:00.000Z',
          },
        },
      },
      now,
    )
    expect(lifecycle?.review_requested_at).toBe('2026-08-28T16:00:00.000Z')
  })

  it('suppresses a recently owner-confirmed task and skips closed work', () => {
    expect(
      deriveMeetingActionReview(
        {
          status: 'logged',
          due_date: '2026-08-20T00:00:00.000Z',
          custom_data: {
            action_lifecycle: { suppress_until: '2026-09-12T16:00:00.000Z' },
          },
        },
        now,
      ),
    ).toBeNull()
    expect(deriveMeetingActionReview({ status: 'done', updated_at: '2026-01-01' }, now)).toBeNull()
  })

  it('records owner decisions and explicit completion evidence', () => {
    expect(
      applyMeetingActionReviewDecision({ provider_evidence: { id: 'a1' } }, 'done', now),
    ).toEqual({
      provider_evidence: { id: 'a1' },
      action_lifecycle: {
        review_state: 'resolved',
        review_reason: 'owner_resolved',
        reviewed_at: now.toISOString(),
      },
      completion_origin: { kind: 'owner_review', completed_at: now.toISOString() },
    })
  })
})
