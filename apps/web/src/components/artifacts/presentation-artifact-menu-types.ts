import type { RefObject } from 'react'
import type { PresentationMenuTarget, PresentationPreviewOverflowMenuProps } from '@/lib/artifacts'
import type { Campaign } from '@/lib/campaigns'

export type PresentationArtifactMenuSubmenuKind = 'move' | 'copy' | 'viewport' | 'export' | null

export interface PresentationArtifactMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  displayName: string
}

export interface PresentationArtifactMenuDropdownProps {
  presentation: PresentationMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  actions: PresentationArtifactMenuActions
  onClose: () => void
  onRequestDelete: () => void
  onOpenFullView?: () => void
  pointerPosition?: { x: number; y: number } | null
  previewOverflow?: PresentationPreviewOverflowMenuProps
}
