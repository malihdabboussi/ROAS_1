import type { SocialPost } from '@/features/studio/types'

export interface SocialValidationIssue {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: SocialValidationIssue[]
  warnings: SocialValidationIssue[]
}

const INSTAGRAM_CAPTION_MAX = 2200
const INSTAGRAM_HASHTAGS_MAX = 30
const INSTAGRAM_CAROUSEL_MIN = 2
const INSTAGRAM_CAROUSEL_MAX = 10
const LINKEDIN_CAPTION_MAX = 3000

function hasVisual(post: SocialPost): boolean {
  return Boolean(post.image_url?.trim() || post.video_url?.trim() || post.generated_tsx?.trim())
}

function hasSlideVisual(
  slide: { tsx?: string; image_url?: string; video_url?: string } | null | undefined,
): boolean {
  return Boolean(slide?.image_url?.trim() || slide?.video_url?.trim() || slide?.tsx?.trim())
}

function getFileExtension(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const file = u.pathname.split('/').pop() ?? ''
    const dot = file.lastIndexOf('.')
    if (dot <= 0) return null
    return file.slice(dot + 1).toLowerCase()
  } catch {
    const clean = url.split('?')[0] ?? url
    const dot = clean.lastIndexOf('.')
    if (dot <= 0) return null
    return clean.slice(dot + 1).toLowerCase()
  }
}

export interface ValidateOptions {
  integrationConnected?: boolean
}

export function validateSocialPost(
  post: SocialPost,
  options: ValidateOptions = {},
): ValidationResult {
  const errors: SocialValidationIssue[] = []
  const warnings: SocialValidationIssue[] = []
  const caption = post.caption ?? ''
  const hashtags = post.hashtags ?? []
  const slides = Array.isArray(post.carousel_slides) ? post.carousel_slides : []

  if (options.integrationConnected === false) {
    const platformLabel = post.platform === 'linkedin' ? 'LinkedIn' : 'Instagram'
    errors.push({
      field: 'integration',
      message: `${platformLabel} is not connected. Connect it in Integrations before scheduling or publishing.`,
    })
  }

  if (post.platform === 'instagram') {
    if (post.post_type === 'text_only') {
      errors.push({
        field: 'post_type',
        message: 'Instagram does not support text-only posts.',
      })
    }

    if (!hasVisual(post) && post.post_type !== 'carousel') {
      errors.push({
        field: 'image_url',
        message: 'Instagram posts require an image or video.',
      })
    }

    if (caption.length > INSTAGRAM_CAPTION_MAX) {
      errors.push({
        field: 'caption',
        message: `Caption exceeds Instagram limit (${INSTAGRAM_CAPTION_MAX} characters).`,
      })
    }

    if (hashtags.length > INSTAGRAM_HASHTAGS_MAX) {
      errors.push({
        field: 'hashtags',
        message: `Instagram allows up to ${INSTAGRAM_HASHTAGS_MAX} hashtags.`,
      })
    }

    if (post.post_type === 'carousel') {
      if (slides.length < INSTAGRAM_CAROUSEL_MIN || slides.length > INSTAGRAM_CAROUSEL_MAX) {
        errors.push({
          field: 'carousel_slides',
          message: `Instagram carousel requires ${INSTAGRAM_CAROUSEL_MIN}-${INSTAGRAM_CAROUSEL_MAX} slides.`,
        })
      }
      if (slides.some((slide) => !hasSlideVisual(slide))) {
        errors.push({
          field: 'carousel_slides',
          message: 'Every carousel slide must have visual content.',
        })
      }
    }

    if (post.post_type === 'reel' && !post.video_url?.trim()) {
      errors.push({
        field: 'video_url',
        message: 'Reels require a video. Attach a video file or pick one from the media library.',
      })
    }

    if (post.image_url) {
      const ext = getFileExtension(post.image_url)
      if (ext && ext !== 'jpg' && ext !== 'jpeg') {
        warnings.push({
          field: 'image_url',
          message: 'Instagram API prefers JPEG for publishing; PNG can fail in some integrations.',
        })
      }
    }

    if (post.post_type === 'story' || post.post_type === 'reel') {
      warnings.push({
        field: 'post_type',
        message: 'Stories and Reels should use 9:16 visual ratio.',
      })
    }
  }

  if (post.platform === 'linkedin') {
    if (caption.length > LINKEDIN_CAPTION_MAX) {
      errors.push({
        field: 'caption',
        message: `Caption exceeds LinkedIn limit (${LINKEDIN_CAPTION_MAX} characters).`,
      })
    }

    if (post.post_type !== 'text_only' && post.post_type !== 'carousel' && !hasVisual(post)) {
      errors.push({
        field: 'image_url',
        message: 'LinkedIn posts with media require an image, video, or creative.',
      })
    }

    if (post.post_type === 'carousel') {
      if (slides.length === 0) {
        errors.push({
          field: 'carousel_slides',
          message: 'LinkedIn carousel requires slides to generate a document.',
        })
      }
      if (slides.some((slide) => !hasSlideVisual(slide))) {
        errors.push({
          field: 'carousel_slides',
          message: 'Every carousel slide must have visual content.',
        })
      }
    }

    if (post.post_type === 'story' || post.post_type === 'reel') {
      errors.push({
        field: 'post_type',
        message: 'LinkedIn does not support stories or reels.',
      })
    }

    if (post.video_url?.trim()) {
      warnings.push({
        field: 'video_url',
        message:
          'LinkedIn video posts must be shorter than 10 minutes and under 4GB. Prefer MP4 at 1080p.',
      })
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}
