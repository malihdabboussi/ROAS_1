/**
 * Post enrichment client: the formula breakdown (creation formula run in
 * reverse) and viewer comments — both persisted frozen onto the research item.
 */
import { backendPost } from '@/lib/api/backend-client'
import type { SocialPlatform } from '../types/space-schema'
import { socialApiPath } from './social-research.shared'

/** A viewer comment persisted onto a research item (top-level only). */
export interface SocialCommentItem {
  id: string
  text: string
  author_name: string | null
  author_is_creator: boolean
  like_count: number | null
  reply_count: number | null
  published_at: string | null
}

export async function fetchPostComments(
  platform: SocialPlatform,
  spaceId: string,
  itemId: string,
  opts: { force?: boolean; cursor?: string | null } = {},
): Promise<{ comments: SocialCommentItem[]; nextCursor: string | null }> {
  const res = await backendPost<{
    success: boolean
    comments: SocialCommentItem[]
    next_cursor: string | null
  }>(socialApiPath(spaceId, platform, `/items/${itemId}/comments`), {
    force: opts.force ?? false,
    cursor: opts.cursor ?? null,
  })
  return { comments: res.comments, nextCursor: res.next_cursor }
}

export interface VideoBreakdownPoint {
  title: string
  re_hook: string | null
  delivery: 'story' | 'framework' | 'explanation' | 'mixed'
  summary: string
}

/** The video creation formula run in reverse — why this video works. */
export interface VideoBreakdown {
  winning_topic: string
  topic_angle: string
  packaging: {
    title_analysis: string
    thumbnail_description: string | null
    thumbnail_text: string | null
    title_thumbnail_synergy: string | null
  }
  viewer_questions: string[]
  hook: { quote: string | null; technique: string }
  setup: { roadmap: string[]; big_claims: string[]; analysis: string }
  main_points: VideoBreakdownPoint[]
  steal_this: string[]
  model: string
  generated_at: string
}

export async function breakdownSocialPost(
  platform: SocialPlatform,
  spaceId: string,
  itemId: string,
  force = false,
): Promise<VideoBreakdown> {
  const res = await backendPost<{ success: boolean; breakdown: VideoBreakdown }>(
    socialApiPath(spaceId, platform, `/items/${itemId}/breakdown`),
    { force },
    { resilient: true },
  )
  return res.breakdown
}
