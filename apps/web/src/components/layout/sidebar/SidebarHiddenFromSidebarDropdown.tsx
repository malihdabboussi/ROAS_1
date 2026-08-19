'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { Space } from '@/features/spaces/types'
import { HUB_DOCK_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import type { SidebarCampaignRow } from './sidebar-types'

export type SidebarHiddenFromSidebarDropdownProps = {
  open: boolean
  anchorRect: DOMRect | null
  onClose: () => void
  hiddenCampaigns: SidebarCampaignRow[]
  hiddenSpaces: Space[]
  onUnhideCampaign: (campaignId: string) => void
  onUnhideSpace: (spaceId: string) => void
}

const ROW_CLS =
  'gap-spacing-2 body-3 flex w-full items-center rounded-md px-2 py-1.5 text-left text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'

export function SidebarHiddenFromSidebarDropdown({
  open,
  anchorRect,
  onClose,
  hiddenCampaigns,
  hiddenSpaces,
  onUnhideCampaign,
  onUnhideSpace,
}: SidebarHiddenFromSidebarDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open || !anchorRect || !menuRef.current) {
      setPos(null)
      return
    }
    const menuRect = menuRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const pad = 8
    let left = anchorRect.left
    let top = anchorRect.bottom + 6
    if (left < pad) left = pad
    if (left + menuRect.width > vw - pad) left = Math.max(pad, vw - menuRect.width - pad)
    setPos({ top, left })
  }, [open, anchorRect, hiddenCampaigns.length, hiddenSpaces.length])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open || !anchorRect || typeof document === 'undefined') return null

  const placedStyle = pos
    ? { top: pos.top, left: pos.left, visibility: 'visible' as const }
    : { top: -9999, left: -9999, visibility: 'hidden' as const }

  const headerCls =
    'px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]'

  return createPortal(
    <div
      ref={menuRef}
      data-sidebar-hidden-menu
      {...{ [HUB_DOCK_PORTAL_GUARD]: '' }}
      className="dropdown-menu-solid fixed z-[99999] w-[13.5rem] rounded-xl py-2 shadow-lg"
      style={placedStyle}
      role="menu"
    >
      <p className="body-3 px-2 pb-1 font-medium text-[var(--foreground)]">Hidden from sidebar</p>
      <div className="scrollbar-hide max-h-56 overflow-y-auto px-1">
        {hiddenCampaigns.length === 0 && hiddenSpaces.length === 0 ? (
          <p className="body-3 px-2 py-2 text-[var(--color-muted-foreground)]">Nothing hidden</p>
        ) : null}
        {hiddenCampaigns.length > 0 ? (
          <>
            <p className={headerCls}>Campaigns</p>
            {hiddenCampaigns.map((c) => {
              const iconColor = getIconColor(c.config.icon_color as string | undefined).textColor
              return (
                <button
                  key={c.id}
                  type="button"
                  className={ROW_CLS}
                  onClick={() => {
                    onUnhideCampaign(c.id)
                    onClose()
                  }}
                >
                  <LucideIcon name={c.icon} className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
                  <span className="min-w-0 flex-1 truncate" title={c.name}>{c.name}</span>
                </button>
              )
            })}
          </>
        ) : null}
        {hiddenSpaces.length > 0 ? (
          <>
            <p className={`${headerCls} ${hiddenCampaigns.length > 0 ? 'pt-2' : ''}`}>Spaces</p>
            {hiddenSpaces.map((s) => {
              const iconName =
                typeof s.schema?.icon === 'string' && s.schema.icon.length > 0
                  ? s.schema.icon
                  : 'layout-grid'
              const iconColor = getIconColor(s.schema?.icon_color).textColor
              return (
                <button
                  key={s.id}
                  type="button"
                  className={ROW_CLS}
                  onClick={() => {
                    onUnhideSpace(s.id)
                    onClose()
                  }}
                >
                  <LucideIcon name={iconName} className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
                  <span className="min-w-0 flex-1 truncate" title={s.title ?? 'Untitled'}>{s.title ?? 'Untitled'}</span>
                </button>
              )
            })}
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
