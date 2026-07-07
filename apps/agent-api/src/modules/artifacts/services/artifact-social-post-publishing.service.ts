import { Injectable } from '@nestjs/common'
import { ArtifactSocialPostsRepository } from '../repositories/artifact-social-posts.repository'

@Injectable()
export class ArtifactSocialPostPublishingService {
  constructor(
    private readonly repository: ArtifactSocialPostsRepository = new ArtifactSocialPostsRepository(),
  ) {}

  async publishSocialPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const socialPostId = input.social_post_id as string
    if (!socialPostId) return { success: false, error: 'social_post_id is required' }

    const { data: post, error: fetchError } = await this.repository.findPostById(supabase, {
      socialPostId,
      userId,
      orgId: orgId ?? null,
      select: '*',
    })

    if (fetchError || !post) {
      return { success: false, error: 'Social post not found' }
    }

    if (
      !post.image_url &&
      !(post as { video_url?: string | null }).video_url &&
      post.post_type !== 'text_only'
    ) {
      return {
        success: false,
        error:
          'image_url or video_url is required before publishing. Render the TSX to an image first, or attach a video URL.',
      }
    }

    const service = post.platform as string
    const useIntegrationHandler = target.actionRegistry?.use_integration
    if (!useIntegrationHandler) {
      return { success: false, error: 'use_integration handler not available' }
    }

    const publishData: Record<string, unknown> = { service }

    if (service === 'linkedin') {
      let author: string | undefined

      const { data: integrationRows } = await this.repository.listLinkedInIntegrations(
        supabase,
        { userId, orgId: orgId ?? null },
      )
      const rowCandidates = ((integrationRows ?? []) as Array<Record<string, unknown>>).filter(
        (row) => {
          if (!orgId) return true
          const scopeMode = String(row.scope_mode ?? '')
          if (scopeMode === 'org_shared') return true
          if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
          return false
        },
      )
      const integrationRow =
        rowCandidates.find(
          (row) =>
            String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId,
        ) ??
        rowCandidates.find(
          (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
        ) ??
        rowCandidates[0]
      const integrationMeta =
        integrationRow?.metadata &&
        typeof integrationRow.metadata === 'object' &&
        !Array.isArray(integrationRow.metadata)
          ? (integrationRow.metadata as Record<string, unknown>)
          : {}
      if (typeof integrationMeta.linkedin_author_urn === 'string') {
        author = integrationMeta.linkedin_author_urn
      }

      if (!author) {
        const infoResult = await useIntegrationHandler(
          { service, integration_action: 'LINKEDIN_GET_MY_INFO', params: {} },
          sessionKey,
        )
        const infoObj =
          infoResult && typeof infoResult === 'object'
            ? (infoResult as Record<string, unknown>)
            : {}
        const infoData =
          infoObj.data && typeof infoObj.data === 'object'
            ? (infoObj.data as Record<string, unknown>)
            : infoObj.result && typeof infoObj.result === 'object'
              ? (infoObj.result as Record<string, unknown>)
              : null
        const responseDict =
          infoData?.response_dict && typeof infoData.response_dict === 'object'
            ? (infoData.response_dict as Record<string, unknown>)
            : null
        const rawAuthorId = responseDict?.author_id ?? responseDict?.sub ?? infoData?.id
        if (!rawAuthorId || typeof rawAuthorId !== 'string') {
          return {
            success: false,
            error: `Could not resolve LinkedIn author URN — GET_MY_INFO returned: ${JSON.stringify(infoResult).slice(0, 300)}`,
          }
        }
        author = rawAuthorId.startsWith('urn:') ? rawAuthorId : `urn:li:person:${rawAuthorId}`
      }

      const postParams: Record<string, unknown> = {
        author,
        commentary: post.caption ?? '',
      }

      const linkedInImageUrl = typeof post.image_url === 'string' ? post.image_url : ''
      if (linkedInImageUrl) {
        const composioSvc = (target as any).composioService as
          | {
              uploadFile: (
                file: string,
                toolSlug: string,
                toolkitSlug: string,
              ) => Promise<{ name: string; mimetype: string; s3key: string; asset_ref?: unknown }>
            }
          | undefined
        if (!composioSvc?.uploadFile) {
          return { success: false, error: 'Composio file upload not available' }
        }
        const fileData = await composioSvc.uploadFile(
          linkedInImageUrl,
          'LINKEDIN_CREATE_LINKED_IN_POST',
          'linkedin',
        )
        postParams.images = [
          { name: fileData.name, mimetype: fileData.mimetype, s3key: fileData.s3key },
        ]
      }

      const ctaUrl = typeof post.cta_url === 'string' ? post.cta_url : ''
      if (ctaUrl) {
        postParams.contentLandingPage = ctaUrl
        postParams.contentCallToActionLabel = 'LEARN_MORE'
      }

      publishData.integration_action = 'LINKEDIN_CREATE_LINKED_IN_POST'
      publishData.params = postParams
    } else if (service === 'instagram') {
      const igCaption = [
        post.caption ?? '',
        ...(Array.isArray(post.hashtags)
          ? post.hashtags
              .filter((hashtag): hashtag is string => typeof hashtag === 'string')
              .map((hashtag) => `#${hashtag}`)
          : []),
      ].join(' ')

      const slides = Array.isArray(post.carousel_slides)
        ? (post.carousel_slides as Array<{ image_url?: string }>)
        : []
      const isIgCarousel = post.post_type === 'carousel' && slides.length >= 2

      if (isIgCarousel) {
        const childImageUrls = slides
          .map((s) => (typeof s.image_url === 'string' ? s.image_url.trim() : ''))
          .filter(Boolean)

        if (childImageUrls.length < 2) {
          return {
            success: false,
            error: `Instagram carousel requires at least 2 slide image URLs, got ${childImageUrls.length}. Render slide images first.`,
          }
        }

        const userInfoResult = await useIntegrationHandler(
          { service, integration_action: 'INSTAGRAM_GET_USER_INFO', params: {} },
          sessionKey,
        )
        const userInfoObj =
          userInfoResult && typeof userInfoResult === 'object'
            ? (userInfoResult as Record<string, unknown>)
            : {}
        const userInfoData =
          userInfoObj.data && typeof userInfoObj.data === 'object'
            ? (userInfoObj.data as Record<string, unknown>)
            : userInfoObj.result && typeof userInfoObj.result === 'object'
              ? (userInfoObj.result as Record<string, unknown>)
              : null
        const igUserId = userInfoData?.id as string | undefined
        if (!igUserId) {
          return {
            success: false,
            error: `Could not resolve Instagram user ID — GET_USER_INFO returned: ${JSON.stringify(userInfoResult).slice(0, 300)}`,
          }
        }

        const carouselResult = await useIntegrationHandler(
          {
            service,
            integration_action: 'INSTAGRAM_CREATE_CAROUSEL_CONTAINER',
            params: {
              ig_user_id: igUserId,
              caption: igCaption,
              child_image_urls: childImageUrls,
            },
          },
          sessionKey,
        )
        const carouselObj =
          carouselResult && typeof carouselResult === 'object'
            ? (carouselResult as Record<string, unknown>)
            : {}
        const carouselData =
          carouselObj.data && typeof carouselObj.data === 'object'
            ? (carouselObj.data as Record<string, unknown>)
            : carouselObj.result && typeof carouselObj.result === 'object'
              ? (carouselObj.result as Record<string, unknown>)
              : null
        const carouselCreationId = (carouselData?.id ?? carouselData?.creation_id) as
          | string
          | undefined
        if (!carouselCreationId) {
          return {
            success: false,
            error: `INSTAGRAM_CREATE_CAROUSEL_CONTAINER returned no creation ID — response: ${JSON.stringify(carouselResult).slice(0, 300)}`,
          }
        }

        publishData.integration_action = 'INSTAGRAM_CREATE_POST'
        publishData.params = {
          ig_user_id: igUserId,
          creation_id: carouselCreationId,
        }
      } else {
        publishData.integration_action = 'INSTAGRAM_CREATE_MEDIA_CONTAINER'
        const vUrl =
          typeof (post as { video_url?: string | null }).video_url === 'string'
            ? (post as { video_url: string }).video_url.trim()
            : ''
        const iUrl = typeof post.image_url === 'string' ? post.image_url.trim() : ''
        publishData.params = {
          caption: igCaption,
          ...(vUrl ? { video_url: vUrl } : {}),
          ...(iUrl && !vUrl ? { image_url: iUrl } : {}),
        }
      }
    } else {
      return { success: false, error: `Unsupported platform: ${service}` }
    }

    const result = await useIntegrationHandler(publishData, sessionKey)
    const resultObj =
      result && typeof result === 'object' ? (result as Record<string, unknown>) : {}

    if (resultObj.success) {
      const publishedId =
        typeof resultObj.result === 'object' && resultObj.result
          ? String((resultObj.result as Record<string, unknown>).id ?? '')
          : ''

      await this.repository.updatePublishStatus(supabase, {
        socialPostId,
        userId,
        orgId: orgId ?? null,
        updates: {
          status: 'published',
          published_at: new Date().toISOString(),
          published_id: publishedId || null,
        },
      })
    } else {
      await this.repository.updatePublishStatus(supabase, {
        socialPostId,
        userId,
        orgId: orgId ?? null,
        updates: { status: 'failed' },
      })
    }

    return result
  }
}
