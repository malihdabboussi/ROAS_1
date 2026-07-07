import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class CampaignArtifactContentRepository {
  async listBlogPosts(
    supabase: SupabaseClient,
    funnelId: string,
    opts?: { status?: string; limit?: number; offset?: number },
  ) {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('funnel_id', funnelId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (opts?.status) query = query.eq('status', opts.status)
    if (typeof opts?.limit === 'number' && opts.limit > 0) query = query.limit(opts.limit)
    if (typeof opts?.offset === 'number' && opts.offset > 0) {
      query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)
    }
    const { data, error } = await query
    if (error) throw new Error(`Failed to list blog posts: ${error.message}`)
    return data ?? []
  }

  async getBlogPost(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).single()
    if (error || !data) return null
    return data
  }

  async createBlogPost(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('blog_posts').insert(payload).select().single()
    if (error) throw new Error(`Failed to create blog post: ${error.message}`)
    return data
  }

  async updateBlogPost(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('blog_posts')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update blog post: ${error.message}`)
    return data
  }

  async deleteBlogPost(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete blog post: ${error.message}`)
  }

  async findMediaPublicUrl(supabase: SupabaseClient, mediaAssetId: string): Promise<string> {
    const { data } = await supabase
      .from('media_assets')
      .select('public_url')
      .eq('id', mediaAssetId)
      .maybeSingle()
    return typeof data?.public_url === 'string' ? data.public_url.trim() : ''
  }

  async listSocialPosts(
    supabase: SupabaseClient,
    campaignId: string,
    platform?: string,
    spaceId?: string,
  ) {
    let query = supabase
      .from('social_posts')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (platform) query = query.eq('platform', platform)
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data, error } = await query
    if (error) throw new Error(`Failed to list social posts: ${error.message}`)
    return data ?? []
  }

  async listSocialSchedules(supabase: SupabaseClient, postIds: string[]) {
    const { data, error } = await supabase
      .from('social_post_schedules')
      .select(
        'id, social_post_id, scheduled_at, status, job_id, error_message, attempts, published_at, campaign_id',
      )
      .in('social_post_id', postIds)
    if (error) throw new Error(`Failed to list social schedules: ${error.message}`)
    return data ?? []
  }

  async createSocialPost(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('social_posts').insert(payload).select().single()
    if (error) throw new Error(`Failed to create social post: ${error.message}`)
    return data
  }

  async getSocialPost(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase.from('social_posts').select('*').eq('id', id).single()
    if (error || !data) return null
    return data
  }

  async updateSocialPost(supabase: SupabaseClient, id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('social_posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update social post schedule: ${error.message}`)
    return data
  }

  async updateSocialPostFields(
    supabase: SupabaseClient,
    id: string,
    updates: Record<string, unknown>,
  ) {
    const { data, error } = await supabase
      .from('social_posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update social post: ${error.message}`)
    return data
  }

  async upsertSocialPostSchedule(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('social_post_schedules')
      .upsert(payload, { onConflict: 'social_post_id' })
      .select('id')
      .single()
    if (error) throw new Error(`Failed to schedule social post: ${error.message}`)
    return data
  }

  async cancelSocialPostSchedule(supabase: SupabaseClient, socialPostId: string, nowIso: string) {
    const { error } = await supabase
      .from('social_post_schedules')
      .update({ status: 'cancelled', job_id: null, updated_at: nowIso })
      .eq('social_post_id', socialPostId)
      .eq('status', 'scheduled')
    if (error) throw new Error(`Failed to unschedule social post: ${error.message}`)
  }

  async clearSocialPostSchedule(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('social_posts')
      .update({
        scheduled_at: null,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to clear social schedule: ${error.message}`)
    return data
  }

  async deleteSocialPost(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('social_posts').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete social post: ${error.message}`)
  }

  async insertAds(supabase: SupabaseClient, rows: Array<Record<string, unknown>>) {
    const { data, error } = await supabase.from('ads').insert(rows).select()
    if (error) throw new Error(`Failed to bulk create ads: ${error.message}`)
    return data ?? []
  }
}
