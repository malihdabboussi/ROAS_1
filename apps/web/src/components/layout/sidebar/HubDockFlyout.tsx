'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, X } from 'lucide-react'
import { HUB_DOCK_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { cn } from '@/lib/utils/cn'

/** Primary dock leave grace (trigger ↔ flyout). */
export const HUB_DOCK_FLYOUT_LEAVE_MS = 350
/** Nested dock leave grace (campaign ↔ spaces / Projects ↔ list). */
export const HUB_DOCK_SUB_FLYOUT_LEAVE_MS = 400
/** Visual gap from trigger; hover bridge covers this. */
export const HUB_DOCK_FLYOUT_OFFSET_PX = 2
/** Nested docks flush to the row — bridge covers any subpixel gap. */
export const HUB_DOCK_SUB_FLYOUT_OFFSET_PX = 0

export type HubDockFlyoutHeaderAction = {
  kind: 'search' | 'plus'
  title: string
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
}

type HubDockFlyoutProps = {
  anchor: DOMRect
  title: string
  onClose: () => void
  onEnter: () => void
  onLeave: () => void
  /** When true, leave timers are ignored until content click or explicit close. */
  pinned?: boolean
  onPinnedChange?: (pinned: boolean) => void
  /** Suspend leave while a nested flyout is open (Programs → create menus). */
  leaveSuspended?: boolean
  /** Gap from trigger right edge. Primary = 2, nested = 0. */
  offsetPx?: number
  nested?: boolean
  /** Fixed panel width; long names truncate instead of growing the flyout. */
  fixedWidth?: boolean
  headerActions?: HubDockFlyoutHeaderAction[]
  searchOpen?: boolean
  searchQuery?: string
  onSearchQueryChange?: (value: string) => void
  onSearchClose?: () => void
  searchPlaceholder?: string
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  children: ReactNode
}

function isHubDockFlyoutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest('[data-hub-dock-flyout]') ||
    target.closest(`[${HUB_DOCK_PORTAL_GUARD}]`) ||
    // Modals / Radix portals hosted from flyout children (Share, settings, delete confirm).
    target.closest('[data-radix-portal]') ||
    target.closest('[role="dialog"]'),
  )
}

/**
 * Shared HQ submenu flyout for collapsed rail and expanded menu.
 * Fixed to the trigger: offsetPx right, top-aligned (clamped to viewport).
 * Left hover bridge keeps pointer continuity across the trigger gap.
 */
export function HubDockFlyout({
  anchor,
  title,
  onClose,
  onEnter,
  onLeave,
  pinned = false,
  onPinnedChange,
  leaveSuspended = false,
  offsetPx = HUB_DOCK_FLYOUT_OFFSET_PX,
  nested = false,
  fixedWidth = false,
  headerActions,
  searchOpen,
  searchQuery,
  onSearchQueryChange,
  onSearchClose,
  searchPlaceholder = 'Search…',
  searchInputRef,
  children,
}: HubDockFlyoutProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(anchor.top)
  const [left, setLeft] = useState(anchor.right + offsetPx)

  const reposition = useCallback(() => {
    const el = rootRef.current
    const height = el?.offsetHeight ?? 0
    const maxTop =
      height > 0
        ? Math.max(8, window.innerHeight - height - 8)
        : Math.max(8, window.innerHeight - 48)
    const nextTop = Math.min(Math.max(8, anchor.top), maxTop)
    let nextLeft = anchor.right + offsetPx
    const width = el?.offsetWidth ?? 240
    const maxLeft = Math.max(8, window.innerWidth - width - 8)
    if (nextLeft > maxLeft) nextLeft = maxLeft
    setTop(nextTop)
    setLeft(nextLeft)
  }, [anchor.right, anchor.top, offsetPx])

  useLayoutEffect(() => {
    reposition()
  }, [reposition, children, searchOpen, title])

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => reposition())
    ro.observe(el)
    return () => ro.disconnect()
  }, [reposition])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      // Portaled dock menus live under document.body, not inside the flyout node.
      if (isHubDockFlyoutTarget(target)) return
      onPinnedChange?.(false)
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose, onPinnedChange])

  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      // Keep open for header chrome / search field.
      if (target.closest('[data-hub-dock-keep-open]')) return
      if (target.closest('a, button[data-hub-dock-navigate]')) {
        onPinnedChange?.(false)
        onClose()
      }
    },
    [onClose, onPinnedChange],
  )

  return createPortal(
    <div
      ref={rootRef}
      data-hub-dock-flyout
      data-hub-dock-flyout-nested={nested ? '' : undefined}
      className={cn(
        'hub-dock-flyout',
        nested && 'hub-dock-flyout-nested',
        fixedWidth && 'hub-dock-flyout-fixed',
      )}
      style={{ top, left }}
      onMouseEnter={() => {
        onEnter()
      }}
      onMouseLeave={(e) => {
        if (pinned || leaveSuspended) return
        // Moving into another dock flyout (nested/parent) is not a leave.
        if (isHubDockFlyoutTarget(e.relatedTarget)) return
        onLeave()
      }}
      onMouseDown={() => {
        // Clicking the flyout shell pins it open until a navigate/close.
        if (!pinned) onPinnedChange?.(true)
      }}
      onClick={handleContentClick}
    >
      <div className="hub-dock-flyout-header" data-hub-dock-keep-open>
        <p className="hub-dock-flyout-title">{title}</p>
        {headerActions && headerActions.length > 0 ? (
          <div className="hub-dock-flyout-header-actions">
            {headerActions.map((action) => (
              <button
                key={action.kind}
                type="button"
                title={action.title}
                aria-label={action.title}
                data-hub-dock-keep-open
                onClick={(e) => {
                  e.stopPropagation()
                  action.onClick(e)
                }}
                className={cn(
                  'hub-dock-flyout-header-btn',
                  action.kind === 'plus' && 'hub-dock-flyout-header-btn-plus',
                )}
              >
                {action.kind === 'search' ? <Search /> : <Plus />}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {searchOpen ? (
        <div className="hub-dock-flyout-search relative" data-hub-dock-keep-open>
          <Search
            className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            aria-hidden
          />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery ?? ''}
            onChange={(e) => onSearchQueryChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onSearchClose?.()
            }}
            placeholder={searchPlaceholder}
            autoFocus
          />
          <button
            type="button"
            title="Close search"
            aria-label="Close search"
            data-hub-dock-keep-open
            onClick={(e) => {
              e.stopPropagation()
              onSearchClose?.()
            }}
            className="hub-dock-flyout-header-btn absolute right-1 top-1/2 -translate-y-1/2"
          >
            <X />
          </button>
        </div>
      ) : null}

      <div className="hub-dock-flyout-body">{children}</div>
    </div>,
    document.body,
  )
}
