import { Injectable } from '@nestjs/common'
import { ArtifactAnalyticsRepository } from '../repositories/artifact-analytics.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { sourceTruthAsOf, withSourceTruth } from './artifact-source-truth-contract'

@Injectable()
export class ArtifactAnalyticsService {
  constructor(
    private readonly repository: ArtifactAnalyticsRepository = new ArtifactAnalyticsRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      get_daily_report_data: (data, sessionKey) =>
        this.getDailyReportData(target, data, sessionKey),
      get_campaign_main_dashboard: (data, sessionKey) =>
        this.getCampaignMainDashboard(target, data, sessionKey),
      get_campaign_social_analytics: (data, sessionKey) =>
        this.getCampaignSocialAnalytics(target, data, sessionKey),
      get_campaign_stripe_overview: (data, sessionKey) =>
        this.getCampaignStripeOverview(target, data, sessionKey),
    }
  }

  private async getDailyReportData(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return {
        success: false,
        error: 'campaign_id required. Select a campaign first or pass campaign_id in data.',
      }
    }

    const hours = Math.min(168, Math.max(1, Number(input.hours) || 24))
    const end = new Date()
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000)
    const startIso = start.toISOString()
    const endIso = end.toISOString()

    const {
      funnelsRes,
      emailsRes,
      adsRes,
      createdCount,
      publishedCount,
      scheduledCount,
      totalSocial,
    } = await this.repository.getDailyReportData(supabase, { campaignId, startIso, endIso })

    if (funnelsRes.error) {
      target.logger?.error?.(
        `[get_daily_report_data] get_campaign_analytics: ${funnelsRes.error.message}`,
      )
    }
    if (emailsRes.error) {
      target.logger?.error?.(
        `[get_daily_report_data] get_campaign_email_analytics: ${emailsRes.error.message}`,
      )
    }
    if (adsRes.error) {
      target.logger?.error?.(
        `[get_daily_report_data] get_campaign_ad_analytics: ${adsRes.error.message}`,
      )
    }

    let metaInsights: unknown = null
    const getMetaHandler = target.actionRegistry?.get_meta_ads_insights
    if (getMetaHandler) {
      try {
        metaInsights = await getMetaHandler(
          { campaign_id: campaignId, level: 'campaign' },
          sessionKey,
        )
      } catch (e) {
        target.logger?.warn?.(
          `[get_daily_report_data] get_meta_ads_insights: ${(e as Error).message}`,
        )
      }
    }

    return {
      period: { start: startIso, end: endIso, hours },
      campaign_id: campaignId,
      funnels: funnelsRes.data ?? null,
      emails: emailsRes.data ?? null,
      ads: adsRes.data ?? null,
      meta_insights: metaInsights,
      social: {
        created_24h: createdCount,
        published_24h: publishedCount,
        scheduled_24h: scheduledCount,
        total: totalSocial,
      },
    }
  }

  private async resolveCampaignIdOrError(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<{ campaignId: string } | { error: string }> {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return {
        error: 'campaign_id required. Select a campaign first or pass campaign_id in data.',
      }
    }
    return { campaignId }
  }

  /**
   * Agent-facing wrapper around GET /api/campaigns/:id/main-dashboard.
   * Reuses MainDashboardService on apps/api (shared 60s cache + partial-failure handling),
   * so agents see the exact numbers rendered on the Studio dashboard.
   */
  private async getCampaignMainDashboard(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCampaignIdOrError(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }

    const params = new URLSearchParams()
    const since = typeof input.since === 'string' ? input.since.trim() : ''
    const until = typeof input.until === 'string' ? input.until.trim() : ''
    const refresh = input.refresh === true || input.refresh === 'true' || input.refresh === 1
    if (since) params.set('since', since)
    if (until) params.set('until', until)
    if (refresh) params.set('refresh', '1')
    const qs = params.toString()

    try {
      const data = await target.mainApiCall(
        'GET',
        `/api/campaigns/${resolved.campaignId}/main-dashboard${qs ? `?${qs}` : ''}`,
        sessionKey,
      )
      const record: Record<string, unknown> =
        data && typeof data === 'object' && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : { data }
      return withSourceTruth(record, {
        canonical_source: {
          system: 'campaign_reporting',
          owner: 'main_dashboard',
          mutable: true,
          campaign_id: resolved.campaignId,
        },
        as_of: sourceTruthAsOf(record.fetched_at ?? record.generated_at),
        evidence: [
          {
            action: 'get_campaign_main_dashboard',
            campaign_id: resolved.campaignId,
            refresh_requested: refresh,
          },
        ],
        brain_context: null,
      })
    } catch (err) {
      target.logger?.error?.(`[get_campaign_main_dashboard] ${(err as Error).message}`)
      return { success: false, error: (err as Error).message }
    }
  }

  /**
   * Agent-facing wrapper around GET /api/campaigns/:id/social-analytics.
   * Returns per-platform reach, engagement, follower growth, and per-post rows.
   */
  private async getCampaignSocialAnalytics(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const platformRaw = typeof input.platform === 'string' ? input.platform.trim().toLowerCase() : ''
    if (platformRaw !== 'instagram' && platformRaw !== 'linkedin') {
      return {
        success: false,
        error: 'platform must be "instagram" or "linkedin"',
      }
    }

    const resolved = await this.resolveCampaignIdOrError(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }

    const params = new URLSearchParams()
    params.set('platform', platformRaw)
    const since = typeof input.since === 'string' ? input.since.trim() : ''
    const until = typeof input.until === 'string' ? input.until.trim() : ''
    const refresh = input.refresh === true || input.refresh === 'true' || input.refresh === 1
    if (since) params.set('since', since)
    if (until) params.set('until', until)
    if (refresh) params.set('refresh', '1')

    try {
      const data = await target.mainApiCall(
        'GET',
        `/api/campaigns/${resolved.campaignId}/social-analytics?${params.toString()}`,
        sessionKey,
      )
      return data
    } catch (err) {
      target.logger?.error?.(`[get_campaign_social_analytics] ${(err as Error).message}`)
      return { success: false, error: (err as Error).message }
    }
  }

  /**
   * Agent-facing wrapper around GET /api/integrations/stripe/analytics/campaign-overview.
   * Returns gross, refunds, fees, net, refund_rate, and daily chart points.
   * When Stripe isn't connected, the underlying service returns a structured failure
   * instead of throwing — surfaced here as { success: false, connected: false }.
   */
  private async getCampaignStripeOverview(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.resolveCampaignIdOrError(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }

    const params = new URLSearchParams()
    params.set('campaign_id', resolved.campaignId)

    // Accept either unix seconds (native to the Stripe endpoint) or ISO dates,
    // so agents can speak in either timezone-agnostic or epoch terms.
    const fromUnix =
      typeof input.from_unix === 'number'
        ? input.from_unix
        : typeof input.from_unix === 'string' && input.from_unix.trim() !== ''
          ? Number(input.from_unix)
          : typeof input.since === 'string' && input.since.trim() !== ''
            ? Math.floor(Date.parse(input.since) / 1000)
            : null
    const toUnix =
      typeof input.to_unix === 'number'
        ? input.to_unix
        : typeof input.to_unix === 'string' && input.to_unix.trim() !== ''
          ? Number(input.to_unix)
          : typeof input.until === 'string' && input.until.trim() !== ''
            ? Math.floor(Date.parse(input.until) / 1000)
            : null
    if (fromUnix !== null && Number.isFinite(fromUnix)) params.set('from', String(fromUnix))
    if (toUnix !== null && Number.isFinite(toUnix)) params.set('to', String(toUnix))

    try {
      const data = await target.mainApiCall(
        'GET',
        `/api/integrations/stripe/analytics/campaign-overview?${params.toString()}`,
        sessionKey,
      )
      return data
    } catch (err) {
      const msg = (err as Error).message
      target.logger?.error?.(`[get_campaign_stripe_overview] ${msg}`)
      if (/stripe.*(not|no).*connect/i.test(msg) || /unauthorized/i.test(msg)) {
        return { success: false, connected: false, error: msg }
      }
      return { success: false, error: msg }
    }
  }
}
