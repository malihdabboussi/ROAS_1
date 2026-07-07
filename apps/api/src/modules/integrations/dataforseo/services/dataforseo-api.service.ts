import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'

const DEFAULT_TIMEOUT_MS = 45_000

@Injectable()
export class DataForSeoApiService {
  private readonly logger = new Logger(DataForSeoApiService.name)
  private readonly baseUrl = 'https://api.dataforseo.com'

  constructor(
    private readonly config: ConfigService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  private getCredentials(): { login: string; password: string } {
    const login =
      this.config.get<string>('DATAFORSEO_LOGIN') ?? process.env.DATAFORSEO_LOGIN ?? ''
    const password =
      this.config.get<string>('DATAFORSEO_PASSWORD') ?? process.env.DATAFORSEO_PASSWORD ?? ''
    return { login: login.trim(), password: password.trim() }
  }

  async forwardPost(
    upstreamPath: string,
    task: Record<string, unknown>,
  ): Promise<{ status: number; body: unknown }> {
    const { login, password } = this.getCredentials()
    if (!login || !password) {
      throw new Error('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are not configured')
    }

    const path = upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([task]),
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
      this.logger.warn(`SEO Research request failed path=${path} err=${message}`)
      reportAppError(
        this.errorReporter,
        {
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'integrations/dataforseo',
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
