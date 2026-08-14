import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Job } from 'bullmq'
import { WorkerLoggerService } from '../../logger/logger.service'
import { AGENT_RUNTIME_BRAIN_IMPORT_QUEUE } from '../types/agent-runtime.types'

const BRAIN_IMPORT_CONCURRENCY = readPositiveInt(
  process.env.AGENT_RUNTIME_BRAIN_IMPORT_CONCURRENCY,
  3,
)

type BrainImportRuntimeJobData = {
  jobId?: string
}

type BrainImportRuntimeRequestOptions = {
  apiName: string
  errorCode: string
  targetOrigin: string
  path: string
  headers: Record<string, string>
  body: Record<string, unknown>
  brainImportJobId?: string
  maxAttempts: number
  retryDelayMs: number
}

type BrainImportRuntimeRequestContext = {
  apiName: string
  path: string
  targetOrigin: string
  targetUrl: string
  attempt: number
  maxAttempts: number
  retryable: boolean
  status?: number
  responsePreview?: string
  brainImportJobId?: string
}

const RETRYABLE_MAIN_API_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524])
const RETRYABLE_FETCH_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
])

class BrainImportRuntimeRequestError extends Error {
  constructor(
    message: string,
    readonly context: BrainImportRuntimeRequestContext,
  ) {
    super(message)
    this.name = 'BrainImportRuntimeRequestError'
  }
}

@Processor(AGENT_RUNTIME_BRAIN_IMPORT_QUEUE, {
  concurrency: BRAIN_IMPORT_CONCURRENCY,
  lockDuration: 5_000_000,
  stalledInterval: 120_000,
})
export class AgentRuntimeBrainImportProcessor extends WorkerHost {
  private readonly logger = new Logger(AgentRuntimeBrainImportProcessor.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly workerLogger: WorkerLoggerService,
  ) {
    super()
  }

  async process(job: Job<BrainImportRuntimeJobData>): Promise<void> {
    try {
      if (job.name === 'brain-import-sweep') {
        await this.postMainApi('/api/internal/brain/import-jobs/enqueue-due', {})
        return
      }

      if (job.name === 'page-grader-brain-sync-sweep') {
        await this.postMainApi('/api/internal/page-grader/brain-sync/catch-up?limit=50', {})
        return
      }

      if (job.name !== 'brain-import-job') {
        throw new Error(`Unsupported brain import runtime job: ${job.name}`)
      }

      const jobId = String(job.data?.jobId ?? '').trim()
      if (!jobId) {
        this.logger.warn(`Skipping brain import runtime job ${job.id}: missing job id`)
        return
      }

      await this.postAgentApi(
        `/api/internal/brain/import-jobs/${encodeURIComponent(jobId)}/execute`,
        { jobId },
        jobId,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const requestContext = err instanceof BrainImportRuntimeRequestError ? err.context : {}
      await this.workerLogger.logError({
        app: 'mission-worker',
        severity: 'error',
        feature: 'brain/import_jobs',
        error_code: 'processor_failed',
        message,
        context: {
          bullJobId: job.id,
          jobName: job.name,
          attemptsMade: job.attemptsMade,
          brainImportJobId: job.data?.jobId,
          ...requestContext,
        },
        stack: err instanceof Error ? err.stack : undefined,
      })
      throw err
    }
  }

  private async postMainApi(
    path: string,
    body: Record<string, unknown>,
    brainImportJobId?: string,
  ): Promise<void> {
    const token = this.internalToken()
    if (!token) {
      throw new Error('INTERNAL_API_TOKEN is required for brain import runtime execution')
    }

    await this.postRuntimeApi({
      apiName: 'Main API',
      errorCode: 'main_api_request_failed',
      targetOrigin: this.mainApiUrl(),
      path,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
      brainImportJobId,
      maxAttempts: this.mainApiMaxAttempts(),
      retryDelayMs: this.mainApiRetryDelayMs(),
    })
  }

  private async postAgentApi(
    path: string,
    body: Record<string, unknown>,
    brainImportJobId?: string,
  ): Promise<void> {
    const token = this.internalToken()
    if (!token) {
      throw new Error('INTERNAL_API_TOKEN is required for brain import runtime execution')
    }

    await this.postRuntimeApi({
      apiName: 'Agent API',
      errorCode: 'agent_api_request_failed',
      targetOrigin: this.agentApiUrl(),
      path,
      headers: {
        'x-internal-token': token,
        'Content-Type': 'application/json',
      },
      body,
      brainImportJobId,
      maxAttempts: 1,
      retryDelayMs: 0,
    })
  }

  private async postRuntimeApi(options: BrainImportRuntimeRequestOptions): Promise<void> {
    const maxAttempts = Math.max(1, options.maxAttempts)
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.postRuntimeApiOnce({ ...options, maxAttempts }, attempt)
        return
      } catch (err) {
        if (!(err instanceof BrainImportRuntimeRequestError)) {
          throw err
        }

        if (!err.context.retryable || attempt >= maxAttempts) {
          await this.workerLogger.logError({
            app: 'mission-worker',
            severity: 'error',
            feature: 'brain/import_jobs',
            error_code: options.errorCode,
            message: err.message,
            context: err.context,
            stack: err.stack,
          })
          throw err
        }

        this.logger.warn(
          `${options.apiName} brain import request failed path=${options.path} attempt=${attempt}/${maxAttempts}; retrying`,
        )
        await sleep(options.retryDelayMs)
      }
    }
  }

  private async postRuntimeApiOnce(
    options: BrainImportRuntimeRequestOptions,
    attempt: number,
  ): Promise<void> {
    const targetUrl = `${options.targetOrigin}${options.path}`
    let response: Response
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: options.headers,
        body: JSON.stringify(options.body),
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      throw this.createRequestError(options, attempt, undefined, detail, isRetryableFetchError(err))
    }

    if (!response.ok) {
      const raw = await response.text().catch(() => '')
      const preview = raw ? raw.slice(0, 500) : `status ${response.status}`
      throw this.createRequestError(
        options,
        attempt,
        response.status,
        preview,
        RETRYABLE_MAIN_API_STATUS.has(response.status),
      )
    }
  }

  private createRequestError(
    options: BrainImportRuntimeRequestOptions,
    attempt: number,
    status: number | undefined,
    detail: string,
    retryable: boolean,
  ): BrainImportRuntimeRequestError {
    const context: BrainImportRuntimeRequestContext = {
      apiName: options.apiName,
      path: options.path,
      targetOrigin: options.targetOrigin,
      targetUrl: `${options.targetOrigin}${options.path}`,
      attempt,
      maxAttempts: options.maxAttempts,
      retryable,
      ...(status !== undefined ? { status } : {}),
      ...(detail ? { responsePreview: detail.slice(0, 500) } : {}),
      ...(options.brainImportJobId ? { brainImportJobId: options.brainImportJobId } : {}),
    }
    const statusSegment = status === undefined ? '' : ` status=${status}`
    return new BrainImportRuntimeRequestError(
      `${options.apiName} brain import runtime request failed path=${options.path} origin=${options.targetOrigin}${statusSegment} attempt=${attempt}/${options.maxAttempts}: ${detail || 'request failed'}`,
      context,
    )
  }

  private mainApiUrl(): string {
    const configured =
      this.configService.get<string>('missionApi.mainApiUrl') ||
      process.env.MAIN_API_URL ||
      process.env.API_URL ||
      process.env.BACKEND_URL ||
      ''
    if (configured.trim()) {
      return configured.trim().replace(/\/$/, '')
    }

    const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
    if (callbackUrl.trim()) {
      return callbackUrl.trim().replace(/\/api\/internal\/missions\/callback\/?$/, '')
    }

    return 'http://localhost:3001'
  }

  private agentApiUrl(): string {
    const configured =
      this.configService.get<string>('missionApi.agentApiUrl') ||
      process.env.AGENT_API_URL ||
      'http://localhost:3003'
    return configured.trim().replace(/\/+$/, '')
  }

  private internalToken(): string {
    return (
      this.configService.get<string>('missionApi.internalToken') ||
      process.env.INTERNAL_API_TOKEN ||
      ''
    ).trim()
  }

  private mainApiMaxAttempts(): number {
    return readPositiveInt(process.env.AGENT_RUNTIME_BRAIN_IMPORT_MAIN_API_MAX_ATTEMPTS, 2)
  }

  private mainApiRetryDelayMs(): number {
    return Math.max(
      0,
      readPositiveInt(process.env.AGENT_RUNTIME_BRAIN_IMPORT_MAIN_API_RETRY_DELAY_MS, 250),
    )
  }
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = parseInt(raw || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function isRetryableFetchError(error: unknown): boolean {
  const code = getErrorCode(error)
  if (code && RETRYABLE_FETCH_ERROR_CODES.has(code)) return true
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes('fetch failed') ||
    message.includes('socket hang up') ||
    message.includes('network') ||
    message.includes('terminated')
  )
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const code = (error as { code?: unknown }).code
  if (typeof code === 'string') return code
  const causeCode = (error as { cause?: { code?: unknown } }).cause?.code
  return typeof causeCode === 'string' ? causeCode : null
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}
