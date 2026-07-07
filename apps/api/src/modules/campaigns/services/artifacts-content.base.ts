import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsDocumentsBase } from './artifacts-documents.base'

export class ArtifactsContentBase extends ArtifactsDocumentsBase {
  // ─── Blog Posts ───

  async listBlogPosts(
    supabase: SupabaseClient,
    funnelId: string,
    opts?: { status?: string; limit?: number; offset?: number },
  ) {
    return this.artifactContentRepo.listBlogPosts(supabase, funnelId, opts)
  }

  async getBlogPost(supabase: SupabaseClient, id: string) {
    const data = await this.artifactContentRepo.getBlogPost(supabase, id)
    if (!data) throw new NotFoundException('Blog post not found')
    return data
  }

  async createBlogPost(
    supabase: SupabaseClient,
    userId: string,
    funnelId: string,
    input: {
      campaign_id?: string | null
      title: string
      slug: string
      content?: unknown
      excerpt?: string | null
      cover_image?: string | null
      author?: string | null
      tags?: string[]
      seo?: Record<string, unknown>
      status?: 'draft' | 'published' | 'archived'
      published_at?: string | null
      metadata?: Record<string, unknown>
    },
    orgId?: string | null,
  ) {
    const payload = {
      user_id: userId,
      funnel_id: funnelId,
      campaign_id: input.campaign_id ?? null,
      title: input.title,
      slug: input.slug,
      content: input.content ?? [],
      excerpt: input.excerpt ?? null,
      cover_image: input.cover_image ?? null,
      author: input.author ?? null,
      tags: input.tags ?? [],
      seo: input.seo ?? {},
      status: input.status ?? 'draft',
      published_at: input.published_at ?? null,
      metadata: input.metadata ?? {},
      org_id: orgId ?? null,
    }
    return this.artifactContentRepo.createBlogPost(supabase, payload)
  }

  async updateBlogPost(
    supabase: SupabaseClient,
    id: string,
    updates: {
      title?: string
      slug?: string
      content?: unknown
      excerpt?: string | null
      cover_image?: string | null
      author?: string | null
      tags?: string[]
      seo?: Record<string, unknown>
      status?: 'draft' | 'published' | 'archived'
      published_at?: string | null
      metadata?: Record<string, unknown>
    },
  ) {
    const allowedKeys = [
      'title',
      'slug',
      'content',
      'excerpt',
      'cover_image',
      'author',
      'tags',
      'seo',
      'status',
      'published_at',
      'metadata',
    ] as const
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) payload[key] = updates[key]
    }
    return this.artifactContentRepo.updateBlogPost(supabase, id, payload)
  }

  async deleteBlogPost(supabase: SupabaseClient, id: string) {
    await this.artifactContentRepo.deleteBlogPost(supabase, id)
  }

  // ─── Social Posts ───

  protected async enrichSocialPostVideoFromAsset(
    supabase: SupabaseClient,
    post: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const vUrl = typeof post.video_url === 'string' ? post.video_url.trim() : ''
    const vAid = post.video_asset_id
    if (vUrl || !vAid || typeof vAid !== 'string') return post
    const pub = await this.artifactContentRepo.findMediaPublicUrl(supabase, vAid)
    if (!pub) return post
    return { ...post, video_url: pub }
  }

  async listSocialPosts(
    supabase: SupabaseClient,
    campaignId: string,
    platform?: string,
    spaceId?: string,
  ) {
    const rows = await this.artifactContentRepo.listSocialPosts(
      supabase,
      campaignId,
      platform,
      spaceId,
    )
    return Promise.all(
      rows.map((p) => this.enrichSocialPostVideoFromAsset(supabase, p as Record<string, unknown>)),
    )
  }

  async listScheduledPosts(supabase: SupabaseClient, campaignId: string) {
    const posts = await this.listSocialPosts(supabase, campaignId)
    const postIds = posts.map((post: { id: string }) => post.id).filter(Boolean)
    if (postIds.length === 0) return []

    const schedules = await this.artifactContentRepo.listSocialSchedules(supabase, postIds)

    const scheduleByPostId = new Map<
      string,
      {
        id: string
        scheduled_at: string | null
        status: string
        job_id: string | null
        error_message: string | null
        attempts: number
        published_at: string | null
      }
    >()

    for (const schedule of schedules ?? []) {
      scheduleByPostId.set(String(schedule.social_post_id), {
        id: String(schedule.id),
        scheduled_at: (schedule.scheduled_at as string | null) ?? null,
        status: String(schedule.status),
        job_id: (schedule.job_id as string | null) ?? null,
        error_message: (schedule.error_message as string | null) ?? null,
        attempts: Number(schedule.attempts ?? 0),
        published_at: (schedule.published_at as string | null) ?? null,
      })
    }

    return posts.map((post: Record<string, unknown>) => {
      const schedule = scheduleByPostId.get(String(post.id))
      return {
        ...post,
        schedule_id: schedule?.id ?? null,
        schedule_status: schedule?.status ?? null,
        schedule_job_id: schedule?.job_id ?? null,
        schedule_error_message: schedule?.error_message ?? null,
        schedule_attempts: schedule?.attempts ?? null,
        schedule_published_at: schedule?.published_at ?? null,
      }
    })
  }

  async createSocialPost(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    input: { platform: string; post_type: string; caption?: string; space_id?: string | null },
    orgId?: string | null,
  ) {
    const data = await this.artifactContentRepo.createSocialPost(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      platform: input.platform,
      post_type: input.post_type,
      caption: input.caption ?? null,
      status: 'draft',
      org_id: orgId ?? null,
      space_id: input.space_id ?? null,
    })
    await this.spaceAutomation?.processArtifactLifecycleEvent(supabase, {
      artifact_kind: 'social_post',
      lifecycle_event: 'created',
      artifact_id: String(data.id),
      campaign_id: campaignId,
      user_id: userId,
      org_id: orgId ?? null,
      title: input.caption ?? 'Social post',
      status: 'draft',
    })
    return this.enrichSocialPostVideoFromAsset(supabase, data as Record<string, unknown>)
  }

  async getSocialPost(supabase: SupabaseClient, id: string) {
    const data = await this.artifactContentRepo.getSocialPost(supabase, id)
    if (!data) throw new NotFoundException('Social post not found')
    return this.enrichSocialPostVideoFromAsset(supabase, data as Record<string, unknown>)
  }

  async updateSocialPost(supabase: SupabaseClient, id: string, updates: Record<string, unknown>) {
    const data = await this.artifactContentRepo.updateSocialPostFields(supabase, id, updates)
    return this.enrichSocialPostVideoFromAsset(supabase, data as Record<string, unknown>)
  }

  async scheduleSocialPost(supabase: SupabaseClient, id: string, scheduledAtIso: string) {
    const post = await this.getSocialPost(supabase, id)
    const postData = post as Record<string, unknown>
    const userId = postData.user_id as string
    const campaignId = postData.campaign_id as string | null
    const orgId = (postData.org_id as string | null) ?? null
    if (!campaignId) throw new BadRequestException('Social post must belong to a campaign')

    const postType = String(postData.post_type ?? '')
    const imageUrl = typeof postData.image_url === 'string' ? postData.image_url.trim() : ''
    const videoUrl = typeof postData.video_url === 'string' ? postData.video_url.trim() : ''
    if (postType !== 'text_only' && !imageUrl && !videoUrl) {
      throw new BadRequestException(
        'image_url or video_url is required for non-text posts. Render the visual to an image before scheduling, or attach a video URL.',
      )
    }

    if (postType === 'carousel') {
      const slides = Array.isArray(postData.carousel_slides)
        ? (postData.carousel_slides as Array<Record<string, unknown>>)
        : []
      const slideHasMedia = (s: Record<string, unknown>): boolean => {
        const img = typeof s.image_url === 'string' ? s.image_url.trim() : ''
        const vid = typeof s.video_url === 'string' ? s.video_url.trim() : ''
        return Boolean(img || vid)
      }
      const missingMediaSlides = slides.filter((s) => !slideHasMedia(s))
      if (slides.length > 0 && missingMediaSlides.length > 0) {
        throw new BadRequestException(
          `All carousel slides must have attached media (image or video) before scheduling. ${missingMediaSlides.length} of ${slides.length} slides are missing image_url or video_url.`,
        )
      }
    }

    const nowIso = new Date().toISOString()
    await this.artifactContentRepo.upsertSocialPostSchedule(supabase, {
      social_post_id: id,
      user_id: userId,
      org_id: orgId,
      campaign_id: campaignId,
      scheduled_at: scheduledAtIso,
      status: 'scheduled',
      job_id: null,
      error_message: null,
      attempts: 0,
      published_at: null,
      updated_at: nowIso,
    })

    const data = await this.artifactContentRepo.updateSocialPost(supabase, id, {
      scheduled_at: scheduledAtIso,
      status: 'scheduled',
      updated_at: nowIso,
    })
    await this.spaceAutomation?.processArtifactLifecycleEvent(supabase, {
      artifact_kind: 'social_post',
      lifecycle_event: 'scheduled',
      artifact_id: id,
      campaign_id: campaignId,
      user_id: userId,
      org_id: orgId,
      title: String(postData.caption ?? 'Social post'),
      status: 'scheduled',
      metadata: { scheduled_at: scheduledAtIso },
    })
    return this.enrichSocialPostVideoFromAsset(supabase, data as Record<string, unknown>)
  }

  async unscheduleSocialPost(supabase: SupabaseClient, id: string) {
    await this.getSocialPost(supabase, id)
    const nowIso = new Date().toISOString()

    await this.artifactContentRepo.cancelSocialPostSchedule(supabase, id, nowIso)
    const data = await this.artifactContentRepo.clearSocialPostSchedule(supabase, id)
    return this.enrichSocialPostVideoFromAsset(supabase, data as Record<string, unknown>)
  }

  async deleteSocialPost(supabase: SupabaseClient, id: string) {
    await this.getSocialPost(supabase, id)
    await this.artifactContentRepo.deleteSocialPost(supabase, id)
  }

  // ─── Bulk Ad Creation ───

  async createAdsBulk(
    supabase: SupabaseClient,
    userId: string,
    adSetId: string,
    creatives: Array<{ imageUrl?: string; imageAssetId?: string }>,
    template?: {
      headline?: string
      primaryText?: string
      destinationUrl?: string
      ctaType?: string
    },
    orgId?: string | null,
  ) {
    // Resolve ad set to get campaign_id
    const adSet = await this.getAdSet(supabase, adSetId)
    const adCampaignId = adSet.ad_campaign_id

    // Resolve campaign_id from ad_campaign
    const adCampaign = await this.getAdCampaign(supabase, adCampaignId)
    const campaignId = (adCampaign as Record<string, unknown>).campaign_id as string
    const spaceId =
      ((adSet as Record<string, unknown>).space_id as string | null | undefined) ??
      ((adCampaign as Record<string, unknown>).space_id as string | null | undefined) ??
      null

    const rows = creatives.map((creative) => ({
      user_id: userId,
      campaign_id: campaignId,
      ad_set_id: adSetId,
      platform: 'meta',
      placement: 'feed',
      headline: template?.headline ?? '',
      primary_text: template?.primaryText ?? '',
      description: null,
      cta_type: template?.ctaType ?? 'LEARN_MORE',
      destination_url: template?.destinationUrl ?? '',
      image_url: creative.imageUrl ?? null,
      image_asset_id: creative.imageAssetId ?? null,
      org_id: orgId ?? null,
      space_id: spaceId,
    }))

    const ads = await this.artifactContentRepo.insertAds(supabase, rows)
    return { ads }
  }
}
