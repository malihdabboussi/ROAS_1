'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { Space } from '@/features/spaces/types'
import type { SidebarCampaignRow } from './sidebar-types'
import { SidebarAddSpaceDropdown } from './SidebarAddSpaceDropdown'
import {
  SidebarHqCampaignMenuLayer,
  SidebarHqSpaceMenuLayer,
  type SidebarHqCampaignMenuState,
  type SidebarHqSpaceMenuState,
} from './SidebarHqSpacesMenuLayers'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqSpacesListOverlays({
  campaignMenuFor,
  setCampaignMenuFor,
  menuFor,
  setMenuFor,
  controller,
  startCreating,
  campaigns,
  activeSpaceId,
  isFavorite,
  toggleFavorite,
  toggleHidden,
  startRenameSpace,
  addDropdownAnchor,
  addDropdownBucket,
  setAddDropdownAnchor,
  setAddDropdownBucket,
  onOpenBrowseTemplates,
}: {
  campaignMenuFor: SidebarHqCampaignMenuState | null
  setCampaignMenuFor: Dispatch<SetStateAction<SidebarHqCampaignMenuState | null>>
  menuFor: SidebarHqSpaceMenuState | null
  setMenuFor: Dispatch<SetStateAction<SidebarHqSpaceMenuState | null>>
  controller: SidebarControllerReturn
  startCreating: (bucket: string) => void
  campaigns: SidebarCampaignRow[]
  activeSpaceId: string | null
  isFavorite: (id: string) => boolean
  toggleFavorite: (id: string) => void
  toggleHidden: (id: string) => void
  startRenameSpace: (space: Space) => void
  addDropdownAnchor: DOMRect | null
  addDropdownBucket: string | null
  setAddDropdownAnchor: Dispatch<SetStateAction<DOMRect | null>>
  setAddDropdownBucket: Dispatch<SetStateAction<string | null>>
  onOpenBrowseTemplates: (bucket: string) => void
}) {
  return (
    <>
      <SidebarHqCampaignMenuLayer
        campaignMenuFor={campaignMenuFor}
        setCampaignMenuFor={setCampaignMenuFor}
        controller={controller}
        startCreating={startCreating}
      />
      <SidebarHqSpaceMenuLayer
        menuFor={menuFor}
        setMenuFor={setMenuFor}
        campaigns={campaigns}
        activeSpaceId={activeSpaceId}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        toggleHidden={toggleHidden}
        startRenameSpace={startRenameSpace}
      />
      <SidebarAddSpaceDropdown
        open={addDropdownAnchor !== null}
        anchorRect={addDropdownAnchor}
        onClose={() => {
          setAddDropdownAnchor(null)
          setAddDropdownBucket(null)
        }}
        onBlank={() => startCreating(addDropdownBucket ?? '')}
        onBrowse={() => {
          onOpenBrowseTemplates(addDropdownBucket ?? '')
          setAddDropdownAnchor(null)
          setAddDropdownBucket(null)
        }}
      />
    </>
  )
}
