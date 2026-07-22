'use client'

import Link from 'next/link'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import { HUB_DOCK_SUB_FLYOUT_OFFSET_PX, HubDockFlyout } from './HubDockFlyout'

export function SidebarHqSpacesNestedFlyout({
  anchor,
  label,
  campaignId,
  bucket,
  sectionSpaces,
  creatingInBucket,
  creatingName,
  setCreatingName,
  isSubmitting,
  onSubmitCreate,
  onCancelCreate,
  onOpenAddDropdown,
  onEnter,
  onLeave,
  onClose,
  onCloseParentFlyout,
  closeSubFlyout,
}: {
  anchor: DOMRect
  label: string
  campaignId: string
  bucket: string
  sectionSpaces: Space[]
  creatingInBucket: string | null
  creatingName: string
  setCreatingName: (v: string) => void
  isSubmitting: boolean
  onSubmitCreate: (campaignId: string | null) => void
  onCancelCreate: () => void
  onOpenAddDropdown: (event: React.MouseEvent<HTMLButtonElement>, bucket: string) => void
  onEnter: () => void
  onLeave: () => void
  onClose: () => void
  onCloseParentFlyout?: () => void
  closeSubFlyout: () => void
}) {
  return (
    <HubDockFlyout
      anchor={anchor}
      title={label}
      nested
      offsetPx={HUB_DOCK_SUB_FLYOUT_OFFSET_PX}
      onEnter={onEnter}
      onLeave={onLeave}
      onClose={onClose}
      headerActions={[
        {
          kind: 'plus',
          title: 'New space',
          onClick: (event) => onOpenAddDropdown(event, campaignId),
        },
      ]}
    >
      {creatingInBucket === bucket ? (
        <div className="flex items-center gap-1.5 px-2 py-1" data-hub-dock-keep-open>
          <input
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmitCreate(campaignId)
              if (e.key === 'Escape') onCancelCreate()
            }}
            onBlur={() => {
              if (!creatingName.trim()) onCancelCreate()
            }}
            disabled={isSubmitting}
            autoFocus
            placeholder={isSubmitting ? 'Creating…' : 'Space name'}
            className="body-3 text-foreground placeholder:text-muted-foreground h-7 flex-1 rounded-md bg-transparent px-2 focus:outline-none disabled:opacity-50"
          />
        </div>
      ) : null}
      {sectionSpaces.length === 0 && creatingInBucket !== bucket ? (
        <p className="hub-dock-flyout-row-muted px-2.5 py-1.5 text-[13px]">No spaces yet</p>
      ) : (
        sectionSpaces.map((s) => {
          const spaceIcon =
            typeof s.schema?.icon === 'string' && s.schema.icon.length > 0
              ? s.schema.icon
              : 'layout-grid'
          const spaceColor = getIconColor(s.schema?.icon_color).textColor
          return (
            <Link
              key={s.id}
              href="/spaces"
              data-hub-dock-navigate
              onClick={() => {
                useSpacesStore.getState().setActiveSpace(s.id)
                useGlobalChatStore.getState().setCollapsed(true)
                closeSubFlyout()
                onCloseParentFlyout?.()
              }}
              className="hub-dock-flyout-row"
            >
              <LucideIcon name={spaceIcon} className={`hub-dock-flyout-row-icon ${spaceColor}`} />
              <span className="min-w-0 flex-1 truncate">{s.title}</span>
            </Link>
          )
        })
      )}
    </HubDockFlyout>
  )
}
