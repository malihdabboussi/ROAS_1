'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, X } from 'lucide-react'
import { useActiveShellMenuDock } from '@/components/shell/use-shell-menu-dock'
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
  /** Natural-height primary flyout aligned to its trigger instead of filling the viewport. */
  compact?: boolean
  /** Omit the title header (e.g. account card that brings its own chrome). */
  hideHeader?: boolean
  /** Fixed panel width; long names truncate instead of growing the flyout. */
  fixedWidth?: boolean
  /** Force the panel to open to the trigger's right, independent of a saved dock preference. */
  placement?: 'dock-aware' | 'right'
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
    // A rail trigger owns the next flyout state. Let it replace this flyout
    // instead of racing the document-level outside-click close.
    target.closest('[data-hub-rail-trigger]') ||
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
  compact = false,
  hideHeader = false,
  fixedWidth = false,
  placement = 'dock-aware',
  headerActions,
  searchOpen,
  searchQuery,
  onSearchQueryChange,
  onSearchClose,
  searchPlaceholder = 'Search…',
  searchInputRef,
  children,
}: HubDockFlyoutProps) {
  const menuDock = useActiveShellMenuDock()
  const rootRef = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(anchor.top)
  const [left, setLeft] = useState(anchor.right + offsetPx)

  const reposition = useCallback(() => {
    const el = rootRef.current
    const width = el?.offsetWidth ?? 360
    const height = el?.offsetHeight ?? 0
    const maxLeft = Math.max(8, window.innerWidth - width - 8)
    const maxTop =
      height > 0
        ? Math.max(8, window.innerHeight - height - 8)
        : Math.max(8, window.innerHeight - 48)

    if (placement === 'dock-aware' && !nested && (menuDock === 'work-top' || menuDock === 'work-bottom')) {
      setLeft(Math.min(Math.max(8, anchor.left), maxLeft))
      setTop(
        menuDock === 'work-top'
          ? Math.min(anchor.bottom + offsetPx, maxTop)
          : Math.max(8, anchor.top - height - offsetPx),
      )
      return
    }

    if (!nested && !compact) {
      setTop(52)
      setLeft(
        placement === 'dock-aware' && menuDock === 'work-right'
          ? Math.max(8, anchor.left - width - offsetPx)
          : Math.min(anchor.right + offsetPx, maxLeft),
      )
      return
    }
    const nextTop = Math.min(Math.max(8, anchor.top), maxTop)
    let nextLeft =
      placement === 'dock-aware' && !nested && menuDock === 'work-right'
        ? Math.max(8, anchor.left - width - offsetPx)
        : anchor.right + offsetPx
    if (nextLeft > maxLeft) nextLeft = maxLeft
    setTop(nextTop)
    setLeft(nextLeft)
  }, [anchor.bottom, anchor.left, anchor.right, anchor.top, compact, menuDock, nested, offsetPx, placement])

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
      data-shell-menu-dock={menuDock}
      className={cn(
        'hub-dock-flyout',
        !nested && !compact && 'hub-dock-flyout-viewport',
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
      {!hideHeader ? (
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
      ) : null}

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
