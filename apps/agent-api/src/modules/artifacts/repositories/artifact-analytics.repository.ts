import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type QueryResult<T = unknown> = { data: T | null; error: QueryError | null }
type CountResult = { count: number | null; error: QueryError | null }

function asQueryPromise<T>(value: unknown): Promise<T> {
  return value as Promise<T>
}

@Injectable()
export class ArtifactAnalyticsRepository {
  async getDailyReportData(
    supabase: SupabaseClient,
    input: { campaignId: string; startIso: string; endIso: string },
  ): Promise<{
    funnelsRes: QueryResult
    emailsRes: QueryResult
    adsRes: QueryResult
    createdCount: number
    publishedCount: number
    scheduledCount: number
    totalSocial: number
  }> {
    const rpcParams = {
      p_campaign_id: input.campaignId,
      p_start_date: input.startIso,
      p_end_date: input.endIso,
    }
    const [funnelsRes, emailsRes, adsRes, createdRes, publishedRes, scheduledRes, totalRes] =
      await Promise.all([
        asQueryPromise<QueryResult>(supabase.rpc('get_campaign_analytics', rpcParams)),
        asQueryPromise<QueryResult>(supabase.rpc('get_campaign_email_analytics', rpcParams)),
        asQueryPromise<QueryResult>(supabase.rpc('get_campaign_ad_analytics', rpcParams)),
        asQueryPromise<CountResult>(
          supabase
            .from('social_posts')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', input.campaignId)
            .gte('created_at', input.startIso)
            .lte('created_at', input.endIso),
        ),
        asQueryPromise<CountResult>(
          supabase
            .from('social_posts')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', input.campaignId)
            .eq('status', 'published')
            .not('published_at', 'is', null)
            .gte('published_at', input.startIso)
            .lte('published_at', input.endIso),
        ),
        asQueryPromise<CountResult>(
          supabase
            .from('social_post_schedules')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', input.campaignId)
            .gte('scheduled_at', input.startIso)
            .lte('scheduled_at', input.endIso),
        ),
        asQueryPromise<CountResult>(
          supabase
            .from('social_posts')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', input.campaignId),
        ),
      ])

    return {
      funnelsRes,
      emailsRes,
      adsRes,
      createdCount: createdRes.count ?? 0,
      publishedCount: publishedRes.count ?? 0,
      scheduledCount: scheduledRes.count ?? 0,
      totalSocial: totalRes.count ?? 0,
    }
  }
}
