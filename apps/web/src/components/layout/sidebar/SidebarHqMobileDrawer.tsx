'use client'

import Link from 'next/link'
import { Suspense, type Dispatch, type SetStateAction } from 'react'
import { ListChecks, Plus, Rocket } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { AvatarDropdown } from '../AvatarDropdown'
import { SidebarCreditsHover } from '../SidebarCreditsHover'
import { SIDEBAR_MESSAGES } from '../config/sidebar-messages.config'
import type { ManageRailItem } from './sidebar-types'
import { SidebarBrainNavLinks } from './SidebarBrainFlyout'
import type { SidebarControllerReturn } from './useSidebarController'

const mobileHiddenRailItemIds = new Set(['projects', 'flows'])

export function SidebarHqMobileDrawer({
  c,
  featureUpdates,
  visibleRailItems,
  mobileListsOpen,
  setMobileListsOpen,
  mobileBrainsOpen,
  setMobileBrainsOpen,
}: {
  c: SidebarControllerReturn
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
  visibleRailItems: ManageRailItem[]
  mobileListsOpen: boolean
  setMobileListsOpen: Dispatch<SetStateAction<boolean>>
  mobileBrainsOpen: boolean
  setMobileBrainsOpen: Dispatch<SetStateAction<boolean>>
}) {
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)

  return (
    <nav className="scrollbar-hide flex flex-1 flex-col overflow-hidden px-3 py-2">
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {visibleRailItems
          .filter((item) => !mobileHiddenRailItemIds.has(item.id))
          .map((item) => {
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
            const sharedClassName = `nav-glass-hover-purple flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              isItemActive
                ? 'nav-glass-selected-purple nav-glass-text-purple'
                : 'text-[var(--color-muted-foreground)]'
            }`
            const content = (
              <>
                {item.icon}
                <span className="body-3">{item.label}</span>
              </>
            )

            if (item.type === 'link') {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => c.setMobileDrawerOpen(false)}
                  className={sharedClassName}
                >
                  {content}
                </Link>
              )
            }

            if (item.type === 'mode-switch') {
              return (
                <Link
                  key={item.id}
                  href="/team"
                  onClick={() => c.setMobileDrawerOpen(false)}
                  className={sharedClassName}
                >
                  {content}
                </Link>
              )
            }
            if (item.type === 'panel' && item.panelId === 'spaces') {
              return (
                <div key={item.id} className="w-full space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!mobileListsOpen) void c.reloadSidebarLists()
                      setMobileListsOpen((v) => !v)
                    }}
                    className={sharedClassName}
                  >
                    {content}
                  </button>
                  {mobileListsOpen && (
                    <div className="ml-3 space-y-0.5 border-l border-[var(--color-border)] pl-2">
                      <button
                        type="button"
                        onClick={() => c.setIsCreatingList(true)}
                        className="nav-glass-hover-purple flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[var(--color-muted-foreground)] transition-all"
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        <span className="body-3 truncate">New Space</span>
                      </button>
                      {c.isCreatingList && (
                        <div className="flex items-center gap-1.5 px-2 py-1">
                          <input
                            value={c.newListName}
                            onChange={(e) => c.setNewListName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void c.handleCreateList()
                              if (e.key === 'Escape') {
                                c.setIsCreatingList(false)
                                c.setNewListName('')
                              }
                            }}
                            onBlur={() => {
                              if (!c.newListName.trim()) {
                                c.setIsCreatingList(false)
                                c.setNewListName('')
                              }
                            }}
                            disabled={c.isSubmittingList}
                            autoFocus
                            placeholder={c.isSubmittingList ? 'Creating…' : 'Space name'}
                            className="h-7 flex-1 rounded-md bg-transparent px-2 text-[13px] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      )}
                      {c.sidebarListsLoading ? (
                        <div className="flex justify-center px-2 py-4">
                          <VibeyLoadingOrb state="processing" size="sm" text="Loading spaces..." />
                        </div>
                      ) : c.sidebarLists.length === 0 ? (
                        <p className="body-3 px-3 py-2 text-center text-[var(--color-muted-foreground)]">
                          No spaces yet
                        </p>
                      ) : (
                        c.sidebarLists.map((list) => {
                          const isActiveSpace =
                            c.pathname.startsWith('/spaces') && activeSpaceId === list.id
                          return (
                            <Link
                              key={list.id}
                              href="/spaces"
                              onClick={() => {
                                useSpacesStore.getState().setActiveSpace(list.id)
                                c.setMobileDrawerOpen(false)
                              }}
                              className={`rounded-spacing-2 hover:bg-hover-subtle flex w-full items-center gap-2 px-3 py-1 transition-colors ${
                                isActiveSpace
                                  ? 'nav-glass-selected-purple nav-glass-text-purple'
                                  : 'text-[var(--color-muted-foreground)]'
                              }`}
                            >
                              <ListChecks className="h-4 w-4 shrink-0" />
                              <span className="body-3 truncate">{list.title}</span>
                            </Link>
                          )
                        })
                      )}
                      {c.sidebarListsHasMore ? (
                        <button
                          type="button"
                          onClick={() => void c.loadMoreSidebarLists()}
                          disabled={c.sidebarListsLoadingMore}
                          className="nav-glass-hover-purple flex w-full items-center justify-center rounded-lg px-3 py-2 text-[var(--color-muted-foreground)] transition-all disabled:opacity-60"
                        >
                          <span className="body-3 truncate">
                            {c.sidebarListsLoadingMore
                              ? SIDEBAR_MESSAGES.LOADING_MORE_SPACES.message
                              : SIDEBAR_MESSAGES.LOAD_MORE_SPACES.message}
                          </span>
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            }
            if (item.type === 'panel' && item.panelId === 'brain') {
              return (
                <div key={item.id} className="w-full space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setMobileBrainsOpen((v) => !v)}
                    className={sharedClassName}
                  >
                    {content}
                  </button>
                  {mobileBrainsOpen && (
                    <div className="ml-3 space-y-0.5 border-l border-[var(--color-border)] pl-2">
                      <Suspense
                        fallback={
                          <p className="body-3 px-3 py-2 text-[var(--color-muted-foreground)]">
                            Loading…
                          </p>
                        }
                      >
                        <SidebarBrainNavLinks onNavigate={() => c.setMobileDrawerOpen(false)} />
                      </Suspense>
                    </div>
                  )}
                </div>
              )
            }
            if (item.type === 'panel') {
              const panelHref = c.sidebarProjects[0] ? `/projects/${c.sidebarProjects[0].id}` : null
              if (!panelHref) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => c.setMobileDrawerOpen(false)}
                    className={sharedClassName}
                  >
                    {content}
                  </button>
                )
              }
              return (
                <Link
                  key={item.id}
                  href={panelHref}
                  onClick={() => c.setMobileDrawerOpen(false)}
                  className={sharedClassName}
                >
                  {content}
                </Link>
              )
            }
            return null
          })}
      </div>
      <div className="mt-2 shrink-0 space-y-2 border-t border-[var(--color-border)] pt-2">
        {featureUpdates && (
          <button
            type="button"
            onClick={(e) => featureUpdates.onOpen(e.currentTarget)}
            className="nav-glass-hover-purple relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[var(--color-muted-foreground)] transition-all"
          >
            <Rocket className="icon-md" />
            <span className="body-3">Updates</span>
            {featureUpdates.hasUnread && (
              <span className="bg-primary ml-auto h-2 w-2 shrink-0 rounded-full" />
            )}
          </button>
        )}
        <div className="gap-spacing-2 flex items-center justify-between px-3 py-1">
          <div className="flex h-9 shrink-0 items-center">
            <AvatarDropdown
              displayName={c.displayName}
              email={c.email ?? ''}
              avatarUrl={c.avatarUrl ?? null}
              initials={c.initials}
              sidebarCollapsed={false}
            />
          </div>
          <SidebarCreditsHover variant="hq" hqTriggerLayout="row" />
        </div>
      </div>
    </nav>
  )
}
