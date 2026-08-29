import type { TaskRollupItem } from './tasks-api'

export type TaskReviewDecision = 'open' | 'done' | 'dismissed'

export function buildTaskReviewPatch(
  item: TaskRollupItem,
  decision: TaskReviewDecision,
  now = new Date(),
): Record<string, unknown> {
  const reviewedAt = now.toISOString()
  const actionLifecycle =
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
    status: decision === 'done' ? 'done' : decision === 'dismissed' ? 'archived' : item.status,
    custom_data: {
      ...(item.custom_data ?? {}),
      action_lifecycle: actionLifecycle,
      ...(decision === 'done'
        ? { completion_origin: { kind: 'owner_review', completed_at: reviewedAt } }
        : {}),
      ...(decision === 'dismissed' ? { dismissed_at: reviewedAt } : {}),
    },
  }
}

export function taskNeedsReview(item: TaskRollupItem): boolean {
  const lifecycle = item.custom_data?.action_lifecycle
  return (
    !!lifecycle &&
    typeof lifecycle === 'object' &&
    !Array.isArray(lifecycle) &&
    (lifecycle as Record<string, unknown>).review_state === 'needs_review'
  )
}
