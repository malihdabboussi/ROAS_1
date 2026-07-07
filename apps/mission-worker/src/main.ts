import './instrument'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { DatabaseService } from './lib/services/database.service'
import { AdminModule } from './modules/admin/admin.module'
import { reportMissionWorkerProcessError } from './modules/logger/process-error-reporter'

const bootstrapLogger = new Logger('MissionWorker')
const reportedFatalReasons = new WeakSet<object>()

function markReported(reason: unknown): void {
  if (reason && typeof reason === 'object') reportedFatalReasons.add(reason)
}

function wasReported(reason: unknown): boolean {
  return !!reason && typeof reason === 'object' && reportedFatalReasons.has(reason)
}

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason)
  if (reason instanceof TypeError && msg.includes('connToClose.close is not a function')) {
    bootstrapLogger.warn(
      `[supabase_phoenix_teardown] Suppressed known @supabase/phoenix teardown error: ${msg}`,
    )
    return
  }
  markReported(reason)
  reportMissionWorkerProcessError('MISSION_WORKER_UNHANDLED_REJECTION', reason, {
    process_event: 'unhandledRejection',
  })
  bootstrapLogger.error(`Unhandled rejection: ${msg}`)
  throw reason
})

process.on('uncaughtException', (error) => {
  if (!wasReported(error)) {
    reportMissionWorkerProcessError('MISSION_WORKER_UNCAUGHT_EXCEPTION', error, {
      process_event: 'uncaughtException',
    })
  }
  bootstrapLogger.error(
    `Uncaught exception: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  )
  process.exit(1)
})

async function bootstrap() {
  const logger = new Logger('MissionWorker')
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const configService = app.get(ConfigService)

  const adminModule = app.get(AdminModule)
  app.use('/admin/queues', adminModule.getServerAdapter().getRouter())

  const port = process.env.PORT || configService.get<number>('port') || 3005
  await app.listen(port)
  const databaseService = app.get(DatabaseService)
  if (databaseService.hasPgPool()) {
    logger.log('[mission_worker] direct_pg: on (full watchdog + advisory-lock parity with API)')
  } else {
    logger.warn(
      '[mission_worker] direct_pg: off — degraded: worker mission advisory locks are no-ops; scheduler/outbox PG-first paths use Supabase fallback; agent-pattern-evaluator PG queries skipped where applicable; stale `processing` outbox reset uses Supabase only. Production: set SUPABASE_DIRECT_DB_URL for parity.',
    )
  }
  logger.log(`Mission Worker listening on http://localhost:${port}`)
  logger.log(`Bull Board available at http://localhost:${port}/admin/queues`)
}

bootstrap().catch((error) => {
  reportMissionWorkerProcessError('MISSION_WORKER_BOOTSTRAP_FAILED', error, {
    process_event: 'bootstrap',
  })
  bootstrapLogger.error(
    `Bootstrap failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  )
  process.exit(1)
})
