import { Injectable } from '@nestjs/common'
import { ArtifactSocialPostsRepository } from '../repositories/artifact-social-posts.repository'
import {
  buildDeleteConfirmBlock,
  tryPersistMissionDeliverable,
} from '../utils/artifact-domain-handler-shared.util'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactSocialPostPublishingService } from './artifact-social-post-publishing.service'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactSocialPostsService {
  constructor(
    private readonly repository: ArtifactSocialPostsRepository = new ArtifactSocialPostsRepository(),
    private readonly publishingService: ArtifactSocialPostPublishingService = new ArtifactSocialPostPublishingService(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      create_social_post: (data, sessionKey) => this.createSocialPost(target, data, sessionKey),
      schedule_social_post: (data, sessionKey) => this.scheduleSocialPost(target, data, sessionKey),
      update_social_post: (data, sessionKey) => this.updateSocialPost(target, data, sessionKey),
      list_social_posts: (data, sessionKey) => this.listSocialPosts(target, data, sessionKey),
      delete_social_post: (data, sessionKey) => this.deleteSocialPost(target, data, sessionKey),
      get_social_post: (data, sessionKey) => this.getSocialPost(target, data, sessionKey),
      publish_social_post: (data, sessionKey) => this.publishSocialPost(target, data, sessionKey),
      get_social_post_template: (data, sessionKey) =>
        this.getSocialPostTemplate(target, data, sessionKey),
      list_social_post_templates: (data, sessionKey) =>
        this.listSocialPostTemplates(target, data, sessionKey),
    }
  }

  private async createSocialPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }

    const platform = input.platform as string
    if (!platform) return { success: false, error: 'platform is required (linkedin | instagram)' }
    const postType = input.post_type as string
    if (!postType)
      return {
        success: false,
        error: 'post_type is required (single_image | carousel | text_only | story | reel)',
      }

    const metadata =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? (input.metadata as Record<string, unknown>)
        : {}
    const spaceId = getActiveSpaceId(input)

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: campaignId,
      ...(spaceId ? { space_id: spaceId } : {}),
      platform,
      post_type: postType,
      caption: (input.caption as string) ?? null,
      headline: (input.headline as string) ?? null,
      generated_tsx: (input.generated_tsx as string) ?? null,
      image_url: (input.image_url as string) ?? null,
      image_asset_id: (input.image_asset_id as string) ?? null,
      video_url: (input.video_url as string) ?? null,
      video_asset_id: (input.video_asset_id as string) ?? null,
      carousel_slides: input.carousel_slides ?? null,
      hashtags: Array.isArray(input.hashtags) ? input.hashtags : null,
      cta_url: (input.cta_url as string) ?? null,
      metadata,
    }

    const scheduledAt =
      typeof input.scheduled_at === 'string' && input.scheduled_at.trim().length > 0
        ? new Date(input.scheduled_at)
        : null
    const isScheduled = Boolean(scheduledAt && !Number.isNaN(scheduledAt.getTime()))
    if (isScheduled && scheduledAt) {
      insertPayload.scheduled_at = scheduledAt.toISOString()
      insertPayload.status = 'scheduled'
    }

    const { data, error } = await this.repository.createPost(supabase, insertPayload)

    if (error) {
      target.logger.error(`[create_social_post] Insert failed: ${error.message}`)
      throw error
    }
    if (!data?.id) throw new Error('Social post was not created')
    const postRow = data as {
      id: string
      caption?: string | null
      headline?: string | null
      image_url?: string | null
      status?: string | null
      video_url?: string | null
    }
    const postName =
      (postRow.caption ? postRow.caption.slice(0, 60) : null) ||
      postRow.headline ||
      'Social Post'
    await ensureSpaceView({
      supabase,
      spaceId,
      campaignId,
      viewType: 'social_posts',
      logger: target.logger,
    })

    if (isScheduled && data) {
      const { error: scheduleError } = await this.repository.upsertSchedule(supabase, {
        social_post_id: data.id,
        user_id: userId,
        org_id: orgId ?? null,
        campaign_id: campaignId,
        scheduled_at: scheduledAt!.toISOString(),
        status: 'scheduled',
        attempts: 0,
        metadata: {},
        updated_at: new Date().toISOString(),
      })
      if (scheduleError) {
        target.logger.error(`[create_social_post] Schedule insert failed: ${scheduleError.message}`)
        throw scheduleError
      }
    }
    await tryPersistMissionDeliverable(target, sessionKey, {
      type: 'social_post',
      entityId: postRow.id,
      entityTable: 'social_posts',
      title: postName,
      sourceAction: 'create_social_post',
    })
    const _returnPayload = {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-social-post-${postRow.id}`,
          artifactType: 'social-post',
          artifactId: postRow.id,
          name: postName,
          imageUrl: postRow.image_url ?? undefined,
          videoUrl: postRow.video_url ?? undefined,
          status: postRow.status ?? 'draft',
          spaceId: spaceId ?? undefined,
        },
      ],
      ...data,
    }
    return _returnPayload
  }

  private async scheduleSocialPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const socialPostId = input.social_post_id as string
    if (!socialPostId) return { success: false, error: 'social_post_id is required' }
    const scheduledAtRaw = input.scheduled_at as string
    if (!scheduledAtRaw) return { success: false, error: 'scheduled_at is required' }
    const scheduledAt = new Date(scheduledAtRaw)
    if (Number.isNaN(scheduledAt.getTime()))
      return { success: false, error: 'scheduled_at must be a valid ISO datetime' }
    if (scheduledAt.getTime() <= Date.now())
      return { success: false, error: 'scheduled_at must be in the future' }

    const { data: post, error: postError } = await this.repository.findPostForScheduling(
      supabase,
      { socialPostId, userId, orgId: orgId ?? null },
    )
    if (postError || !post) {
      return { success: false, error: 'Social post not found' }
    }

    const imageUrl =
      typeof post.image_url === 'string' ? post.image_url.trim() : String(post.image_url ?? '')
    const videoUrl =
      typeof (post as Record<string, unknown>).video_url === 'string'
        ? ((post as Record<string, unknown>).video_url as string).trim()
        : ''
    if (post.post_type !== 'text_only' && !imageUrl && !videoUrl) {
      return {
        success: false,
        error:
          'image_url or video_url is required before scheduling. Render the TSX to an image first, or attach a video.',
      }
    }

    if (post.post_type === 'carousel') {
      const slides = Array.isArray((post as Record<string, unknown>).carousel_slides)
        ? ((post as Record<string, unknown>).carousel_slides as Array<Record<string, unknown>>)
        : []
      const missingCount = slides.filter((s) => {
        const img = typeof s.image_url === 'string' ? s.image_url.trim() : ''
        const vid = typeof s.video_url === 'string' ? s.video_url.trim() : ''
        return !img && !vid
      }).length
      if (slides.length > 0 && missingCount > 0) {
        return {
          success: false,
          error: `All carousel slides must have media (image or video) before scheduling. ${missingCount} of ${slides.length} slides are missing image_url and video_url.`,
        }
      }
    }

    const postOrgId = (post as Record<string, unknown>).org_id as string | null
    const nowIso = new Date().toISOString()
    const { error: scheduleError } = await this.repository.upsertSchedule(supabase, {
      social_post_id: socialPostId,
      user_id: userId,
      org_id: postOrgId ?? orgId ?? null,
      campaign_id: post.campaign_id,
      scheduled_at: scheduledAt.toISOString(),
      status: 'scheduled',
      job_id: null,
      error_message: null,
      attempts: 0,
      updated_at: nowIso,
    })
    if (scheduleError) throw scheduleError

    const { data, error } = await this.repository.markScheduled(supabase, {
      socialPostId,
      userId,
      orgId: orgId ?? null,
      scheduledAtIso: scheduledAt.toISOString(),
      nowIso,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Social post not found' }
    return data
  }

  private async updateSocialPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const socialPostId = input.social_post_id as string
    if (!socialPostId) return { success: false, error: 'social_post_id is required' }

    const allowedFields = [
      'caption',
      'headline',
      'generated_tsx',
      'image_url',
      'image_asset_id',
      'video_url',
      'video_asset_id',
      'carousel_slides',
      'hashtags',
      'cta_url',
      'post_type',
      'status',
    ] as const

    const updates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (input[key] !== undefined) updates[key] = input[key]
    }

    if (input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)) {
      updates.metadata = input.metadata
    }

    if (input.carousel_slide_update && typeof input.carousel_slide_update === 'object') {
      const slideUpdate = input.carousel_slide_update as { index: number; [key: string]: unknown }
      const slideIndex = typeof slideUpdate.index === 'number' ? slideUpdate.index : -1

      if (slideIndex < 0) {
        return {
          success: false,
          error: 'carousel_slide_update.index must be a non-negative number',
        }
      }

      const { data: existing, error: fetchError } = await this.repository.findCarouselSlides(
        supabase,
        { socialPostId, userId, orgId: orgId ?? null },
      )
      if (fetchError || !existing) {
        return { success: false, error: 'Social post not found' }
      }

      const raw = (existing as Record<string, unknown>).carousel_slides
      const currentSlides: Record<string, unknown>[] = Array.isArray(raw)
        ? (raw as Record<string, unknown>[]).map((s) => ({ ...s }))
        : []

      while (currentSlides.length <= slideIndex) {
        currentSlides.push({})
      }

      const { index: _, ...slideData } = slideUpdate
      currentSlides[slideIndex] = { ...(currentSlides[slideIndex] ?? {}), ...slideData }

      updates.carousel_slides = currentSlides
    }

    if (input.carousel_slide_patch && typeof input.carousel_slide_patch === 'object') {
      const patch = input.carousel_slide_patch as {
        index: number
        replacements?: Array<{ find: string; replace: string }>
        find?: string
        replace?: string
      }
      const slideIndex = typeof patch.index === 'number' ? patch.index : -1

      if (slideIndex < 0) {
        return { success: false, error: 'carousel_slide_patch.index must be a non-negative number' }
      }

      const pairs: Array<{ find: string; replace: string }> = []
      if (Array.isArray(patch.replacements)) {
        for (const r of patch.replacements) {
          if (typeof r.find === 'string' && typeof r.replace === 'string') pairs.push(r)
        }
      } else if (typeof patch.find === 'string' && typeof patch.replace === 'string') {
        pairs.push({ find: patch.find, replace: patch.replace })
      }

      if (pairs.length === 0) {
        return {
          success: false,
          error: 'carousel_slide_patch requires at least one find/replace pair',
        }
      }

      const { data: existing, error: fetchError } = await this.repository.findCarouselSlides(
        supabase,
        { socialPostId, userId, orgId: orgId ?? null },
      )
      if (fetchError || !existing) {
        return { success: false, error: 'Social post not found' }
      }

      const raw = (existing as Record<string, unknown>).carousel_slides
      const currentSlides: Record<string, unknown>[] = Array.isArray(raw)
        ? (raw as Record<string, unknown>[]).map((s) => ({ ...s }))
        : []

      if (slideIndex >= currentSlides.length) {
        return {
          success: false,
          error: `SLIDE_INDEX_OUT_OF_RANGE: Slide index ${slideIndex} does not exist (${currentSlides.length} slides)`,
        }
      }

      const slide = currentSlides[slideIndex]
      let tsx = typeof slide.tsx === 'string' ? slide.tsx : ''

      for (const { find, replace } of pairs) {
        const occurrences = this.countOccurrences(tsx, find)
        if (occurrences === 0) {
          return {
            success: false,
            error: `FIND_NOT_FOUND: find string not found in slide ${slideIndex} tsx: ${JSON.stringify(find.slice(0, 120))}`,
          }
        }
        if (occurrences > 1) {
          return {
            success: false,
            error: `FIND_NOT_UNIQUE: find string matched ${occurrences} times in slide ${slideIndex} tsx. Provide a more specific snippet: ${JSON.stringify(find.slice(0, 120))}`,
          }
        }
        tsx = tsx.replace(find, replace)
      }

      if (!tsx.includes('function') || !tsx.includes('return')) {
        return {
          success: false,
          error:
            'PATCH_BROKE_TSX: The patched TSX is missing a function or return statement. The patch likely removed structural code.',
        }
      }

      currentSlides[slideIndex] = { ...slide, tsx }
      updates.carousel_slides = currentSlides
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { data, error } = await this.repository.updatePost(supabase, {
      socialPostId,
      userId,
      orgId: orgId ?? null,
      updates,
    })

    if (error) {
      target.logger.error(`[update_social_post] Update failed: ${error.message}`)
      throw error
    }
    if (!data) return { success: false, error: 'Social post not found' }
    return data
  }

  private async listSocialPosts(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)

    const { data, error } = await this.repository.listPosts(supabase, {
      userId,
      orgId: orgId ?? null,
      campaignId,
      platform: typeof input.platform === 'string' ? input.platform : null,
    })
    if (error) throw error
    return data
  }

  private async publishSocialPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.publishingService.publishSocialPost(target, input, sessionKey)
  }

  private async deleteSocialPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const socialPostId = String(input.social_post_id ?? '').trim()
    if (!socialPostId) return { success: false, error: 'social_post_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findPostById(supabase, {
      socialPostId,
      userId,
      orgId: orgId ?? null,
      select: 'id, headline, caption',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Social post not found' }
    const rawName =
      (typeof data.headline === 'string' && data.headline.trim()) ||
      (typeof data.caption === 'string' && data.caption.trim()) ||
      'Untitled Social Post'
    const entityName = rawName.length > 60 ? rawName.slice(0, 57) + '…' : rawName
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        buildDeleteConfirmBlock({
          action: 'delete_social_post',
          entityType: 'social_post',
          entityId: String(data.id),
          entityName,
        }),
      ],
    }
  }

  private async getSocialPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const socialPostId = String(input.social_post_id ?? '').trim()
    if (!socialPostId) return { success: false, error: 'social_post_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findPostById(supabase, {
      socialPostId,
      userId,
      orgId: orgId ?? null,
      select: '*',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Social post not found' }
    return data
  }

  private async getSocialPostTemplate(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const templateId = input.template_id as number
    if (!templateId) return { success: false, error: 'template_id is required' }

    const { data, error } = await this.repository.findTemplate(supabase, {
      templateId,
      platform: input.platform ? (input.platform as string).toLowerCase() : null,
    })
    if (error) {
      target.logger.error(`[get_social_post_template] Fetch failed: ${error.message}`)
      return { success: false, error: 'Template not found' }
    }
    if (!data) return { success: false, error: 'Template not found' }
    return data
  }

  private async listSocialPostTemplates(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data, error } = await this.repository.listTemplates(supabase, {
      platform: input.platform ? (input.platform as string).toLowerCase() : null,
      templateCategory:
        typeof input.template_category === 'string' ? input.template_category : null,
    })
    if (error) {
      target.logger.error(`[list_social_post_templates] Fetch failed: ${error.message}`)
      throw error
    }
    return data
  }

  private countOccurrences(haystack: string, needle: string): number {
    if (!needle) return 0
    let count = 0
    let idx = 0
    for (;;) {
      const next = haystack.indexOf(needle, idx)
      if (next === -1) return count
      count += 1
      idx = next + needle.length
    }
  }

}
