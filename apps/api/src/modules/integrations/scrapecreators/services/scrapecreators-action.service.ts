import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import { CreditsService } from '../../../billing/services/credits.service'
import { scrapecreatorsCreditsForAction } from '../scrapecreators.constants'
import { ScrapeCreatorsApiService } from './scrapecreators-api.service'

export type ScrapeCreatorsRawQuery = Record<string, string | string[] | undefined>

type RequiredOptions = {
  required?: string | string[]
  requiredAny?: string[]
  requiredMessage?: string
}

@Injectable()
export class ScrapeCreatorsActionService {
  private readonly logger = new Logger(ScrapeCreatorsActionService.name)

  constructor(
    private readonly api: ScrapeCreatorsApiService,
    private readonly credits: CreditsService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  pickQuery(q: ScrapeCreatorsRawQuery, keys: string[]) {
    const out: Record<string, string> = {}
    for (const k of keys) {
      const v = q[k]
      const s = Array.isArray(v) ? v[0] : v
      if (typeof s === 'string' && s.trim() !== '') out[k] = s.trim()
    }
    return out
  }

  badRequest(message: string): never {
    throw new HttpException({ success: false, error: message }, HttpStatus.BAD_REQUEST)
  }

  async runPicked(
    userId: string,
    actionSlug: string,
    upstreamPath: string,
    rawQuery: ScrapeCreatorsRawQuery,
    keys: string[],
    orgId?: string,
    options: RequiredOptions = {},
  ) {
    const query = this.pickQuery(rawQuery, keys)
    this.assertRequired(query, options)
    return this.run(userId, actionSlug, upstreamPath, query, orgId)
  }

  async run(
    userId: string,
    actionSlug: string,
    upstreamPath: string,
    query: Record<string, string>,
    orgId?: string,
  ) {
    const { status, body } = await this.api.forwardGet(upstreamPath, query)
    if (status < 200 || status >= 300) {
      const msg =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message?: unknown }).message)
          : typeof body === 'string'
            ? body
            : `Social Analysis error (${status})`
      const httpError = new HttpException({ success: false, error: msg, status }, status)
      reportAppError(
        this.errorReporter,
        {
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'integrations/scrapecreators',
          error_code: `upstream_http_${status}`,
          message: msg,
          user_id: userId,
          context: { actionSlug, upstreamPath, status, orgId: orgId ?? null },
        },
        httpError,
      )
      throw httpError
    }

    const creditUnits = scrapecreatorsCreditsForAction(actionSlug)
    try {
      await this.credits.processDirectTextUsage({
        userId,
        orgId,
        feature: 'scrapecreators',
        action: actionSlug,
        modelName: `scrapecreators/${actionSlug}`,
        usage: {
          input: creditUnits,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: creditUnits,
        },
        costSource: 'scrapecreators_flat',
      })
    } catch (err) {
      this.logger.warn(
        `scrapecreators credit charge failed action=${actionSlug} user=${userId} err=${err instanceof Error ? err.message : String(err)}`,
      )
      throw err
    }

    return { success: true, action: actionSlug, data: body }
  }

  private assertRequired(query: Record<string, string>, options: RequiredOptions) {
    const required = Array.isArray(options.required) ? options.required : [options.required]
    for (const key of required.filter(Boolean) as string[]) {
      if (!query[key]) this.badRequest(options.requiredMessage ?? `${key} is required`)
    }
    if (options.requiredAny?.length && !options.requiredAny.some((key) => query[key])) {
      this.badRequest(
        options.requiredMessage ?? `${options.requiredAny.join(' or ')} is required`,
      )
    }
  }
}
