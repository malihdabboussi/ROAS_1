'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import {
  Brain,
  FolderGit2,
  House,
  ListChecks,
  Plus,
  Users,
  Workflow,
} from 'lucide-react'
import { surfaceFromPathname } from '@/components/global-chat/config/work-context.config'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { cn } from '@/lib/utils/cn'
import { SidebarBrainNavLinks } from './SidebarBrainFlyout'
import { SidebarHqHubMenuSection } from './SidebarHqHubMenuSection'
import { SidebarHqHubMenuSpacesSection } from './SidebarHqHubMenuSpacesSection'
import { SidebarHqProjectList } from './SidebarHqProjectList'
import { SidebarTeam2Flyout } from './SidebarTeam2Flyout'
import { HUB_MENU_SECTION_ORDER, type HubMenuSectionId } from './sidebar-hq-hub-menu.types'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqHubMenuContent({
  c,
  variant,
  expandedSections,
  onToggleSection,
  onNavigate,
  showAdminSections,
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
  setBrowsePanelBucket,
  setCreateSpaceModalFor,
  spaceUserState,
}: {
  c: SidebarControllerReturn
  variant: 'panel' | 'drawer'
  expandedSections: Set<HubMenuSectionId>
  onToggleSection: (sectionId: HubMenuSectionId) => void
  onNavigate?: () => void
  showAdminSections: boolean
  spacesSearchOpen: boolean
  setSpacesSearchOpen: Dispatch<SetStateAction<boolean>>
  spacesSearchQuery: string
  setSpacesSearchQuery: Dispatch<SetStateAction<string>>
  spacesSearchInputRef: React.RefObject<HTMLInputElement | null>
  hiddenSidebarCount: number
  hiddenEyeRef: React.RefObject<HTMLButtonElement | null>
  hiddenMenuOpen: boolean
  setHiddenMenuOpen: Dispatch<SetStateAction<boolean>>
  openHiddenMenu: () => void
  setBrowsePanelBucket: Dispatch<SetStateAction<string | null>>
  setCreateSpaceModalFor: Dispatch<SetStateAction<{ campaignId: string | null } | null>>
  spaceUserState: ReturnType<typeof useSpaceUserState>
}) {
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const setChatCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const expandChat = useGlobalChatStore((s) => s.expandAndFocus)
  const spacesReloadedRef = useRef(false)

  useEffect(() => {
    if (!expandedSections.has('spaces')) {
      spacesReloadedRef.current = false
      return
    }
    if (spacesReloadedRef.current) return
    spacesReloadedRef.current = true
    void c.reloadSidebarLists()
  }, [c, expandedSections])

  const handleNavigate = () => {
    onNavigate?.()
  }

  const sectionMeta: Record<
    HubMenuSectionId,
    { title: string; icon: ReactNode; adminOnly?: boolean }
  > = {
    team: { title: 'Team', icon: <Users className="icon-md" /> },
    spaces: { title: 'Spaces', icon: <ListChecks className="icon-md" /> },
    brain: { title: 'Brain', icon: <Brain className="icon-md" /> },
    projects: { title: 'Projects', icon: <FolderGit2 className="icon-md" />, adminOnly: true },
  }

  const visibleSections = HUB_MENU_SECTION_ORDER.filter(
    (id) => !sectionMeta[id].adminOnly || showAdminSections,
  )

  return (
    <div className={cn('hub-menu-content flex min-h-0 flex-1 flex-col', variant === 'drawer' && 'px-0')}>
      <div className="scrollbar-hide min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        <Link
          href="/home"
          onClick={() => {
            setWorkContext({ surface: 'general' })
            setChatCollapsed(true)
            handleNavigate()
          }}
          className={cn('hub-menu-link-row', c.pathname === '/home' && 'hub-menu-link-row-active')}
        >
          <House className="icon-md shrink-0" />
          <span className="body-3">Home</span>
        </Link>

        {visibleSections.map((sectionId) => {
          const meta = sectionMeta[sectionId]
          const expanded = expandedSections.has(sectionId)
          return (
            <SidebarHqHubMenuSection
              key={sectionId}
              sectionId={sectionId}
              title={meta.title}
              icon={meta.icon}
              expanded={expanded}
              onToggle={onToggleSection}
            >
              {sectionId === 'team' ? (
                <SidebarTeam2Flyout pathname={c.pathname} embedded />
              ) : null}
              {sectionId === 'brain' ? (
                <div className="px-1 pb-2">
                  <Suspense
                    fallback={
                      <p className="body-3 px-3 py-4 text-center text-muted-foreground">Loading…</p>
                    }
                  >
                    <SidebarBrainNavLinks onNavigate={handleNavigate} />
                  </Suspense>
                </div>
              ) : null}
              {sectionId === 'projects' ? (
                <div className="space-y-1 px-1 pb-2">
                  {!c.isCreatingProject ? (
                    <button
                      type="button"
                      onClick={() => c.setIsCreatingProject(true)}
                      className="hub-menu-inline-action"
                    >
                      <Plus className="icon-sm shrink-0" />
                      <span className="body-3">New project</span>
                    </button>
                  ) : (
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
                        placeholder={c.isSubmittingProject ? 'Creating…' : 'Project name'}
                        className="body-3 h-7 flex-1 rounded-md bg-transparent px-2 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  )}
                  {c.sidebarProjects.length === 0 ? (
                    <p className="body-3 px-3 py-2 text-center text-muted-foreground">No projects yet</p>
                  ) : (
                    <SidebarHqProjectList
                      projects={c.sidebarProjects}
                      setSidebarProjects={c.setSidebarProjects}
                      pathname={c.pathname}
                    />
                  )}
                </div>
              ) : null}
              {sectionId === 'spaces' ? (
                <SidebarHqHubMenuSpacesSection
                  c={c}
                  spacesSearchOpen={spacesSearchOpen}
                  setSpacesSearchOpen={setSpacesSearchOpen}
                  spacesSearchQuery={spacesSearchQuery}
                  setSpacesSearchQuery={setSpacesSearchQuery}
                  spacesSearchInputRef={spacesSearchInputRef}
                  hiddenSidebarCount={hiddenSidebarCount}
                  hiddenEyeRef={hiddenEyeRef}
                  hiddenMenuOpen={hiddenMenuOpen}
                  setHiddenMenuOpen={setHiddenMenuOpen}
                  openHiddenMenu={openHiddenMenu}
                  setBrowsePanelBucket={setBrowsePanelBucket}
                  setCreateSpaceModalFor={setCreateSpaceModalFor}
                  spaceUserState={spaceUserState}
                />
              ) : null}
            </SidebarHqHubMenuSection>
          )
        })}

        {showAdminSections ? (
          <Link
            href="/flows"
            onClick={() => {
              setWorkContext({ surface: 'flows' })
              expandChat({ workContext: { surface: 'flows' } })
              handleNavigate()
            }}
            className={cn(
              'hub-menu-link-row',
              c.pathname.startsWith('/flows') && 'hub-menu-link-row-active',
            )}
          >
            <Workflow className="icon-md shrink-0" />
            <span className="body-3">Flows</span>
          </Link>
        ) : null}
      </div>
    </div>
  )
}
