'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Copy,
  Edit2,
  EyeOff,
  FolderInput,
  FolderKanban,
  Palette,
  Share2,
  Star,
  Trash2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  MoveCopySubmenu,
  MoveCopySubmenuExclusiveGroup,
  moveCopyTriggerSidebar,
} from '@/components/menus/MoveCopySubmenu'
import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useSpacePermission } from '@/features/spaces/hooks/use-space-permission'
import type { Space } from '@/features/spaces/types'
import {
  HUB_DOCK_PORTAL_GUARD,
  VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD,
} from '@/lib/ui/floating-control-attrs'
import { cn } from '@/lib/utils/cn'
import type { SidebarCampaignRow } from './sidebar-types'

const MENU_WIDTH = 224

const ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
const DANGER_ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left text-destructive transition-colors hover:bg-red-500/10 [&_svg]:text-destructive'
const ITEM_ICON_CLS = 'h-3.5 w-3.5 shrink-0'
const QUICK_CELL_CLS =
  'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'

export type SidebarSpaceContextMenuProps = {
  /** When set, render menu at this viewport coordinate. */
  position: { x: number; y: number } | null
  anchorRect?: { top: number; left: number; bottom: number; right: number }
  space: Space
  campaigns: SidebarCampaignRow[]
  onClose: () => void
  onOpenInNewTab: () => void
  onRename: () => void
  onDuplicate: () => void
  onMoveToCampaign: (campaignId: string | null) => void
  onCopyToCampaign: (campaignId: string | null) => void
  onPatchSchemaIcon: (patch: { icon?: string; icon_color?: string }) => Promise<void> | void
  onOpenAutomations: () => void
  onOpenSharing: () => void
  onDelete: () => void
  isFavorite: boolean
  onToggleFavorite: () => void
  onOpenCampaign?: () => void
  onHide?: () => void
}

export function SidebarSpaceContextMenu({
  position,
  anchorRect,
  space,
  campaigns,
  onClose,
  onOpenInNewTab,
  onRename,
  onDuplicate,
  onMoveToCampaign,
  onCopyToCampaign,
  onPatchSchemaIcon,
  onOpenAutomations,
  onOpenSharing,
  onDelete,
  isFavorite,
  onToggleFavorite,
  onOpenCampaign,
  onHide,
}: SidebarSpaceContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const memberships = useOrgStore((s) => s.memberships)
  const perm = useSpacePermission(space)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!position || !ref.current) {
      setPos(null)
      return
    }
    const dropRect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let left = position.x
    let top = position.y
    if (anchorRect) {
      top = anchorRect.bottom + 4
      left = anchorRect.right
      if (top + dropRect.height > vh - pad) top = anchorRect.top - dropRect.height - 4
    } else if (top + dropRect.height > vh - pad) {
      top = Math.max(pad, vh - dropRect.height - pad)
    }
    if (top < pad) top = pad
    if (left + dropRect.width > vw - pad) left = Math.max(pad, vw - dropRect.width - pad)
    setPos({ top, left })
  }, [position, anchorRect])

  useEffect(() => {
    if (!position) return
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      if (t instanceof Element && t.closest(`[${VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD}]`)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [position, onClose])

  if (!position || typeof document === 'undefined') return null

  function row(
    icon: ReactNode,
    label: string,
    onPick: () => void,
    opts?: { danger?: boolean; rightAffix?: ReactNode },
  ) {
    return (
      <button
        type="button"
        className={opts?.danger ? DANGER_ITEM_CLS : ITEM_CLS}
        onClick={() => {
          onPick()
          onClose()
        }}
      >
        {icon}
        <span className="flex-1 truncate">{label}</span>
        {opts?.rightAffix}
      </button>
    )
  }

  const copyLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/spaces?space=${space.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const iconName = (space.schema?.icon as string | undefined) ?? 'layout-grid'
  const iconColorId = (space.schema?.icon_color as string | undefined) ?? 'default'
  const iconPalette = getIconColor(iconColorId)

  const placedStyle = pos
    ? { top: pos.top, left: pos.left, visibility: 'visible' as const }
    : { top: -9999, left: -9999, visibility: 'hidden' as const }

  return createPortal(
    <div
      ref={ref}
      data-sidebar-space-menu
      {...{ [HUB_DOCK_PORTAL_GUARD]: '' }}
      className={cn(
        'z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed border shadow-lg',
        'gap-spacing-1 flex flex-col',
      )}
      style={{ ...placedStyle, width: MENU_WIDTH }}
      role="menu"
    >
      {/* Quick row — Copy link + Open in new tab. */}
      <div className="border-border mb-spacing-1 overflow-hidden rounded-md border">
        <div className="divide-border flex w-full divide-x">
          <button
            type="button"
            onClick={async () => {
              await copyLink()
              onClose()
            }}
            className={QUICK_CELL_CLS}
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenInNewTab()
              onClose()
            }}
            className={QUICK_CELL_CLS}
          >
            New tab
          </button>
        </div>
      </div>

      {/* Identity — Favorite, Rename. */}
      {row(
        <Star
          className={`${ITEM_ICON_CLS} ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
        />,
        isFavorite ? 'Unfavorite' : 'Favorite',
        onToggleFavorite,
      )}
      {perm.canEdit ? <>{row(<Edit2 className={ITEM_ICON_CLS} />, 'Rename', onRename)}</> : null}

      {/* Customization — Duplicate, Color & Icon. */}
      {(perm.canAdmin || perm.canEdit) && (
        <>
          <div className="border-border border-t" />
          {perm.canAdmin ? row(<Copy className={ITEM_ICON_CLS} />, 'Duplicate', onDuplicate) : null}
          {perm.canEdit ? (
            <div className={ITEM_CLS}>
              <IconPicker
                value={iconName}
                color={iconColorId}
                size="sm"
                onChange={(name) => void onPatchSchemaIcon({ icon: name })}
                onColorChange={(c: IconColorId) => void onPatchSchemaIcon({ icon_color: c })}
                customTrigger={
                  <span className="gap-spacing-2 flex w-full items-center">
                    <Palette className={ITEM_ICON_CLS} />
                    <span className="flex-1 text-left">Color &amp; Icon</span>
                    <LucideIcon
                      name={iconName}
                      className={`h-3.5 w-3.5 shrink-0 ${iconPalette.textColor}`}
                    />
                  </span>
                }
              />
            </div>
          ) : null}
        </>
      )}

      {/* Workflow — Flows, Open campaign. */}
      {(perm.canEdit || (space.campaign_id && onOpenCampaign)) && (
        <>
          <div className="border-border border-t" />
          {perm.canEdit ? row(<Zap className={ITEM_ICON_CLS} />, 'Flows', onOpenAutomations) : null}
          {space.campaign_id && onOpenCampaign
            ? row(<FolderKanban className={ITEM_ICON_CLS} />, 'Open campaign', onOpenCampaign)
            : null}
        </>
      )}

      {/* Movement — Move to / Copy to. */}
      {perm.canAdmin ? (
        <>
          <div className="border-border border-t" />
          <MoveCopySubmenuExclusiveGroup>
            <MoveCopySubmenu
              mode="move"
              label="Move to"
              icon={<FolderInput className={ITEM_ICON_CLS} />}
              entityType="space"
              entityId={space.id}
              entityName={space.title ?? ''}
              sourceOrgId={activeOrgId}
              sourceCampaignId={space.campaign_id}
              currentCampaigns={campaigns as any}
              memberships={memberships}
              onSameContextCampaignSelect={onMoveToCampaign}
              onCloseMenus={onClose}
              className={moveCopyTriggerSidebar}
            />
            <MoveCopySubmenu
              mode="copy"
              label="Copy to"
              icon={<Copy className={ITEM_ICON_CLS} />}
              entityType="space"
              entityId={space.id}
              entityName={space.title ?? ''}
              sourceOrgId={activeOrgId}
              sourceCampaignId={space.campaign_id}
              currentCampaigns={campaigns as any}
              memberships={memberships}
              onSameContextCampaignSelect={onCopyToCampaign}
              onCloseMenus={onClose}
              className={moveCopyTriggerSidebar}
            />
          </MoveCopySubmenuExclusiveGroup>
        </>
      ) : null}

      {/* Hide from sidebar — personal preference, owned spaces only. */}
      {onHide && !space.share_meta ? (
        <>
          <div className="border-border border-t" />
          {row(<EyeOff className={ITEM_ICON_CLS} />, 'Hide from sidebar', onHide)}
        </>
      ) : null}

      {/* Destructive — Delete. */}
      {perm.canDeleteSpace ? (
        <>
          <div className="border-border border-t" />
          {row(<Trash2 className={ITEM_ICON_CLS} />, 'Delete', onDelete, { danger: true })}
        </>
      ) : null}

      {/* Sharing — last, matches campaign menu. Glass-blue accent. */}
      {perm.canAdmin ? (
        <>
          <div className="border-border border-t" />
          <button
            type="button"
            onClick={() => {
              onOpenSharing()
              onClose()
            }}
            className="button-glass-blue body-3 gap-spacing-2 px-spacing-3 py-spacing-1 mt-spacing-1 flex w-full items-center justify-center rounded-md font-medium"
          >
            <Share2 className="relative z-10 h-3.5 w-3.5 shrink-0" />
            <span className="relative z-10">Sharing &amp; Permissions</span>
          </button>
        </>
      ) : null}
    </div>,
    document.body,
  )
}
