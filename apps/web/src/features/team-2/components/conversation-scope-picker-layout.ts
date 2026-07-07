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
  onConversationUpdated: (conversation: Conversation) => void
  bannerAnchorRef?: RefObject<HTMLButtonElement | null>
}

export type ConversationScopeMenuGeom = { top: number; left: number; maxHeight: number }

export function readConversationSpaceId(conversation: Conversation | null): string | null {
  const value = conversation?.metadata?.space_id
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

/** Bottom-align spaces submenu to the hovered campaign row, mirroring row-anchored submenu placement. */
export function placeSpacesMenuFromRowRect(
  rowRect: DOMRect,
  placementHeight: number,
): ConversationScopeMenuGeom {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = rowRect.right + CONVERSATION_SCOPE_SUBMENU_GAP
  if (
    left + CONVERSATION_SCOPE_MENU_WIDTH + CONVERSATION_SCOPE_VIEWPORT_MARGIN >
    viewportWidth
  ) {
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
