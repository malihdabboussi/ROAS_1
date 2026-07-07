import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AdminService } from './modules/admin/services/admin.service'
import { StripeService } from './modules/billing/services/stripe.service'
import { BrowserSessionsMaintenanceService } from './modules/browser-sessions/services/browser-sessions-maintenance.service'
import { IdleManagerService } from './modules/machines/services/idle-manager.service'
import { MachinePoolService } from './modules/machines/services/machine-pool.service'
import { MachineReconciliationService } from './modules/machines/services/machine-reconciliation.service'
import { MissionsAgentOperationsService } from './modules/missions/services/missions-agent-operations.service'
import { ModelsService } from './modules/models/services/models.service'
import { SpaceAutomationReconcilerService } from './modules/spaces/services/space-automation-reconciler.service'
import { SpaceAutomationSchedulerService } from './modules/spaces/services/space-automation-scheduler.service'
import { SpaceRecurrenceService } from './modules/spaces/services/space-recurrence.service'

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name)

  constructor(
    private readonly idleManager: IdleManagerService,
    private readonly adminService: AdminService,
    private readonly machinePool: MachinePoolService,
    private readonly machineReconciliation: MachineReconciliationService,
    private readonly browserSessionsMaintenance: BrowserSessionsMaintenanceService,
    private readonly spaceRecurrenceService: SpaceRecurrenceService,
    private readonly stripeService: StripeService,
    private readonly spaceAutomationReconciler: SpaceAutomationReconcilerService,
    private readonly spaceAutomationScheduler: SpaceAutomationSchedulerService,
    private readonly missionsAgentOperations: MissionsAgentOperationsService,
    private readonly modelsService: ModelsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async idleCheck() {
    try {
      await this.machineReconciliation.reconcileRuntimeState()
      await this.idleManager.checkIdleMachines()
    } catch (err) {
      this.logger.error(`Idle check failed: ${(err as Error).message}`)
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async replenishMachinePool() {
    try {
      const result = await this.machinePool.replenishPool()
      if (result.created > 0) {
        this.logger.log(`Machine pool replenished: +${result.created}`)
      } else if (result.skipped) {
        this.logger.debug(`Pool replenish skipped: ${result.skipped}`)
      }
    } catch (err) {
      this.logger.error(`Pool replenish failed: ${(err as Error).message}`)
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async repairStaleAgentSetups() {
    try {
      const result = await this.missionsAgentOperations.repairStaleAgentSetups()
      if (result.repaired > 0 || result.failed > 0 || result.skipped > 0) {
        this.logger.log(
          `Agent setup repair sweep: checked=${result.checked} repaired=${result.repaired} failed=${result.failed} skipped=${result.skipped}`,
        )
      }
    } catch (err) {
      this.logger.error(`Agent setup repair sweep failed: ${(err as Error).message}`)
    }
  }

  @Cron('0 2 * * *')
  async billingReconcile() {
    try {
      await this.adminService.runBillingReconciliation()
      this.logger.log('Billing reconciliation completed')
    } catch (err) {
      this.logger.error(`Billing reconciliation failed: ${(err as Error).message}`)
    }
  }

  @Cron('0 */6 * * *')
  async browserSessionExpiryCheck() {
    try {
      const { notified } = await this.browserSessionsMaintenance.checkAndNotifyExpiringSessions()
      if (notified > 0) {
        this.logger.log(`Browser session expiry notifications sent: ${notified}`)
      }
    } catch (err) {
      this.logger.error(`Browser session expiry check failed: ${(err as Error).message}`)
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async materializeRecurringSpaceItems() {
    try {
      const { materialized } = await this.spaceRecurrenceService.materializeDueRecurrences()
      if (materialized > 0) {
        this.logger.log(`Recurring space items materialized: ${materialized}`)
      }
    } catch (err) {
      this.logger.error(`Recurring space item materialization failed: ${(err as Error).message}`)
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async reconcileSpaceAutomations() {
    try {
      await this.spaceAutomationReconciler.reconcileMissionCompletions()
    } catch (err) {
      this.logger.error(`Space automation reconciliation failed: ${(err as Error).message}`)
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueSpaceSchedules() {
    try {
      await this.spaceAutomationScheduler.processDueSchedules()
    } catch (err) {
      this.logger.error(`Space automation schedule fire failed: ${(err as Error).message}`)
    }
  }

  // Delete agent brains whose 14-day grace window expired. Idempotent; safe to
  // double-fire since the worker only selects rows with status='pending_deletion'
  // and pending_deletion_at <= now.
  @Cron('0 3 * * *')
  async purgePendingAgentBrains() {
    try {
      await this.stripeService.runAgentBrainPurge()
    } catch (err) {
      this.logger.error(`Agent-brain purge failed: ${(err as Error).message}`)
    }
  }

  @Cron('15 3 * * *')
  async syncOpenRouterModelCapabilities() {
    try {
      const result = await this.modelsService.syncOpenRouterModelCapabilities()
      this.logger.log(
        `OpenRouter model capability sync completed: checked=${result.checked} updated=${result.updated}`,
      )
    } catch (err) {
      this.logger.error(`OpenRouter model capability sync failed: ${(err as Error).message}`)
    }
  }
}
