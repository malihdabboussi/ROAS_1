'use client'

import Link from 'next/link'
import { Rocket } from 'lucide-react'
import { AvatarDropdown } from '../AvatarDropdown'
import { SidebarCreditsHover } from '../SidebarCreditsHover'
import type { ManageRailItem } from './sidebar-types'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqRail({
  c,
  featureUpdates,
  visibleRailItems,
  clearSpacesFlyoutCloseTimer,
  closeHoverManageFlyout,
}: {
  c: SidebarControllerReturn
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
  visibleRailItems: ManageRailItem[]
  clearSpacesFlyoutCloseTimer: () => void
  closeHoverManageFlyout: () => void
}) {
  return (
    <div className="flex w-[72px] flex-shrink-0 items-stretch py-3 pl-2">
      <div className="card-glass flex w-full flex-col rounded-2xl">
        <div className="flex h-14 items-center justify-center pt-1">
          <Link
            href="/team"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
              c.setActiveManagePanel(null)
            }}
            className="cursor-pointer transition-opacity hover:opacity-80"
          >
            <img
              src="/Logos/logov2/icon-white.png"
              alt="Vibey"
              className="hidden h-10 w-10 dark:block"
            />
            <img src="/Logos/logov2/icon-black.png" alt="Vibey" className="h-10 w-10 dark:hidden" />
          </Link>
        </div>

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
                    c.setActiveManagePanel(null)
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
                <Link
                  key={item.id}
                  href={item.href ?? '/team'}
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
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    c.setIsPanelClosing(false)
                    c.setActiveManagePanel('team2')
                  }}
                  className="flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
                >
                  {iconSpan}
                  {labelSpan}
                </Link>
              )
            }
            if (item.type === 'panel' && item.panelId === 'brain') {
              return (
                <Link
                  key={item.id}
                  href={item.href ?? '/brain'}
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
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    c.setIsPanelClosing(false)
                    c.setActiveManagePanel('brain')
                  }}
                  className="flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
                >
                  {iconSpan}
                  {labelSpan}
                </Link>
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
                    e.preventDefault()
                    const alreadyOpen = c.activeManagePanel === item.panelId
                    if (alreadyOpen) {
                      c.setIsPanelClosing(true)
                    } else {
                      c.setIsPanelClosing(false)
                      c.setActiveManagePanel(item.panelId)
                    }
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

        <div className="flex flex-col items-center gap-2 py-2">
          {featureUpdates && (
            <button
              type="button"
              onClick={(e) => featureUpdates.onOpen(e.currentTarget)}
              className="group relative flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
            >
              <span className="relative flex items-center justify-center rounded-lg border border-transparent p-1.5 text-[var(--color-muted-foreground)] transition-all group-hover:text-[var(--color-foreground)]">
                <Rocket className="icon-md" />
                {featureUpdates.hasUnread && (
                  <span className="bg-primary absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-[var(--color-card)]" />
                )}
              </span>
              <span className="text-[10px] leading-tight text-[var(--color-muted-foreground)] transition-colors group-hover:text-[var(--color-foreground)]">
                Updates
              </span>
            </button>
          )}
          <SidebarCreditsHover variant="hq" hqTriggerLayout="rail" />
          <AvatarDropdown
            displayName={c.displayName}
            email={c.email ?? ''}
            avatarUrl={c.avatarUrl ?? null}
            initials={c.initials}
            sidebarCollapsed={true}
          />
        </div>
      </div>
    </div>
  )
}
