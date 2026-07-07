import type { RefObject } from 'react'
import type { FunnelMenuTarget } from '@/lib/artifacts'
import type { Campaign } from '@/lib/campaigns'

export type FunnelArtifactMenuSubmenuKind = 'move' | 'copy' | null

export interface FunnelArtifactMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  isPublished: boolean
  liveUrl: string | null
  copyLink(): Promise<void>
  copyId(): Promise<void>
  openInNewTab(): void
  rename(): Promise<void>
  publish(): Promise<void>
  unpublish(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
}

export interface FunnelArtifactMenuDropdownProps {
  funnel: FunnelMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  actions: FunnelArtifactMenuActions
  onClose: () => void
  onOpenSettings: () => void
  onRequestConnectDomain: () => void
  onRequestDelete: () => void
  onOpenFullView?: () => void
  onViewAnalytics?: () => void | Promise<void>
  pointerPosition?: { x: number; y: number } | null
}
