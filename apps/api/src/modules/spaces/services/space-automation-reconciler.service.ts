import { Injectable, Logger } from '@nestjs/common'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import { SpaceAutomationReconcilerRepository } from '../repositories/space-automation-reconciler.repository'
import { SpaceAutomationService, type TriggerEvent } from './space-automation.service'

/**
 * Polls for mission status changes that should trigger space automations.
 * Called by CronService on a 30-second interval.
 *
 * The DB trigger `sync_mission_status_to_space_item` updates the space_item
 * status when a linked mission completes/fails, and also emits pg_notify.
 * This reconciler catches those events for the serverless API tier
 * (which cannot hold a persistent LISTEN connection).
 */
@Injectable()
export class SpaceAutomationReconcilerService {
  private readonly logger = new Logger(SpaceAutomationReconcilerService.name)
  private lastReconcileAt = new Date(Date.now() - 60_000).toISOString()

  constructor(
    private readonly reconcilerRepo: SpaceAutomationReconcilerRepository,
    private readonly automationService: SpaceAutomationService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  async reconcileMissionCompletions(): Promise<void> {
    const admin = this.reconcilerRepo.getServiceClient()
    if (!admin) return

    const since = this.lastReconcileAt
    this.lastReconcileAt = new Date().toISOString()

    const { items, errorMessage } = await this.reconcilerRepo.listLinkedItemsUpdatedSince(
      admin,
      since,
    )

    if (errorMessage) {
      this.logger.error(`Reconciler query failed: ${errorMessage}`)
      reportAppError(this.errorReporter, {
        app: process.env.APP_NAME ?? 'api',
        category: 'worker',
        feature: 'spaces/automation_reconciler',
        error_code: 'query_failed',
        message: errorMessage,
        context: { since },
      })
      return
    }
    if (!items.length) return

    for (const item of items) {
      const mission = await this.reconcilerRepo.findMissionStatus(admin, item.linked_mission_id)

      if (!mission) continue

      let event: TriggerEvent | null = null
      if (mission.status === 'done') {
        event = { type: 'mission_completed', mission_id: mission.id }
      } else if (mission.status === 'failed' || mission.status === 'error') {
        event = { type: 'mission_failed', mission_id: mission.id }
      }
      if (!event) continue

      const alreadyRan = await this.reconcilerRepo.hasRecentRun(admin, item.id, event.type)
      if (alreadyRan) continue

      try {
        const userClient = this.reconcilerRepo.getServiceClientForUser()
        await this.automationService.evaluate(event, {
          supabase: userClient,
          userId: item.user_id,
          orgId: item.org_id ?? null,
          spaceId: item.space_id,
          itemId: item.id,
          depth: 0,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.error(`Automation eval failed for item ${item.id}: ${message}`)
        reportAppError(
          this.errorReporter,
          {
            app: process.env.APP_NAME ?? 'api',
            category: 'worker',
            feature: 'spaces/automation_reconciler',
            error_code: 'eval_failed',
            message,
            user_id: item.user_id,
            context: {
              itemId: item.id,
              spaceId: item.space_id,
              missionId: item.linked_mission_id,
            },
            stack: err instanceof Error ? err.stack : undefined,
          },
          err,
        )
      }
    }
  }
}
