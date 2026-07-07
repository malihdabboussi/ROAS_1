import type { SupabaseClient } from '@supabase/supabase-js'
import type { IntegrationContext, SocialAnalyticsAccountMetrics, SocialAnalyticsChartPoint, SocialPostRow } from './social-insights.shared'
import { EMPTY_ACCOUNT_METRICS } from './social-insights.shared'
import type { SocialAnalyticsPostRow } from './social-insights.shared'
import { SocialInsightsFacebookBase } from './social-insights-facebook.base'

export class SocialInsightsYoutubeProjectionBase extends SocialInsightsFacebookBase {


  protected async fetchYoutubeAccount(
    integration: IntegrationContext,
    since: string | undefined,
    until: string | undefined,
  ): Promise<{ account: SocialAnalyticsAccountMetrics; chart: SocialAnalyticsChartPoint[] }> {
    const channelId = this.extractYoutubeChannelId(integration.metadata)
    if (!channelId) throw new Error('missing_youtube_channel_id')

    const untilIso = until ?? new Date().toISOString().slice(0, 10)
    const sinceIso =
      since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const metrics: SocialAnalyticsAccountMetrics = { ...EMPTY_ACCOUNT_METRICS }
    let chart: SocialAnalyticsChartPoint[] = []

    try {
      const statsRes = (await this.composio.executeTool(
        'YOUTUBE_GET_CHANNEL_STATISTICS',
        integration.composioUserId,
        { id: channelId, part: 'statistics' },
        integration.connectedAccountId ?? undefined,
      )) as Record<string, unknown> | null
      const stats = this.parseYoutubeChannelStatistics(statsRes)
      metrics.follower_count = stats.subscriberCount
      metrics.views = stats.viewCount
    } catch (err) {
      this.logger.warn(
        `[social-insights] YOUTUBE_GET_CHANNEL_STATISTICS failed: ${err instanceof Error ? err.message : 'unknown'}`,
      )
    }

    const report = await this.fetchYoutubeAnalyticsReport(
      integration,
      sinceIso,
      untilIso,
      channelId,
    )
    const parsed = this.parseYoutubeAnalyticsReport(report)
    metrics.views = parsed.views > 0 ? parsed.views : metrics.views
    metrics.total_interactions = parsed.likes + parsed.comments + parsed.shares
    metrics.likes = parsed.likes
    metrics.comments = parsed.comments
    metrics.shares = parsed.shares
    metrics.follower_growth = parsed.subscribersGained - parsed.subscribersLost
    metrics.impressions = parsed.views
    metrics.reach = parsed.views
    if (metrics.views > 0) {
      metrics.engagement_rate = Number(
        ((metrics.total_interactions / metrics.views) * 100).toFixed(2),
      )
    }
    chart = parsed.chart

    return { account: metrics, chart }
  }


  protected parseYoutubeChannelStatistics(res: Record<string, unknown> | null): {
    subscriberCount: number
    viewCount: number
  } {
    const items = this.extractYoutubeItems(res)
    const first = items[0]
    const statistics =
      first?.statistics && typeof first.statistics === 'object'
        ? (first.statistics as Record<string, unknown>)
        : {}
    return {
      subscriberCount: this.toInt(statistics.subscriberCount),
      viewCount: this.toInt(statistics.viewCount),
    }
  }


  protected extractYoutubeItems(res: Record<string, unknown> | null): Array<Record<string, unknown>> {
    if (!res || typeof res !== 'object') return []
    const stack: unknown[] = [res, (res as Record<string, unknown>).data]
    const data = (res as Record<string, unknown>).data
    if (data && typeof data === 'object') {
      stack.push((data as Record<string, unknown>).items)
      stack.push((data as Record<string, unknown>).data)
    }
    for (const node of stack) {
      if (Array.isArray(node)) {
        return node.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>
      }
      if (node && typeof node === 'object') {
        const items = (node as Record<string, unknown>).items
        if (Array.isArray(items)) {
          return items.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>
        }
      }
    }
    return []
  }


  protected async fetchYoutubeAnalyticsReport(
    integration: IntegrationContext,
    startDate: string,
    endDate: string,
    channelId: string,
  ): Promise<Record<string, unknown> | null> {
    const token = await this.composio.getAccessTokenForToolkit(
      integration.composioUserId,
      'youtube',
      integration.connectedAccountId ?? undefined,
    )
    if (!token) return null

    const qs = new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics:
        'views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares',
      dimensions: 'day',
    })

    const url = `https://youtubeanalytics.googleapis.com/v2/reports?${qs.toString()}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (!response.ok) {
      const body = await response.text()
      this.logger.warn(`[social-insights] YouTube Analytics API ${response.status}: ${body}`)
      return null
    }
    return (await response.json()) as Record<string, unknown>
  }


  protected parseYoutubeAnalyticsReport(report: Record<string, unknown> | null): {
    views: number
    likes: number
    comments: number
    shares: number
    subscribersGained: number
    subscribersLost: number
    chart: SocialAnalyticsChartPoint[]
  } {
    const empty = {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      chart: [] as SocialAnalyticsChartPoint[],
    }
    if (!report || typeof report !== 'object') return empty

    const headers = report.columnHeaders
    const rows = report.rows
    if (!Array.isArray(headers) || !Array.isArray(rows)) return empty

    const metricIndexes: Record<string, number> = {}
    let dayIndex = -1
    headers.forEach((h, i) => {
      if (!h || typeof h !== 'object') return
      const header = h as Record<string, unknown>
      const name = String(header.name ?? '')
      if (header.columnType === 'DIMENSION' && name === 'day') dayIndex = i
      if (header.columnType === 'METRIC') metricIndexes[name] = i
    })

    const sums: Record<string, number> = {}
    const chart: SocialAnalyticsChartPoint[] = []

    for (const row of rows) {
      if (!Array.isArray(row)) continue
      const date = dayIndex >= 0 ? String(row[dayIndex] ?? '').slice(0, 10) : ''
      let dayViews = 0
      let dayEngagement = 0
      for (const [metric, idx] of Object.entries(metricIndexes)) {
        const v = typeof row[idx] === 'number' ? row[idx] : Number(row[idx] ?? 0)
        const n = Number.isFinite(v) ? v : 0
        sums[metric] = (sums[metric] ?? 0) + n
        if (metric === 'views') dayViews = n
        if (metric === 'likes' || metric === 'comments' || metric === 'shares') dayEngagement += n
      }
      if (date) {
        chart.push({
          date,
          reach: dayViews,
          impressions: dayViews,
          engagement: dayEngagement,
        })
      }
    }

    return {
      views: sums.views ?? 0,
      likes: sums.likes ?? 0,
      comments: sums.comments ?? 0,
      shares: sums.shares ?? 0,
      subscribersGained: sums.subscribersGained ?? 0,
      subscribersLost: sums.subscribersLost ?? 0,
      chart: chart.sort((a, b) => a.date.localeCompare(b.date)),
    }
  }


  protected flattenYoutubeVideoMetrics(res: Record<string, unknown> | null): Record<string, unknown> {
    const items = this.extractYoutubeItems(res)
    const statistics =
      items[0]?.statistics && typeof items[0].statistics === 'object'
        ? (items[0].statistics as Record<string, unknown>)
        : {}
    const views = this.toInt(statistics.viewCount)
    const likes = this.toInt(statistics.likeCount)
    const comments = this.toInt(statistics.commentCount)
    return {
      views,
      impressions: views,
      reach: views,
      likes,
      comments,
      total_interactions: likes + comments,
    }
  }


  // ─── Projection helpers ────────────────────────────────────────────────────

  protected projectPostRow(
    post: SocialPostRow,
    metrics: Record<string, unknown> | null,
    fetchedAt: string | null,
    errorMessage: string | null,
  ): SocialAnalyticsPostRow {
    const m = metrics ?? {}
    const reach = this.toInt(m.reach ?? m.impressions)
    const likes = this.toInt(m.likes ?? m.likeCount)
    const comments = this.toInt(m.comments ?? m.commentCount)
    const shares = this.toInt(m.shares ?? m.shareCount)
    const saves = this.toInt(m.saved ?? m.saves)
    const views = this.toInt(m.views ?? m.plays)
    const totalInteractions = this.toInt(m.total_interactions) || likes + comments + shares + saves
    const engagementRate = reach > 0 ? Number(((totalInteractions / reach) * 100).toFixed(2)) : 0

    const reelsAvg = this.toNullableNumber(m.ig_reels_avg_watch_time)
    const reelsTotal = this.toNullableNumber(m.ig_reels_video_view_total_time)
    const reelsSkip = this.toNullableNumber(m.reels_skip_rate)

    return {
      social_post_id: post.id,
      published_id: post.published_id,
      post_type: post.post_type,
      published_at: post.published_at,
      caption: post.caption,
      headline: post.headline,
      image_url: post.image_url,
      video_url: post.video_url,
      reach,
      likes,
      comments,
      shares,
      saves,
      views,
      total_interactions: totalInteractions,
      engagement_rate: engagementRate,
      reels_avg_watch_time: reelsAvg,
      reels_total_watch_time: reelsTotal,
      reels_skip_rate: reelsSkip,
      raw_metrics: m,
      fetched_at: fetchedAt,
      error: errorMessage,
    }
  }


  protected toInt(val: unknown): number {
    if (typeof val === 'number') return Math.round(val)
    if (typeof val === 'string') {
      const n = Number(val)
      return Number.isFinite(n) ? Math.round(n) : 0
    }
    return 0
  }


  protected toNullableNumber(val: unknown): number | null {
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const n = Number(val)
      return Number.isFinite(n) ? n : null
    }
    return null
  }
}
