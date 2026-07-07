import { Injectable, Logger as NestLogger } from '@nestjs/common'
import { ErrorReporter } from './error-reporter.service'

export interface LogErrorParams {
  severity: 'error' | 'warn' | 'critical' | 'info'
  feature: string
  error_code: string
  message: string
  context?: Record<string, any>
  stack?: string
  user_id?: string
  trace_id?: string | null
  message_id?: string | null
  request_id?: string | null
  run_id?: string | null
  conversation_id?: string | null
}

@Injectable()
export class LoggerService {
  private readonly logger = new NestLogger(LoggerService.name)

  constructor(private readonly errorReporter: ErrorReporter) {}

  async logError(params: LogErrorParams): Promise<void> {
    this.logger.error(
      `[${params.severity.toUpperCase()}] ${params.feature}/${params.error_code}: ${params.message}`,
      params.context ? JSON.stringify(params.context) : undefined,
    )
    const app = process.env.APP_NAME ?? 'api'
    const severity =
      params.severity === 'critical'
        ? 'critical'
        : params.severity === 'warn' || params.severity === 'info'
          ? 'warn'
          : 'error'
    this.errorReporter.report({
      app,
      severity,
      feature: params.feature,
      error_code: params.error_code,
      message: params.message,
      context: params.context,
      stack: params.stack,
      user_id: params.user_id,
      trace_id: params.trace_id,
      message_id: params.message_id,
      request_id: params.request_id,
      run_id: params.run_id,
      conversation_id: params.conversation_id,
    })
  }
}
