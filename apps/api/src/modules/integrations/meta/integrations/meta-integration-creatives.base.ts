import { BadRequestException } from '@nestjs/common'
import { META_ERRORS } from '../config/meta-errors.config'
import type {
  MetaAdCreativeInput,
  MetaAssetFeedCreativeInput,
  MetaCarouselCreativeInput,
  MetaImageUploadResult,
  MetaVideoCreativeInput,
} from '../types/meta.types'
import { MetaIntegrationAudiencesBase } from './meta-integration-audiences.base'

export abstract class MetaIntegrationCreativesBase extends MetaIntegrationAudiencesBase {
  async getAdImages(
    accessToken: string,
    adAccountId: string,
  ): Promise<Array<{ id: string; hash: string; url?: string; name?: string }>> {
    const params = new URLSearchParams()
    params.set('fields', 'id,hash,url,name')
    params.set('limit', '100')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${adAccountId}/adimages?${params.toString()}`
    const response = await this.fetchWithRetry(url, undefined, 'Failed to load ad account images')
    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta getAdImages failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException('Failed to load ad account images')
    }
    const parsed = JSON.parse(raw) as {
      data?: Array<{ id: string; hash: string; url?: string; name?: string }>
    }
    return parsed.data ?? []
  }

  async uploadAdImage(
    accessToken: string,
    adAccountId: string,
    imageUrl: string,
  ): Promise<MetaImageUploadResult> {
    const endpoint = `${this.API_BASE}/${adAccountId}/adimages`
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new BadRequestException(`Failed to download image from URL: ${imageResponse.status}`)
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    const base64Image = imageBuffer.toString('base64')
    const formBody = new URLSearchParams()
    formBody.set('bytes', base64Image)
    formBody.set('access_token', accessToken)
    formBody.set('appsecret_proof', this.buildAppSecretProof(accessToken))

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    })
    const raw = await response.text()

    if (!response.ok) {
      this.logger.error(`Meta image upload failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(`Image upload failed: ${raw.slice(0, 200)}`)
    }

    const parsed = JSON.parse(raw) as { images?: Record<string, { hash: string; url?: string }> }
    const images = parsed.images
    if (!images) throw new BadRequestException(META_ERRORS.IMAGE_UPLOAD_NO_IMAGES)

    const firstKey = Object.keys(images)[0]
    return { hash: images[firstKey].hash, url: images[firstKey].url }
  }

  async uploadAdImageFromBuffer(
    accessToken: string,
    adAccountId: string,
    imageBuffer: Buffer,
    mimeType?: string,
  ): Promise<MetaImageUploadResult> {
    const endpoint = `${this.API_BASE}/${adAccountId}/adimages`
    const base64Image = imageBuffer.toString('base64')
    const formBody = new URLSearchParams()
    formBody.set('bytes', base64Image)
    formBody.set('access_token', accessToken)
    formBody.set('appsecret_proof', this.buildAppSecretProof(accessToken))

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(
        `Meta image upload from buffer failed: ${response.status} ${raw.slice(0, 300)}`,
      )
      throw new BadRequestException(`Image upload failed: ${raw.slice(0, 200)}`)
    }

    const parsed = JSON.parse(raw) as { images?: Record<string, { hash: string; url?: string }> }
    const images = parsed.images
    if (!images) throw new BadRequestException(META_ERRORS.IMAGE_UPLOAD_NO_IMAGES)

    const firstKey = Object.keys(images)[0]
    return { hash: images[firstKey].hash, url: images[firstKey].url }
  }

  async uploadAdVideo(
    accessToken: string,
    adAccountId: string,
    videoUrl: string,
  ): Promise<{ video_id: string }> {
    const endpoint = `${this.API_BASE}/${adAccountId}/advideos`
    const response = await this.fetchWithRetry(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: videoUrl,
          access_token: accessToken,
          appsecret_proof: this.buildAppSecretProof(accessToken),
        }),
      },
      'Video upload failed',
    )

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta video upload failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(`Video upload failed: ${raw.slice(0, 200)}`)
    }

    const parsed = JSON.parse(raw) as { id?: string }
    if (!parsed.id) throw new BadRequestException('Video upload returned no video ID')
    return { video_id: parsed.id }
  }

  async waitForVideoReady(
    accessToken: string,
    videoId: string,
    maxWaitMs = 120_000,
  ): Promise<void> {
    const start = Date.now()
    const pollIntervalMs = 3000
    while (Date.now() - start < maxWaitMs) {
      const url = `${this.API_BASE}/${videoId}?fields=status&access_token=${accessToken}&appsecret_proof=${this.buildAppSecretProof(accessToken)}`
      const resp = await fetch(url)
      const data = (await resp.json()) as { status?: { video_status?: string } }
      const status = data?.status?.video_status
      if (status === 'ready') return
      if (status === 'error') throw new BadRequestException('Meta video processing failed')
      await new Promise((r) => setTimeout(r, pollIntervalMs))
    }
    throw new BadRequestException('Video processing timed out')
  }

  async createVideoCreative(
    accessToken: string,
    adAccountId: string,
    input: MetaVideoCreativeInput,
  ): Promise<{ id: string }> {
    const url = `${this.API_BASE}/${adAccountId}/adcreatives`
    const videoData: Record<string, unknown> = {
      video_id: input.video_id,
      message: input.message,
      link_description: input.description,
      call_to_action: {
        type: input.call_to_action_type || 'LEARN_MORE',
        value: { link: input.link },
      },
    }
    if (input.headline) videoData.title = input.headline
    if (input.image_hash) videoData.image_hash = input.image_hash

    const objectStorySpec: Record<string, unknown> = {
      page_id: input.page_id,
      video_data: videoData,
    }
    if (input.instagram_user_id) objectStorySpec.instagram_user_id = input.instagram_user_id

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        object_story_spec: objectStorySpec,
        access_token: accessToken,
        appsecret_proof: this.buildAppSecretProof(accessToken),
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(
        `Meta video creative creation failed: ${response.status} ${raw.slice(0, 300)}`,
      )
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, META_ERRORS.AD_CREATIVE_CREATION_FAILED),
      )
    }

    return JSON.parse(raw) as { id: string }
  }

  async createCarouselCreative(
    accessToken: string,
    adAccountId: string,
    input: MetaCarouselCreativeInput,
  ): Promise<{ id: string }> {
    const url = `${this.API_BASE}/${adAccountId}/adcreatives`
    const childAttachments = input.child_attachments.map((card) => {
      const attachment: Record<string, unknown> = {
        image_hash: card.image_hash,
        link: card.link,
      }
      if (card.name) attachment.name = card.name
      if (card.description) attachment.description = card.description
      attachment.call_to_action = {
        type: input.call_to_action_type || 'LEARN_MORE',
        value: { link: card.link },
      }
      return attachment
    })

    const linkData: Record<string, unknown> = {
      message: input.message,
      link: input.link,
      child_attachments: childAttachments,
      multi_share_end_card: false,
    }
    const objectStorySpec: Record<string, unknown> = {
      page_id: input.page_id,
      link_data: linkData,
    }
    if (input.instagram_user_id) objectStorySpec.instagram_user_id = input.instagram_user_id

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        object_story_spec: objectStorySpec,
        access_token: accessToken,
        appsecret_proof: this.buildAppSecretProof(accessToken),
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(
        `Meta carousel creative creation failed: ${response.status} ${raw.slice(0, 300)}`,
      )
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, META_ERRORS.AD_CREATIVE_CREATION_FAILED),
      )
    }

    return JSON.parse(raw) as { id: string }
  }

  async createAdCreative(
    accessToken: string,
    adAccountId: string,
    input: MetaAdCreativeInput,
  ): Promise<{ id: string }> {
    const url = `${this.API_BASE}/${adAccountId}/adcreatives`
    const linkData: Record<string, unknown> = {
      message: input.message,
      link: input.link,
      image_hash: input.image_hash,
    }
    if (input.headline) linkData.name = input.headline
    if (input.description) linkData.description = input.description
    if (input.call_to_action_type) {
      linkData.call_to_action = {
        type: input.call_to_action_type,
        value: { link: input.link },
      }
    }

    const objectStorySpec: Record<string, unknown> = {
      page_id: input.page_id,
      link_data: linkData,
    }
    if (input.instagram_user_id) {
      objectStorySpec.instagram_user_id = input.instagram_user_id
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        object_story_spec: objectStorySpec,
        access_token: accessToken,
        appsecret_proof: this.buildAppSecretProof(accessToken),
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta creative creation failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, META_ERRORS.AD_CREATIVE_CREATION_FAILED),
      )
    }

    return JSON.parse(raw) as { id: string }
  }

  async createAdCreativeWithAssetFeed(
    accessToken: string,
    adAccountId: string,
    input: MetaAssetFeedCreativeInput,
  ): Promise<{ id: string }> {
    const url = `${this.API_BASE}/${adAccountId}/adcreatives`
    const objectStorySpec: Record<string, unknown> = { page_id: input.page_id }
    if (input.instagram_user_id) objectStorySpec.instagram_user_id = input.instagram_user_id

    const assetFeedSpec: Record<string, unknown> = {
      ad_formats: ['SINGLE_IMAGE'],
      optimization_type: 'PLACEMENT',
      images: input.images.map((img) => ({
        hash: img.hash,
        adlabels: [{ name: img.label }],
      })),
      bodies: [{ text: input.message }],
      titles: input.headline ? [{ text: input.headline }] : [],
      descriptions: input.description ? [{ text: input.description }] : [],
      link_urls: [{ website_url: input.link }],
      call_to_action_types: input.call_to_action_type
        ? [input.call_to_action_type]
        : ['LEARN_MORE'],
      asset_customization_rules: input.customization_rules,
    }

    const response = await this.fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          object_story_spec: objectStorySpec,
          asset_feed_spec: assetFeedSpec,
          access_token: accessToken,
          appsecret_proof: this.buildAppSecretProof(accessToken),
        }),
      },
      META_ERRORS.ASSET_FEED_CREATIVE_CREATION,
    )

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(
        `Meta asset-feed creative creation failed: ${response.status} ${raw.slice(0, 300)}`,
      )
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, META_ERRORS.AD_CREATIVE_CREATION_FAILED),
      )
    }

    return JSON.parse(raw) as { id: string }
  }
}
