import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { AdminModule } from './modules/admin/admin.module'
import { reportQueueWorkerProcessError } from './modules/logger/process-error-reporter'

const bootstrapLogger = new Logger('QueueWorker')
const reportedFatalReasons = new WeakSet<object>()

function markReported(reason: unknown): void {
  if (reason && typeof reason === 'object') reportedFatalReasons.add(reason)
}

function wasReported(reason: unknown): boolean {
  return !!reason && typeof reason === 'object' && reportedFatalReasons.has(reason)
}

process.on('unhandledRejection', (reason) => {
  markReported(reason)
  reportQueueWorkerProcessError('QUEUE_WORKER_UNHANDLED_REJECTION', reason, {
    process_event: 'unhandledRejection',
  })
  bootstrapLogger.error(
    `Unhandled rejection: ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}`,
  )
  throw reason
})

process.on('uncaughtException', (error) => {
  if (!wasReported(error)) {
    reportQueueWorkerProcessError('QUEUE_WORKER_UNCAUGHT_EXCEPTION', error, {
      process_event: 'uncaughtException',
    })
  }
  bootstrapLogger.error(
    `Uncaught exception: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  )
  process.exit(1)
})

async function bootstrap() {
  const logger = new Logger('QueueWorker')

  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const configService = app.get(ConfigService)

  // Mount Bull Board dashboard
  const adminModule = app.get(AdminModule)
  app.use('/admin/queues', adminModule.getServerAdapter().getRouter())

  const port = process.env.PORT || configService.get<number>('port') || 3004
  await app.listen(port)

  logger.log(`Queue Worker listening on http://localhost:${port}`)
  logger.log(`Bull Board available at http://localhost:${port}/admin/queues`)
}

bootstrap().catch((error) => {
  reportQueueWorkerProcessError('QUEUE_WORKER_BOOTSTRAP_FAILED', error, {
    process_event: 'bootstrap',
  })
  bootstrapLogger.error(
    `Bootstrap failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  )
  process.exit(1)
})
