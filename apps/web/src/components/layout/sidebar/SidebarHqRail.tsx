'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { surfaceFromPathname } from '@/components/global-chat/config/work-context.config'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { cn } from '@/lib/utils/cn'
import { SidebarHqHubLogoButton } from './SidebarHqHubLogoButton'
import { SidebarHqHubMenuPane, type HubMenuPaneProps } from './SidebarHqHubMenu'
import { SidebarHqShellFooter } from './SidebarHqShellFooter'
import type { ManageRailItem } from './sidebar-types'
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

  const syncWorkContextForPath = (href: string) => {
    setWorkContext({ surface: surfaceFromPathname(href) })
  }

  const syncWorkContextForPanel = (panelId: 'projects' | 'spaces' | 'team2' | 'brain') => {
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
    setWorkContext({ surface: 'general' })
  }

  const pushIfNeeded = (href: string) => {
    if (c.pathname === href) return
    if (href !== '/' && c.pathname.startsWith(`${href}/`)) return
    router.push(href)
  }

  const closeHubIfOpen = () => {
    if (c.hubMenuOpen) c.closeHubMenu()
  }

  const toggleHubFromLogo = () => {
    closeHoverManageFlyout()
    c.toggleHubMenu()
  }

  const hubExpanded = c.hubMenuOpen || c.hubMenuClosing

  return (
    <div
      className={cn(
        'hub-sidebar-shell box-border flex h-full min-h-0 shrink-0 flex-col py-3 pl-2 transition-[width] duration-300 ease-out',
        c.hubMenuOpen || c.hubMenuClosing ? 'hub-sidebar-shell-expanded' : 'hub-sidebar-shell-collapsed',
      )}
    >
      <div className="card-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="hub-sidebar-logo-header shrink-0">
          <SidebarHqHubLogoButton
            hubOpen={c.hubMenuOpen}
            onToggle={toggleHubFromLogo}
          />
        </div>
        <div className="relative min-h-0 flex-1">
        <div
          className={cn(
            'hub-sidebar-layer flex h-full w-[72px] flex-col',
            !(c.hubMenuOpen || c.hubMenuClosing) && 'hub-sidebar-layer-visible',
          )}
          aria-hidden={c.hubMenuOpen || c.hubMenuClosing}
        >
        <nav className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2">
          {visibleRailItems.map((item) => {
            const isItemActive = (() => {
              if (item.type === 'link') {
                if (item.id === 'home') return c.pathname === item.href
                return c.isActive(item.href)
              }
              if (item.type === 'panel') {
                if (item.panelId === 'projects') return c.pathname.startsWith('/projects')
                if (item.panelId === 'spaces') return c.pathname.startsWith('/spaces')
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
                    ? 'text-[var(--color-foreground)]'
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
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    e.preventDefault()
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
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
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
                    pushIfNeeded('/spaces')
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
            if (item.type === 'panel') {
              const panelHref = c.sidebarProjects[0] ? `/projects/${c.sidebarProjects[0].id}` : null
              if (!panelHref) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const alreadyOpen = c.activeManagePanel === item.panelId
                      if (alreadyOpen) {
                        c.setIsPanelClosing(true)
                      } else {
                        syncWorkContextForPanel(item.panelId)
                        setCollapsed(true)
                        c.setIsPanelClosing(false)
                        c.setActiveManagePanel(item.panelId)
                      }
                    }}
                    className="flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
                  >
                    {iconSpan}
                    {labelSpan}
                  </button>
                )
              }
              return (
                <Link
                  key={item.id}
                  href={panelHref}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                    syncWorkContextForPanel(item.panelId)
                    const alreadyOpen = c.activeManagePanel === item.panelId
                    if (alreadyOpen) {
                      e.preventDefault()
                      c.setIsPanelClosing(true)
                      return
                    }
                    setCollapsed(true)
                    c.setIsPanelClosing(false)
                    c.setActiveManagePanel(item.panelId)
                  }}
                  className="flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
                >
                  {iconSpan}
                  {labelSpan}
                </Link>
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
