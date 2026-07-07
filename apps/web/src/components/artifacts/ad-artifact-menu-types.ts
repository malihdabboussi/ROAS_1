import type { RefObject } from 'react'
import type { AdMenuTarget } from '@/lib/artifacts'
import type { Campaign } from '@/lib/campaigns'

export type AdArtifactMenuSubmenuKind = 'move' | 'copy' | null

export interface AdArtifactMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
}

export interface AdArtifactMenuDropdownProps {
  ad: AdMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  actions: AdArtifactMenuActions
  onClose: () => void
  onRequestDelete: () => void
  onOpenFullView?: () => void
  onViewAnalytics?: () => void | Promise<void>
  pointerPosition?: { x: number; y: number } | null
}
