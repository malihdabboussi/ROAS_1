'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, type CSSProperties } from 'react'
import { ChevronRight } from 'lucide-react'
import { surfaceFromPathname } from '@/components/global-chat/config/work-context.config'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useActiveShellMenuDock, useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { shellSidebarExpanded, useShellStore } from '@/components/shell/use-shell-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { cn } from '@/lib/utils/cn'
import {
  isManageRailItemActive,
  shouldPushRailHref,
  workContextSurfaceForPanel,
} from './sidebar-hq-rail.helpers'
import type { ManagePanelId, ManageRailItem } from './sidebar-types'
import { SidebarHqHubLogoButton } from './SidebarHqHubLogoButton'
import { useOpenDelegationDesk } from './use-open-delegation-desk'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqRail({
  c,
  visibleRailItems,
  clearSpacesFlyoutCloseTimer,
  closeHoverManageFlyout,
}: {
  c: SidebarControllerReturn
  visibleRailItems: ManageRailItem[]
  clearSpacesFlyoutCloseTimer: () => void
  closeHoverManageFlyout: () => void
}) {
  const router = useRouter()
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const sidebarPinned = useShellStore((s) => s.sidebarPinned)
  const sidebarPeek = useShellStore((s) => s.sidebarPeek)
  const holdSidebarPeek = useShellStore((s) => s.holdSidebarPeek)
  const scheduleSidebarPeekClose = useShellStore((s) => s.scheduleSidebarPeekClose)
  const setSidebarPinned = useShellStore((s) => s.setSidebarPinned)
  const menuDock = useActiveShellMenuDock()
  const menuCompact = useShellMenuDock((state) => state.menuCompact)
  const dragging = useShellMenuDock((state) => state.dragging)
  const lift = useShellMenuDock((state) => state.lift)
  const setMenuCompact = useShellMenuDock((state) => state.setMenuCompact)
  const shellExpanded = shellSidebarExpanded({ sidebarPinned, sidebarPeek })
  const lifting = dragging && lift !== null
  useEffect(() => {
    setSidebarPinned(false)
    if (c.hubMenuOpen || c.hubMenuClosing) c.forceCloseHubMenu()
  }, [c.hubMenuOpen, c.hubMenuClosing, c.forceCloseHubMenu, setSidebarPinned])
  useEffect(() => {
    if (shellExpanded && (c.hubMenuOpen || c.hubMenuClosing)) c.forceCloseHubMenu()
  }, [shellExpanded, c.hubMenuOpen, c.hubMenuClosing, c.forceCloseHubMenu])
  const syncWorkContextForPath = (href: string) => {
    if (useChatStore.getState().activeConversationId) return
    setWorkContext({ surface: surfaceFromPathname(href) })
  }
  const syncWorkContextForPanel = (panelId: ManagePanelId) => {
    if (useChatStore.getState().activeConversationId) return
    setWorkContext({ surface: workContextSurfaceForPanel(panelId) })
  }
  const pushIfNeeded = (href: string) => {
    if (shouldPushRailHref(c.pathname, href)) router.push(href)
  }
  const openDelegationDesk = useOpenDelegationDesk({
    router,
    sidebarSpaces: c.sidebarLists,
    onClose: closeHoverManageFlyout,
  })
  const closeHubIfOpen = () => {
    if (c.hubMenuOpen || c.hubMenuClosing) c.forceCloseHubMenu()
    const shell = useShellStore.getState()
    // setSidebarPinned broadcasts a global flyout-close epoch. Only call it for
    // a real pin transition or it will cancel the rail flyout being opened by
    // this same gesture.
    if (shell.sidebarPinned) shell.setSidebarPinned(false)
    if (shell.sidebarPeek) shell.setSidebarPeek(false)
    shell.clearSidebarPeekClose()
  }
  /** Home always clears chat query params so the dashboard shows. */
  const goHome = () => {
    closeHoverManageFlyout()
    closeHubIfOpen()
    syncWorkContextForPath('/home')
    setCollapsed(true)
    c.setActiveManagePanel(null)
    router.push('/home')
  }
  const isPeeking = false
  // Icon rail only — expanded hub menu is retired.
  const hubExpanded = false
  const iconOnlyDock = menuDock === 'work-top' || menuDock === 'work-bottom'
  // Pointer-follow geometry for the lifted rail (not a color — dock drag exception).
  const liftStyle =
    lifting && lift
      ? ({
          '--shell-menu-lift-left': `${lift.left}px`,
          '--shell-menu-lift-top': `${lift.top}px`,
          '--shell-menu-lift-width': `${lift.width}px`,
          '--shell-menu-lift-height': `${lift.height}px`,
        } as CSSProperties)
      : undefined
  return (
    <div
      className={cn(
        'shell-menu-dock-rail-lift-root',
        !lifting && 'h-full',
        lifting && 'shell-menu-dock-rail-lift-root-active',
      )}
      style={
        lifting && lift
          ? ({
              width: lift.width,
              height: lift.height,
            } as CSSProperties)
          : undefined
      }
    >
      <div
        data-shell-menu-dock={menuDock}
        data-shell-menu-dock-dragging={dragging ? 'true' : undefined}
        className={cn(
          'hub-sidebar-shell relative box-border flex h-full min-h-0 shrink-0 flex-col transition-[width] duration-200 ease-out',
          hubExpanded ? 'hub-sidebar-shell-expanded' : 'hub-sidebar-shell-collapsed',
          // Hover peek pops over main content; pin stays in-flow.
          isPeeking && 'hub-sidebar-shell-peek',
          lifting && 'shell-menu-dock-lifting',
        )}
        style={liftStyle}
        onMouseEnter={() => {
          // Only hold an existing peek — rail hover must not expand the sidebar.
          if (!sidebarPinned && sidebarPeek) holdSidebarPeek()
        }}
        onMouseLeave={() => {
          if (!sidebarPinned) scheduleSidebarPeekClose()
        }}
      >
        <div
          className={cn(
            'hub-sidebar-rail-layout flex min-h-0 flex-1 flex-col overflow-visible',
            // Same gray glass chrome as the vertical HQ rail.
            hubExpanded ? 'bg-background shell-sidebar-panel' : 'card-glass rounded-2xl',
          )}
        >
          <div className="hub-sidebar-logo-header relative shrink-0">
            <SidebarHqHubLogoButton expanded={!menuCompact} />
          </div>

          {!menuCompact ? (
            <>
              <div className="hub-sidebar-rail-body relative min-h-0 flex-1 overflow-hidden">
                <div
                  className={cn(
                    'hub-sidebar-layer flex h-full w-full flex-col',
                    // Keep rail/menu mutual exclusion on the same signal as shell width
                    // (hubExpanded). hubMenuOpen alone lags pin/peek by a frame and can
                    // flash both layers — Chat menu crushed beside the icon rail.
                    !hubExpanded && 'hub-sidebar-layer-visible',
                  )}
                  aria-hidden={hubExpanded}
                >
                  <nav className="hub-sidebar-rail-nav flex flex-1 flex-col items-center gap-0.5 px-0.5 pb-2 pt-0">
                    {visibleRailItems.map((item) => {
                      const isItemActive = isManageRailItemActive(item, c.pathname, c.isActive)
                      const railItemClass = iconOnlyDock
                        ? 'flex w-full flex-col items-center gap-0 px-0.5 py-1 transition-all'
                        : 'flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all'
                      const iconSpan = (
                        <span
                          className={cn(
                            'flex items-center justify-center rounded-lg border border-transparent transition-all',
                            iconOnlyDock ? 'p-1' : 'p-1.5',
                            isItemActive
                              ? 'nav-glass-selected-purple nav-glass-text-purple'
                              : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                          )}
                        >
                          {item.icon}
                        </span>
                      )
                      const labelSpan = iconOnlyDock ? null : (
                        <span
                          className={`text-[10px] leading-tight transition-colors ${
                            isItemActive
                              ? 'nav-glass-text-purple'
                              : 'text-[var(--color-muted-foreground)]'
                          }`}
                        >
                          {item.label}
                        </span>
                      )

                      if (item.type === 'link') {
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onMouseEnter={closeHoverManageFlyout}
                            onFocus={closeHoverManageFlyout}
                            onClick={(e) => {
                              if (
                                e.metaKey ||
                                e.ctrlKey ||
                                e.shiftKey ||
                                e.altKey ||
                                e.button !== 0
                              )
                                return
                              e.preventDefault()
                              if (item.id === 'home') {
                                goHome()
                                return
                              }
                              closeHubIfOpen()
                              syncWorkContextForPath(item.href)
                              c.setActiveManagePanel(null)
                              setCollapsed(true)
                              pushIfNeeded(item.href)
                            }}
                            className={railItemClass}
                            aria-label={item.label}
                            title={item.label}
                          >
                            {iconSpan}
                            {labelSpan}
                          </Link>
                        )
                      }

                      if (item.type === 'mode-switch') {
                        return (
                          <Link
                            key={item.id}
                            href="/team"
                            onMouseEnter={closeHoverManageFlyout}
                            onFocus={closeHoverManageFlyout}
                            onClick={(e) => {
                              if (
                                e.metaKey ||
                                e.ctrlKey ||
                                e.shiftKey ||
                                e.altKey ||
                                e.button !== 0
                              )
                                return
                              if (!useChatStore.getState().activeConversationId) {
                                setWorkContext({ surface: 'team' })
                              }
                              setCollapsed(true)
                              c.setActiveManagePanel(null)
                            }}
                            className={railItemClass}
                            aria-label={item.label}
                            title={item.label}
                          >
                            {iconSpan}
                            {labelSpan}
                          </Link>
                        )
                      }
                      if (item.type === 'delegation') {
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onMouseEnter={closeHoverManageFlyout}
                            onFocus={closeHoverManageFlyout}
                            onClick={() => void openDelegationDesk()}
                            className={railItemClass}
                            aria-label={item.label}
                            title={item.label}
                          >
                            {iconSpan}
                            {labelSpan}
                          </button>
                        )
                      }
                      if (item.type === 'panel' && item.panelId === 'favorites') {
                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-hub-rail-trigger="favorites"
                            onMouseEnter={() => {
                              clearSpacesFlyoutCloseTimer()
                              c.setIsPanelClosing(false)
                              c.setActiveManagePanel('favorites')
                            }}
                            onFocus={() => {
                              clearSpacesFlyoutCloseTimer()
                              c.setIsPanelClosing(false)
                              c.setActiveManagePanel('favorites')
                            }}
                            onClick={() => {
                              closeHubIfOpen()
                              setCollapsed(true)
                              c.setIsPanelClosing(false)
                              c.setActiveManagePanel('favorites')
                            }}
                            className={railItemClass}
                            aria-label={item.label}
                            title={item.label}
                          >
                            {iconSpan}
                            {labelSpan}
                          </button>
                        )
                      }
                      if (item.type === 'panel' && item.panelId === 'spaces') {
                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-hub-rail-trigger="spaces"
                            onMouseEnter={() => {
                              clearSpacesFlyoutCloseTimer()
                              c.setIsPanelClosing(false)
                              c.setActiveManagePanel('spaces')
                            }}
                            onFocus={() => {
                              clearSpacesFlyoutCloseTimer()
                              c.setIsPanelClosing(false)
                              c.setActiveManagePanel('spaces')
                            }}
                            onClick={() => {
                              closeHubIfOpen()
                              syncWorkContextForPanel('spaces')
                              setCollapsed(true)
                              pushIfNeeded('/programs')
                              if (c.activeManagePanel === 'spaces' && !c.isPanelClosing) {
                                c.setIsPanelClosing(true)
                              }
                            }}
                            className={railItemClass}
                            aria-label={item.label}
                            title={item.label}
                          >
                            {iconSpan}
                            {labelSpan}
                          </button>
                        )
                      }

                      // Direct panel destinations keep their hover flyout and navigate on click.
                      // Projects has no index route, so it intentionally opens only its flyout.
                      if (item.type === 'panel') {
                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-hub-rail-trigger={item.panelId}
                            onMouseEnter={() => {
                              clearSpacesFlyoutCloseTimer()
                              c.setIsPanelClosing(false)
                              c.setActiveManagePanel(item.panelId)
                            }}
                            onFocus={() => {
                              clearSpacesFlyoutCloseTimer()
                              c.setIsPanelClosing(false)
                              c.setActiveManagePanel(item.panelId)
                            }}
                            onClick={() => {
                              closeHubIfOpen()
                              syncWorkContextForPanel(item.panelId)
                              setCollapsed(true)
                              c.setIsPanelClosing(false)
                              c.setActiveManagePanel(item.panelId)
                              if (item.href) pushIfNeeded(item.href)
                            }}
                            className={railItemClass}
                            aria-label={item.label}
                            title={item.label}
                          >
                            {iconSpan}
                            {labelSpan}
                          </button>
                        )
                      }
                      return null
                    })}
                  </nav>
                </div>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setMenuCompact(false)}
              className="nav-glass-text-purple p-spacing-2 hover:text-foreground mt-auto flex w-full items-center justify-center transition-colors"
              aria-label="Expand menu"
              title="Expand menu"
            >
              <ChevronRight className="icon-sm rotate-90" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
