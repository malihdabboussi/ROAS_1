'use client'

import {
  Suspense,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react'
import { Eye, Plus, Search, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { SidebarBrainFlyout } from './SidebarBrainFlyout'
import { SidebarHqProjectList } from './SidebarHqProjectList'
import { SidebarHqSpacesGroupedList } from './SidebarHqSpacesGroupedList'
import { SidebarTeam2Flyout } from './SidebarTeam2Flyout'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqFlyouts({
  placement = 'all',
  c,
  spacesSearchOpen,
  setSpacesSearchOpen,
  spacesSearchQuery,
  setSpacesSearchQuery,
  spacesSearchInputRef,
  hiddenSidebarCount,
  hiddenEyeRef,
  hiddenMenuOpen,
  setHiddenMenuOpen,
  openHiddenMenu,
  clearSpacesFlyoutCloseTimer,
  scheduleSpacesFlyoutClose,
  setBrowsePanelBucket,
  setCreateSpaceModalFor,
  spaceUserState,
}: {
  placement?: 'all' | 'inline' | 'hover'
  c: SidebarControllerReturn
  spacesSearchOpen: boolean
  setSpacesSearchOpen: Dispatch<SetStateAction<boolean>>
  spacesSearchQuery: string
  setSpacesSearchQuery: Dispatch<SetStateAction<string>>
  spacesSearchInputRef: RefObject<HTMLInputElement | null>
  hiddenSidebarCount: number
  hiddenEyeRef: RefObject<HTMLButtonElement | null>
  hiddenMenuOpen: boolean
  setHiddenMenuOpen: Dispatch<SetStateAction<boolean>>
  openHiddenMenu: () => void
  clearSpacesFlyoutCloseTimer: () => void
  scheduleSpacesFlyoutClose: () => void
  setBrowsePanelBucket: Dispatch<SetStateAction<string | null>>
  setCreateSpaceModalFor: Dispatch<SetStateAction<{ campaignId: string | null } | null>>
  spaceUserState: ReturnType<typeof useSpaceUserState>
}) {
  const showInline = placement === 'all' || placement === 'inline'
  const showHover = (placement === 'all' || placement === 'hover') && !c.hubMenuOpen

  return (
    <>
      {showInline &&
        c.activeManagePanel &&
        c.activeManagePanel !== 'spaces' &&
        c.activeManagePanel !== 'team2' &&
        c.activeManagePanel !== 'brain' && (
          <InlineManageFlyoutPanel isPanelClosing={c.isPanelClosing}>
            {c.activeManagePanel === 'projects' && (
              <>
                <div className="flex items-center justify-between px-3 py-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Projects
                  </span>
                  {!c.isCreatingProject && (
                    <button
                      onClick={() => c.setIsCreatingProject(true)}
                      className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                      title="New Project"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {c.isCreatingProject && (
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <input
                      value={c.newProjectName}
                      onChange={(e) => c.setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void c.handleCreateProject()
                        if (e.key === 'Escape') {
                          c.setIsCreatingProject(false)
                          c.setNewProjectName('')
                        }
                      }}
                      onBlur={() => {
                        if (!c.newProjectName.trim()) {
                          c.setIsCreatingProject(false)
                          c.setNewProjectName('')
                        }
                      }}
                      disabled={c.isSubmittingProject}
                      autoFocus
                      placeholder={c.isSubmittingProject ? 'Creating...' : 'Project name'}
                      className="h-7 flex-1 rounded-md bg-transparent px-2 text-[13px] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none disabled:opacity-50"
                    />
                  </div>
                )}
                <div className="scrollbar-hide flex-1 overflow-y-auto px-2 py-2">
                  {c.sidebarProjects.length === 0 ? (
                    <p className="px-2 py-4 text-center text-[11px] text-[var(--color-muted-foreground)]">
                      No projects yet
                    </p>
                  ) : (
                    <SidebarHqProjectList
                      projects={c.sidebarProjects}
                      setSidebarProjects={c.setSidebarProjects}
                      pathname={c.pathname}
                    />
                  )}
                </div>
              </>
            )}
          </InlineManageFlyoutPanel>
        )}
      {showHover && c.activeManagePanel === 'team2' && (
        <HoverPanel
          c={c}
          onMouseEnter={clearSpacesFlyoutCloseTimer}
          onMouseLeave={scheduleSpacesFlyoutClose}
        >
          <SidebarTeam2Flyout pathname={c.pathname} />
        </HoverPanel>
      )}
      {showHover && c.activeManagePanel === 'brain' && (
        <HoverPanel
          c={c}
          onMouseEnter={clearSpacesFlyoutCloseTimer}
          onMouseLeave={scheduleSpacesFlyoutClose}
        >
          <Suspense
            fallback={
              <p className="body-3 px-3 py-6 text-center text-[var(--color-muted-foreground)]">
                Loading…
              </p>
            }
          >
            <SidebarBrainFlyout />
          </Suspense>
        </HoverPanel>
      )}
      {showHover && c.activeManagePanel === 'spaces' && (
        <HoverPanel
          c={c}
          onMouseEnter={clearSpacesFlyoutCloseTimer}
          onMouseLeave={scheduleSpacesFlyoutClose}
        >
          {spacesSearchOpen ? (
            <div className="gap-spacing-2 flex shrink-0 items-center px-3 py-3">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                  aria-hidden
                />
                <input
                  ref={spacesSearchInputRef}
                  type="text"
                  value={spacesSearchQuery}
                  onChange={(e) => setSpacesSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSpacesSearchOpen(false)
                      setSpacesSearchQuery('')
                    }
                  }}
                  placeholder="Search spaces…"
                  className="body-4 box-border h-8 w-full rounded-lg border border-[var(--color-border)] bg-[var(--background)] pl-7 pr-8 text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSpacesSearchOpen(false)
                    setSpacesSearchQuery('')
                  }}
                  className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
                  aria-label="Close search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {hiddenSidebarCount > 0 ? (
                <button
                  ref={hiddenEyeRef}
                  type="button"
                  onClick={() => {
                    if (hiddenMenuOpen) setHiddenMenuOpen(false)
                    else openHiddenMenu()
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                  aria-label="Show hidden from sidebar"
                  title="Hidden from sidebar"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-3">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Spaces
              </span>
              <div className="flex items-center gap-0.5">
                {hiddenSidebarCount > 0 ? (
                  <button
                    ref={hiddenEyeRef}
                    type="button"
                    onClick={() => {
                      if (hiddenMenuOpen) setHiddenMenuOpen(false)
                      else openHiddenMenu()
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                    aria-label="Show hidden from sidebar"
                    title="Hidden from sidebar"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSpacesSearchOpen(true)}
                  className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                  aria-label="Search spaces"
                  title="Search spaces"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          <div className="scrollbar-hide flex-1 overflow-y-auto px-2 py-2">
            {c.sidebarListsLoading ? (
              <div className="flex justify-center px-2 py-6">
                <VibeyLoadingOrb state="processing" size="sm" text="Loading spaces..." />
              </div>
            ) : (
              <SidebarHqSpacesGroupedList
                controller={c}
                spaces={c.sidebarLists}
                campaigns={c.manageCampaigns}
                pathname={c.pathname}
                expandedIds={c.expandedSpaceCampaignIds}
                setExpandedIds={c.setExpandedSpaceCampaignIds}
                onCreateSpace={(campaignId) => void c.handleCreateList(campaignId)}
                patchCampaignConfig={c.patchCampaignConfig}
                isSubmitting={c.isSubmittingList}
                creatingName={c.newListName}
                setCreatingName={c.setNewListName}
                searchQuery={spacesSearchQuery}
                onOpenBrowseTemplates={setBrowsePanelBucket}
                onOpenCreateSpaceModal={(campaignId) => setCreateSpaceModalFor({ campaignId })}
                spaceUserState={spaceUserState}
                hasMore={c.sidebarListsHasMore}
                loadingMore={c.sidebarListsLoadingMore}
                onLoadMore={() => void c.loadMoreSidebarLists()}
              />
            )}
          </div>
        </HoverPanel>
      )}
    </>
  )
}

function InlineManageFlyoutPanel({
  isPanelClosing,
  children,
}: {
  isPanelClosing: boolean
  children: ReactNode
}) {
  const isVisible = useFlyoutSlideVisible(isPanelClosing)

  return (
    <div
      className={`flex h-full min-h-0 min-w-0 items-stretch overflow-hidden py-3 pl-1.5 pr-1.5 transition-[width,padding] duration-300 ease-out ${
        isPanelClosing ? 'w-0 pl-0 pr-0' : 'w-[248px]'
      }`}
    >
      <div
        className={`card-glass flex w-full flex-col overflow-hidden rounded-2xl transition-[transform,opacity] duration-300 ease-out ${flyoutSlideClass(
          isVisible,
        )}`}
      >
        {children}
      </div>
    </div>
  )
}

function useFlyoutSlideVisible(isPanelClosing: boolean) {
  const [isEntered, setIsEntered] = useState(false)

  useEffect(() => {
    if (isPanelClosing) {
      setIsEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setIsEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [isPanelClosing])

  return !isPanelClosing && isEntered
}

function flyoutSlideClass(isVisible: boolean) {
  return isVisible ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-3 opacity-0'
}

function HoverPanel({
  c,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  c: SidebarControllerReturn
  onMouseEnter: () => void
  onMouseLeave: () => void
  children: ReactNode
}) {
  const isVisible = useFlyoutSlideVisible(c.isPanelClosing)

  return (
    <div
      className={`absolute bottom-3 left-full top-3 z-[100] ml-1.5 flex min-h-0 w-[248px] flex-col transition-[transform,opacity] duration-300 ease-out ${flyoutSlideClass(
        isVisible,
      )}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="dropdown-menu-solid rounded-spacing-4 flex h-full min-h-0 w-full flex-col overflow-hidden text-[var(--color-foreground)]">
        {children}
      </div>
    </div>
  )
}
