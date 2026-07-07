import type { RefObject } from 'react'
import type { AvatarMenuTarget } from '@/lib/artifacts'
import type { Campaign } from '@/lib/campaigns'

export type AvatarArtifactMenuSubmenuKind = 'move' | 'copy' | null

export interface AvatarArtifactMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
}

export interface AvatarArtifactMenuDropdownProps {
  avatar: AvatarMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  actions: AvatarArtifactMenuActions
  onClose: () => void
  onRequestDelete: () => void
  onOpenFullView?: () => void
  pointerPosition?: { x: number; y: number } | null
}
