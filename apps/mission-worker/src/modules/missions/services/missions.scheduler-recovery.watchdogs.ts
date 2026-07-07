import { MissionsSchedulerRecoveryCtx } from './missions.scheduler-recovery.types'
import {
  detectStuckReviewMissions,
  enqueueApproachingScheduledSubtasks,
  escalateOverdueHumanSubtasks,
  recoverStuckInboxMissions,
  resetStaleOutboxProcessingRows,
} from './missions.scheduler-recovery.watchdogs.phase-a'
import {
  detectOrphanedPendingSubtasks,
  detectStalledLegacyMissions,
  detectStalledSubtasks,
} from './missions.scheduler-recovery.watchdogs.phase-b'

export async function runDetectStalledWork(ctx: MissionsSchedulerRecoveryCtx): Promise<void> {
  await resetStaleOutboxProcessingRows(ctx)
  await recoverStuckInboxMissions(ctx)
  await detectStalledSubtasks(ctx)
  await detectStuckReviewMissions(ctx)
  await detectOrphanedPendingSubtasks(ctx)
  await detectStalledLegacyMissions(ctx)
  await enqueueApproachingScheduledSubtasks(ctx)
  await escalateOverdueHumanSubtasks(ctx)
}
