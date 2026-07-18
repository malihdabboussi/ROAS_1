'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export function SidebarHqHubMenuNavRow({
  active,
  icon,
  label,
  href,
  onNavigate,
  onHover,
  onLeave,
  rowRef,
  trailing,
}: {
  active?: boolean
  icon: ReactNode
  label: string
  href?: string
  onNavigate?: () => void
  onHover?: () => void
  onLeave?: () => void
  rowRef?: (el: HTMLElement | null) => void
  trailing?: ReactNode
}) {
  const className = cn(
    'hub-menu-link-row',
    active && 'hub-menu-link-row-active nav-glass-selected-purple nav-glass-text-purple',
  )
  const inner = (
    <>
      <span className="shrink-0">{icon}</span>
      <span className="body-3 flex-1 truncate text-left">{label}</span>
      {trailing}
    </>
  )

  const setRefs = (el: HTMLElement | null) => {
    rowRef?.(el)
  }

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={(e) => {
        // Pointer moved into the dock flyout — keep it open.
        if (
          e.relatedTarget instanceof Element &&
          e.relatedTarget.closest('[data-hub-dock-flyout]')
        ) {
          return
        }
        onLeave?.()
      }}
    >
      {href ? (
        <Link
          href={href}
          onClick={onNavigate}
          className={className}
          ref={setRefs as (el: HTMLAnchorElement | null) => void}
        >
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onNavigate}
          className={cn(className, 'w-full')}
          ref={setRefs as (el: HTMLButtonElement | null) => void}
        >
          {inner}
        </button>
      )}
    </div>
  )
}
