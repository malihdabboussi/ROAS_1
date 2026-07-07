import type { RefObject } from 'react'
import type { SpaceSchema, ViewDef } from '../../types/space-schema'

export interface CustomizeViewPanelProps {
  open: boolean
  /** When set, overlay is confined below the view tabs; omitted falls back to full viewport. */
  stageBounds?: { top: number; height: number } | null
  onClose: () => void
  schema: SpaceSchema
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onViewPinToStart: (pinned: boolean) => Promise<void>
  canDeleteView: boolean
  onDeleteView: () => Promise<void>
  initialSubView?: 'main' | 'fields' | 'people' | 'ig_format'
  onAddAccount?: (handle: string) => Promise<void>
  onSyncAccount?: (handle: string) => Promise<void>
  onRemoveAccount?: (handle: string) => Promise<void>
  onAddAllSocialAccount?: (
    platform: import('../../types/space-schema').SocialPlatform,
    handle: string,
  ) => Promise<void>
  onSyncAllSocialAccount?: (
    platform: import('../../types/space-schema').SocialPlatform,
    handle: string,
  ) => Promise<void>
  onRemoveAllSocialAccount?: (
    platform: import('../../types/space-schema').SocialPlatform,
    handle: string,
  ) => Promise<void>
  reportingCampaignId?: string | null
  /** Campaign linked to the space; used for per-artifact customize (e.g. Funnels). */
  artifactCampaignId?: string | null
  isTeamSpace?: boolean
  canSaveForEveryone?: boolean
  hasViewOverride?: boolean
  onSaveForEveryone?: () => Promise<void>
  onResetToDefault?: () => Promise<void>
  onOpenSharingPermissions?: () => void
  /** Opens the Status editor modal from the customize panel main view. */
  onOpenStatusEditor?: () => void
  /** When `.current` is the tab DOM node (right-click customize), panel renders as a fixed dropdown below it instead of the right slide-over. */
  dropdownAnchorRef?: RefObject<HTMLElement | null> | null
}

export type ViewPatchHandler = (patch: Partial<ViewDef>) => Promise<void>

export interface ViewIdentityProps {
  activeView: ViewDef
  viewIconName: string
  viewIconColor: { textColor: string }
  nameDraft: string
  setNameDraft: (v: string) => void
  onViewPatch: ViewPatchHandler
  onClose: () => void
}
