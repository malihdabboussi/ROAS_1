import type { ReactNode } from 'react'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'

export type ChatMode = 'chat' | 'conversations' | 'checkpoints'
export type TeamHrChatRailIntent = 'new' | 'list' | null

export interface TeamHrSideChatPanelProps {
  agent: MissionAgent | null
  agentKey?: string
  fallbackAgentName?: string
  fallbackRoleLabel?: string
  emptyStateGreeting?: string
  blockingOverlay?: ReactNode
  composerTopAccessory?: ReactNode
  composerBlocked?: boolean
  composerBlockedMessage?: string
  loading?: boolean
  onCollapseChat?: () => void
  railIntent?: TeamHrChatRailIntent
  onRailIntentConsumed?: () => void
  buildAwarenessContext?: () => string
  showCheckpoints?: boolean
  storageScope?: 'hr' | 'atlas' | 'loop'
  spaceId?: string | null
  resolveSpaceIdBeforeSend?: () => Promise<string | null>
  onStreamSettled?: () => void
  onNewConversation?: () => void
}
