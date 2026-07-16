import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WorkerLoggerService } from '../../logger'
import { getMissionRecoveryPollMs } from './mission-execution-lease'
import { MissionsSchedulerRecoveryService } from './missions.scheduler-recovery.service'
import { MissionsSchedulerStateTransitionsService } from './missions.scheduler-state-transitions.service'

@Injectable()
export class MissionsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MissionsScheduler.name)
  private pollTimer: NodeJS.Timeout | null = null
  private recoveryTimer: NodeJS.Timeout | null = null
  private recoverySweepInFlight = false
  private watchdogPausedUntil = 0

  constructor(
    private readonly configService: ConfigService,
    private readonly stateTransitions: MissionsSchedulerStateTransitionsService,
    private readonly recovery: MissionsSchedulerRecoveryService,
    @Optional() private readonly workerLogger?: WorkerLoggerService,
  ) {}

  onModuleInit() {
    const watchdogEnabled = (process.env.MISSIONS_WATCHDOG_ENABLED || 'true').toLowerCase()
    if (watchdogEnabled === 'false') {
      this.logger.log('Mission scheduler watchdog disabled by MISSIONS_WATCHDOG_ENABLED=false')
      return
    }

    const pollMs = Number(process.env.MISSIONS_WATCHDOG_MS || 900000)
    const recoveryPollMs = getMissionRecoveryPollMs()
    void this.runRecoverySweep()
    this.recoveryTimer = setInterval(() => {
      void this.runRecoverySweep()
    }, recoveryPollMs)
    this.pollTimer = setInterval(() => {
      this.pollAllPhases().catch((error) => {
        this.reportSchedulerError('MISSIONS_SCHEDULER_POLL_FAILED', 'Scheduler poll failed', error)
      })
    }, pollMs)
    this.logger.log(
      `Mission scheduler started (watchdog_poll=${pollMs}ms, recovery_poll=${recoveryPollMs}ms)`,
    )
  }

  onModuleDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer)
      this.recoveryTimer = null
    }
  }

  private pauseWatchdogsIfDbTransportError(error: Error) {
    const message = String(error?.message || '')
    if (
      !/self-signed certificate|password authentication failed|ECONNREFUSED|connection timeout|Connection terminated/i.test(
        message,
      )
    ) {
      return
    }
    const pauseMs = 60000
    this.watchdogPausedUntil = Date.now() + pauseMs
    this.logger.warn(`Watchdogs paused for ${pauseMs}ms due to direct DB transport failure`)
  }

  private async pollAllPhases() {
    const useOutboxDispatch =
      this.configService.get<boolean>('missions.useOutboxDispatch') ??
      (process.env.MISSIONS_USE_OUTBOX_DISPATCH || 'true').toLowerCase() !== 'false'

    if (!useOutboxDispatch) {
      this.logger.warn('Outbox dispatch disabled by MISSIONS_USE_OUTBOX_DISPATCH=false')
    }
    if (Date.now() < this.watchdogPausedUntil) {
      return
    }
    await this.recovery.autoRetryFailed().catch((error) => {
      this.pauseWatchdogsIfDbTransportError(error)
      this.reportSchedulerError('MISSIONS_AUTO_RETRY_POLL_FAILED', 'Auto-retry poll failed', error)
    })
    const usersHandledByOps = await this.stateTransitions.runOperationalLoop().catch((error) => {
      this.reportSchedulerError(
        'MISSIONS_OPERATIONAL_LOOP_FAILED',
        'Operational loop failed',
        error,
      )
      return new Set<string>()
    })
    await this.stateTransitions.runSignalIntelligence(usersHandledByOps).catch((error) => {
      this.reportSchedulerError(
        'MISSIONS_SIGNAL_INTELLIGENCE_FAILED',
        'Signal intelligence failed',
        error,
        { users_handled_by_ops: usersHandledByOps.size },
      )
    })
    await this.stateTransitions.maybeRunDigests().catch((error) => {
      this.reportSchedulerError('MISSIONS_DAILY_DIGEST_FAILED', 'Daily digest failed', error)
    })
  }

  private async runRecoverySweep(): Promise<void> {
    if (this.recoverySweepInFlight || Date.now() < this.watchdogPausedUntil) return
    this.recoverySweepInFlight = true
    try {
      await this.recovery.detectStalledWork()
    } catch (error) {
      this.pauseWatchdogsIfDbTransportError(error as Error)
      this.reportSchedulerError(
        'MISSIONS_STALLED_WORK_WATCHDOG_FAILED',
        'Failed stalled-work watchdog',
        error,
      )
    } finally {
      this.recoverySweepInFlight = false
    }
  }

  private reportSchedulerError(
    errorCode: string,
    label: string,
    error: unknown,
    context: Record<string, unknown> = {},
  ): void {
    const message = formatSchedulerError(error)
    this.logger.error(`${label}: ${message}`)
    void this.workerLogger?.logError({
      app: 'mission-worker',
      severity: 'error',
      feature: 'missions_scheduler',
      error_code: errorCode,
      message: `${label}: ${message}`,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    })
  }
}

function formatSchedulerError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
