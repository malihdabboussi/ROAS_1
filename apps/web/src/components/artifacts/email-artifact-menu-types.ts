import type { RefObject } from 'react'
import type { EmailMenuTarget } from '@/lib/artifacts'
import type { Campaign } from '@/lib/campaigns'

export type EmailArtifactMenuSubmenuKind = 'move' | 'copy' | null

export interface EmailArtifactMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
}

export interface EmailArtifactMenuDropdownProps {
  email: EmailMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  actions: EmailArtifactMenuActions
  onClose: () => void
  onRequestDelete: () => void
  onOpenFullView?: () => void
  pointerPosition?: { x: number; y: number } | null
}
