'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, FolderGit2, Layers3, Workflow } from 'lucide-react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { cn } from '@/lib/utils/cn'
import {
  HUB_DOCK_SUB_FLYOUT_LEAVE_MS,
  HUB_DOCK_SUB_FLYOUT_OFFSET_PX,
  HubDockFlyout,
} from './HubDockFlyout'
import type { SidebarControllerReturn } from './useSidebarController'

/** Shared More flyout body (Projects + Flows) for collapsed rail and expanded menu. */
export function SidebarHqMoreFlyoutBody({
  c,
  showProjects,
  onNavigate,
  onHoldParentFlyout,
  onReleaseParentFlyout,
  onSubFlyoutOpenChange,
  onCloseParentFlyout,
}: {
  c: SidebarControllerReturn
  showProjects: boolean
  onNavigate?: () => void
  onHoldParentFlyout?: () => void
  onReleaseParentFlyout?: () => void
  onSubFlyoutOpenChange?: (open: boolean) => void
  onCloseParentFlyout?: () => void
}) {
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [projectsAnchor, setProjectsAnchor] = useState<DOMRect | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCreateProject = useCallback(() => {
    c.setIsCreatingProject(false)
    c.setNewProjectName('')
  }, [c.setIsCreatingProject, c.setNewProjectName])

  const clearLeave = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
  }, [])

  const closeProjects = useCallback(() => {
    clearLeave()
    setProjectsOpen(false)
    setProjectsAnchor(null)
    onSubFlyoutOpenChange?.(false)
    clearCreateProject()
  }, [clearCreateProject, clearLeave, onSubFlyoutOpenChange])

  const openProjects = useCallback(
    (anchor: DOMRect) => {
      clearLeave()
      onHoldParentFlyout?.()
      setProjectsOpen(true)
      setProjectsAnchor(anchor)
      onSubFlyoutOpenChange?.(true)
    },
    [clearLeave, onHoldParentFlyout, onSubFlyoutOpenChange],
  )

  const scheduleClose = useCallback(() => {
    clearLeave()
    leaveTimer.current = setTimeout(() => {
      leaveTimer.current = null
      closeProjects()
      onReleaseParentFlyout?.()
    }, HUB_DOCK_SUB_FLYOUT_LEAVE_MS)
  }, [clearLeave, closeProjects, onReleaseParentFlyout])

  useEffect(() => () => clearLeave(), [clearLeave])

  useEffect(() => {
    return () => {
      clearCreateProject()
    }
  }, [clearCreateProject])

  return (
    <>
      {showProjects ? (
        <>
          <Link
            href="/admin/ai-usage"
            data-hub-dock-navigate
            onClick={onNavigate}
            className={cn(
              'hub-dock-flyout-row',
              c.pathname.startsWith('/admin/ai-usage') && 'hub-dock-flyout-row-active',
            )}
          >
            <Activity />
            <span className="min-w-0 flex-1 truncate">AI usage</span>
          </Link>
          <div
            className={cn(
              'hub-dock-flyout-row',
              c.pathname.startsWith('/projects') && 'hub-dock-flyout-row-active',
            )}
            onMouseEnter={(e) => openProjects(e.currentTarget.getBoundingClientRect())}
            onMouseLeave={(e) => {
              const related = e.relatedTarget
              if (related instanceof Element && related.closest('[data-hub-dock-flyout-nested]')) {
                return
              }
              scheduleClose()
            }}
          >
            <FolderGit2 />
            <span className="min-w-0 flex-1 truncate">Projects</span>
          </div>
        </>
      ) : null}

      <Link
        href="/flows"
        data-hub-dock-navigate
        onClick={() => {
          setWorkContext({ surface: 'flows' })
          onNavigate?.()
        }}
        className={cn(
          'hub-dock-flyout-row',
          c.pathname.startsWith('/flows') && 'hub-dock-flyout-row-active',
        )}
      >
        <Workflow />
        <span className="min-w-0 flex-1 truncate">Flows</span>
      </Link>

      <Link
        href="/artifacts"
        data-hub-dock-navigate
        onClick={() => {
          setWorkContext({ surface: 'general' })
          onNavigate?.()
        }}
        className={cn(
          'hub-dock-flyout-row',
          c.pathname.startsWith('/artifacts') && 'hub-dock-flyout-row-active',
        )}
      >
        <Layers3 />
        <span className="min-w-0 flex-1 truncate">Artifacts</span>
      </Link>

      {showProjects && projectsOpen && projectsAnchor ? (
        <HubDockFlyout
          anchor={projectsAnchor}
          title="Projects"
          nested
          offsetPx={HUB_DOCK_SUB_FLYOUT_OFFSET_PX}
          onEnter={() => {
            clearLeave()
            onHoldParentFlyout?.()
          }}
          onLeave={scheduleClose}
          onClose={() => {
            closeProjects()
            onCloseParentFlyout?.()
          }}
          headerActions={[
            {
              kind: 'plus',
              title: 'New project',
              onClick: () => {
                c.setNewProjectName('')
                c.setIsCreatingProject(true)
              },
            },
          ]}
        >
          {c.isCreatingProject ? (
            <div className="flex items-center gap-1.5 px-2 py-1" data-hub-dock-keep-open>
              <input
                value={c.newProjectName}
                onChange={(e) => c.setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void c.handleCreateProject()
                  if (e.key === 'Escape') clearCreateProject()
                }}
                onBlur={() => {
                  if (!c.newProjectName.trim()) clearCreateProject()
                }}
                disabled={c.isSubmittingProject}
                autoFocus
                placeholder={c.isSubmittingProject ? 'Creating…' : 'Project name'}
                className="body-3 text-foreground placeholder:text-muted-foreground h-7 flex-1 rounded-md bg-transparent px-2 focus:outline-none disabled:opacity-50"
              />
            </div>
          ) : null}
          {c.sidebarProjects.length === 0 && !c.isCreatingProject ? (
            <p className="hub-dock-flyout-row-muted px-2.5 py-1.5 text-[13px]">No projects yet</p>
          ) : (
            c.sidebarProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                data-hub-dock-navigate
                onClick={() => {
                  setWorkContext({ surface: 'general' })
                  closeProjects()
                  onNavigate?.()
                }}
                className={cn(
                  'hub-dock-flyout-row',
                  c.pathname === `/projects/${project.id}` && 'hub-dock-flyout-row-active',
                )}
              >
                <FolderGit2 />
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
              </Link>
            ))
          )}
        </HubDockFlyout>
      ) : null}
    </>
  )
}
