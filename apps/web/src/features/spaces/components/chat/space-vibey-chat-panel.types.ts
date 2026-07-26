import type { GlobalWorkSurface } from '@/components/global-chat/lib/global-chat-storage'

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
}
