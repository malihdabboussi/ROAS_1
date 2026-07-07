import {
  ArgumentsHost,
  BadGatewayException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common'
import type { Response } from 'express'
import { AuthUpstreamUnavailableError } from '../services/auth-errors'
import { ErrorReporter } from '../services/error-reporter.service'
import { isTransientNetworkError } from '../services/transient-error.util'

function isNestHttpException(exception: unknown): exception is HttpException {
  if (exception instanceof HttpException) return true
  if (typeof exception !== 'object' || exception === null) return false
  const e = exception as { getStatus?: unknown; getResponse?: unknown }
  return typeof e.getStatus === 'function' && typeof e.getResponse === 'function'
}

function isAppErrorAlreadyReported(exception: unknown): boolean {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    '__appErrorReported' in exception &&
    (exception as { __appErrorReported?: boolean }).__appErrorReported === true
  )
}

const INTEGRATION_REPORTABLE_4XX = new Set([402, 429, 502])

function shouldReportIntegrationClientError(status: number, path: string): boolean {
  if (!INTEGRATION_REPORTABLE_4XX.has(status)) return false
  return path.includes('social-research') || path.includes('/integrations/')
}

interface RichRequest {
  method?: string
  path?: string
  url?: string
  headers?: Record<string, string | string[] | undefined>
  user?: { id?: string }
  orgId?: string | null
  body?: unknown
  params?: Record<string, string>
}

function collectCauseChain(err: unknown, maxDepth = 3): string[] {
  const causes: string[] = []
  let current = err instanceof Error ? err.cause : undefined
  for (let i = 0; i < maxDepth && current; i++) {
    causes.push(current instanceof Error ? current.message : String(current))
    current = current instanceof Error ? current.cause : undefined
  }
  return causes
}

function safeBodySnippet(req: RichRequest): string | undefined {
  const method = req.method?.toUpperCase()
  if (!method || !['POST', 'PUT', 'PATCH'].includes(method)) return undefined
  if (!req.body || typeof req.body !== 'object') return undefined
  try {
    return JSON.stringify(req.body).slice(0, 500)
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstHeader(
  headers: Record<string, string | string[] | undefined> | undefined,
  keys: string[],
): string | null {
  if (!headers) return null
  for (const key of keys) {
    const value = headers[key] ?? headers[key.toLowerCase()]
    const first = Array.isArray(value) ? value[0] : value
    if (typeof first === 'string' && first.trim().length > 0) return first.trim()
  }
  return null
}

function readBodyString(body: unknown, keys: string[]): string | null {
  if (!isRecord(body)) return null
  for (const key of keys) {
    const value = body[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return null
}

function readParamString(params: Record<string, string> | undefined, keys: string[]): string | null {
  if (!params) return null
  for (const key of keys) {
    const value = params[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return null
}

function collectCorrelationIds(request: RichRequest | undefined): {
  trace_id?: string
  message_id?: string
  request_id?: string
  run_id?: string
  conversation_id?: string
} {
  if (!request) return {}
  const traceId =
    firstHeader(request.headers, ['x-vibey-trace-id', 'x-trace-id']) ??
    readBodyString(request.body, ['trace_id', 'traceId'])
  const messageId =
    firstHeader(request.headers, ['x-vibey-message-id', 'x-message-id']) ??
    readBodyString(request.body, ['message_id', 'messageId'])
  const requestId =
    firstHeader(request.headers, ['x-vibey-request-id', 'x-request-id', 'x-vercel-id']) ??
    readBodyString(request.body, ['request_id', 'requestId'])
  const runId =
    firstHeader(request.headers, ['x-vibey-run-id', 'x-run-id']) ??
    readBodyString(request.body, ['run_id', 'runId'])
  const conversationId =
    firstHeader(request.headers, ['x-vibey-conversation-id', 'x-conversation-id']) ??
    readParamString(request.params, ['conversation_id', 'conversationId']) ??
    readBodyString(request.body, ['conversation_id', 'conversationId'])

  return {
    ...(traceId ? { trace_id: traceId } : {}),
    ...(messageId ? { message_id: messageId } : {}),
    ...(requestId ? { request_id: requestId } : {}),
    ...(runId ? { run_id: runId } : {}),
    ...(conversationId ? { conversation_id: conversationId } : {}),
  }
}

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)
  private readonly appName: string

  constructor(@Optional() private readonly errorReporter?: ErrorReporter) {
    this.appName = process.env.APP_NAME ?? 'api'
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<RichRequest>()
    const path = request?.path ?? request?.url ?? 'unknown'

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'

    if (isNestHttpException(exception)) {
      status = exception.getStatus()
      const res = exception.getResponse()
      if (typeof res === 'object' && res !== null) {
        if (!response.headersSent) {
          response.status(status).json(res)
        }
        if (status >= 500) {
          this.reportError(status, path, request, exception)
        } else if (shouldReportIntegrationClientError(status, path)) {
          this.reportError(status, path, request, exception)
        }
        return
      }
      message = typeof res === 'string' ? res : ((res as any).message ?? message)
      if (status >= 500) {
        this.reportError(status, path, request, exception)
      } else if (shouldReportIntegrationClientError(status, path)) {
        this.reportError(status, path, request, exception)
      }
    } else if (
      exception instanceof AuthUpstreamUnavailableError ||
      exception instanceof ServiceUnavailableException ||
      exception instanceof BadGatewayException ||
      isTransientNetworkError(exception)
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE
      message = 'Service temporarily unavailable'
      const msg = exception instanceof Error ? exception.message : String(exception)
      const code =
        exception && typeof exception === 'object' && 'code' in exception
          ? (exception as { code: string }).code
          : ''
      const cause = exception instanceof Error && exception.cause ? String(exception.cause) : ''
      this.logger.warn(
        `[API] transient_unavailable_503 path=${path} error=${msg} code=${code || 'none'} cause=${cause || 'none'}`,
      )
      this.reportError(503, path, request, exception)
    } else {
      const msg = exception instanceof Error ? exception.message : String(exception)
      this.logger.error(
        `[API] unhandled_error path=${path} error=${msg}`,
        exception instanceof Error ? exception.stack : exception,
      )
      this.reportError(500, path, request, exception)
    }

    response.status(status).json({ error: message })
  }

  private reportError(
    status: number,
    path: string,
    request: RichRequest | undefined,
    exception: unknown,
  ): void {
    if (!this.errorReporter) return
    if (isAppErrorAlreadyReported(exception)) return
    const msg = exception instanceof Error ? exception.message : String(exception)

    const userId = request?.user?.id
    const orgId = request?.orgId
    const method = request?.method
    const params =
      request?.params && Object.keys(request.params).length > 0 ? request.params : undefined
    const bodySnippet = request ? safeBodySnippet(request) : undefined
    const causes = collectCauseChain(exception)
    const correlation = collectCorrelationIds(request)

    let responseBody: unknown
    if (isNestHttpException(exception)) {
      const res = exception.getResponse()
      if (typeof res === 'object' && res !== null) {
        try {
          responseBody = JSON.parse(JSON.stringify(res))
        } catch {
          /* skip */
        }
      }
    }

    const context: Record<string, unknown> = { path, status, method }
    if (userId) context.userId = userId
    if (orgId) context.orgId = orgId
    Object.assign(context, correlation)
    if (params) context.params = params
    if (bodySnippet) context.bodySnippet = bodySnippet
    if (causes.length > 0) context.causes = causes
    if (responseBody) context.responseBody = responseBody

    this.errorReporter.report({
      app: this.appName,
      severity: status >= 500 ? 'error' : 'warn',
      feature: 'http',
      error_code: `http_${status}`,
      message: `${path} — ${msg}`,
      category: status === 503 ? 'infra' : 'http',
      context,
      stack: exception instanceof Error ? exception.stack : undefined,
      user_id: userId,
      trace_id: correlation.trace_id,
      message_id: correlation.message_id,
      request_id: correlation.request_id,
      run_id: correlation.run_id,
      conversation_id: correlation.conversation_id,
    })
  }
}
