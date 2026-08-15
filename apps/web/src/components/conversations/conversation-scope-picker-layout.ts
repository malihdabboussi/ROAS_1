import type { RefObject } from 'react'
import type { Conversation } from '@/lib/conversations'

export const CONVERSATION_SCOPE_MENU_WIDTH = 260
export const CONVERSATION_SCOPE_MENU_HEIGHT_CAP = 520
export const CONVERSATION_SCOPE_MENU_HEIGHT_MIN = 160
export const CONVERSATION_SCOPE_VIEWPORT_MARGIN = 8
export const CONVERSATION_SCOPE_SUBMENU_GAP = 4

export interface ConversationScopeSpace {
  id: string
  title: string
}

export interface ConversationScopePickerHandle {
  openMenuFromBanner: () => void
}

export interface ConversationScopePickerProps {
  conversation: Conversation | null
  campaignId?: string | null
  spaceId?: string | null
  showLabel?: boolean
  compact?: boolean
  onConversationUpdated?: (conversation: Conversation) => void
  onScopeChanged?: (scope: { campaignId: string | null; spaceId: string | null }) => void
  /** Opens the linked campaign in the work area (pop-out control). */
  onOpenCampaign?: (campaignId: string) => void
  bannerAnchorRef?: RefObject<HTMLButtonElement | null>
  /** Render only the menus; the parent owns the visible trigger. */
  hideTrigger?: boolean
}

export type ConversationScopeMenuGeom = { top: number; left: number; maxHeight: number }

export function readConversationSpaceId(conversation: Conversation | null): string | null {
  const value = conversation?.metadata?.space_id
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export function findConversationScopeSpace(
  spacesByCampaign: Record<string, ConversationScopeSpace[]>,
  spaceId: string | null,
): ConversationScopeSpace | null {
  if (!spaceId) return null
  for (const spaces of Object.values(spacesByCampaign)) {
    const match = spaces.find((space) => space.id === spaceId)
    if (match) return match
  }
  return null
}

/** Bottom-align spaces submenu to the hovered campaign row, mirroring row-anchored submenu placement. */
export function placeSpacesMenuFromRowRect(
  rowRect: DOMRect,
  placementHeight: number,
): ConversationScopeMenuGeom {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = rowRect.right + CONVERSATION_SCOPE_SUBMENU_GAP
  if (left + CONVERSATION_SCOPE_MENU_WIDTH + CONVERSATION_SCOPE_VIEWPORT_MARGIN > viewportWidth) {
    left = rowRect.left - CONVERSATION_SCOPE_MENU_WIDTH - CONVERSATION_SCOPE_SUBMENU_GAP
  }
  if (left < CONVERSATION_SCOPE_VIEWPORT_MARGIN) left = CONVERSATION_SCOPE_VIEWPORT_MARGIN

  let top = rowRect.bottom - placementHeight
  top = Math.max(
    CONVERSATION_SCOPE_VIEWPORT_MARGIN,
    Math.min(top, viewportHeight - CONVERSATION_SCOPE_VIEWPORT_MARGIN - placementHeight),
  )

  const maxHeight = Math.min(
    CONVERSATION_SCOPE_MENU_HEIGHT_CAP,
    Math.max(
      CONVERSATION_SCOPE_MENU_HEIGHT_MIN,
      viewportHeight - CONVERSATION_SCOPE_VIEWPORT_MARGIN - top,
    ),
  )
  return { top, left, maxHeight }
}
