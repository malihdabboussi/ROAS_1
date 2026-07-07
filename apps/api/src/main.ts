import './instrument'
import { join } from 'path'
import { ConsoleLogger, Logger, RequestMethod } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express'
import express from 'express'
import {
  createRequestTraceMiddleware,
  GlobalExceptionFilter,
  RouteTraceReporter,
} from '@vibey/api-shared'
import { AppModule } from './app.module'
import { enforceApiSurface } from './middleware/external-surface.middleware'

const server = express()
server.use(enforceApiSurface)

const NOISY_CONTEXTS = ['RouterExplorer', 'RoutesResolver', 'InstanceLoader', 'NestFactory']

class FilteredConsoleLogger extends ConsoleLogger {
  log(message: unknown, context?: string): void {
    if (!context || !NOISY_CONTEXTS.includes(context)) {
      super.log(message as string, context)
    }
  }
}

export const createNestApp = async () => {
  const isProd = process.env.NODE_ENV === 'production'
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server) as any,
    {
      rawBody: true,
      bodyParser: false,
      abortOnError: false,
      ...(isProd && { logger: new FilteredConsoleLogger() }),
    },
  )

  app.useStaticAssets(join(__dirname, '..', 'public'))

  app.useBodyParser('json', { limit: '15mb' })
  app.useBodyParser('urlencoded', { extended: true, limit: '15mb' } as any)
  const routeTraceReporter = app.get(RouteTraceReporter)
  app.use(
    createRequestTraceMiddleware(routeTraceReporter, {
      surface: 'api',
      service: 'platform-api',
    }),
  )

  // Global prefix — all routes under /api except OAuth metadata discovery.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '.well-known/oauth-authorization-server', method: RequestMethod.GET },
      { path: '.well-known/openid-configuration', method: RequestMethod.GET },
    ],
  })

  // CORS — public ingest endpoint allows all origins (funnel pages on any domain)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-supabase-refresh-token',
      'x-org-id',
      'x-vibey-request-id',
      'x-vibey-parent-span-id',
      'x-vibey-span-id',
      'x-vibey-trace-id',
      'x-vibey-message-id',
      'x-vibey-run-id',
      'x-vibey-conversation-id',
      'x-vibey-signature',
      'x-vibey-event-id',
      'x-webhook-id',
    ],
    exposedHeaders: ['x-vibey-request-id', 'x-vibey-span-id'],
  })

  const exceptionFilter = app.get(GlobalExceptionFilter)
  app.useGlobalFilters(exceptionFilter)

  await app.init()
  return app
}

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await createNestApp()

  const port = Number(process.env.PORT ?? 3001)
  await app.listen(port)

  logger.log(`[vibey-api] Running on http://localhost:${port}`)
}

if (require.main === module) {
  bootstrap().catch((err: any) => {
    console.error('[vibey-api] Bootstrap failed:')
    console.error(err?.stack ?? err?.message ?? err)
    if (err?.cause) {
      console.error('caused by:', err.cause?.stack ?? err.cause)
    }
    process.exit(1)
  })
}
