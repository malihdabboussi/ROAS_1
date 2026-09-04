'use client'

import Link from 'next/link'
import { FolderGit2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { SIDEBAR_MESSAGES } from '../config/sidebar-messages.config'
import { HubDockFlyout } from './HubDockFlyout'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarProjectsFlyout({
  c,
  anchor,
  onEnter,
  onLeave,
  onClose,
  onNavigate,
  pinned,
  onPinnedChange,
}: {
  c: SidebarControllerReturn
  anchor: DOMRect
  onEnter: () => void
  onLeave: () => void
  onClose: () => void
  onNavigate?: () => void
  pinned?: boolean
  onPinnedChange?: (pinned: boolean) => void
}) {
  const clearCreateProject = () => {
    c.setIsCreatingProject(false)
    c.setNewProjectName('')
  }

  return (
    <HubDockFlyout
      anchor={anchor}
      title="Projects"
      compact
      onEnter={onEnter}
      onLeave={onLeave}
      onClose={onClose}
      pinned={pinned}
      onPinnedChange={onPinnedChange}
      headerActions={[
        {
          kind: 'plus',
          title: SIDEBAR_MESSAGES.NEW_PROJECT.message,
          onClick: () => {
            c.setNewProjectName('')
            c.setIsCreatingProject(true)
          },
        },
      ]}
    >
      {c.isCreatingProject ? (
        <div
          className="gap-spacing-2 px-spacing-2 py-spacing-1 flex items-center"
          data-hub-dock-keep-open
        >
          <input
            value={c.newProjectName}
            onChange={(event) => c.setNewProjectName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void c.handleCreateProject()
              if (event.key === 'Escape') clearCreateProject()
            }}
            onBlur={() => {
              if (!c.newProjectName.trim()) clearCreateProject()
            }}
            disabled={c.isSubmittingProject}
            autoFocus
            placeholder={
              c.isSubmittingProject
                ? SIDEBAR_MESSAGES.CREATING_PROJECT.message
                : SIDEBAR_MESSAGES.PROJECT_NAME_PLACEHOLDER.message
            }
            className="body-3 text-foreground placeholder:text-muted-foreground h-spacing-7 px-spacing-2 rounded-spacing-2 min-w-0 flex-1 bg-transparent outline-none disabled:opacity-50"
          />
        </div>
      ) : null}
      {c.sidebarProjects.length === 0 && !c.isCreatingProject ? (
        <p className="hub-dock-flyout-row-muted px-spacing-3 py-spacing-2 body-3">
          {SIDEBAR_MESSAGES.NO_PROJECTS.message}
        </p>
      ) : (
        c.sidebarProjects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            data-hub-dock-navigate
            onClick={onNavigate}
            className={cn(
              'hub-dock-flyout-row',
              c.pathname === `/projects/${project.id}` && 'hub-dock-flyout-row-active',
            )}
          >
            <FolderGit2 />
            <span className="min-w-0 flex-1 truncate" title={project.name}>
              {project.name}
            </span>
          </Link>
        ))
      )}
    </HubDockFlyout>
  )
}
