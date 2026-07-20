'use client'

import { useState, type RefObject } from 'react'
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
  moveCopyTriggerDropdown,
} from '@/components/menus/MoveCopySubmenu'
import { ConfirmDialog } from '@/components/ui/dialogs/ConfirmDialog'
import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import type { Campaign } from '@/lib/campaigns/campaign-api'
import { useOrgStore } from '@/lib/org/org-context-store'
import { openInNewTab as openAppInNewTab } from '@/lib/utils/open-in-new-tab'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { SPACES_ACTIONS_TOAST_ERRORS } from '../../config/spaces-toast-errors.config'
import { useSpacePermission } from '../../hooks/use-space-permission'
import type { Space } from '../../types'

export type SpaceMoreMenuProps = {
  open: boolean
  pos: { top: number; left: number } | null
  moreMenuRef: RefObject<HTMLDivElement | null>
  activeSpace: Space | null
  allCampaigns: Campaign[]
  isFavorite: boolean
  setMoreMenuOpen: (v: boolean) => void
  setSwitcherOpen: (v: boolean) => void
  setAutomationsOpen: (v: boolean) => void
  setSpaceShareOpen: (v: boolean) => void
  createSpace: (title: string) => Promise<{ id: string; title: string }>
  deleteSpace: (id: string) => Promise<void>
  onToggleFavorite: () => void
  onRename: () => void
  onPatchSchemaIcon: (patch: { icon?: string; icon_color?: string }) => void | Promise<void>
  onOpenCampaign?: () => void
  onHide?: () => void
  onMoveToCampaign: (campaignId: string | null) => void | Promise<void>
  onCopyToCampaign: (campaignId: string | null) => void | Promise<void>
}

const ROW_CLS =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]'
const DANGER_ROW_CLS =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-400 hover:bg-[var(--color-hover-subtle)]'
const ROW_ICON_CLS = 'h-3.5 w-3.5 text-[var(--color-muted-foreground)]'

export function SpaceMoreMenu({
  open,
  pos,
  moreMenuRef,
  activeSpace,
  allCampaigns,
  isFavorite,
  setMoreMenuOpen,
  setSwitcherOpen,
  setAutomationsOpen,
  setSpaceShareOpen,
  createSpace,
  deleteSpace,
  onToggleFavorite,
  onRename,
  onPatchSchemaIcon,
  onOpenCampaign,
  onHide,
  onMoveToCampaign,
  onCopyToCampaign,
}: SpaceMoreMenuProps) {
  const memberships = useOrgStore((s) => s.memberships)
  const perm = useSpacePermission(activeSpace)
  const isPersonalDashboard = activeSpace?.space_kind === 'personal_dashboard'
  const [deleteTarget, setDeleteTarget] = useState<Space | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const showMenu = open && pos && typeof document !== 'undefined'

  const closeAll = () => {
    setMoreMenuOpen(false)
    setSwitcherOpen(false)
  }

  const sourceOrgId =
    activeSpace && activeSpace.org_id !== activeSpace.user_id ? activeSpace.org_id : null

  const copyLink = async () => {
    if (!activeSpace) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/spaces?space=${activeSpace.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const openInNewTab = () => {
    if (!activeSpace) return
    if (typeof window === 'undefined') return
    openAppInNewTab(`/spaces?space=${activeSpace.id}`)
  }

  const Divider = () => <div className="my-1 h-px bg-[var(--color-border)]" />

  const iconName = (activeSpace?.schema?.icon as string | undefined) ?? 'layout-grid'
  const iconColorId = (activeSpace?.schema?.icon_color as string | undefined) ?? 'default'
  const iconPalette = getIconColor(iconColorId)

  return (
    <>
      {showMenu
        ? createPortal(
            <div
              ref={moreMenuRef}
              className="dropdown-menu-solid fixed w-[224px] overflow-hidden rounded-xl py-1"
              style={{ top: pos!.top, left: pos!.left, zIndex: 100001 }}
            >
              <div className="px-spacing-2 pb-spacing-1">
                <div className="border-border overflow-hidden rounded-md border">
                  <div className="divide-border flex w-full divide-x">
                    <button
                      type="button"
                      onClick={async () => {
                        await copyLink()
                        closeAll()
                      }}
                      className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center px-2 text-center transition-colors"
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openInNewTab()
                        closeAll()
                      }}
                      className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center px-2 text-center transition-colors"
                    >
                      New tab
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={ROW_CLS}
                onClick={() => {
                  onToggleFavorite()
                  closeAll()
                }}
              >
                <Star
                  className={`${ROW_ICON_CLS} ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                />
                {isFavorite ? 'Unfavorite' : 'Favorite'}
              </button>

              {perm.canEdit ? (
                <button
                  type="button"
                  className={ROW_CLS}
                  onClick={() => {
                    onRename()
                    closeAll()
                  }}
                >
                  <Edit2 className={ROW_ICON_CLS} />
                  Rename
                </button>
              ) : null}

              {(perm.canAdmin || perm.canEdit) && <Divider />}

              {perm.canAdmin ? (
                <button
                  type="button"
                  className={ROW_CLS}
                  onClick={async () => {
                    if (!activeSpace) {
                      closeAll()
                      return
                    }
                    try {
                      const dup = await createSpace(`${activeSpace.title} (copy)`)
                      toast.success(`Duplicated as "${dup.title}"`)
                    } catch {
                      toast.error('Failed to duplicate space')
                    }
                    closeAll()
                  }}
                >
                  <Copy className={ROW_ICON_CLS} />
                  Duplicate
                </button>
              ) : null}

              {perm.canEdit ? (
                <div className={ROW_CLS}>
                  <IconPicker
                    value={iconName}
                    color={iconColorId}
                    size="sm"
                    onChange={(name) => void onPatchSchemaIcon({ icon: name })}
                    onColorChange={(c: IconColorId) => void onPatchSchemaIcon({ icon_color: c })}
                    customTrigger={
                      <span className="gap-spacing-2 flex w-full items-center">
                        <Palette className={ROW_ICON_CLS} />
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

              {(perm.canEdit || (activeSpace?.campaign_id && onOpenCampaign)) && <Divider />}

              {perm.canEdit ? (
                <button
                  type="button"
                  className={ROW_CLS}
                  onClick={() => {
                    closeAll()
                    setAutomationsOpen(true)
                  }}
                >
                  <Zap className={ROW_ICON_CLS} />
                  Flows
                </button>
              ) : null}

              {activeSpace?.campaign_id && onOpenCampaign ? (
                <button
                  type="button"
                  className={ROW_CLS}
                  onClick={() => {
                    onOpenCampaign()
                    closeAll()
                  }}
                >
                  <FolderKanban className={ROW_ICON_CLS} />
                  Open campaign
                </button>
              ) : null}

              {perm.canAdmin && activeSpace ? (
                <>
                  <Divider />
                  <MoveCopySubmenuExclusiveGroup>
                    <MoveCopySubmenu
                      mode="move"
                      label="Move to"
                      icon={<FolderInput className={ROW_ICON_CLS} />}
                      entityType="space"
                      entityId={activeSpace.id}
                      entityName={activeSpace.title}
                      sourceOrgId={sourceOrgId}
                      sourceCampaignId={activeSpace.campaign_id}
                      currentCampaigns={allCampaigns}
                      memberships={memberships}
                      onSameContextCampaignSelect={onMoveToCampaign}
                      onCloseMenus={closeAll}
                      className={moveCopyTriggerDropdown}
                    />
                    <MoveCopySubmenu
                      mode="copy"
                      label="Copy to"
                      icon={<Copy className={ROW_ICON_CLS} />}
                      entityType="space"
                      entityId={activeSpace.id}
                      entityName={activeSpace.title}
                      sourceOrgId={sourceOrgId}
                      sourceCampaignId={activeSpace.campaign_id}
                      currentCampaigns={allCampaigns}
                      memberships={memberships}
                      onSameContextCampaignSelect={onCopyToCampaign}
                      onCloseMenus={closeAll}
                      className={moveCopyTriggerDropdown}
                    />
                  </MoveCopySubmenuExclusiveGroup>
                </>
              ) : null}

              {onHide && activeSpace && !activeSpace.share_meta ? (
                <>
                  <Divider />
                  <button
                    type="button"
                    className={ROW_CLS}
                    onClick={() => {
                      onHide()
                      closeAll()
                    }}
                  >
                    <EyeOff className={ROW_ICON_CLS} />
                    Hide from sidebar
                  </button>
                </>
              ) : null}

              {perm.canDeleteSpace && !isPersonalDashboard ? (
                <>
                  <Divider />
                  <button
                    type="button"
                    className={DANGER_ROW_CLS}
                    onClick={() => {
                      if (!activeSpace) return
                      closeAll()
                      setDeleteTarget(activeSpace)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </>
              ) : null}

              {perm.canAdmin && !isPersonalDashboard ? (
                <>
                  <Divider />
                  <div className="px-spacing-2 pb-spacing-1">
                    <button
                      type="button"
                      className="button-glass-blue body-3 gap-spacing-2 px-spacing-3 py-spacing-1 flex w-full items-center justify-center rounded-md font-medium"
                      onClick={() => {
                        closeAll()
                        setSpaceShareOpen(true)
                      }}
                    >
                      <Share2 className="relative z-10 h-3.5 w-3.5 shrink-0" />
                      <span className="relative z-10">Sharing &amp; Permissions</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isDeleting) setDeleteTarget(null)
        }}
        title="Delete space?"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title || 'Untitled'}"? This cannot be undone.`
            : undefined
        }
        confirmText="Delete"
        confirmDisabled={isDeleting}
        confirmingText="Deleting…"
        onConfirm={async () => {
          if (!deleteTarget) return
          setIsDeleting(true)
          try {
            await deleteSpace(deleteTarget.id)
            setDeleteTarget(null)
            toast.success('Space deleted')
          } catch (err) {
            toast.error(
              sanitizeUserError(err, SPACES_ACTIONS_TOAST_ERRORS.DELETE_SPACE_FAILED.userMessage),
            )
          } finally {
            setIsDeleting(false)
          }
        }}
      />
    </>
  )
}
