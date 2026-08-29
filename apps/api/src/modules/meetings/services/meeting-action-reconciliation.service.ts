import { Injectable, Logger } from '@nestjs/common'
import { deriveMeetingActionReview } from '../domain/meeting-action-lifecycle'
import { MeetingActionReconciliationRepository } from '../repositories/meeting-action-reconciliation.repository'

@Injectable()
export class MeetingActionReconciliationService {
  private readonly logger = new Logger(MeetingActionReconciliationService.name)

  constructor(private readonly repository: MeetingActionReconciliationRepository) {}

  async reconcile(
    now = new Date(),
  ): Promise<{ checked: number; marked: number; unchanged: number }> {
    const candidates = await this.repository.listOpenMeetingActions()
    let marked = 0
    for (const candidate of candidates) {
      const lifecycle = deriveMeetingActionReview(candidate, now)
      if (!lifecycle || sameLifecycle(candidate.custom_data?.action_lifecycle, lifecycle)) continue
      if (await this.repository.markNeedsReview(candidate, lifecycle)) marked += 1
    }
    const result = { checked: candidates.length, marked, unchanged: candidates.length - marked }
    this.logger.log(
      `Meeting action reconciliation checked=${result.checked} marked=${result.marked}`,
    )
    return result
  }
}

function sameLifecycle(current: unknown, next: Record<string, unknown>): boolean {
  if (!current || typeof current !== 'object' || Array.isArray(current)) return false
  const record = current as Record<string, unknown>
  return (
    record.review_state === next.review_state &&
    record.review_reason === next.review_reason &&
    record.review_requested_at === next.review_requested_at
  )
}
