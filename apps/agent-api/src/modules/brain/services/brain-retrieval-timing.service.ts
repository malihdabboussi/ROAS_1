import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class BrainRetrievalTimingService {
  private readonly logger = new Logger(BrainRetrievalTimingService.name)

  async timeRetrievalStage<T>(
    stage: string,
    meta: Record<string, unknown>,
    operation: () => Promise<T>,
    resultMeta?: (value: T) => Record<string, unknown>,
  ): Promise<T> {
    const startedAt = Date.now()
    try {
      const value = await operation()
      this.logRetrievalTiming(stage, meta, Date.now() - startedAt, resultMeta?.(value))
      return value
    } catch (err) {
      this.logRetrievalTiming(stage, meta, Date.now() - startedAt, {
        status: 'error',
        error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
      })
      throw err
    }
  }

  timeRetrievalSyncStage<T>(
    stage: string,
    meta: Record<string, unknown>,
    operation: () => T,
    resultMeta?: (value: T) => Record<string, unknown>,
  ): T {
    const startedAt = Date.now()
    try {
      const value = operation()
      this.logRetrievalTiming(stage, meta, Date.now() - startedAt, resultMeta?.(value))
      return value
    } catch (err) {
      this.logRetrievalTiming(stage, meta, Date.now() - startedAt, {
        status: 'error',
        error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
      })
      throw err
    }
  }

  logRetrievalTiming(
    stage: string,
    meta: Record<string, unknown>,
    latencyMs: number,
    extra?: Record<string, unknown>,
  ): void {
    if (!this.retrievalTimingLogsEnabled()) return
    this.logger.log(
      JSON.stringify({
        feature: 'brain_retrieval_timing_v1',
        stage,
        latency_ms: latencyMs,
        ...meta,
        ...(extra ?? {}),
      }),
    )
  }

  retrievalTimingLogsEnabled(): boolean {
    const setting = process.env.BRAIN_RETRIEVAL_TIMING_LOGS
    if (setting === undefined) return false
    return !['0', 'false', 'off', 'no'].includes(setting.toLowerCase())
  }
}
