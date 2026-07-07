export interface LogErrorParams {
  severity: 'error' | 'warn' | 'critical' | 'info'
  feature: string
  error_code: string
  message: string
  context?: Record<string, any>
  stack?: string
  user_id?: string
}
export declare class LoggerService {
  private readonly logger
  logError(params: LogErrorParams): Promise<void>
}
