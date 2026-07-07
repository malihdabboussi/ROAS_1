import './instrument'
import { Logger, RequestMethod, ValidationPipe, type Type } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { WsAdapter } from '@nestjs/platform-ws'
import {
  GlobalExceptionFilter,
  RouteTraceReporter,
  createRequestTraceMiddleware,
} from '@vibey/api-shared'
import cookieParser from 'cookie-parser'

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let lastBootMarkMs = 0
function logBootTiming(logger: Logger, stage: string): void {
  const nowMs = performance.now()
  const stepMs = nowMs - lastBootMarkMs
  lastBootMarkMs = nowMs
  logger.log(
    `[agent-api.boot] stage=${stage} stepMs=${stepMs.toFixed(1)} totalMs=${nowMs.toFixed(1)}`,
  )
}

async function loadRootModule(logger: Logger): Promise<Type<unknown>> {
  const bootProfile = process.env.AGENT_API_BOOT_PROFILE?.trim() || 'full'
  if (bootProfile === 'runtime-chat') {
    const { RuntimeChatAppModule } = await import('./runtime-chat-app.module')
    logBootTiming(logger, 'root_module_loaded_runtime_chat')
    return RuntimeChatAppModule
  }
  if (bootProfile !== 'full') {
    throw new Error(`Unsupported AGENT_API_BOOT_PROFILE=${bootProfile}`)
  }
  const { AppModule } = await import('./app.module')
  logBootTiming(logger, 'root_module_loaded_full')
  return AppModule
}

async function bootstrap() {
  process.env.APP_NAME = process.env.APP_NAME || 'agent-api'
  const logger = new Logger('Bootstrap')
  logBootTiming(logger, 'entrypoint_ready')
  const configPath = process.env.OPENCLAW_CONFIG_PATH?.trim() ?? ''
  if (!configPath && process.env.NODE_ENV !== 'test') {
    throw new Error('OPENCLAW_CONFIG_PATH is required to run agent-api')
  }
  const userId = process.env.USER_ID?.trim() ?? ''
  if (userId && !UUID_V4_PATTERN.test(userId)) {
    throw new Error('USER_ID must be a valid UUID when provided')
  }
  logBootTiming(logger, 'env_validated')

  const rootModule = await loadRootModule(logger)
  const app = await NestFactory.create<NestExpressApplication>(rootModule, {
    rawBody: true,
  })
  logBootTiming(logger, 'nest_app_created')

  // Global prefix — all routes under /api except MCP OAuth protected-resource discovery.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '', method: RequestMethod.POST },
      { path: '', method: RequestMethod.HEAD },
      { path: '.well-known/oauth-protected-resource', method: RequestMethod.GET },
      { path: '.well-known/oauth-protected-resource/api/mcp', method: RequestMethod.GET },
      { path: '.well-known/oauth-protected-resource/api/vibey-mcp', method: RequestMethod.GET },
    ],
  })
  logBootTiming(logger, 'global_prefix_set')

  // Middleware
  app.useBodyParser('json', { limit: '50mb' })
  app.use(cookieParser())
  const routeTraceReporter = app.get(RouteTraceReporter)
  app.use(
    createRequestTraceMiddleware(routeTraceReporter, {
      surface: 'agent-api',
      service: 'agent-api',
      alwaysTraceRoute: (route) =>
        route.startsWith('/api/chat') ||
        route.startsWith('/api/apps') ||
        route.startsWith('/api/project-files') ||
        route.startsWith('/api/internal/chat'),
    }),
  )
  logBootTiming(logger, 'middleware_registered')

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-supabase-refresh-token',
      'x-org-id',
      'x-public-agent-token',
      'x-vibey-request-id',
      'x-vibey-parent-span-id',
      'x-vibey-span-id',
      'x-vibey-trace-id',
      'x-vibey-message-id',
      'x-vibey-run-id',
      'x-vibey-conversation-id',
    ],
    exposedHeaders: ['x-vibey-request-id', 'x-vibey-span-id'],
  })
  logBootTiming(logger, 'cors_enabled')

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  logBootTiming(logger, 'pipes_registered')

  // Global exception filter (DI-resolved for ErrorReporter injection)
  const exceptionFilter = app.get(GlobalExceptionFilter)
  app.useGlobalFilters(exceptionFilter)
  logBootTiming(logger, 'exception_filter_registered')

  // WebSocket adapter for Brain Live voice sessions
  app.useWebSocketAdapter(new WsAdapter(app))
  logBootTiming(logger, 'websocket_adapter_registered')

  const port = Number(process.env.PORT ?? 3003)
  const server = await app.listen(port, '0.0.0.0')
  logBootTiming(logger, 'http_listening')
  server.headersTimeout = 10 * 60 * 1000
  server.keepAliveTimeout = 10 * 60 * 1000
  logBootTiming(logger, 'server_timeouts_configured')

  logger.log(`[vibey-agent-api] Running on http://0.0.0.0:${port}`)
  logger.log(`[vibey-agent-api] OPENCLAW_CONFIG_PATH=${configPath || '(test fallback)'}`)
  logger.log(
    `[vibey-agent-api] AGENTS_BASE_DIR=${process.env.AGENTS_BASE_DIR?.trim() || '(auto-resolve)'}`,
  )
}

bootstrap()
