import type { RefObject } from 'react'
import type { SequenceMenuTarget } from '@/lib/artifacts'
import type { Campaign } from '@/lib/campaigns'

export type SequenceArtifactMenuSubmenuKind = 'move' | 'copy' | null

export interface SequenceArtifactMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
}

export interface SequenceArtifactMenuDropdownProps {
  sequence: SequenceMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  actions: SequenceArtifactMenuActions
  onClose: () => void
  onRequestDelete: () => void
  onOpenFullView?: () => void
  onViewAnalytics?: () => void | Promise<void>
  pointerPosition?: { x: number; y: number } | null
}
