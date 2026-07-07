import type { SupabaseClient } from '@supabase/supabase-js'
import type { IntegrationContext, SocialAnalyticsAccountMetrics, SocialAnalyticsChartPoint, SocialPostRow } from './social-insights.shared'
import { EMPTY_ACCOUNT_METRICS } from './social-insights.shared'
import { SocialInsightsLinkedInBase } from './social-insights-linkedin.base'

export class SocialInsightsFacebookBase extends SocialInsightsLinkedInBase {


  protected async fetchFacebookAccount(
    integration: IntegrationContext,
    since: string | undefined,
    until: string | undefined,
  ): Promise<{ account: SocialAnalyticsAccountMetrics; chart: SocialAnalyticsChartPoint[] }> {
    const pageId = this.extractFacebookPageId(integration.metadata)
    if (!pageId) throw new Error('missing_facebook_page_id')

    const untilIso = until ?? new Date().toISOString().slice(0, 10)
    const sinceIso =
      since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const res = (await this.composio.executeTool(
      'FACEBOOK_GET_PAGE_INSIGHTS',
      integration.composioUserId,
      {
        page_id: pageId,
        period: 'day',
        since: sinceIso,
        until: untilIso,
        metrics:
          'page_media_view,page_post_engagements,page_video_views,page_follows,page_daily_follows_unique',
      },
      integration.connectedAccountId ?? undefined,
    )) as Record<string, unknown> | null

    const account = this.parseFacebookPageInsights(res)
    const chart = this.buildFacebookChartData(res)

    try {
      const lifetimeRes = (await this.composio.executeTool(
        'FACEBOOK_GET_PAGE_INSIGHTS',
        integration.composioUserId,
        {
          page_id: pageId,
          period: 'lifetime',
          metrics: 'page_follows',
        },
        integration.connectedAccountId ?? undefined,
      )) as Record<string, unknown> | null
      const followers = this.sumFacebookMetricValues(lifetimeRes, 'page_follows')
      if (followers > 0) account.follower_count = followers
    } catch (err) {
      this.logger.warn(
        `[social-insights] FACEBOOK page_follows lifetime failed: ${err instanceof Error ? err.message : 'unknown'}`,
      )
    }

    return { account, chart }
  }


  protected extractFacebookInsightRows(
    res: Record<string, unknown> | null,
  ): Array<Record<string, unknown>> {
    if (!res || typeof res !== 'object') return []
    const out: Array<Record<string, unknown>> = []
    const stack: unknown[] = [res, (res as Record<string, unknown>).data]
    const data = (res as Record<string, unknown>).data
    if (data && typeof data === 'object') {
      stack.push((data as Record<string, unknown>).data)
      stack.push((data as Record<string, unknown>).response_dict)
    }
    for (const node of stack) {
      if (!node || typeof node !== 'object') continue
      const arr = (node as Record<string, unknown>).data
      if (!Array.isArray(arr)) continue
      for (const item of arr) {
        if (item && typeof item === 'object') out.push(item as Record<string, unknown>)
      }
    }
    return out
  }


  protected sumFacebookMetricValues(res: Record<string, unknown> | null, metricName: string): number {
    const rows = this.extractFacebookInsightRows(res)
    for (const row of rows) {
      if (String(row.name ?? '') !== metricName) continue
      const values = row.values
      if (!Array.isArray(values) || values.length === 0) continue
      const last = values[values.length - 1] as Record<string, unknown>
      const v = last?.value
      const n = typeof v === 'number' ? v : Number(v ?? 0)
      return Number.isFinite(n) ? Math.round(n) : 0
    }
    return 0
  }


  protected parseFacebookPageInsights(
    res: Record<string, unknown> | null,
  ): SocialAnalyticsAccountMetrics {
    const metrics: SocialAnalyticsAccountMetrics = { ...EMPTY_ACCOUNT_METRICS }
    const rows = this.extractFacebookInsightRows(res)

    let mediaViews = 0
    let engagements = 0
    let videoViews = 0
    let follows = 0

    for (const row of rows) {
      const name = String(row.name ?? '')
      const sum = this.sumInsightValuesArray(row.values)
      if (name === 'page_media_view') mediaViews += sum
      if (name === 'page_post_engagements') engagements += sum
      if (name === 'page_video_views') videoViews += sum
      if (name === 'page_follows') follows = Math.max(follows, sum)
      if (name === 'page_daily_follows_unique') metrics.follower_growth += sum
    }

    metrics.impressions = mediaViews
    metrics.views = videoViews
    metrics.total_interactions = engagements
    metrics.reach = mediaViews
    if (follows > 0) metrics.follower_count = follows
    if (metrics.impressions > 0) {
      metrics.engagement_rate = Number(
        ((metrics.total_interactions / metrics.impressions) * 100).toFixed(2),
      )
    }
    return metrics
  }


  protected sumInsightValuesArray(values: unknown): number {
    if (!Array.isArray(values)) return 0
    return values.reduce((sum, item) => {
      if (!item || typeof item !== 'object') return sum
      const v = (item as Record<string, unknown>).value
      const n = typeof v === 'number' ? v : Number(v ?? 0)
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
  }


  protected buildFacebookChartData(res: Record<string, unknown> | null): SocialAnalyticsChartPoint[] {
    const rows = this.extractFacebookInsightRows(res)
    const byDate = new Map<string, { impressions: number; engagement: number }>()

    for (const row of rows) {
      const name = String(row.name ?? '')
      if (name !== 'page_media_view' && name !== 'page_post_engagements') continue
      const values = row.values
      if (!Array.isArray(values)) continue
      for (const item of values) {
        if (!item || typeof item !== 'object') continue
        const point = item as Record<string, unknown>
        const endTime = typeof point.end_time === 'string' ? point.end_time : ''
        const date = endTime ? endTime.slice(0, 10) : ''
        if (!date) continue
        const v = typeof point.value === 'number' ? point.value : Number(point.value ?? 0)
        const n = Number.isFinite(v) ? v : 0
        const cur = byDate.get(date) ?? { impressions: 0, engagement: 0 }
        if (name === 'page_media_view') cur.impressions += n
        if (name === 'page_post_engagements') cur.engagement += n
        byDate.set(date, cur)
      }
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        reach: 0,
        impressions: Math.round(vals.impressions),
        engagement: Math.round(vals.engagement),
      }))
  }


  protected flattenFacebookPostInsights(
    res: Record<string, unknown> | null,
  ): Record<string, unknown> {
    const rows = this.extractFacebookInsightRows(res)
    const out: Record<string, unknown> = {}
    for (const row of rows) {
      const name = String(row.name ?? '')
      const v = this.sumInsightValuesArray(row.values)
      if (name) out[name] = v
      if (name === 'post_media_view') {
        out.impressions = v
        out.reach = v
      }
    }
    return out
  }
}
