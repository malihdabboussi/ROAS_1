'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { surfaceFromPathname } from '@/components/global-chat/config/work-context.config'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { shellSidebarExpanded, useShellStore } from '@/components/shell/use-shell-store'
import { cn } from '@/lib/utils/cn'
import type { ManageRailItem } from './sidebar-types'
import { SidebarHqHubLogoButton } from './SidebarHqHubLogoButton'
import { SidebarHqHubMenuPane, type HubMenuPaneProps } from './SidebarHqHubMenu'
import { SidebarHqShellFooter } from './SidebarHqShellFooter'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqRail({
  c,
  featureUpdates,
  visibleRailItems,
  clearSpacesFlyoutCloseTimer,
  closeHoverManageFlyout,
  hubMenuProps,
}: {
  c: SidebarControllerReturn
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
  visibleRailItems: ManageRailItem[]
  clearSpacesFlyoutCloseTimer: () => void
  closeHoverManageFlyout: () => void
  hubMenuProps: HubMenuPaneProps
}) {
  const router = useRouter()
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const sidebarPinned = useShellStore((s) => s.sidebarPinned)
  const sidebarPeek = useShellStore((s) => s.sidebarPeek)
  const holdSidebarPeek = useShellStore((s) => s.holdSidebarPeek)
  const scheduleSidebarPeekClose = useShellStore((s) => s.scheduleSidebarPeekClose)
  const shellExpanded = shellSidebarExpanded({ sidebarPinned, sidebarPeek })

  useEffect(() => {
    if (shellExpanded) {
      if (!c.hubMenuOpen && !c.hubMenuClosing) c.openHubMenu()
      return
    }
    // Peek/pin end: close instantly — animated close thrash causes the glitchy pop.
    if (c.hubMenuOpen || c.hubMenuClosing) c.forceCloseHubMenu()
  }, [shellExpanded, c.hubMenuOpen, c.hubMenuClosing, c.openHubMenu, c.forceCloseHubMenu])

  const syncWorkContextForPath = (href: string) => {
    setWorkContext({ surface: surfaceFromPathname(href) })
  }

  const syncWorkContextForPanel = (panelId: 'projects' | 'spaces' | 'team2' | 'brain' | 'more') => {
    if (panelId === 'spaces') {
      setWorkContext({ surface: 'spaces' })
      return
    }
    if (panelId === 'brain') {
      setWorkContext({ surface: 'brain' })
      return
    }
    if (panelId === 'team2') {
      setWorkContext({ surface: 'team' })
      return
    }
    if (panelId === 'more') {
      setWorkContext({ surface: 'general' })
      return
    }
    setWorkContext({ surface: 'general' })
  }

  const pushIfNeeded = (href: string) => {
    if (c.pathname === href) return
    if (href !== '/' && c.pathname.startsWith(`${href}/`)) return
    router.push(href)
  }

  const closeHubIfOpen = () => {
    if (c.hubMenuOpen || c.hubMenuClosing) c.forceCloseHubMenu()
    useShellStore.getState().setSidebarPinned(false)
    useShellStore.getState().setSidebarPeek(false)
    useShellStore.getState().clearSidebarPeekClose()
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

  const isPeeking = sidebarPeek && !sidebarPinned
  const hubExpanded = c.hubMenuOpen || c.hubMenuClosing || shellExpanded

  return (
    <div
      className={cn(
        'hub-sidebar-shell box-border flex h-full min-h-0 shrink-0 flex-col transition-[width] duration-200 ease-out',
        hubExpanded ? 'hub-sidebar-shell-expanded' : 'hub-sidebar-shell-collapsed',
        // Hover peek pops over main content; pin stays in-flow.
        isPeeking && 'hub-sidebar-shell-peek',
      )}
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
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          hubExpanded ? 'bg-background shell-sidebar-panel' : 'card-glass rounded-2xl',
        )}
      >
        <div className="hub-sidebar-logo-header shrink-0">
          <SidebarHqHubLogoButton hubOpen={hubExpanded} onToggle={goHome} />
        </div>

        <div className="relative min-h-0 flex-1">
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
            <nav className="flex flex-1 flex-col items-center gap-0.5 px-0.5 py-2">
              {visibleRailItems.map((item) => {
                const isItemActive = (() => {
                  if (item.type === 'link') {
                    if (item.id === 'home') return c.pathname === item.href
                    return c.isActive(item.href)
                  }
                  if (item.type === 'panel') {
                    if (item.panelId === 'more') {
                      return (
                        c.pathname.startsWith('/projects') ||
                        c.pathname.startsWith('/flows') ||
                        c.pathname.startsWith('/artifacts')
                      )
                    }
                    if (item.panelId === 'spaces') {
                      return (
                        c.pathname.startsWith('/spaces') ||
                        c.pathname.startsWith('/campaigns') ||
                        c.pathname.startsWith('/programs')
                      )
                    }
                    if (item.panelId === 'team2') return c.pathname.startsWith('/team')
                    if (item.panelId === 'brain') return c.pathname.startsWith('/brain')
                  }
                  return false
                })()
                const iconSpan = (
                  <span
                    className={`flex items-center justify-center rounded-lg border border-transparent p-1.5 transition-all ${
                      isItemActive
                        ? 'nav-glass-selected-purple nav-glass-text-purple'
                        : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                    }`}
                  >
                    {item.icon}
                  </span>
                )
                const labelSpan = (
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
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
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
                      className="flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
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
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
                          return
                        setWorkContext({ surface: 'team' })
                        setCollapsed(true)
                        c.setActiveManagePanel(null)
                      }}
                      className="flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
                    >
                      {iconSpan}
                      {labelSpan}
                    </Link>
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
                        pushIfNeeded('/campaigns')
                        if (c.activeManagePanel === 'spaces' && !c.isPanelClosing) {
                          c.setIsPanelClosing(true)
                        }
                      }}
                      className="flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
                    >
                      {iconSpan}
                      {labelSpan}
                    </button>
                  )
                }
                if (item.type === 'panel' && item.panelId === 'team2') {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-hub-rail-trigger="team2"
                      onMouseEnter={() => {
                        clearSpacesFlyoutCloseTimer()
                        c.setIsPanelClosing(false)
                        c.setActiveManagePanel('team2')
                      }}
                      onFocus={() => {
                        clearSpacesFlyoutCloseTimer()
                        c.setIsPanelClosing(false)
                        c.setActiveManagePanel('team2')
                      }}
                      onClick={() => {
                        closeHubIfOpen()
                        syncWorkContextForPanel('team2')
                        setCollapsed(true)
                        c.setIsPanelClosing(false)
                        c.setActiveManagePanel('team2')
                        pushIfNeeded(item.href ?? '/team')
                      }}
                      className="flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
                    >
                      {iconSpan}
                      {labelSpan}
                    </button>
                  )
                }
                if (item.type === 'panel' && item.panelId === 'brain') {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-hub-rail-trigger="brain"
                      onMouseEnter={() => {
                        clearSpacesFlyoutCloseTimer()
                        c.setIsPanelClosing(false)
                        c.setActiveManagePanel('brain')
                      }}
                      onFocus={() => {
                        clearSpacesFlyoutCloseTimer()
                        c.setIsPanelClosing(false)
                        c.setActiveManagePanel('brain')
                      }}
                      onClick={() => {
                        closeHubIfOpen()
                        syncWorkContextForPanel('brain')
                        setCollapsed(true)
                        c.setIsPanelClosing(false)
                        c.setActiveManagePanel('brain')
                        pushIfNeeded(item.href ?? '/brain')
                      }}
                      className="flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
                    >
                      {iconSpan}
                      {labelSpan}
                    </button>
                  )
                }
                if (item.type === 'panel' && item.panelId === 'more') {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-hub-rail-trigger="more"
                      onMouseEnter={() => {
                        clearSpacesFlyoutCloseTimer()
                        c.setIsPanelClosing(false)
                        c.setActiveManagePanel('more')
                      }}
                      onFocus={() => {
                        clearSpacesFlyoutCloseTimer()
                        c.setIsPanelClosing(false)
                        c.setActiveManagePanel('more')
                      }}
                      onClick={() => {
                        closeHubIfOpen()
                        syncWorkContextForPanel('more')
                        setCollapsed(true)
                        c.setIsPanelClosing(false)
                        c.setActiveManagePanel('more')
                      }}
                      className="flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
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
          <div
            className={cn(
              'hub-sidebar-layer flex h-full min-w-0 flex-col',
              hubExpanded && 'hub-sidebar-layer-visible',
            )}
            aria-hidden={!hubExpanded}
          >
            {hubExpanded ? <SidebarHqHubMenuPane {...hubMenuProps} /> : null}
          </div>
        </div>
        <SidebarHqShellFooter
          c={c}
          expanded={hubExpanded}
          pathname={c.pathname}
          featureUpdates={featureUpdates}
          onChatHover={closeHoverManageFlyout}
        />
      </div>
    </div>
  )
}
