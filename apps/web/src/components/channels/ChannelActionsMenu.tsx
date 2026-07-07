'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CheckCheck,
  Component,
  Palette,
  Pencil,
  PinOff,
  Settings,
  Star,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { cn } from '@/lib/utils/cn'

export interface ChannelActionsMenuProps {
  open: boolean
  anchor: { top: number; left: number } | null
  channelName: string
  canManage: boolean
  showUnpinFromView?: boolean
  onClose: () => void
  onCopyLink: () => void
  onOpenInNewTab: () => void
  onMarkAsRead: () => void
  isFavorite: boolean
  onToggleFavorite: () => void
  onRename: () => void
  onAddMembers: () => void
  onOpenSettings: () => void
  channelIconName: string
  channelIconColorId: string
  onPatchIcon: (patch: { icon?: string; icon_color?: string }) => void
  onStartBrainstorm: () => void
  onUnpinFromView?: () => void
  onDelete: () => void
}

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

export function ChannelActionsMenu({
  open,
  anchor,
  channelName,
  canManage,
  showUnpinFromView = false,
  onClose,
  onCopyLink,
  onOpenInNewTab,
  onMarkAsRead,
  isFavorite,
  onToggleFavorite,
  onRename,
  onAddMembers,
  onOpenSettings,
  channelIconName,
  channelIconColorId,
  onPatchIcon,
  onStartBrainstorm,
  onUnpinFromView,
  onDelete,
}: ChannelActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const iconPalette = getIconColor(channelIconColorId)

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPosition(null)
      return
    }
    const el = menuRef.current
    const width = el?.offsetWidth ?? 224
    const height = el?.offsetHeight ?? 320
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = anchor.left
    let top = anchor.top
    if (left + width + margin > vw) left = Math.max(margin, vw - width - margin)
    if (top + height + margin > vh) top = Math.max(margin, anchor.top - height)
    if (top < margin) top = margin
    setPosition({ top, left })
  }, [open, anchor, canManage, showUnpinFromView])

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
      data-channel-actions-menu
      role="menu"
      aria-label={`Actions for ${channelName}`}
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
          icon={<CheckCheck className={ITEM_ICON} />}
          label="Mark as read"
          onClick={() => {
            onMarkAsRead()
            close()
          }}
        />
        <MenuItem
          icon={<Star className={cn(ITEM_ICON, isFavorite && 'fill-primary text-primary')} />}
          label={isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
          onClick={() => {
            onToggleFavorite()
            close()
          }}
        />
        <MenuItem
          icon={<Component className={ITEM_ICON} />}
          label="Start brainstorm"
          onClick={() => {
            onStartBrainstorm()
            close()
          }}
        />

        {canManage ? (
          <>
            <div className="border-border border-t" />
            <MenuItem
              icon={<Pencil className={ITEM_ICON} />}
              label="Rename"
              onClick={() => {
                onRename()
                close()
              }}
            />
            <MenuItem
              icon={<UserPlus className={ITEM_ICON} />}
              label="Add members"
              onClick={() => {
                onAddMembers()
                close()
              }}
            />
            <div className={ITEM_CLS}>
              <IconPicker
                key={`${channelIconName}-${channelIconColorId}`}
                value={channelIconName}
                color={channelIconColorId}
                size="sm"
                preferAbove
                onChange={(name) => onPatchIcon({ icon: name })}
                onColorChange={(colorId: IconColorId) => onPatchIcon({ icon_color: colorId })}
                customTrigger={
                  <span className="gap-spacing-2 flex w-full items-center">
                    <Palette className={ITEM_ICON} />
                    <span className="min-w-0 flex-1 truncate text-left">Color &amp; Icon</span>
                    <LucideIcon
                      name={channelIconName}
                      className={`h-3.5 w-3.5 shrink-0 ${iconPalette.textColor}`}
                    />
                  </span>
                }
              />
            </div>
            <MenuItem
              icon={<Settings className={ITEM_ICON} />}
              label="Channel settings"
              onClick={() => {
                onOpenSettings()
                close()
              }}
            />
          </>
        ) : null}

        {showUnpinFromView && onUnpinFromView ? (
          <>
            <div className="border-border border-t" />
            <MenuItem
              icon={<PinOff className={ITEM_ICON} />}
              label="Remove from View"
              destructive
              onClick={() => {
                onUnpinFromView()
                close()
              }}
            />
          </>
        ) : null}

        {canManage && !(showUnpinFromView && onUnpinFromView) ? (
          <>
            <div className="border-border border-t" />
            <MenuItem
              icon={<Trash2 className={ITEM_ICON} />}
              label="Delete channel"
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
