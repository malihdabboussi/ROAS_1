import type { SocialPost } from '../../../types'

export function getSocialPostPreviewTitle(post: SocialPost): string {
  return (
    post.caption?.split('\n')[0]?.slice(0, 60) || post.headline?.slice(0, 60) || 'Untitled Post'
  )
}

export function getSocialPostScheduledLabel(post: SocialPost): string | null {
  if (!post.scheduled_at) return null
  return new Date(post.scheduled_at).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
