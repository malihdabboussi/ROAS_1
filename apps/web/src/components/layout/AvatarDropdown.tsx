'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { AvatarAccountMenuPanel } from './AvatarAccountMenuPanel'

const AVATAR_MENU_WIDTH = 288

type AvatarDropdownProps = {
  displayName: string
  email: string
  avatarUrl: string | null
  initials: string
  sidebarCollapsed: boolean
  showLabel?: boolean
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
}

export function AvatarDropdown({
  displayName,
  email,
  avatarUrl,
  initials,
  sidebarCollapsed: _sidebarCollapsed,
  showLabel: _showLabel = true,
  featureUpdates,
}: AvatarDropdownProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = React.useState<{
    top?: number
    bottom?: number
    left: number
  }>({ left: 0 })

  React.useEffect(() => {
    if (menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const isMobile = window.matchMedia('(max-width: 767px)').matches
      if (isMobile) {
        const MARGIN = 8
        let left = rect.left
        if (left + AVATAR_MENU_WIDTH > window.innerWidth - MARGIN) {
          left = window.innerWidth - AVATAR_MENU_WIDTH - MARGIN
        }
        if (left < MARGIN) left = MARGIN
        setDropdownPos({ bottom: window.innerHeight - rect.top + MARGIN, left })
      } else {
        setDropdownPos({ bottom: window.innerHeight - rect.bottom, left: rect.right + 16 })
      }
    }
  }, [menuOpen])

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !target.closest('[data-avatar-dropdown]')
      ) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [menuOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        onClick={() => setMenuOpen(!menuOpen)}
        className="rounded-spacing-2 relative flex cursor-pointer items-center justify-center p-1 text-[var(--color-muted-foreground)] outline-none transition-colors hover:text-[var(--color-foreground)]"
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="text-sm font-medium text-[var(--color-primary-foreground)]">
              {initials}
            </span>
          )}
        </div>
        {featureUpdates?.hasUnread ? (
          <span className="bg-primary absolute right-0.5 top-0.5 h-2 w-2 rounded-full ring-2 ring-[var(--color-card)]" />
        ) : null}
      </button>

      {menuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-avatar-dropdown
            className="border-border bg-card text-card-foreground rounded-spacing-2 fixed z-[999] w-72 overflow-hidden border shadow-lg"
            style={{ top: dropdownPos.top, bottom: dropdownPos.bottom, left: dropdownPos.left }}
          >
            <AvatarAccountMenuPanel
              email={email}
              featureUpdates={featureUpdates}
              updatesAnchorRef={triggerRef}
              onClose={() => setMenuOpen(false)}
            />
          </div>,
          document.body,
        )}
    </div>
  )
}
