import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'

const DEFAULT_TIMEOUT_MS = 45_000

@Injectable()
export class ScrapeCreatorsApiService {
  private readonly logger = new Logger(ScrapeCreatorsApiService.name)
  private readonly baseUrl = 'https://api.scrapecreators.com'

  constructor(
    private readonly config: ConfigService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  private getApiKey(): string {
    const key =
      this.config.get<string>('SCRAPECREATORS_API_KEY') ?? process.env.SCRAPECREATORS_API_KEY ?? ''
    return key.trim()
  }

  /**
   * GET upstream path (e.g. /v1/tiktok/profile) with query string params.
   */
  async forwardGet(
    upstreamPath: string,
    query: Record<string, string>,
  ): Promise<{ status: number; body: unknown }> {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      throw new Error('SCRAPECREATORS_API_KEY is not configured')
    }

    const path = upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [k, v] of Object.entries(query)) {
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
          'x-api-key': apiKey,
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

      return { status: response.status, body }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Social Analysis request failed path=${path} err=${message}`)
      reportAppError(
        this.errorReporter,
        {
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'integrations/scrapecreators',
          error_code: 'network_failed',
          message,
          stack: err instanceof Error ? err.stack : undefined,
          context: { upstreamPath: path },
        },
        err,
      )
      throw err
    } finally {
      clearTimeout(t)
    }
  }
}
