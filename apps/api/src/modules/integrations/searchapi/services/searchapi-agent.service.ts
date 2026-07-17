import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import { CreditsService } from '../../../billing/services/credits.service'
import {
  SEARCHAPI_ACTION_ENGINES,
  searchApiCreditsForAction,
  type SearchApiAgentAction,
} from '../searchapi.constants'
import { SearchApiService } from './searchapi-api.service'

@Injectable()
export class SearchApiAgentService {
  private readonly logger = new Logger(SearchApiAgentService.name)

  constructor(
    private readonly api: SearchApiService,
    private readonly credits: CreditsService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  async run(
    userId: string,
    actionSlug: SearchApiAgentAction,
    params: Record<string, unknown>,
    orgId?: string,
  ) {
    const engine = SEARCHAPI_ACTION_ENGINES[actionSlug]
    if (!engine) {
      throw new HttpException(
        { success: false, error: `Unknown Ads Intelligence action: ${actionSlug}` },
        HttpStatus.BAD_REQUEST,
      )
    }

    const query = this.toQueryParams(actionSlug, params)
    const { status, body } = await this.api.search(engine, query)

    if (status < 200 || status >= 300) {
      const msg =
        typeof body === 'object' && body !== null && 'error' in body
          ? String((body as { error?: unknown }).error)
          : `Ads Intelligence error (${status})`
      const httpError = new HttpException({ success: false, error: msg, status }, status)
      reportAppError(
        this.errorReporter,
        {
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'integrations/searchapi',
          error_code: `upstream_http_${status}`,
          message: msg,
          user_id: userId,
          context: { actionSlug, engine, status, orgId: orgId ?? null },
        },
        httpError,
      )
      throw httpError
    }

    const creditUnits = searchApiCreditsForAction(actionSlug)
    try {
      await this.credits.processDirectTextUsage({
        userId,
        orgId,
        feature: 'searchapi',
        action: actionSlug,
        modelName: `searchapi/${actionSlug}`,
        usage: {
          input: creditUnits,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: creditUnits,
        },
        costSource: 'searchapi_flat',
      })
    } catch (err) {
      this.logger.warn(
        `searchapi credit charge failed action=${actionSlug} user=${userId} err=${err instanceof Error ? err.message : String(err)}`,
      )
      throw err
    }

    return { success: true, action: actionSlug, engine, data: body }
  }

  private toQueryParams(
    actionSlug: SearchApiAgentAction,
    params: Record<string, unknown>,
  ): Record<string, string | undefined | null> {
    const pick = (key: string): string | undefined => {
      const value = params[key]
      if (value === undefined || value === null) return undefined
      const text = String(value).trim()
      return text.length > 0 ? text : undefined
    }

    if (actionSlug === 'meta_ads_page_search' || actionSlug.endsWith('_advertiser_search')) {
      const q = pick('q') ?? pick('query')
      if (!q) {
        throw new HttpException(
          { success: false, error: 'q (or query) is required' },
          HttpStatus.BAD_REQUEST,
        )
      }
      return { q }
    }

    if (actionSlug === 'meta_ads_search') {
      const pageId = pick('page_id') ?? pick('pageId')
      const q = pick('q') ?? pick('query')
      if (!pageId && !q) {
        throw new HttpException(
          { success: false, error: 'page_id or q is required' },
          HttpStatus.BAD_REQUEST,
        )
      }
      return {
        page_id: pageId,
        q,
        active_status: pick('active_status') ?? 'all',
        country: pick('country'),
        next_page_token: pick('next_page_token'),
      }
    }

    if (actionSlug === 'tiktok_ads_search') {
      const advertiserToken = pick('advertiser_token') ?? pick('advertiserToken')
      const q = pick('q') ?? pick('query')
      if (!advertiserToken && !q) {
        throw new HttpException(
          { success: false, error: 'advertiser_token or q is required' },
          HttpStatus.BAD_REQUEST,
        )
      }
      return {
        advertiser_token: advertiserToken,
        q,
        sort_by: pick('sort_by') ?? 'unique_users_seen_high_to_low',
        country: pick('country'),
        next_page_token: pick('next_page_token'),
      }
    }

    if (actionSlug === 'google_ads_search') {
      const advertiserId = pick('advertiser_id') ?? pick('advertiserId')
      if (!advertiserId) {
        throw new HttpException(
          { success: false, error: 'advertiser_id is required for Google ads search' },
          HttpStatus.BAD_REQUEST,
        )
      }
      return {
        advertiser_id: advertiserId,
        region: pick('region') ?? pick('country'),
        next_page_token: pick('next_page_token'),
      }
    }

    if (actionSlug === 'meta_ad_details') {
      const adId = pick('ad_id') ?? pick('adId') ?? pick('ad_archive_id')
      const token = pick('ad_details_token') ?? pick('details_token')
      if (!token && !adId) {
        throw new HttpException(
          { success: false, error: 'ad_details_token or ad_id is required' },
          HttpStatus.BAD_REQUEST,
        )
      }
      return {
        ad_details_token: token,
        ad_archive_id: adId,
      }
    }

    if (actionSlug === 'tiktok_ad_details') {
      const adId = pick('ad_id') ?? pick('adId')
      if (!adId) {
        throw new HttpException(
          { success: false, error: 'ad_id is required' },
          HttpStatus.BAD_REQUEST,
        )
      }
      return { ad_id: adId }
    }

    if (actionSlug === 'google_ad_details') {
      const advertiserId = pick('advertiser_id') ?? pick('advertiserId')
      const creativeId = pick('creative_id') ?? pick('ad_id') ?? pick('adId')
      if (!advertiserId || !creativeId) {
        throw new HttpException(
          { success: false, error: 'advertiser_id and creative_id (or ad_id) are required' },
          HttpStatus.BAD_REQUEST,
        )
      }
      return { advertiser_id: advertiserId, creative_id: creativeId }
    }

    return {}
  }
}
