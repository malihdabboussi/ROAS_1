import { Injectable, Logger as NestLogger } from '@nestjs/common'
import { SupabaseServiceClient } from '../services/supabase-service-client.provider'
import { normalizeRequestTraceEvent } from './source-code-pointer'
import type { RequestTraceEventInput } from './types'

@Injectable()
export class RouteTraceReporter {
  private readonly logger = new NestLogger(RouteTraceReporter.name)
  private warnedUnavailable = false

  constructor(private readonly svc: SupabaseServiceClient) {}

  report(input: RequestTraceEventInput): void {
    this.reportNow(input).catch((err: unknown) => {
      this.warnOnce(`request_trace_events insert threw: ${this.formatError(err)}`)
    })
  }

  async reportNow(input: RequestTraceEventInput): Promise<void> {
    const row = normalizeRequestTraceEvent(input)
    const { error } = await this.svc.client.from('request_trace_events').insert(row)
    if (error) {
      this.warnOnce(`Failed to persist request_trace_event: ${error.message}`)
    }
  }

  private warnOnce(message: string): void {
    if (this.warnedUnavailable) return
    this.warnedUnavailable = true
    this.logger.warn(message)
  }

  private formatError(err: unknown): string {
    return err instanceof Error ? err.message : String(err)
  }
}
