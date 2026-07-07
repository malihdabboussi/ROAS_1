export interface SocialPostJobData {
  scheduleId: string
}

export interface SocialPostJobResult {
  scheduleId: string
  success: boolean
  publishedId?: string
  processedAt: string
  error?: string
}

export const SOCIAL_POSTS_QUEUE = 'social-posts'
