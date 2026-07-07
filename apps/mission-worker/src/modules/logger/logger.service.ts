import { Injectable, Logger as NestLogger } from '@nestjs/common'
import { ErrorReporter } from './error-reporter'

export interface LogErrorParams {
  app: 'mission-worker'
  severity: 'error' | 'warning' | 'critical' | 'info'
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
export class WorkerLoggerService {
  private readonly logger = new NestLogger(WorkerLoggerService.name)

  constructor(private readonly errorReporter: ErrorReporter) {}

  async logError(params: LogErrorParams): Promise<void> {
    const logLevel =
      params.severity === 'critical' || params.severity === 'error'
        ? 'error'
        : params.severity === 'warning'
          ? 'warn'
          : 'log'
    ;(this.logger as any)[logLevel](
      `[${params.feature}] ${params.error_code}: ${params.message}`,
      params.context,
    )

    this.errorReporter.report({
      app: params.app,
      severity:
        params.severity === 'warning'
          ? 'warn'
          : params.severity === 'critical'
            ? 'critical'
            : 'error',
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
      category: 'worker',
    })
  }
}
