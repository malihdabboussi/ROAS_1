import type { SupabaseClient } from '@supabase/supabase-js'
import type { IntegrationContext, SocialAnalyticsAccountMetrics, SocialAnalyticsChartPoint, SocialPostRow } from './social-insights.shared'
import { EMPTY_ACCOUNT_METRICS } from './social-insights.shared'
import { SocialInsightsInstagramBase } from './social-insights-instagram.base'

export class SocialInsightsLinkedInBase extends SocialInsightsInstagramBase {


  protected async fetchLinkedInAccount(
    integration: IntegrationContext,
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    since: string | undefined,
    until: string | undefined,
  ): Promise<{ account: SocialAnalyticsAccountMetrics; chart: SocialAnalyticsChartPoint[] }> {
    const orgUrn = this.extractLinkedInOrgUrn(integration.metadata)
    if (!orgUrn) {
      // Without an organization URN we cannot pull page/share stats.
      // Signal upward so the caller marks the response partial.
      void supabase
      void userId
      void campaignId
      throw new Error('missing_linkedin_org_urn')
    }

    const shareStatsArgs: Record<string, unknown> = { organizational_entity: orgUrn }
    if (since && until) {
      const start = Date.parse(since)
      const end = Date.parse(until)
      if (Number.isFinite(start) && Number.isFinite(end)) {
        shareStatsArgs.time_intervals = `(timeRange:(start:${start},end:${end}),timeGranularityType:DAY)`
      }
    }

    const shareStats = (await this.composio.executeTool(
      'LINKEDIN_GET_SHARE_STATS',
      integration.composioUserId,
      shareStatsArgs,
      integration.connectedAccountId ?? undefined,
    )) as Record<string, unknown> | null

    const pageStats = (await this.composio
      .executeTool(
        'LINKEDIN_GET_ORG_PAGE_STATS',
        integration.composioUserId,
        { organization: orgUrn },
        integration.connectedAccountId ?? undefined,
      )
      .catch((err) => {
        this.logger.warn(
          `[social-insights] LINKEDIN_GET_ORG_PAGE_STATS failed: ${err instanceof Error ? err.message : 'unknown'}`,
        )
        return null
      })) as Record<string, unknown> | null

    const account = this.parseLinkedInAccount(shareStats, pageStats)
    const chart = this.buildLinkedInChartData(shareStats)

    try {
      const networkRes = (await this.composio.executeTool(
        'LINKEDIN_GET_NETWORK_SIZE',
        integration.composioUserId,
        { organizational_entity: orgUrn },
        integration.connectedAccountId ?? undefined,
      )) as Record<string, unknown> | null
      const followerCount = this.extractLinkedInFollowerCount(networkRes)
      if (followerCount > 0) account.follower_count = followerCount
    } catch (err) {
      this.logger.warn(
        `[social-insights] LINKEDIN_GET_NETWORK_SIZE failed: ${err instanceof Error ? err.message : 'unknown'}`,
      )
    }

    return { account, chart }
  }


  protected extractLinkedInFollowerCount(res: Record<string, unknown> | null): number {
    if (!res || typeof res !== 'object') return 0
    const data = (res as Record<string, unknown>).data
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : res
    const dict =
      payload.response_dict && typeof payload.response_dict === 'object'
        ? (payload.response_dict as Record<string, unknown>)
        : payload
    const candidates = [
      dict.firstDegreeSize,
      dict.followerCount,
      dict.followers,
      dict.totalFollowerCount,
    ]
    for (const c of candidates) {
      const n = typeof c === 'number' ? c : Number(c ?? 0)
      if (Number.isFinite(n) && n > 0) return Math.floor(n)
    }
    return 0
  }


  protected parseLinkedInAccount(
    shareStats: Record<string, unknown> | null,
    pageStats: Record<string, unknown> | null,
  ): SocialAnalyticsAccountMetrics {
    const metrics: SocialAnalyticsAccountMetrics = { ...EMPTY_ACCOUNT_METRICS }
    const shareRows = this.extractLinkedInRows(shareStats)
    for (const row of shareRows) {
      const td = (row.totalShareStatistics ?? row) as Record<string, unknown>
      metrics.impressions += this.toInt(td.impressionCount)
      metrics.clicks += this.toInt(td.clickCount)
      metrics.likes += this.toInt(td.likeCount)
      metrics.comments += this.toInt(td.commentCount)
      metrics.shares += this.toInt(td.shareCount)
    }
    metrics.total_interactions = metrics.likes + metrics.comments + metrics.shares
    if (metrics.impressions > 0) {
      metrics.engagement_rate = Number(
        (((metrics.total_interactions + metrics.clicks) / metrics.impressions) * 100).toFixed(2),
      )
    }

    const pageRows = this.extractLinkedInRows(pageStats)
    for (const row of pageRows) {
      const views = (row.totalPageStatistics ?? row) as Record<string, unknown>
      const pageViewsNode = views.views as Record<string, unknown> | undefined
      if (pageViewsNode) {
        const all = pageViewsNode.allPageViews as Record<string, unknown> | undefined
        if (all) {
          metrics.page_views += this.toInt(all.pageViews)
          metrics.unique_page_visitors += this.toInt(all.uniquePageViews)
        }
      }
    }

    return metrics
  }


  protected buildLinkedInChartData(
    shareStats: Record<string, unknown> | null,
  ): SocialAnalyticsChartPoint[] {
    const rows = this.extractLinkedInRows(shareStats)
    const out: SocialAnalyticsChartPoint[] = []
    for (const row of rows) {
      const interval = row.timeRange as Record<string, unknown> | undefined
      if (!interval) continue
      const startMs =
        typeof interval.start === 'number'
          ? (interval.start as number)
          : Number(interval.start ?? 0)
      if (!Number.isFinite(startMs)) continue
      const date = new Date(startMs).toISOString().slice(0, 10)
      const td = (row.totalShareStatistics ?? row) as Record<string, unknown>
      const impressions = this.toInt(td.impressionCount)
      const engagement =
        this.toInt(td.likeCount) +
        this.toInt(td.commentCount) +
        this.toInt(td.shareCount) +
        this.toInt(td.clickCount)
      out.push({ date, reach: 0, impressions, engagement })
    }
    return out
  }


  protected extractLinkedInRows(res: Record<string, unknown> | null): Array<Record<string, unknown>> {
    if (!res || typeof res !== 'object') return []
    const data = (res as Record<string, unknown>).data
    const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : res
    const elements = payload.elements ?? payload.response_dict
    if (Array.isArray(elements)) return elements as Array<Record<string, unknown>>
    if (elements && typeof elements === 'object') {
      const inner = (elements as Record<string, unknown>).elements
      if (Array.isArray(inner)) return inner as Array<Record<string, unknown>>
    }
    return []
  }


  protected flattenLinkedInShareStats(
    res: Record<string, unknown> | null,
    _shareUrn: string,
  ): Record<string, unknown> {
    void _shareUrn
    // Share-level filtering by URN is not supported by Composio's LINKEDIN_GET_SHARE_STATS
    // (takes an organizational entity only). Return aggregate so caller can display
    // account-level LinkedIn metrics without per-post granularity.
    const rows = this.extractLinkedInRows(res)
    const acc: Record<string, number> = {
      impressions: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    }
    for (const row of rows) {
      const td = (row.totalShareStatistics ?? row) as Record<string, unknown>
      acc.impressions += this.toInt(td.impressionCount)
      acc.clicks += this.toInt(td.clickCount)
      acc.likes += this.toInt(td.likeCount)
      acc.comments += this.toInt(td.commentCount)
      acc.shares += this.toInt(td.shareCount)
    }
    return acc
  }
}
