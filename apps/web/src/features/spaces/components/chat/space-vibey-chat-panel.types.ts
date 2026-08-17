import type { ReactNode } from 'react'
import type { GlobalWorkSurface } from '@/components/global-chat/lib/global-chat-storage'

export type ConversationAgentScope = 'active' | 'all'

export interface FocusedArtifact {
  type: string
  id: string
  name: string
  spaceId?: string
  docSource?: string
  docKind?: string
}

export interface SpaceVibeyChatPanelProps {
  spaceId?: string
  chatSurface?: GlobalWorkSurface
  campaignId: string | null
  campaignName: string | null
  channelContext?: {
    channelId: string
    channelName: string
    awarenessContext: string
  } | null
  brainContext?: {
    brainId: string | null
    scopeLabel: string
    awarenessContext: string
  } | null
  teamOpsContext?: {
    label: string
    awarenessContext: string
  } | null
  onCollapseChat?: () => void
  /** Agent picker + history chrome live in the shell Chat sidebar. */
  shellSidebarChrome?: boolean
  headerLayout?: 'full' | 'compact'
  headerLeadingAction?: ReactNode
  headerTrailingAction?: ReactNode
  composerContextSlot?: ReactNode
  preferredConversationId?: string | null
  awarenessContextOverride?: string
}
