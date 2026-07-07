import type { SocialPlatform, SocialResearchConfig } from '../types/space-schema'

/**
 * Reels, Images, and Slideshows are independent; each can be on.
 * Legacy `media_filter` maps in when show flags are absent. The `slideshows`
 * toggle only applies to TikTok (Instagram has no slideshow concept and the
 * value is ignored for `platform === 'instagram'`).
 * YouTube uses `youtubeVideos` / `youtubeShorts` from `media_show_yt_videos` /
 * `media_show_yt_shorts`; reels/images/slideshows are ignored for `platform === 'youtube'`.
 * X uses `xTweets` / `xVideos` from `media_show_x_tweets` / `media_show_x_videos`.
 */
export function getIgMediaToggles(
  ic: SocialResearchConfig,
  platform: SocialPlatform = 'instagram',
): {
  reels: boolean
  images: boolean
  slideshows: boolean
  youtubeVideos: boolean
  youtubeShorts: boolean
  xTweets: boolean
  xVideos: boolean
} {
  if (platform === 'youtube') {
    return {
      reels: false,
      images: false,
      slideshows: false,
      youtubeVideos: ic.media_show_yt_videos !== false,
      youtubeShorts: ic.media_show_yt_shorts !== false,
      xTweets: true,
      xVideos: true,
    }
  }

  if (platform === 'twitter') {
    return {
      reels: false,
      images: false,
      slideshows: false,
      youtubeVideos: true,
      youtubeShorts: true,
      xTweets: ic.media_show_x_tweets !== false,
      xVideos: ic.media_show_x_videos !== false,
    }
  }

  const slideshows = platform === 'tiktok' ? ic.media_show_slideshows !== false : false
  if (
    ic.media_show_reels !== undefined ||
    ic.media_show_images !== undefined ||
    ic.media_show_slideshows !== undefined
  ) {
    return {
      reels: ic.media_show_reels !== false,
      images: ic.media_show_images !== false,
      slideshows,
      youtubeVideos: true,
      youtubeShorts: true,
      xTweets: true,
      xVideos: true,
    }
  }
  const mf = ic.media_filter ?? 'all'
  if (mf === 'reels')
    return {
      reels: true,
      images: false,
      slideshows: false,
      youtubeVideos: true,
      youtubeShorts: true,
      xTweets: true,
      xVideos: true,
    }
  if (mf === 'images')
    return {
      reels: false,
      images: true,
      slideshows: false,
      youtubeVideos: true,
      youtubeShorts: true,
      xTweets: true,
      xVideos: true,
    }
  return {
    reels: true,
    images: true,
    slideshows,
    youtubeVideos: true,
    youtubeShorts: true,
    xTweets: true,
    xVideos: true,
  }
}
