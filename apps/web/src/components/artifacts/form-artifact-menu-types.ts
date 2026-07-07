import type { RefObject } from 'react'
import type { FormMenuTarget } from '@/lib/artifacts'
import type { Campaign } from '@/lib/campaigns'

export type FormArtifactMenuSubmenuKind = 'move' | 'copy' | null

export interface FormArtifactMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  isPublished: boolean
  liveUrl: string | null
  embedSnippet: string
  copyLink(): Promise<void>
  copyId(): Promise<void>
  copyEmbedCode(): Promise<void>
  openInNewTab(): void
  rename(nextName?: string): Promise<void>
  publish(): Promise<void>
  unpublish(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  goToTargetSpace?: () => void
  exportResponsesCsv(): Promise<void>
}

export interface FormArtifactMenuDropdownProps {
  form: FormMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  actions: FormArtifactMenuActions
  onClose: () => void
  onRequestDelete: () => void
  onOpenSettings?: () => void
  onRequestRename?: () => void
  onOpenResponses?: () => void
  onOpenFullView?: () => void
  pointerPosition?: { x: number; y: number } | null
}
