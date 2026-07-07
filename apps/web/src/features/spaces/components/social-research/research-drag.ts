import type { DragEvent } from 'react'
import { formatViewCount } from '../../services/social-research.service'
import type { SocialPlatform } from '../../types/space-schema'

/** Chat drop handler resolves these to research items (ChatInput x-vibey-artifact). */
export const RESEARCH_DRAG_TYPE: Record<SocialPlatform, string> = {
  instagram: 'instagram-research',
  tiktok: 'tiktok-research',
  youtube: 'youtube-research',
  twitter: 'twitter-research',
}

const PLATFORM_DISPLAY_NAME: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X',
}

export function researchDragLabel(
  platform: SocialPlatform,
  handle: string | null | undefined,
  playCount: number,
): string {
  const h = typeof handle === 'string' && handle.trim() ? handle.trim() : null
  const who = h ? `@${h}` : PLATFORM_DISPLAY_NAME[platform]
  return `${who} · ${formatViewCount(playCount)} views`.slice(0, 500)
}

/**
 * Reference id for research items that may not be persisted yet (topic-search
 * results). The agent-api resolves `media:<spaceId>:<mediaId>` to the real
 * space item by media_id — by the time the message is sent, the background
 * persist has landed.
 */
export function researchMediaRefId(spaceId: string, mediaId: string): string {
  return `media:${spaceId}:${mediaId}`
}

export function setResearchDragData(
  e: DragEvent,
  payload: { id: string; platform: SocialPlatform; label: string },
): void {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData(
    'application/x-vibey-artifact',
    JSON.stringify({
      id: payload.id,
      type: RESEARCH_DRAG_TYPE[payload.platform],
      label: payload.label,
    }),
  )
}
