import type { RefObject } from 'react'
import type { Conversation } from '@/lib/conversations'
import { qualifyGeneralLocation } from './conversation-scope-sort'

export const CONVERSATION_SCOPE_MENU_WIDTH = 260
export const CONVERSATION_SCOPE_MENU_HEIGHT_CAP = 520
export const CONVERSATION_SCOPE_MENU_HEIGHT_MIN = 160
export const CONVERSATION_SCOPE_VIEWPORT_MARGIN = 8
export const CONVERSATION_SCOPE_SUBMENU_GAP = 4

export interface ConversationScopeSpace {
  id: string
  title: string
  campaign_id?: string | null
}

export interface ConversationScopePickerHandle {
  openMenuFromBanner: () => void
}

export interface ConversationScopeSelection {
  campaignId: string | null
  spaceId: string | null
  campaignName?: string | null
  spaceTitle?: string | null
  programName?: string | null
}

export interface ConversationScopePickerProps {
  conversation: Conversation | null
  campaignId?: string | null
  spaceId?: string | null
  showLabel?: boolean
  compact?: boolean
  onConversationUpdated?: (conversation: Conversation) => void
  onScopeChanged?: (scope: ConversationScopeSelection) => void
  /** Opens the linked campaign in the work area (pop-out control). */
  onOpenCampaign?: (campaignId: string) => void
  bannerAnchorRef?: RefObject<HTMLButtonElement | null>
  /** Render only the menus; the parent owns the visible trigger. */
  hideTrigger?: boolean
  /** Adds an All row that clears campaign and space. Recents/history filters use this. */
  allowClear?: boolean
  /** Connections + adds another campaign/space. Recents Filter stays replace. */
  selectionMode?: 'replace' | 'add'
}

/** Visible name for a selected campaign or space. Never leave a generic Space label when a real name exists. */
export function conversationScopeDisplayLabel(input: {
  campaignName?: string | null
  spaceTitle?: string | null
  programName?: string | null
  campaignId?: string | null
  spaceId?: string | null
  emptyLabel: string
}): string {
  const spaceTitle = qualifyGeneralLocation({
    leafName: input.spaceTitle,
    ancestors: [input.campaignName, input.programName],
  })
  if (spaceTitle) return spaceTitle
  const campaignName = qualifyGeneralLocation({
    leafName: input.campaignName,
    ancestors: [input.programName],
  })
  if (campaignName) return campaignName
  if (input.spaceId) return 'Space'
  if (input.campaignId) return 'Campaign'
  return input.emptyLabel
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

/** Top-align the submenu with its hovered row so the pointer can travel straight across. */
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

  let top = rowRect.top
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

export function sameConversationScopeMenuLayout(
  prev: {
    campaign: ConversationScopeMenuGeom
    spaces: ConversationScopeMenuGeom | null
  } | null,
  campaign: ConversationScopeMenuGeom,
  spaces: ConversationScopeMenuGeom | null,
): boolean {
  if (!prev) return false
  if (
    prev.campaign.top !== campaign.top ||
    prev.campaign.left !== campaign.left ||
    prev.campaign.maxHeight !== campaign.maxHeight
  ) {
    return false
  }
  if (prev.spaces == null || spaces == null) return prev.spaces == null && spaces == null
  return (
    prev.spaces.top === spaces.top &&
    prev.spaces.left === spaces.left &&
    prev.spaces.maxHeight === spaces.maxHeight
  )
}
