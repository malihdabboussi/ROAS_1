'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Check, ChevronRight, MessageCircle, Shield, UserMinus } from 'lucide-react'
import { HUB_DOCK_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { cn } from '@/lib/utils/cn'

const MENU_WIDTH = 224
const SUBMENU_WIDTH = 200
const ASSIGNABLE_ROLES = ['admin', 'creator', 'editor', 'viewer'] as const

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  creator: 'Creator',
  editor: 'Editor',
  viewer: 'Viewer',
}

const ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
const QUICK_CELL_CLS =
  'body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'
const ITEM_ICON = 'h-3.5 w-3.5 shrink-0'
const SUBMENU_TRIGGER_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50'

export interface PersonActionsMenuProps {
  open: boolean
  anchor: { top: number; left: number } | null
  displayName: string
  orgRole: string | null
  canManageMembers: boolean
  canChangeRole: boolean
  canRemove: boolean
  roleBusy: boolean
  onClose: () => void
  onCopyLink: () => void
  onOpenInNewTab: () => void
  onOpenMessage: () => void
  onChangeRole: (role: string) => void
  onRemove: () => void
  onOpenOrgMembers: () => void
}

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

export function PersonActionsMenu({
  open,
  anchor,
  displayName,
  orgRole,
  canManageMembers,
  canChangeRole,
  canRemove,
  roleBusy,
  onClose,
  onCopyLink,
  onOpenInNewTab,
  onOpenMessage,
  onChangeRole,
  onRemove,
  onOpenOrgMembers,
}: PersonActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const roleRowRef = useRef<HTMLButtonElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [roleSubmenuOpen, setRoleSubmenuOpen] = useState(false)
  const [subPos, setSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPosition(null)
      return
    }
    const el = menuRef.current
    const width = el?.offsetWidth ?? MENU_WIDTH
    const height = el?.offsetHeight ?? 240
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = anchor.left
    let top = anchor.top
    if (left + width + margin > vw) left = Math.max(margin, vw - width - margin)
    if (top + height + margin > vh) top = Math.max(margin, anchor.top - height)
    if (top < margin) top = margin
    setPosition({ top, left })
  }, [open, anchor, canManageMembers, canChangeRole, canRemove])

  useLayoutEffect(() => {
    if (!roleSubmenuOpen || !roleRowRef.current || !submenuRef.current) return
    const row = roleRowRef.current.getBoundingClientRect()
    const sub = submenuRef.current.getBoundingClientRect()
    const pad = 8
    let left = row.right + 4
    let top = row.top
    if (left + sub.width > window.innerWidth - pad) {
      left = Math.max(pad, row.left - sub.width - 4)
    }
    if (top + sub.height > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - sub.height - pad)
    }
    setSubPos({ top, left })
  }, [roleSubmenuOpen])

  useEffect(() => {
    if (!open) {
      setRoleSubmenuOpen(false)
      return
    }
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (menuRef.current?.contains(t)) return
      if (submenuRef.current?.contains(t)) return
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

  const cancelClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setRoleSubmenuOpen(false), 140)
  }

  if (!open || !anchor || typeof document === 'undefined') return null

  const roleLabel = orgRole ? (ROLE_LABELS[orgRole] ?? orgRole) : null

  return createPortal(
    <>
      <div
        ref={menuRef}
        data-person-actions-menu
        {...{ [HUB_DOCK_PORTAL_GUARD]: '' }}
        role="menu"
        aria-label={`Actions for ${displayName}`}
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
            icon={<MessageCircle className={ITEM_ICON} />}
            label="Open message"
            onClick={() => {
              onOpenMessage()
              close()
            }}
          />

          {roleLabel ? (
            <div
              className="body-3 text-muted-foreground px-spacing-2 py-spacing-1 flex items-center gap-2"
              aria-hidden
            >
              <Shield className={ITEM_ICON} />
              <span className="truncate">{roleLabel}</span>
            </div>
          ) : null}

          {canManageMembers ? (
            <>
              <div className="border-border border-t" />
              <MenuItem
                icon={<Building2 className={ITEM_ICON} />}
                label="Organization members"
                onClick={() => {
                  onOpenOrgMembers()
                  close()
                }}
              />
            </>
          ) : null}

          {canChangeRole ? (
            <button
              ref={roleRowRef}
              type="button"
              role="menuitem"
              disabled={roleBusy}
              className={SUBMENU_TRIGGER_CLS}
              onMouseEnter={() => {
                cancelClose()
                setRoleSubmenuOpen(true)
              }}
              onMouseLeave={scheduleClose}
              onFocus={() => setRoleSubmenuOpen(true)}
              onClick={() => setRoleSubmenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={roleSubmenuOpen}
            >
              <Shield className={ITEM_ICON} />
              <span className="min-w-0 flex-1 truncate">Change role</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
            </button>
          ) : null}

          {canRemove ? (
            <>
              <div className="border-border border-t" />
              <MenuItem
                icon={<UserMinus className={ITEM_ICON} />}
                label="Remove from organization"
                destructive
                onClick={() => {
                  onRemove()
                  close()
                }}
              />
            </>
          ) : null}
        </div>
      </div>

      {canChangeRole && roleSubmenuOpen ? (
        <div
          ref={submenuRef}
          role="menu"
          {...{ [HUB_DOCK_PORTAL_GUARD]: '' }}
          className="z-dropdown dropdown-menu-solid fixed overflow-y-auto rounded-xl py-1 shadow-lg"
          style={{
            top: subPos.top,
            left: subPos.left,
            width: SUBMENU_WIDTH,
            maxHeight: 'min(280px, 50vh)',
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onClick={(e) => e.stopPropagation()}
        >
          {ASSIGNABLE_ROLES.map((role) => {
            const selected = orgRole === role
            return (
              <button
                key={role}
                type="button"
                role="menuitem"
                disabled={roleBusy || selected}
                className={ITEM_CLS}
                onClick={() => {
                  onChangeRole(role)
                  close()
                }}
              >
                {selected ? (
                  <Check className={`${ITEM_ICON} text-foreground`} />
                ) : (
                  <span className={`${ITEM_ICON}`} aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate">{ROLE_LABELS[role] ?? role}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </>,
    document.body,
  )
}
