export const ACTION_REVIEW_INACTIVE_DAYS = 30

export type MeetingActionLifecycle = {
  review_state: 'needs_review' | 'confirmed_open' | 'resolved' | 'dismissed'
  review_reason: 'overdue' | 'inactive' | 'owner_confirmed' | 'owner_resolved' | 'owner_dismissed'
  review_requested_at?: string
  reviewed_at?: string
  suppress_until?: string
}

export function deriveMeetingActionReview(
  item: Record<string, unknown>,
  now = new Date(),
): MeetingActionLifecycle | null {
  if (isClosedStatus(item.status)) return null
  const custom = record(item.custom_data)
  const existing = record(custom.action_lifecycle)
  const suppressUntil = date(existing.suppress_until)
  if (suppressUntil && suppressUntil.getTime() > now.getTime()) return null

  const dueAt = date(item.due_date)
  const reason = dueAt && dueAt.getTime() < now.getTime() ? 'overdue' : inactiveReason(item, now)
  if (!reason) return null

  const requestedAt = text(existing.review_requested_at) ?? now.toISOString()
  return {
    review_state: 'needs_review',
    review_reason: reason,
    review_requested_at: requestedAt,
  }
}

export function applyMeetingActionReviewDecision(
  customData: unknown,
  decision: 'open' | 'done' | 'dismissed',
  now = new Date(),
): Record<string, unknown> {
  const custom = record(customData)
  const reviewedAt = now.toISOString()
  const lifecycle: MeetingActionLifecycle =
    decision === 'open'
      ? {
          review_state: 'confirmed_open',
          review_reason: 'owner_confirmed',
          reviewed_at: reviewedAt,
          suppress_until: new Date(now.getTime() + 14 * 86_400_000).toISOString(),
        }
      : decision === 'done'
        ? { review_state: 'resolved', review_reason: 'owner_resolved', reviewed_at: reviewedAt }
        : { review_state: 'dismissed', review_reason: 'owner_dismissed', reviewed_at: reviewedAt }

  return {
    ...custom,
    action_lifecycle: lifecycle,
    ...(decision === 'done'
      ? { completion_origin: { kind: 'owner_review', completed_at: reviewedAt } }
      : {}),
    ...(decision === 'dismissed' ? { dismissed_at: reviewedAt } : {}),
  }
}

function inactiveReason(
  item: Record<string, unknown>,
  now: Date,
): MeetingActionLifecycle['review_reason'] | null {
  const lastChanged = date(item.updated_at) ?? date(item.created_at)
  if (!lastChanged) return null
  const inactiveBefore = now.getTime() - ACTION_REVIEW_INACTIVE_DAYS * 86_400_000
  return lastChanged.getTime() <= inactiveBefore ? 'inactive' : null
}

function isClosedStatus(value: unknown): boolean {
  return ['done', 'complete', 'completed', 'resolved', 'archived'].includes(
    String(value ?? '')
      .trim()
      .toLowerCase(),
  )
}

function date(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
