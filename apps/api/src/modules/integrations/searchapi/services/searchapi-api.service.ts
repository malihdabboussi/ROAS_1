import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'

const DEFAULT_TIMEOUT_MS = 45_000

/**
 * Thin client for SearchAPI.io (ad library engines). Every call is one billed
 * search — callers are responsible for snapshotting results so reopening a
 * saved search never re-hits this service.
 */
@Injectable()
export class SearchApiService {
  private readonly logger = new Logger(SearchApiService.name)
  private readonly baseUrl = 'https://www.searchapi.io/api/v1/search'

  constructor(
    private readonly config: ConfigService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  private getApiKey(): string {
    const key = this.config.get<string>('SEARCHAPI_API_KEY') ?? process.env.SEARCHAPI_API_KEY ?? ''
    return key.trim()
  }

  /**
   * GET https://www.searchapi.io/api/v1/search?engine=...&... — returns the
   * parsed JSON body. Empty params are dropped.
   */
  async search(
    engine: string,
    params: Record<string, string | undefined | null>,
  ): Promise<{ status: number; body: unknown }> {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      throw new Error('SEARCHAPI_API_KEY is not configured')
    }

    const url = new URL(this.baseUrl)
    url.searchParams.set('engine', engine)
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        url.searchParams.set(k, String(v))
      }
    }

    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      })

      const text = await response.text()
      let body: unknown = text
      try {
        body = text ? (JSON.parse(text) as unknown) : null
      } catch {
        body = text
      }

      if (response.status < 200 || response.status >= 300) {
        const message =
          typeof body === 'object' && body !== null && 'error' in body
            ? String((body as { error?: unknown }).error)
            : `SearchAPI error (${response.status})`
        reportAppError(this.errorReporter, {
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'integrations/searchapi',
          error_code: `upstream_http_${response.status}`,
          message,
          context: { engine, status: response.status },
        })
      }

      return { status: response.status, body }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.warn(`SearchAPI request failed engine=${engine} err=${message}`)
      reportAppError(
        this.errorReporter,
        {
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'integrations/searchapi',
          error_code: 'network_failed',
          message,
          stack: err instanceof Error ? err.stack : undefined,
          context: { engine },
        },
        err,
      )
      throw err
    } finally {
      clearTimeout(t)
    }
  }
}
