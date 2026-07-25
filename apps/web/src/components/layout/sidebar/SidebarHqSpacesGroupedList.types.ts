import type { Dispatch, SetStateAction } from 'react'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import type { Space } from '@/features/spaces/types'
import type { SidebarCampaignRow } from './sidebar-types'
import type { SidebarControllerReturn } from './useSidebarController'

export type SidebarHqSpacesGroupedListProps = {
  controller: SidebarControllerReturn
  spaces: Space[]
  campaigns: SidebarCampaignRow[]
  pathname: string
  expandedIds: Set<string>
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>
  onCreateSpace: (campaignId?: string | null) => void
  isSubmitting: boolean
  creatingName: string
  setCreatingName: (value: string) => void
  searchQuery?: string
  onOpenBrowseTemplates: (bucket: string) => void
  onOpenCreateSpaceModal: (campaignId: string | null) => void
  spaceUserState: ReturnType<typeof useSpaceUserState>
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  flyoutMode?: boolean
  expandedProgramIds: Set<string>
  setExpandedProgramIds: Dispatch<SetStateAction<Set<string>>>
  onNewProgram?: () => void
}
