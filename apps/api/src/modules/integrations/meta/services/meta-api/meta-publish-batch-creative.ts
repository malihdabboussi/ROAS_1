import { BadRequestException, type Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleDriveApiService } from '../../../google-drive/services/google-drive-api.service'
import { MetaIntegration } from '../../integrations/meta.integration'

type PlacementRule = {
  customization_spec: {
    publisher_platforms: string[]
    facebook_positions?: string[]
    instagram_positions?: string[]
  }
  image_label: { name: string }
}

type MetaBatchAdCreativeInput = {
  supabase: SupabaseClient
  userId: string
  meta: MetaIntegration
  driveApi: GoogleDriveApiService
  logger: Pick<Logger, 'log'>
  accessToken: string
  adAccountId: string
  pageId: string
  instagramUserId: string
  campaignName: string
  metaAdSetId: string
  ad: Record<string, unknown>
  batchAdMetadata: Record<string, unknown>
}

export async function createMetaBatchAdCreative({
  supabase,
  userId,
  meta,
  driveApi,
  logger,
  accessToken,
  adAccountId,
  pageId,
  instagramUserId,
  campaignName,
  metaAdSetId,
  ad,
  batchAdMetadata,
}: MetaBatchAdCreativeInput): Promise<{ createdMetaAd: { id: string }; metaCreativeId: string }> {
  const batchPlacementImages =
    (ad.placement_images as Record<string, { image_url?: string }> | null) ?? {}
  const batchDistinctPlacements = Object.entries(batchPlacementImages).filter(
    ([, value]) => value?.image_url,
  )
  const batchFormat = (ad.ad_format as string | null) || 'SINGLE_IMAGE'

  let creative: { id: string }
  if (batchFormat === 'SINGLE_VIDEO') {
    creative = await createVideoCreative({
      meta,
      accessToken,
      adAccountId,
      pageId,
      instagramUserId,
      campaignName,
      ad,
    })
  } else if (batchFormat === 'CAROUSEL') {
    creative = await createCarouselCreative({
      meta,
      accessToken,
      adAccountId,
      pageId,
      instagramUserId,
      campaignName,
      ad,
    })
  } else if (batchDistinctPlacements.length >= 2) {
    creative = await createAssetFeedCreative({
      meta,
      accessToken,
      adAccountId,
      pageId,
      instagramUserId,
      campaignName,
      ad,
      placements: batchDistinctPlacements,
    })
  } else {
    creative = await createImageCreative({
      supabase,
      userId,
      meta,
      driveApi,
      logger,
      accessToken,
      adAccountId,
      pageId,
      instagramUserId,
      campaignName,
      ad,
      batchDistinctPlacements,
    })
  }

  const batchMetaAdName =
    (batchAdMetadata.meta_ad_name as string | undefined) || String(ad.headline ?? 'Vibey Ad')
  const createdMetaAd = await meta.createAd(accessToken, adAccountId, {
    name: batchMetaAdName,
    adset_id: metaAdSetId,
    creative_id: creative.id,
    status: 'PAUSED',
  })
  return { createdMetaAd, metaCreativeId: creative.id }
}

async function createVideoCreative(input: {
  meta: MetaIntegration
  accessToken: string
  adAccountId: string
  pageId: string
  instagramUserId: string
  campaignName: string
  ad: Record<string, unknown>
}) {
  const { meta, accessToken, adAccountId, pageId, instagramUserId, campaignName, ad } = input
  const videoUrl = ad.video_url as string | null
  if (!videoUrl) throw new BadRequestException('Video ad requires video_url')
  const videoResult = await meta.uploadAdVideo(accessToken, adAccountId, videoUrl)
  await meta.waitForVideoReady(accessToken, videoResult.video_id)
  let thumbHash: string | undefined
  if (ad.image_url) {
    const thumbResult = await meta.uploadAdImage(accessToken, adAccountId, String(ad.image_url))
    thumbHash = thumbResult.hash
  }
  return meta.createVideoCreative(accessToken, adAccountId, {
    name: `${campaignName} - Creative`,
    page_id: pageId,
    ...(instagramUserId ? { instagram_user_id: instagramUserId } : {}),
    video_id: videoResult.video_id,
    message: String(ad.primary_text ?? ''),
    headline: (ad.headline as string | undefined) ?? undefined,
    description: (ad.description as string | null | undefined) ?? undefined,
    link: String(ad.destination_url ?? ''),
    image_hash: thumbHash,
    call_to_action_type: (ad.cta_type as string | null | undefined) ?? undefined,
  })
}

async function createCarouselCreative(input: {
  meta: MetaIntegration
  accessToken: string
  adAccountId: string
  pageId: string
  instagramUserId: string
  campaignName: string
  ad: Record<string, unknown>
}) {
  const { meta, accessToken, adAccountId, pageId, instagramUserId, campaignName, ad } = input
  const cards =
    (ad.carousel_cards as Array<{
      image_url?: string
      headline?: string
      description?: string
      link?: string
    }> | null) ?? []
  const childAttachments: Array<{
    image_hash: string
    link: string
    name?: string
    description?: string
  }> = []
  for (const card of cards) {
    if (!card.image_url) throw new BadRequestException('Carousel card missing image_url')
    const result = await meta.uploadAdImage(accessToken, adAccountId, card.image_url)
    childAttachments.push({
      image_hash: result.hash,
      link: card.link || String(ad.destination_url ?? ''),
      name: card.headline,
      description: card.description,
    })
  }
  return meta.createCarouselCreative(accessToken, adAccountId, {
    name: `${campaignName} - Creative`,
    page_id: pageId,
    ...(instagramUserId ? { instagram_user_id: instagramUserId } : {}),
    message: String(ad.primary_text ?? ''),
    link: String(ad.destination_url ?? ''),
    call_to_action_type: (ad.cta_type as string | null | undefined) ?? undefined,
    child_attachments: childAttachments,
  })
}

async function createAssetFeedCreative(input: {
  meta: MetaIntegration
  accessToken: string
  adAccountId: string
  pageId: string
  instagramUserId: string
  campaignName: string
  ad: Record<string, unknown>
  placements: Array<[string, { image_url?: string }]>
}) {
  const { meta, accessToken, adAccountId, pageId, instagramUserId, campaignName, ad, placements } =
    input
  const hashes: Array<{ placement: string; hash: string; label: string }> = []
  for (const [placement, image] of placements) {
    const result = await meta.uploadAdImage(accessToken, adAccountId, image.image_url!)
    hashes.push({ placement, hash: result.hash, label: `img_${placement}` })
  }
  return meta.createAdCreativeWithAssetFeed(accessToken, adAccountId, {
    name: `${campaignName} - Creative`,
    page_id: pageId,
    ...(instagramUserId ? { instagram_user_id: instagramUserId } : {}),
    images: hashes.map((hash) => ({ hash: hash.hash, label: hash.label })),
    message: String(ad.primary_text ?? ''),
    headline: (ad.headline as string | undefined) ?? undefined,
    description: (ad.description as string | null | undefined) ?? undefined,
    link: String(ad.destination_url ?? ''),
    call_to_action_type: (ad.cta_type as string | null | undefined) ?? undefined,
    customization_rules: buildPlacementRules(hashes),
  })
}

async function createImageCreative(input: {
  supabase: SupabaseClient
  userId: string
  meta: MetaIntegration
  driveApi: GoogleDriveApiService
  logger: Pick<Logger, 'log'>
  accessToken: string
  adAccountId: string
  pageId: string
  instagramUserId: string
  campaignName: string
  ad: Record<string, unknown>
  batchDistinctPlacements: Array<[string, { image_url?: string }]>
}) {
  const {
    supabase,
    userId,
    meta,
    driveApi,
    logger,
    accessToken,
    adAccountId,
    pageId,
    instagramUserId,
    campaignName,
    ad,
    batchDistinctPlacements,
  } = input
  const batchAdMeta = (ad.metadata as Record<string, unknown> | null) ?? {}
  const driveFileId =
    batchAdMeta.image_source === 'google_drive' && typeof batchAdMeta.drive_file_id === 'string'
      ? (batchAdMeta.drive_file_id as string).trim()
      : ''
  let imageHash: string
  if (driveFileId) {
    logger.log(`Resolving image from Google Drive file: ${driveFileId}`)
    const { buffer, exportMimeType } = await driveApi.downloadFile(
      supabase,
      userId,
      driveFileId,
      undefined,
    )
    const imageResult = await meta.uploadAdImageFromBuffer(
      accessToken,
      adAccountId,
      buffer,
      exportMimeType,
    )
    imageHash = imageResult.hash
  } else {
    const resolvedUrl =
      batchDistinctPlacements.length === 1
        ? batchDistinctPlacements[0][1].image_url!
        : String(ad.image_url ?? '')
    const image = await meta.uploadAdImage(accessToken, adAccountId, resolvedUrl)
    imageHash = image.hash
  }
  return meta.createAdCreative(accessToken, adAccountId, {
    name: `${campaignName} - Creative`,
    page_id: pageId,
    ...(instagramUserId ? { instagram_user_id: instagramUserId } : {}),
    image_hash: imageHash,
    message: String(ad.primary_text ?? ''),
    headline: (ad.headline as string | undefined) ?? undefined,
    description: (ad.description as string | null | undefined) ?? undefined,
    link: String(ad.destination_url ?? ''),
    call_to_action_type: (ad.cta_type as string | null | undefined) ?? undefined,
  })
}

function buildPlacementRules(hashes: Array<{ placement: string; label: string }>): PlacementRule[] {
  const rules: PlacementRule[] = []
  for (const { placement, label } of hashes) {
    if (placement === 'feed') {
      rules.push({
        customization_spec: { publisher_platforms: ['facebook'], facebook_positions: ['feed'] },
        image_label: { name: label },
      })
      rules.push({
        customization_spec: { publisher_platforms: ['instagram'], instagram_positions: ['stream'] },
        image_label: { name: label },
      })
    } else if (placement === 'story') {
      rules.push({
        customization_spec: { publisher_platforms: ['facebook'], facebook_positions: ['story'] },
        image_label: { name: label },
      })
      rules.push({
        customization_spec: { publisher_platforms: ['instagram'], instagram_positions: ['story'] },
        image_label: { name: label },
      })
    } else if (placement === 'reels') {
      rules.push({
        customization_spec: { publisher_platforms: ['instagram'], instagram_positions: ['reels'] },
        image_label: { name: label },
      })
    }
  }
  return rules
}
