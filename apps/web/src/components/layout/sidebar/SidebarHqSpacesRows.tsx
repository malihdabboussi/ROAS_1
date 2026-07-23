'use client'

import Link from 'next/link'
import type { MouseEvent } from 'react'
import { ChevronRight, MoreHorizontal, Plus, Star, User } from 'lucide-react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import type { SidebarCampaignRow } from './sidebar-types'

export type SectionMenuAnchorRect = { top: number; left: number; bottom: number; right: number }

export type SpaceRowSharedProps = {
  pathname: string
  activeSpaceId: string | null
  renamingSpaceId: string | null
  renameDraft: string
  setRenameDraft: (value: string) => void
  onSubmitRename: () => void
  onCancelRename: () => void
  onOpenMenu: (menu: {
    space: Space
    anchorRect?: SectionMenuAnchorRect
    x: number
    y: number
  }) => void
}

export function SpaceRow({
  space,
  favorited,
  pathname,
  activeSpaceId,
  renamingSpaceId,
  renameDraft,
  setRenameDraft,
  onSubmitRename,
  onCancelRename,
  onOpenMenu,
}: SpaceRowSharedProps & { space: Space; favorited: boolean }) {
  const active = pathname.startsWith('/spaces') && activeSpaceId === space.id
  const allowedViewIds = space.share_meta?.allowed_view_ids
  const viewSuffix =
    allowedViewIds && allowedViewIds.length === 1
      ? space.schema?.views?.find((view) => view.id === allowedViewIds[0])?.name
      : null
  const isShared = !!space.share_meta
  const isRenaming = renamingSpaceId === space.id
  const spaceIcon =
    typeof space.schema?.icon === 'string' && space.schema.icon.length > 0
      ? space.schema.icon
      : 'layout-grid'
  const iconColor = getIconColor(space.schema?.icon_color).textColor

  return (
    <div className="group/row relative flex min-w-0 items-stretch">
      {isRenaming ? (
        <div className="rounded-spacing-2 flex w-full min-w-0 items-center gap-2 px-3 py-1">
          <LucideIcon name={spaceIcon} className={`h-4 w-4 shrink-0 ${iconColor}`} />
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={() => onSubmitRename()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmitRename()
              if (e.key === 'Escape') onCancelRename()
            }}
            className="body-3 border-border text-foreground ring-border min-w-0 flex-1 rounded bg-transparent px-1 outline-none ring-1"
          />
        </div>
      ) : (
        <>
          <Link
            href="/spaces"
            onClick={() => {
              useSpacesStore.getState().setActiveSpace(space.id)
              useGlobalChatStore.getState().setCollapsed(true)
            }}
            onContextMenu={(e) => {
              if (isShared) return
              e.preventDefault()
              e.stopPropagation()
              onOpenMenu({ space, x: e.clientX, y: e.clientY })
            }}
            className={`nav-glass-hover-purple flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
              active ? 'nav-glass-selected-purple nav-glass-text-purple' : 'text-muted-foreground'
            }`}
          >
            <LucideIcon name={spaceIcon} className={`h-4 w-4 shrink-0 ${iconColor}`} />
            <span className="body-3 min-w-0 flex-1 truncate">
              {space.title}
              {viewSuffix ? ` • ${viewSuffix}` : ''}
            </span>
            {favorited ? (
              <Star
                className="text-status-amber h-3 w-3 shrink-0 fill-current opacity-100 transition-opacity group-hover/row:pointer-events-none group-hover/row:opacity-0"
                aria-label="Favorite"
              />
            ) : null}
          </Link>
          {!isShared ? (
            <button
              type="button"
              aria-label="Space options"
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity group-hover/row:opacity-100"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const r = e.currentTarget.getBoundingClientRect()
                onOpenMenu({ space, anchorRect: r, x: r.right, y: r.bottom + 4 })
              }}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}

export function Section({
  bucket,
  label,
  campaignId,
  sectionSpaces,
  campaignRow,
  isExpanded,
  isCreating,
  searchActive,
  onToggle,
  onOpenCampaignMenu,
  onOpenAddDropdown,
  creatingName,
  setCreatingName,
  onSubmitCreate,
  onCancelCreate,
  isSubmitting,
  favoriteIds,
  spaceRowProps,
}: {
  bucket: string
  label: string
  campaignId: string | null
  sectionSpaces: Space[]
  campaignRow?: SidebarCampaignRow
  isExpanded: boolean
  isCreating: boolean
  searchActive: boolean
  onToggle: (bucket: string) => void
  onOpenCampaignMenu: (campaign: SidebarCampaignRow, anchorRect: SectionMenuAnchorRect) => void
  onOpenAddDropdown: (e: MouseEvent<HTMLButtonElement>, bucket: string) => void
  creatingName: string
  setCreatingName: (v: string) => void
  onSubmitCreate: (campaignId: string | null) => void
  onCancelCreate: () => void
  isSubmitting: boolean
  favoriteIds: Set<string>
  spaceRowProps: SpaceRowSharedProps
}) {
  const iconName = campaignRow?.icon ?? 'folder-kanban'
  const iconColor = getIconColor(
    (campaignRow?.config.icon_color as string | undefined) ?? undefined,
  ).textColor

  return (
    <div className="min-w-0">
      <div className="group/section rounded-spacing-2 hover:bg-hover-subtle flex min-w-0 items-center gap-0.5 transition-colors">
        <button
          type="button"
          onClick={() => onToggle(bucket)}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground relative flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
        >
          {campaignRow ? (
            <LucideIcon
              name={iconName}
              className={`icon-sm absolute ${iconColor} transition-opacity ${
                isExpanded ? 'opacity-0' : 'opacity-100 group-hover/section:opacity-0'
              }`}
            />
          ) : (
            <User
              className={`icon-sm text-muted-foreground absolute shrink-0 transition-opacity ${
                isExpanded ? 'opacity-0' : 'opacity-100 group-hover/section:opacity-0'
              }`}
              aria-hidden
            />
          )}
          <ChevronRight
            className={`icon-sm absolute shrink-0 transition-all duration-150 ${
              isExpanded ? 'rotate-90 opacity-100' : 'opacity-0 group-hover/section:opacity-100'
            }`}
          />
        </button>
        {campaignRow ? (
          <Link
            href={`/campaigns/${campaignRow.id}`}
            data-hub-dock-navigate
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const r = e.currentTarget.getBoundingClientRect()
              onOpenCampaignMenu(campaignRow, r)
            }}
            className="body-3 text-muted-foreground hover:text-foreground min-w-0 flex-1 truncate px-0 py-1 font-medium transition-colors"
          >
            {label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(bucket)}
            className="body-3 text-muted-foreground hover:text-foreground min-w-0 flex-1 truncate px-0 py-1 text-left font-medium transition-colors"
          >
            {label}
          </button>
        )}
        {campaignRow ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              const r = e.currentTarget.getBoundingClientRect()
              onOpenCampaignMenu(campaignRow, r)
            }}
            title={`More options for ${label}`}
            aria-label={`More options for ${label}`}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground pointer-events-none flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover/section:pointer-events-auto group-hover/section:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
          {sectionSpaces.length > 0 ? (
            <span className="body-3 text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center font-medium tabular-nums opacity-100 transition-opacity group-hover/section:opacity-0">
              {sectionSpaces.length}
            </span>
          ) : null}
          <button
            type="button"
            onClick={(e) => onOpenAddDropdown(e, bucket)}
            title={`New space in ${label}`}
            className="text-muted-foreground hover:text-foreground pointer-events-none absolute inset-0 flex items-center justify-center rounded opacity-0 transition-opacity group-hover/section:pointer-events-auto group-hover/section:opacity-100"
            aria-label={`New space in ${label}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-border ml-2 min-w-0 space-y-0.5 border-l pl-2">
          {sectionSpaces.map((s) => (
            <SpaceRow key={s.id} space={s} favorited={favoriteIds.has(s.id)} {...spaceRowProps} />
          ))}
          {isCreating ? (
            <div className="flex min-w-0 items-center gap-1.5 px-2 py-1">
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
                className="body-3 text-foreground placeholder:text-muted-foreground h-7 min-w-0 flex-1 rounded-md bg-transparent px-2 focus:outline-none disabled:opacity-50"
              />
            </div>
          ) : !searchActive ? (
            <button
              type="button"
              onClick={(e) => onOpenAddDropdown(e, bucket)}
              className="rounded-spacing-2 hover:bg-hover-subtle text-muted-foreground flex w-full min-w-0 items-center gap-2 px-3 py-1 transition-colors"
            >
              <Plus className="icon-sm shrink-0" />
              <span className="body-3 truncate">New space</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
