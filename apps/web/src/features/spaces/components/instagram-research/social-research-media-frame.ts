import type { SocialPlatform } from '../../types/space-schema'

/** Shared grid thumbnail frame — all research cards (IG, TikTok, YouTube, X) use the same size. */
const GRID_CARD_IMAGE_ASPECT = 'aspect-[9/8]'

export type SocialResearchMediaFrame = {
  aspectClass: string
  columnWidthClass: string
  imageObjectClass: string
}

function isLandscapeVideo(mediaType: string): boolean {
  return mediaType === 'youtube_video' || mediaType === 'tweet_video'
}

export function resolveSocialResearchMediaFrame(
  mediaType: string,
  platform: SocialPlatform,
  surface: 'grid' | 'modal' | 'topic' = 'grid',
): SocialResearchMediaFrame {
  if (surface === 'topic') {
    if (platform === 'youtube' && mediaType === 'youtube_short') {
      return {
        aspectClass: 'aspect-[9/16]',
        columnWidthClass: 'w-[90px]',
        imageObjectClass: 'object-cover',
      }
    }
    if (platform === 'youtube' || isLandscapeVideo(mediaType)) {
      return {
        aspectClass: 'aspect-video',
        columnWidthClass: 'w-[90px]',
        imageObjectClass: 'object-cover',
      }
    }
    return {
      aspectClass: GRID_CARD_IMAGE_ASPECT,
      columnWidthClass: 'w-[90px]',
      imageObjectClass: 'object-cover',
    }
  }

  if (surface === 'modal') {
    if (platform === 'twitter' || isLandscapeVideo(mediaType)) {
      return {
        aspectClass: 'aspect-video',
        columnWidthClass: 'w-[160px]',
        imageObjectClass: 'object-cover',
      }
    }
    if (mediaType === 'tweet') {
      return {
        aspectClass: 'aspect-square',
        columnWidthClass: 'w-[90px]',
        imageObjectClass: 'object-cover',
      }
    }
    return {
      aspectClass: 'aspect-[9/16]',
      columnWidthClass: 'w-[90px]',
      imageObjectClass: 'object-cover',
    }
  }

  return {
    aspectClass: GRID_CARD_IMAGE_ASPECT,
    columnWidthClass: 'w-[90px]',
    imageObjectClass: 'object-cover',
  }
}
