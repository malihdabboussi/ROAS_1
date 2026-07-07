'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BarChart3, LayoutDashboard, Palette, Pencil, Shield, Trash2, UserPlus } from 'lucide-react'
import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { cn } from '@/lib/utils/cn'

export interface TeamActionsMenuProps {
  open: boolean
  anchor: { top: number; left: number } | null
  teamName: string
  teamIcon: string
  teamColor: string
  isSystem: boolean
  canEdit: boolean
  canManageMembers: boolean
  onClose: () => void
  onCopyLink: () => void
  onOpenInNewTab: () => void
  onOpenOverview: () => void
  onOpenAnalytics: () => void
  onOpenAccess: () => void
  onRename: () => void
  onAddMembers: () => void
  onPatchAppearance: (patch: { icon?: string; color?: string }) => void
  onDelete: () => void
}

const MENU_WIDTH = 224
const ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
const QUICK_CELL_CLS =
  'body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'
const ITEM_ICON = 'h-3.5 w-3.5 shrink-0'

function MenuItem({
  icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        ITEM_CLS,
        destructive && 'text-destructive hover:bg-destructive/10 [&_svg]:text-destructive',
      )}
    >
      <span className="flex shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}

export function TeamActionsMenu({
  open,
  anchor,
  teamName,
  teamIcon,
  teamColor,
  isSystem,
  canEdit,
  canManageMembers,
  onClose,
  onCopyLink,
  onOpenInNewTab,
  onOpenOverview,
  onOpenAnalytics,
  onOpenAccess,
  onRename,
  onAddMembers,
  onPatchAppearance,
  onDelete,
}: TeamActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const iconPalette = getIconColor(teamColor)
  const canRename = canEdit && !isSystem
  const canDelete = canEdit && !isSystem

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPosition(null)
      return
    }
    const el = menuRef.current
    const width = el?.offsetWidth ?? MENU_WIDTH
    const height = el?.offsetHeight ?? 280
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = anchor.left
    let top = anchor.top
    if (left + width + margin > vw) left = Math.max(margin, vw - width - margin)
    if (top + height + margin > vh) top = Math.max(margin, anchor.top - height)
    if (top < margin) top = margin
    setPosition({ top, left })
  }, [open, anchor, canEdit, canManageMembers, isSystem])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (menuRef.current?.contains(t)) return
      if (t instanceof Element && t.closest('[data-icon-picker-popup]')) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const close = () => onClose()

  if (!open || !anchor || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      data-team-actions-menu
      role="menu"
      aria-label={`Actions for ${teamName}`}
      className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-56 overflow-visible border shadow-lg"
      style={{
        top: position?.top ?? anchor.top,
        left: position?.left ?? anchor.left,
        visibility: position ? 'visible' : 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-border mb-spacing-2 overflow-hidden rounded-md border">
        <div className="divide-border flex w-full divide-x">
          <button
            type="button"
            className={QUICK_CELL_CLS}
            onClick={() => {
              onCopyLink()
              close()
            }}
          >
            Copy link
          </button>
          <button
            type="button"
            className={QUICK_CELL_CLS}
            onClick={() => {
              onOpenInNewTab()
              close()
            }}
          >
            New tab
          </button>
        </div>
      </div>

      <div className="gap-spacing-1 px-spacing-1 flex flex-col">
        <MenuItem
          icon={<LayoutDashboard className={ITEM_ICON} />}
          label="Overview"
          onClick={() => {
            onOpenOverview()
            close()
          }}
        />
        <MenuItem
          icon={<BarChart3 className={ITEM_ICON} />}
          label="Analytics"
          onClick={() => {
            onOpenAnalytics()
            close()
          }}
        />
        <MenuItem
          icon={<Shield className={ITEM_ICON} />}
          label="Access"
          onClick={() => {
            onOpenAccess()
            close()
          }}
        />

        {canRename || canManageMembers || canEdit ? (
          <>
            <div className="border-border border-t" />
            {canRename ? (
              <MenuItem
                icon={<Pencil className={ITEM_ICON} />}
                label="Rename"
                onClick={() => {
                  onRename()
                  close()
                }}
              />
            ) : null}
            {canManageMembers ? (
              <MenuItem
                icon={<UserPlus className={ITEM_ICON} />}
                label="Add members"
                onClick={() => {
                  onAddMembers()
                  close()
                }}
              />
            ) : null}
            {canEdit ? (
              <div className={ITEM_CLS}>
                <IconPicker
                  key={`${teamIcon}-${teamColor}`}
                  value={teamIcon || 'users'}
                  color={teamColor}
                  size="sm"
                  preferAbove
                  onChange={(name) => onPatchAppearance({ icon: name })}
                  onColorChange={(colorId: IconColorId) => onPatchAppearance({ color: colorId })}
                  customTrigger={
                    <span className="gap-spacing-2 flex w-full items-center">
                      <Palette className={ITEM_ICON} />
                      <span className="min-w-0 flex-1 truncate text-left">Color &amp; Icon</span>
                      <LucideIcon
                        name={teamIcon || 'users'}
                        className={`h-3.5 w-3.5 shrink-0 ${iconPalette.textColor}`}
                      />
                    </span>
                  }
                />
              </div>
            ) : null}
          </>
        ) : null}

        {canDelete ? (
          <>
            <div className="border-border border-t" />
            <MenuItem
              icon={<Trash2 className={ITEM_ICON} />}
              label="Delete team"
              destructive
              onClick={() => {
                onDelete()
                close()
              }}
            />
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
