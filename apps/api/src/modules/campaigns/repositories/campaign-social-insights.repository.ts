import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CachedInsightRow,
  SocialAnalyticsPlatform,
  SocialPostRow,
} from '../services/social-insights.shared'

@Injectable()
export class CampaignSocialInsightsRepository {
  async findCampaignOrgId(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<string | null | undefined> {
    const { data } = await supabase
      .from('campaigns')
      .select('org_id')
      .eq('id', campaignId)
      .maybeSingle()
    if (!data) return undefined
    return (data.org_id as string | null) ?? null
  }

  async findCampaignConnection(
    supabase: SupabaseClient,
    campaignId: string,
    platform: SocialAnalyticsPlatform,
    id?: string,
  ) {
    let query = supabase
      .from('campaign_integration_connections')
      .select('id, composio_connected_account_id, user_id, metadata, status')
      .eq('campaign_id', campaignId)
      .eq('integration_id', platform)
      .eq('status', 'connected')
    if (id) query = query.eq('id', id)
    else query = query.limit(1)
    const { data } = await query.maybeSingle()
    return data ?? null
  }

  async findUserIntegrationById(supabase: SupabaseClient, id: string) {
    const { data } = await supabase
      .from('user_integrations')
      .select('id, connection_label, metadata, user_id, scope_mode, org_id, integration_id, status')
      .eq('id', id)
      .maybeSingle()
    return data ?? null
  }

  async listEligiblePersonalIntegrations(
    supabase: SupabaseClient,
    userId: string,
    platform: SocialAnalyticsPlatform,
    orgId?: string | null,
  ): Promise<Array<Record<string, unknown>>> {
    const selectCols =
      'id, connection_label, status, metadata, user_id, scope_mode, is_default, updated_at, org_id, integration_id'
    let query = supabase
      .from('user_integrations')
      .select(selectCols)
      .eq('integration_id', platform)
      .eq('user_id', userId)
      .eq('scope_mode', 'personal')
      .in('status', ['connected'])
      .order('updated_at', { ascending: false })
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data } = await query
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listEligibleSharedIntegrations(
    supabase: SupabaseClient,
    orgId: string,
    platform: SocialAnalyticsPlatform,
  ): Promise<Array<Record<string, unknown>>> {
    const { data } = await supabase
      .from('user_integrations')
      .select(
        'id, connection_label, status, metadata, user_id, scope_mode, is_default, updated_at, org_id, integration_id',
      )
      .eq('integration_id', platform)
      .eq('org_id', orgId)
      .eq('scope_mode', 'org_shared')
      .in('status', ['connected'])
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listPublishedPosts(
    supabase: SupabaseClient,
    campaignId: string,
    platform: SocialAnalyticsPlatform,
  ): Promise<SocialPostRow[]> {
    const { data, error } = await supabase
      .from('social_posts')
      .select(
        'id, platform, post_type, published_id, published_at, caption, headline, image_url, video_url, user_id, campaign_id, org_id',
      )
      .eq('campaign_id', campaignId)
      .eq('platform', platform)
      .not('published_id', 'is', null)
      .order('published_at', { ascending: false })
    if (error) throw new Error(`Failed to list published social posts: ${error.message}`)
    return (data ?? []) as SocialPostRow[]
  }

  async loadCachedInsights(
    supabase: SupabaseClient,
    postIds: string[],
  ): Promise<Map<string, CachedInsightRow>> {
    const out = new Map<string, CachedInsightRow>()
    if (postIds.length === 0) return out
    const { data, error } = await supabase
      .from('social_post_insights')
      .select('social_post_id, metrics, fetched_at, error_message')
      .in('social_post_id', postIds)
    if (error) throw error
    for (const row of data ?? []) {
      out.set(String(row.social_post_id), {
        social_post_id: String(row.social_post_id),
        metrics:
          row.metrics && typeof row.metrics === 'object' && !Array.isArray(row.metrics)
            ? (row.metrics as Record<string, unknown>)
            : null,
        fetched_at: (row.fetched_at as string | null) ?? null,
        error_message: (row.error_message as string | null) ?? null,
      })
    }
    return out
  }

  async upsertCachedInsight(
    supabase: SupabaseClient,
    post: SocialPostRow,
    metrics: Record<string, unknown> | null,
    errorMessage: string | null,
  ): Promise<void> {
    const { error } = await supabase.from('social_post_insights').upsert(
      {
        social_post_id: post.id,
        user_id: post.user_id,
        org_id: post.org_id,
        campaign_id: post.campaign_id,
        platform: post.platform,
        published_id: post.published_id,
        metrics: metrics ?? {},
        error_message: errorMessage,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'social_post_id' },
    )
    if (error) throw error
  }
}
