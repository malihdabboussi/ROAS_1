'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Archive,
  Copy,
  Edit2,
  EyeOff,
  FolderInput,
  Palette,
  Plus,
  Share2,
  Star,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  MoveCopySubmenu,
  MoveCopySubmenuExclusiveGroup,
  moveCopyTriggerSidebar,
} from '@/components/menus/MoveCopySubmenu'
import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useCampaignPermission } from '@/features/studio/hooks/use-campaign-permission'
import { HUB_DOCK_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import type { SidebarCampaignRow } from './sidebar-types'

const MENU_WIDTH = 224

export interface SidebarCampaignMenuPortalProps {
  campaign: SidebarCampaignRow
  anchorRect: { top: number; left: number; bottom: number; right: number }
  onClose: () => void
  onToggleFavorite?: () => void
  onEdit: () => void
  onCreateSpaceInCampaign?: () => void
  onPatchCampaignConfig?: (
    campaignId: string,
    patch: Record<string, unknown>,
  ) => void | Promise<void>
  onHide?: () => void
  onArchive?: () => void
  onDeleteRequest: () => void
  onRequestShare: () => void
  onRequestTransfer?: () => void
  onManageTeam?: () => void
  onPin?: () => void
}

export function SidebarCampaignMenuPortal({
  campaign,
  anchorRect,
  onClose,
  onToggleFavorite,
  onEdit,
  onCreateSpaceInCampaign,
  onPatchCampaignConfig,
  onHide,
  onArchive,
  onDeleteRequest,
  onRequestShare,
  onManageTeam,
}: SidebarCampaignMenuPortalProps) {
  const { activeOrgId, isOrgContext, memberships } = useOrgStore()
  const perm = useCampaignPermission()
  const hasOtherContexts = memberships.length > 0 || isOrgContext()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!ref.current) {
      setPos(null)
      return
    }
    const dropRect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let top = anchorRect.bottom + 4
    let left = anchorRect.right
    if (top + dropRect.height > vh - pad) top = anchorRect.top - dropRect.height - 4
    if (top < pad) top = pad
    if (left + dropRect.width > vw - pad) left = Math.max(pad, vw - dropRect.width - pad)
    setPos({ top, left })
  }, [anchorRect])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-campaign-menu]')) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  const itemCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
  const itemIcon = 'h-3.5 w-3.5 shrink-0'
  const dangerCls =
    'gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left text-red-600 transition-colors hover:bg-red-500/10 [&_svg]:text-red-600'
  const quickCellCls =
    'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'

  const wrap = (fn: () => void | Promise<void>) => async () => {
    try {
      await fn()
    } finally {
      onClose()
    }
  }

  const copyLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/campaigns/${campaign.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const iconColorId = (campaign.config.icon_color as string | undefined) ?? 'default'
  const iconPalette = getIconColor(iconColorId)

  const placedStyle = pos
    ? { top: pos.top, left: pos.left, visibility: 'visible' as const }
    : { top: -9999, left: -9999, visibility: 'hidden' as const }

  return createPortal(
    <div
      ref={ref}
      data-campaign-menu
      {...{ [HUB_DOCK_PORTAL_GUARD]: '' }}
      className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed border shadow-lg"
      style={{ ...placedStyle, width: MENU_WIDTH }}
      role="menu"
    >
      {/* Segmented top row */}
      <div className="border-border mb-spacing-2 overflow-hidden rounded-md border">
        <div className="divide-border flex w-full divide-x">
          <button type="button" onClick={wrap(copyLink)} className={quickCellCls}>
            Copy link
          </button>
          <button
            type="button"
            onClick={() => {
              openInNewTab(`/campaigns/${campaign.id}`)
              onClose()
            }}
            className={quickCellCls}
          >
            New tab
          </button>
        </div>
      </div>

      <div className="gap-spacing-1 px-spacing-1 flex flex-col">
        {/* Identity — Favorite (any) + Rename (canEdit). */}
        {onToggleFavorite && (
          <button type="button" onClick={wrap(onToggleFavorite)} className={itemCls}>
            <Star
              className={`${itemIcon} ${campaign.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
            />
            <span>{campaign.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
          </button>
        )}
        {!campaign.isSystemGeneral && !campaign.isSystemPersonal && perm.canEdit && (
          <button type="button" onClick={wrap(onEdit)} className={itemCls}>
            <Edit2 className={itemIcon} />
            <span>Rename</span>
          </button>
        )}

        {/* Customization — New space + Color & Icon (canEdit). */}
        {((onCreateSpaceInCampaign && perm.canEdit) || (onPatchCampaignConfig && perm.canEdit)) && (
          <>
            <div className="border-border border-t" />
            {onCreateSpaceInCampaign && perm.canEdit && (
              <button type="button" onClick={wrap(onCreateSpaceInCampaign)} className={itemCls}>
                <Plus className={itemIcon} />
                <span>New space here</span>
              </button>
            )}
            {onPatchCampaignConfig && perm.canEdit && (
              <div className={itemCls}>
                <IconPicker
                  value={campaign.icon}
                  color={iconColorId}
                  size="sm"
                  onChange={(name) => void onPatchCampaignConfig(campaign.id, { icon: name })}
                  onColorChange={(c: IconColorId) =>
                    void onPatchCampaignConfig(campaign.id, { icon_color: c })
                  }
                  customTrigger={
                    <span className="gap-spacing-2 flex w-full items-center">
                      <Palette className={itemIcon} />
                      <span className="flex-1 text-left">Color & Icon</span>
                      <LucideIcon
                        name={campaign.icon}
                        className={`h-3.5 w-3.5 shrink-0 ${iconPalette.textColor}`}
                      />
                    </span>
                  }
                />
              </div>
            )}
          </>
        )}

        {/* Movement / team — Move/Copy + Manage team (canAdmin). */}
        {!campaign.isSystemGeneral &&
          !campaign.isSystemPersonal &&
          perm.canAdmin &&
          (hasOtherContexts || onManageTeam) && (
            <>
              <div className="border-border border-t" />
              {hasOtherContexts && (
                <MoveCopySubmenuExclusiveGroup>
                  <MoveCopySubmenu
                    mode="move"
                    label="Move to"
                    icon={<FolderInput className={itemIcon} />}
                    entityType="campaign"
                    entityId={campaign.id}
                    entityName={campaign.name}
                    sourceOrgId={activeOrgId}
                    memberships={memberships}
                    onCloseMenus={onClose}
                    className={moveCopyTriggerSidebar}
                  />
                  <MoveCopySubmenu
                    mode="copy"
                    label="Copy to"
                    icon={<Copy className={itemIcon} />}
                    entityType="campaign"
                    entityId={campaign.id}
                    entityName={campaign.name}
                    sourceOrgId={activeOrgId}
                    memberships={memberships}
                    onCloseMenus={onClose}
                    className={moveCopyTriggerSidebar}
                  />
                </MoveCopySubmenuExclusiveGroup>
              )}
              {onManageTeam && (
                <button type="button" onClick={wrap(onManageTeam)} className={itemCls}>
                  <Users className={itemIcon} />
                  <span>Manage team</span>
                </button>
              )}
            </>
          )}

        {/* Hide from sidebar — personal preference, any role. */}
        {!campaign.isSystemGeneral && !campaign.isSystemPersonal && onHide && (
          <>
            <div className="border-border border-t" />
            <button type="button" onClick={wrap(onHide)} className={itemCls}>
              <EyeOff className={itemIcon} />
              <span>Hide from sidebar</span>
            </button>
          </>
        )}

        {/* Destructive — Archive (canAdmin) + Delete (org admin/owner only). */}
        {!campaign.isSystemGeneral &&
          !campaign.isSystemPersonal &&
          (perm.canAdmin || perm.canDeleteCampaign) && (
            <>
              <div className="border-border border-t" />
              {onArchive && perm.canAdmin && (
                <button type="button" onClick={wrap(onArchive)} className={itemCls}>
                  <Archive className={itemIcon} />
                  <span>Archive</span>
                </button>
              )}
              {perm.canDeleteCampaign && (
                <button type="button" onClick={wrap(onDeleteRequest)} className={dangerCls}>
                  <Trash2 className={itemIcon} />
                  <span>Delete</span>
                </button>
              )}
            </>
          )}

        {/* Sharing — last, glass-blue accent (canAdmin). */}
        {isOrgContext() && perm.canAdmin && (
          <>
            <div className="border-border border-t" />
            <button
              type="button"
              onClick={wrap(onRequestShare)}
              className="button-glass-blue body-3 gap-spacing-2 px-spacing-3 py-spacing-1 mt-spacing-1 flex w-full items-center justify-center rounded-md font-medium"
            >
              <Share2 className="relative z-10 h-3.5 w-3.5 shrink-0" />
              <span className="relative z-10">Sharing &amp; Permissions</span>
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
