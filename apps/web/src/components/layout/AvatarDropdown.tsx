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
  sidebarCollapsed,
  showLabel = true,
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    return undefined
  }, [menuOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Account menu for ${displayName}`}
        className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-2 gap-spacing-2 p-spacing-1 relative flex w-full cursor-pointer items-center text-left outline-none transition-colors"
      >
        <div className="relative flex-shrink-0">
          <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-primary-foreground text-sm font-medium">{initials}</span>
            )}
          </div>
          {featureUpdates?.hasUnread ? (
            <span
              className="bg-primary ring-card absolute -right-px -top-px h-2 w-2 rounded-full ring-2"
              title="New updates available"
              aria-label="New updates available"
            />
          ) : null}
        </div>
        {showLabel && !sidebarCollapsed ? (
          <span className="min-w-0 flex-1">
            <span className="body-3 text-foreground block truncate font-medium">{displayName}</span>
            <span className="body-4 text-muted-foreground block truncate">{email}</span>
          </span>
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
