import { Composio } from '@composio/core'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PDFDocument } from 'pdf-lib'
import { DatabaseService } from '../../../lib/services/database.service'
import type { SocialPostJobResult } from '../types'

type SocialPostRecord = {
  id: string
  user_id: string
  org_id: string | null
  campaign_id: string | null
  platform: 'linkedin' | 'instagram'
  post_type: string
  caption: string | null
  cta_url: string | null
  image_url: string | null
  video_url: string | null
  video_asset_id: string | null
  hashtags: string[] | null
  carousel_slides: Array<{
    tsx?: string
    image_url?: string
    image_asset_id?: string
    video_url?: string
    video_asset_id?: string
    caption?: string
  }> | null
}

const LINKEDIN_API_VERSION = '202603'
const USE_INTEGRATION_SCOPE_RESOLVER_V2 = process.env.INTEGRATION_SCOPE_RESOLVER_V2 !== '0'

@Injectable()
export class SocialPostService {
  private readonly logger = new Logger(SocialPostService.name)
  private readonly composio: Composio

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    const apiKey = this.configService.get<string>('composio.apiKey') || ''
    const baseURL = this.configService.get<string>('composio.baseUrl') || undefined
    this.composio = new Composio({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
      toolkitVersions: 'latest',
    } as Record<string, unknown>)
  }

  private async getComposioAccessToken(connectedAccountId: string): Promise<string> {
    const apiKey = this.configService.get<string>('composio.apiKey')
    if (!apiKey) throw new Error('Composio API key not configured')
    const res = await fetch(
      `https://backend.composio.dev/api/v3/connected_accounts/${connectedAccountId}`,
      { headers: { 'x-api-key': apiKey } },
    )
    if (!res.ok) {
      throw new Error(`Composio connected account fetch failed: ${res.status} ${res.statusText}`)
    }
    const body = (await res.json()) as Record<string, unknown>
    const token =
      ((body?.data as Record<string, unknown> | undefined)?.access_token as string | undefined) ??
      ((body?.params as Record<string, unknown> | undefined)?.access_token as string | undefined)
    if (!token || typeof token !== 'string') {
      throw new Error(
        'No access_token in Composio connected account — LinkedIn OAuth may need re-authorization',
      )
    }
    return token
  }

  private async compileSlidesPdf(
    slides: Array<{ tsx?: string; image_url?: string; caption?: string }>,
  ): Promise<Uint8Array> {
    const imageUrls = slides
      .map((s) => s.image_url?.trim())
      .filter((url): url is string => Boolean(url))
    if (imageUrls.length === 0) {
      throw new Error('No slide images available to compile into PDF')
    }

    const pdfDoc = await PDFDocument.create()
    for (const url of imageUrls) {
      const imgRes = await fetch(url)
      if (!imgRes.ok) throw new Error(`Failed to fetch slide image: ${url} (${imgRes.status})`)
      const imgBytes = new Uint8Array(await imgRes.arrayBuffer())

      const contentType = imgRes.headers.get('content-type') ?? ''
      const isJpeg =
        contentType.includes('jpeg') ||
        contentType.includes('jpg') ||
        url.endsWith('.jpg') ||
        url.endsWith('.jpeg')
      const img = isJpeg ? await pdfDoc.embedJpg(imgBytes) : await pdfDoc.embedPng(imgBytes)

      const page = pdfDoc.addPage([img.width, img.height])
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
    }

    return pdfDoc.save()
  }

  private async createInstagramChildContainer(
    igUserId: string,
    accessToken: string,
    slide: { image_url?: string; video_url?: string },
  ): Promise<string> {
    const graphBase = 'https://graph.facebook.com/v21.0'
    const body = new URLSearchParams()
    body.set('is_carousel_item', 'true')
    body.set('access_token', accessToken)
    if (slide.video_url?.trim()) {
      body.set('media_type', 'VIDEO')
      body.set('video_url', slide.video_url.trim())
    } else if (slide.image_url?.trim()) {
      body.set('image_url', slide.image_url.trim())
    } else {
      throw new Error('IG carousel child requires image_url or video_url')
    }
    const res = await fetch(`${graphBase}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`IG child container create failed: ${res.status} — ${text.slice(0, 500)}`)
    }
    const data = (await res.json()) as Record<string, unknown>
    const id = data.id
    if (!id || typeof id !== 'string') {
      throw new Error(`IG child container returned no id: ${JSON.stringify(data).slice(0, 500)}`)
    }
    return id
  }

  private async waitForInstagramContainerFinished(
    containerId: string,
    accessToken: string,
    timeoutMs = 180_000,
    intervalMs = 3_000,
  ): Promise<void> {
    const graphBase = 'https://graph.facebook.com/v21.0'
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const res = await fetch(
        `${graphBase}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
      )
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`IG container status check failed: ${res.status} — ${text.slice(0, 500)}`)
      }
      const data = (await res.json()) as Record<string, unknown>
      const status = String(data.status_code ?? '')
      if (status === 'FINISHED') return
      if (status === 'ERROR' || status === 'EXPIRED') {
        throw new Error(`IG container ${containerId} status=${status}`)
      }
      await new Promise((r) => setTimeout(r, intervalMs))
    }
    throw new Error(`IG container ${containerId} did not finish within ${timeoutMs}ms`)
  }

  private async createInstagramCarouselContainerDirect(
    igUserId: string,
    accessToken: string,
    caption: string,
    childrenIds: string[],
  ): Promise<string> {
    const graphBase = 'https://graph.facebook.com/v21.0'
    const body = new URLSearchParams()
    body.set('media_type', 'CAROUSEL')
    body.set('children', childrenIds.join(','))
    body.set('caption', caption)
    body.set('access_token', accessToken)
    const res = await fetch(`${graphBase}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`IG carousel parent create failed: ${res.status} — ${text.slice(0, 500)}`)
    }
    const data = (await res.json()) as Record<string, unknown>
    const id = data.id
    if (!id || typeof id !== 'string') {
      throw new Error(`IG carousel parent returned no id: ${JSON.stringify(data).slice(0, 500)}`)
    }
    return id
  }

  private async publishLinkedInVideo(
    accessToken: string,
    authorUrn: string,
    videoUrl: string,
    caption: string,
  ): Promise<string> {
    this.logger.log(`[DEBUG] LinkedIn publishLinkedInVideo: fetching video bytes from ${videoUrl}`)
    const videoRes = await fetch(videoUrl)
    if (!videoRes.ok) {
      throw new Error(`Failed to fetch video for LinkedIn upload: ${videoRes.status} ${videoUrl}`)
    }
    const videoBuf = Buffer.from(await videoRes.arrayBuffer())
    const fileSize = videoBuf.length
    this.logger.log(
      `[DEBUG] LinkedIn video fetched (${Math.round(fileSize / 1024)} KB), calling initializeUpload`,
    )

    const initRes = await fetch('https://api.linkedin.com/rest/videos?action=initializeUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: authorUrn,
          fileSizeBytes: fileSize,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
    })
    if (!initRes.ok) {
      const body = await initRes.text()
      throw new Error(
        `LinkedIn video initializeUpload failed: ${initRes.status} — ${body.slice(0, 500)}`,
      )
    }
    const initData = (await initRes.json()) as Record<string, unknown>
    const value = initData.value as Record<string, unknown> | undefined
    const videoUrn = value?.video as string | undefined
    const uploadToken = (value?.uploadToken as string | undefined) ?? ''
    const uploadInstructions =
      (value?.uploadInstructions as Array<Record<string, unknown>> | undefined) ?? []
    if (!videoUrn || uploadInstructions.length === 0) {
      throw new Error(
        `LinkedIn initializeUpload returned no video urn / instructions: ${JSON.stringify(initData).slice(0, 500)}`,
      )
    }

    this.logger.log(
      `[DEBUG] LinkedIn video urn=${videoUrn}, uploading ${uploadInstructions.length} part(s)…`,
    )

    const uploadedPartIds: string[] = []
    for (let i = 0; i < uploadInstructions.length; i++) {
      const ins = uploadInstructions[i]!
      const uploadUrl = ins.uploadUrl as string
      const firstByte = Number(ins.firstByte ?? 0)
      const lastByte = Number(ins.lastByte ?? fileSize - 1)
      if (!uploadUrl) {
        throw new Error(`LinkedIn upload instruction ${i} missing uploadUrl`)
      }
      const chunk = videoBuf.subarray(firstByte, lastByte + 1)
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: chunk,
      })
      if (!putRes.ok) {
        const body = await putRes.text()
        throw new Error(
          `LinkedIn video PUT part ${i} failed: ${putRes.status} — ${body.slice(0, 500)}`,
        )
      }
      const etag = putRes.headers.get('etag') ?? putRes.headers.get('ETag') ?? ''
      if (!etag) {
        throw new Error(`LinkedIn video PUT part ${i} returned no ETag header`)
      }
      uploadedPartIds.push(etag.replace(/"/g, ''))
    }

    this.logger.log(`[DEBUG] LinkedIn video all parts uploaded, calling finalizeUpload`)
    const finalizeRes = await fetch('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        finalizeUploadRequest: {
          video: videoUrn,
          uploadToken,
          uploadedPartIds,
        },
      }),
    })
    if (!finalizeRes.ok) {
      const body = await finalizeRes.text()
      throw new Error(
        `LinkedIn video finalizeUpload failed: ${finalizeRes.status} — ${body.slice(0, 500)}`,
      )
    }

    this.logger.log(`[DEBUG] LinkedIn video finalized, creating post with video urn=${videoUrn}`)

    let postRes: Response | null = null
    const maxPostAttempts = 4
    for (let attempt = 0; attempt < maxPostAttempts; attempt++) {
      postRes = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': LINKEDIN_API_VERSION,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: authorUrn,
          commentary: caption,
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          content: {
            media: {
              title: 'Video',
              id: videoUrn,
            },
          },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
        }),
      })
      if (postRes.ok) break
      const body = await postRes.clone().text()
      const processingError =
        postRes.status === 422 || /process|not.*ready|ingest/i.test(body.slice(0, 500))
      if (!processingError || attempt === maxPostAttempts - 1) {
        throw new Error(
          `LinkedIn create video post failed: ${postRes.status} — ${body.slice(0, 500)}`,
        )
      }
      const delayMs = 5000 * (attempt + 1)
      this.logger.log(
        `[DEBUG] LinkedIn video still processing (status=${postRes.status}), retrying in ${delayMs}ms`,
      )
      await new Promise((r) => setTimeout(r, delayMs))
    }

    if (!postRes) throw new Error('LinkedIn create video post: no response')

    const postHeader = postRes.headers.get('x-restli-id') ?? ''
    this.logger.log(
      `[DEBUG] LinkedIn create video post response: status=${postRes.status} x-restli-id=${postHeader || 'none'}`,
    )
    return postHeader || videoUrn
  }

  private async publishLinkedInCarousel(
    accessToken: string,
    authorUrn: string,
    pdfBytes: Uint8Array,
    caption: string,
  ): Promise<string> {
    this.logger.log(
      `[DEBUG] LinkedIn initializeUpload for owner=${authorUrn}, PDF size=${pdfBytes.length} bytes`,
    )
    const initRes = await fetch('https://api.linkedin.com/rest/documents?action=initializeUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initializeUploadRequest: { owner: authorUrn },
      }),
    })
    if (!initRes.ok) {
      const body = await initRes.text()
      throw new Error(`LinkedIn initializeUpload failed: ${initRes.status} — ${body.slice(0, 500)}`)
    }
    const initData = (await initRes.json()) as Record<string, unknown>
    const value = initData.value as Record<string, unknown> | undefined
    const uploadUrl = value?.uploadUrl as string | undefined
    const documentUrn = value?.document as string | undefined
    if (!uploadUrl || !documentUrn) {
      throw new Error(
        `LinkedIn initializeUpload returned no uploadUrl/document: ${JSON.stringify(initData).slice(0, 500)}`,
      )
    }

    this.logger.log(`[DEBUG] LinkedIn document URN=${documentUrn}, uploading PDF to presigned URL…`)
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: Buffer.from(pdfBytes),
    })
    if (!uploadRes.ok) {
      const body = await uploadRes.text()
      throw new Error(
        `LinkedIn document upload failed: ${uploadRes.status} — ${body.slice(0, 500)}`,
      )
    }

    this.logger.log(`[DEBUG] PDF upload complete (${uploadRes.status}), creating LinkedIn post…`)
    const postRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        author: authorUrn,
        commentary: caption,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: {
          media: {
            title: 'Carousel',
            id: documentUrn,
          },
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    })
    if (!postRes.ok) {
      const body = await postRes.text()
      throw new Error(`LinkedIn create post failed: ${postRes.status} — ${body.slice(0, 500)}`)
    }

    const postHeader = postRes.headers.get('x-restli-id') ?? ''
    this.logger.log(
      `[DEBUG] LinkedIn create post response: status=${postRes.status} x-restli-id=${postHeader || 'none'}`,
    )
    return postHeader || documentUrn
  }

  async processSchedule(
    scheduleId: string,
    attemptsMade: number,
    maxAttempts: number,
  ): Promise<SocialPostJobResult> {
    const supabase = this.databaseService.getClient()

    const { data: schedule, error: scheduleError } = await supabase
      .from('social_post_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()
    if (scheduleError || !schedule)
      throw new Error(`Social schedule not found: ${scheduleError?.message || scheduleId}`)

    if (schedule.status !== 'scheduled' && schedule.status !== 'processing') {
      return {
        scheduleId,
        success: false,
        error: `Schedule status is ${String(schedule.status)}`,
        processedAt: new Date().toISOString(),
      }
    }

    const nowIso = new Date().toISOString()
    await supabase
      .from('social_post_schedules')
      .update({ status: 'processing', updated_at: nowIso })
      .eq('id', scheduleId)

    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', String(schedule.social_post_id))
      .single()
    if (postError || !post)
      throw new Error(
        `Social post not found: ${postError?.message || String(schedule.social_post_id)}`,
      )

    let socialPost = post as SocialPostRecord
    if (!socialPost.video_url?.trim() && socialPost.video_asset_id) {
      const { data: asset } = await supabase
        .from('media_assets')
        .select('public_url')
        .eq('id', socialPost.video_asset_id)
        .maybeSingle()
      const pub = typeof asset?.public_url === 'string' ? asset.public_url.trim() : ''
      if (pub) socialPost = { ...socialPost, video_url: pub }
    }

    if (Array.isArray(socialPost.carousel_slides) && socialPost.carousel_slides.length > 0) {
      const enrichedSlides = await Promise.all(
        socialPost.carousel_slides.map(async (slide) => {
          const next = { ...slide }
          if (!next.video_url?.trim() && next.video_asset_id) {
            const { data: asset } = await supabase
              .from('media_assets')
              .select('public_url')
              .eq('id', next.video_asset_id)
              .maybeSingle()
            const pub = typeof asset?.public_url === 'string' ? asset.public_url.trim() : ''
            if (pub) next.video_url = pub
          }
          if (!next.image_url?.trim() && next.image_asset_id) {
            const { data: asset } = await supabase
              .from('media_assets')
              .select('public_url')
              .eq('id', next.image_asset_id)
              .maybeSingle()
            const pub = typeof asset?.public_url === 'string' ? asset.public_url.trim() : ''
            if (pub) next.image_url = pub
          }
          return next
        }),
      )
      socialPost = { ...socialPost, carousel_slides: enrichedSlides }
    }

    this.logger.log(
      `[DEBUG] Post ${socialPost.id} | platform=${socialPost.platform} post_type=${socialPost.post_type} ` +
        `image_url=${socialPost.image_url ? 'SET' : 'NULL'} video_url=${socialPost.video_url ? 'SET' : 'NULL'} ` +
        `carousel_slides type=${typeof socialPost.carousel_slides} ` +
        `isArray=${Array.isArray(socialPost.carousel_slides)} ` +
        `length=${Array.isArray(socialPost.carousel_slides) ? socialPost.carousel_slides.length : 'N/A'} ` +
        `raw_keys=${
          post
            ? Object.keys(post)
                .filter((k) => k.includes('carousel'))
                .join(',') || 'none'
            : 'no-post'
        }`,
    )

    try {
      if (
        socialPost.post_type !== 'text_only' &&
        !socialPost.image_url?.trim() &&
        !socialPost.video_url?.trim()
      ) {
        const msg = `Post ${socialPost.id} has no image_url or video_url — cannot publish non-text post without media`
        this.logger.error(msg)

        await supabase
          .from('social_post_schedules')
          .update({
            status: 'failed',
            error_message: msg.slice(0, 1000),
            updated_at: new Date().toISOString(),
          })
          .eq('id', scheduleId)

        await supabase
          .from('social_posts')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', socialPost.id)

        return {
          scheduleId,
          success: false,
          error: msg,
          processedAt: new Date().toISOString(),
        }
      }

      // 1) Try campaign-scoped integration first
      let connectedAccountId: string | undefined
      let composioUserId = socialPost.user_id
      let resolvedFromCampaignConnection = false
      let cachedAuthorUrn: string | undefined

      if (socialPost.campaign_id) {
        let campaignConnQuery = supabase
          .from('campaign_integration_connections')
          .select('composio_connected_account_id, user_id, metadata, status')
          .eq('campaign_id', socialPost.campaign_id)
          .eq('integration_id', socialPost.platform)
          .eq('status', 'connected')
          .limit(1)

        if (socialPost.org_id) {
          campaignConnQuery = campaignConnQuery.eq('org_id', socialPost.org_id)
        } else {
          campaignConnQuery = campaignConnQuery.eq('user_id', socialPost.user_id).is('org_id', null)
        }

        const { data: campaignConn } = await campaignConnQuery.maybeSingle()
        if (campaignConn?.composio_connected_account_id) {
          connectedAccountId = campaignConn.composio_connected_account_id as string
          composioUserId = String(campaignConn.user_id ?? socialPost.user_id)
          resolvedFromCampaignConnection = true
          const connMeta =
            campaignConn.metadata &&
            typeof campaignConn.metadata === 'object' &&
            !Array.isArray(campaignConn.metadata)
              ? (campaignConn.metadata as Record<string, unknown>)
              : {}
          if (typeof connMeta.linkedin_author_urn === 'string') {
            cachedAuthorUrn = connMeta.linkedin_author_urn
          }
        }
      }

      // 2) Fall back to account/org-level integration
      if (!resolvedFromCampaignConnection) {
        let integrationQuery = supabase
          .from('user_integrations')
          .select('id, user_id, status, metadata, scope_mode, is_default, updated_at')
          .eq('integration_id', socialPost.platform)
          .in('status', ['connected', 'pending'])
          .order('updated_at', { ascending: false })

        if (socialPost.org_id) {
          integrationQuery = integrationQuery.eq('org_id', socialPost.org_id)
        } else {
          integrationQuery = integrationQuery.eq('user_id', socialPost.user_id).is('org_id', null)
        }

        const { data: integrationRows, error: integrationError } = await integrationQuery
        if (integrationError || !integrationRows || integrationRows.length === 0) {
          throw new Error(`Integration not connected for ${socialPost.platform}`)
        }
        const integration = this.pickPreferredIntegrationRow(
          integrationRows as Array<Record<string, unknown>>,
          socialPost.user_id,
          socialPost.org_id,
        )
        if (!integration) {
          throw new Error(`Integration not connected for ${socialPost.platform}`)
        }

        const metadata =
          integration.metadata &&
          typeof integration.metadata === 'object' &&
          !Array.isArray(integration.metadata)
            ? (integration.metadata as Record<string, unknown>)
            : {}
        connectedAccountId =
          typeof metadata.composio_connected_account_id === 'string'
            ? metadata.composio_connected_account_id
            : undefined
        if (typeof metadata.linkedin_author_urn === 'string') {
          cachedAuthorUrn = metadata.linkedin_author_urn
        }

        composioUserId = socialPost.org_id
          ? String(integration.user_id ?? socialPost.user_id)
          : socialPost.user_id
      }

      let result: Record<string, unknown>

      const execOpts = (slug: string, args: Record<string, unknown>) =>
        ({
          userId: composioUserId,
          arguments: args,
          ...(connectedAccountId ? { connectedAccountId } : {}),
          dangerouslySkipVersionCheck: true,
        }) as Record<string, unknown>

      if (socialPost.platform === 'linkedin') {
        let author: string
        if (cachedAuthorUrn) {
          author = cachedAuthorUrn
          this.logger.log(`[DEBUG] LinkedIn author from cache: ${author}`)
        } else {
          const infoRes = (await this.composio.tools.execute(
            'LINKEDIN_GET_MY_INFO',
            execOpts('LINKEDIN_GET_MY_INFO', {}),
          )) as Record<string, unknown>
          const infoData =
            infoRes.data && typeof infoRes.data === 'object'
              ? (infoRes.data as Record<string, unknown>)
              : null
          const responseDict =
            infoData?.response_dict && typeof infoData.response_dict === 'object'
              ? (infoData.response_dict as Record<string, unknown>)
              : null
          const authorId = responseDict?.author_id ?? responseDict?.sub ?? infoData?.id
          if (!authorId || typeof authorId !== 'string') {
            throw new Error(
              `Could not resolve LinkedIn author URN — LINKEDIN_GET_MY_INFO returned: ${JSON.stringify(infoRes).slice(0, 500)}`,
            )
          }
          author = authorId.startsWith('urn:') ? authorId : `urn:li:person:${authorId}`
        }
        this.logger.log(`[DEBUG] LinkedIn author resolved: ${author}`)

        const isCarousel =
          socialPost.post_type === 'carousel' &&
          Array.isArray(socialPost.carousel_slides) &&
          socialPost.carousel_slides.length > 0

        this.logger.log(
          `[DEBUG] isCarousel=${isCarousel} | post_type=${socialPost.post_type} ` +
            `slides_is_array=${Array.isArray(socialPost.carousel_slides)} ` +
            `slides_length=${Array.isArray(socialPost.carousel_slides) ? socialPost.carousel_slides.length : 'N/A'} ` +
            `connectedAccountId=${connectedAccountId ?? 'NONE'}`,
        )

        if (isCarousel) {
          if (!connectedAccountId) {
            throw new Error(
              'LinkedIn carousel requires a connected account to retrieve OAuth token',
            )
          }
          const slideUrls = socialPost
            .carousel_slides!.map((s, i) => `slide[${i}].image_url=${s.image_url ? 'SET' : 'NULL'}`)
            .join(', ')
          this.logger.log(`[DEBUG] Carousel slides detail: ${slideUrls}`)
          this.logger.log(
            `Compiling ${socialPost.carousel_slides!.length} slides into PDF for LinkedIn carousel…`,
          )
          const pdfBytes = await this.compileSlidesPdf(socialPost.carousel_slides!)
          this.logger.log(
            `PDF compiled (${Math.round(pdfBytes.length / 1024)} KB), uploading to LinkedIn…`,
          )

          this.logger.log(
            `[DEBUG] Fetching Composio access token for connectedAccountId=${connectedAccountId}`,
          )
          const accessToken = await this.getComposioAccessToken(connectedAccountId)
          this.logger.log(
            `[DEBUG] Got LinkedIn access token (${accessToken.length} chars), calling Documents API…`,
          )
          const publishedId = await this.publishLinkedInCarousel(
            accessToken,
            author,
            pdfBytes,
            socialPost.caption ?? '',
          )

          this.logger.log(`LinkedIn carousel published for schedule ${scheduleId}: ${publishedId}`)
          result = { successful: true, id: publishedId }
        } else if (socialPost.video_url?.trim()) {
          if (!connectedAccountId) {
            throw new Error('LinkedIn video requires a connected account to retrieve OAuth token')
          }
          this.logger.log(
            `[DEBUG] LinkedIn video path — fetching access token for connectedAccountId=${connectedAccountId}`,
          )
          const accessToken = await this.getComposioAccessToken(connectedAccountId)
          const publishedId = await this.publishLinkedInVideo(
            accessToken,
            author,
            socialPost.video_url.trim(),
            socialPost.caption ?? '',
          )
          this.logger.log(`LinkedIn video published for schedule ${scheduleId}: ${publishedId}`)
          result = { successful: true, id: publishedId }
        } else if (socialPost.image_url) {
          this.logger.log(
            `[DEBUG] Single-image LinkedIn path — uploading image to Composio S3 via files.upload()`,
          )
          const fileData = await this.composio.files.upload({
            file: socialPost.image_url,
            toolSlug: 'LINKEDIN_CREATE_LINKED_IN_POST',
            toolkitSlug: 'linkedin',
          })
          this.logger.log(
            `[DEBUG] Composio files.upload result: name=${fileData.name} mimetype=${fileData.mimetype} s3key=${fileData.s3key.slice(0, 80)}`,
          )

          result = (await this.composio.tools.execute(
            'LINKEDIN_CREATE_LINKED_IN_POST',
            execOpts('LINKEDIN_CREATE_LINKED_IN_POST', {
              author,
              commentary: socialPost.caption ?? '',
              images: [{ name: fileData.name, mimetype: fileData.mimetype, s3key: fileData.s3key }],
            }),
          )) as Record<string, unknown>

          this.logger.log(
            `Composio LINKEDIN_CREATE_LINKED_IN_POST response for schedule ${scheduleId}: ${JSON.stringify(result).slice(0, 2000)}`,
          )
        } else {
          this.logger.log(`[DEBUG] Text-only LinkedIn path`)
          result = (await this.composio.tools.execute(
            'LINKEDIN_CREATE_LINKED_IN_POST',
            execOpts('LINKEDIN_CREATE_LINKED_IN_POST', {
              author,
              commentary: socialPost.caption ?? '',
            }),
          )) as Record<string, unknown>

          this.logger.log(
            `Composio LINKEDIN_CREATE_LINKED_IN_POST response for schedule ${scheduleId}: ${JSON.stringify(result).slice(0, 2000)}`,
          )
        }
      } else if (socialPost.platform === 'instagram') {
        const userRes = (await this.composio.tools.execute(
          'INSTAGRAM_GET_USER_INFO',
          execOpts('INSTAGRAM_GET_USER_INFO', {}),
        )) as Record<string, unknown>
        const userData =
          userRes.data && typeof userRes.data === 'object'
            ? (userRes.data as Record<string, unknown>)
            : null
        const igUserId = userData?.id
        if (!igUserId || typeof igUserId !== 'string') {
          throw new Error(
            `Could not resolve Instagram user ID — INSTAGRAM_GET_USER_INFO returned: ${JSON.stringify(userRes).slice(0, 500)}`,
          )
        }

        const caption = [
          socialPost.caption ?? '',
          ...(Array.isArray(socialPost.hashtags)
            ? socialPost.hashtags.map((tag) => `#${tag}`)
            : []),
        ]
          .filter(Boolean)
          .join(' ')

        const isIgCarousel =
          socialPost.post_type === 'carousel' &&
          Array.isArray(socialPost.carousel_slides) &&
          socialPost.carousel_slides.length >= 2

        this.logger.log(
          `[DEBUG] Instagram isCarousel=${isIgCarousel} | post_type=${socialPost.post_type} ` +
            `slides_length=${Array.isArray(socialPost.carousel_slides) ? socialPost.carousel_slides.length : 'N/A'}`,
        )

        let creationId: string

        if (isIgCarousel) {
          const slides = socialPost.carousel_slides!
          const hasAnyVideo = slides.some((s) => Boolean(s.video_url?.trim()))

          if (hasAnyVideo) {
            if (!connectedAccountId) {
              throw new Error(
                'Instagram carousel with video requires a connected account to retrieve OAuth token',
              )
            }
            if (slides.length < 2 || slides.length > 10) {
              throw new Error(`Instagram carousel requires 2-10 slides, got ${slides.length}`)
            }
            const missing = slides.filter((s) => !s.image_url?.trim() && !s.video_url?.trim())
            if (missing.length > 0) {
              throw new Error(
                `Instagram carousel: ${missing.length} slide(s) missing image_url/video_url`,
              )
            }
            this.logger.log(
              `[DEBUG] Instagram carousel has video(s); using direct Graph API for ${slides.length} children`,
            )
            const igAccessToken = await this.getComposioAccessToken(connectedAccountId)

            const childIds: string[] = []
            for (let i = 0; i < slides.length; i++) {
              const slide = slides[i]!
              const childId = await this.createInstagramChildContainer(igUserId, igAccessToken, {
                image_url: slide.image_url,
                video_url: slide.video_url,
              })
              this.logger.log(
                `[DEBUG] IG child ${i + 1}/${slides.length} container=${childId} (${slide.video_url ? 'video' : 'image'})`,
              )
              if (slide.video_url?.trim()) {
                await this.waitForInstagramContainerFinished(childId, igAccessToken)
              }
              childIds.push(childId)
            }

            creationId = await this.createInstagramCarouselContainerDirect(
              igUserId,
              igAccessToken,
              caption,
              childIds,
            )
            this.logger.log(`[DEBUG] Instagram mixed carousel container created: ${creationId}`)
          } else {
            const childImageUrls = slides
              .map((s) => s.image_url?.trim())
              .filter((url): url is string => Boolean(url))

            if (childImageUrls.length < 2) {
              throw new Error(
                `Instagram carousel requires at least 2 slide image URLs, got ${childImageUrls.length}`,
              )
            }

            this.logger.log(
              `[DEBUG] Instagram carousel: ${childImageUrls.length} slide images, calling INSTAGRAM_CREATE_CAROUSEL_CONTAINER`,
            )

            const carouselRes = (await this.composio.tools.execute(
              'INSTAGRAM_CREATE_CAROUSEL_CONTAINER',
              execOpts('INSTAGRAM_CREATE_CAROUSEL_CONTAINER', {
                ig_user_id: igUserId,
                caption,
                child_image_urls: childImageUrls,
              }),
            )) as Record<string, unknown>

            const carouselData =
              carouselRes.data && typeof carouselRes.data === 'object'
                ? (carouselRes.data as Record<string, unknown>)
                : null
            creationId = (carouselData?.id ?? carouselData?.creation_id) as string
            if (!creationId || typeof creationId !== 'string') {
              throw new Error(
                `INSTAGRAM_CREATE_CAROUSEL_CONTAINER returned no creation ID — response: ${JSON.stringify(carouselRes).slice(0, 500)}`,
              )
            }

            this.logger.log(`[DEBUG] Instagram carousel container created: ${creationId}`)
          }
        } else {
          const vid = socialPost.video_url?.trim() ?? ''
          const img = socialPost.image_url?.trim() ?? ''
          const containerPayload: Record<string, unknown> = {
            ig_user_id: igUserId,
            caption,
          }
          if (vid) {
            containerPayload.video_url = vid
          } else if (img) {
            containerPayload.image_url = img
          }

          const containerRes = (await this.composio.tools.execute(
            'INSTAGRAM_CREATE_MEDIA_CONTAINER',
            execOpts('INSTAGRAM_CREATE_MEDIA_CONTAINER', containerPayload),
          )) as Record<string, unknown>

          const containerData =
            containerRes.data && typeof containerRes.data === 'object'
              ? (containerRes.data as Record<string, unknown>)
              : null
          creationId = (containerData?.id ?? containerData?.creation_id) as string
          if (!creationId || typeof creationId !== 'string') {
            throw new Error(
              `INSTAGRAM_CREATE_MEDIA_CONTAINER returned no creation ID — response: ${JSON.stringify(containerRes).slice(0, 500)}`,
            )
          }
        }

        result = (await this.composio.tools.execute(
          'INSTAGRAM_CREATE_POST',
          execOpts('INSTAGRAM_CREATE_POST', {
            ig_user_id: igUserId,
            creation_id: creationId,
          }),
        )) as Record<string, unknown>

        this.logger.log(
          `Composio INSTAGRAM_CREATE_POST response for schedule ${scheduleId}: ${JSON.stringify(result).slice(0, 2000)}`,
        )
      } else {
        throw new Error(`Unsupported social platform: ${socialPost.platform}`)
      }

      const successful =
        result.successful === true || result.status === 'success' || result.status === 'SUCCESS'
      const errorField =
        typeof result.error === 'string'
          ? result.error
          : typeof result.message === 'string'
            ? result.message
            : null

      if (!successful && errorField) {
        throw new Error(`Composio ${socialPost.platform} failed: ${errorField}`)
      }

      const innerResult =
        result.result && typeof result.result === 'object'
          ? (result.result as Record<string, unknown>)
          : result.data && typeof result.data === 'object'
            ? (result.data as Record<string, unknown>)
            : null

      if (!successful && !innerResult && !result.id && !result.post_id) {
        throw new Error(
          `Composio ${socialPost.platform} returned no success indicator — response: ${JSON.stringify(result).slice(0, 500)}`,
        )
      }

      const publishedId = innerResult
        ? String(innerResult.id ?? innerResult.post_id ?? innerResult.activity ?? '')
        : String(result.id ?? result.post_id ?? '')

      await supabase
        .from('social_post_schedules')
        .update({
          status: 'published',
          published_at: nowIso,
          error_message: null,
          updated_at: nowIso,
        })
        .eq('id', scheduleId)

      await supabase
        .from('social_posts')
        .update({
          status: 'published',
          scheduled_at: null,
          published_at: nowIso,
          published_id: publishedId || null,
          updated_at: nowIso,
        })
        .eq('id', socialPost.id)

      return {
        scheduleId,
        success: true,
        publishedId: publishedId || undefined,
        processedAt: nowIso,
      }
    } catch (error) {
      const nextAttempts = Math.max(Number(schedule.attempts ?? 0) + 1, attemptsMade + 1)
      const finalFailure = nextAttempts >= maxAttempts
      const errorMessage = error instanceof Error ? error.message : String(error)

      await supabase
        .from('social_post_schedules')
        .update({
          attempts: nextAttempts,
          status: finalFailure ? 'failed' : 'scheduled',
          error_message: errorMessage.slice(0, 1000),
          job_id: finalFailure ? String(schedule.job_id ?? scheduleId) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId)

      if (finalFailure) {
        await supabase
          .from('social_posts')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', socialPost.id)
      }

      this.logger.error(`Scheduled social post ${scheduleId} failed: ${errorMessage}`)
      throw error
    }
  }

  private pickPreferredIntegrationRow(
    rows: Array<Record<string, unknown>>,
    userId: string,
    orgId: string | null,
  ): Record<string, unknown> | null {
    if (!rows.length) return null
    if (!USE_INTEGRATION_SCOPE_RESOLVER_V2) return rows[0]
    if (!orgId) return rows[0]
    const scopedRows = rows.filter((row) => {
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
      return false
    })
    if (!scopedRows.length) return null
    const personalConnected = scopedRows.find(
      (row) =>
        String(row.status ?? '').toLowerCase() === 'connected' &&
        String(row.scope_mode ?? '') === 'personal' &&
        String(row.user_id ?? '') === userId,
    )
    if (personalConnected) return personalConnected
    const sharedDefaultConnected = scopedRows.find(
      (row) =>
        String(row.status ?? '').toLowerCase() === 'connected' &&
        String(row.scope_mode ?? '') === 'org_shared' &&
        Boolean(row.is_default),
    )
    if (sharedDefaultConnected) return sharedDefaultConnected
    const latestSharedConnected = scopedRows.find(
      (row) =>
        String(row.status ?? '').toLowerCase() === 'connected' &&
        String(row.scope_mode ?? '') === 'org_shared',
    )
    if (latestSharedConnected) return latestSharedConnected
    const personalAny = scopedRows.find(
      (row) => String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId,
    )
    if (personalAny) return personalAny
    const sharedDefaultAny = scopedRows.find(
      (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
    )
    if (sharedDefaultAny) return sharedDefaultAny
    return scopedRows[0]
  }
}
