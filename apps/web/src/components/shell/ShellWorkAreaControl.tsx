'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Brain,
  CalendarDays,
  FileImage,
  FolderGit2,
  Inbox,
  LayoutDashboard,
  ListChecks,
  PanelRight,
  Users,
  Workflow,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useShellStore, type ShellWorkAreaPageTarget } from './use-shell-store'

type ShellWorkAreaControlProps = {
  currentPage: ShellWorkAreaPageTarget
}

export function ShellWorkAreaControl({ currentPage }: ShellWorkAreaControlProps) {
  const router = useRouter()
  const [historyOpen, setHistoryOpen] = useState(false)
  const workAreaOpen = useShellStore((state) => state.workAreaOpen)
  const toggleWorkAreaOpen = useShellStore((state) => state.toggleWorkAreaOpen)
  const setWorkAreaOpen = useShellStore((state) => state.setWorkAreaOpen)
  const activeTarget = useShellStore((state) => state.artifactViewer.target)
  const recentTargets = useShellStore((state) => state.recentArtifactTargets)
  const recentPages = useShellStore((state) => state.recentWorkAreaPages)
  const openArtifactViewer = useShellStore((state) => state.openArtifactViewer)
  const closeArtifactViewer = useShellStore((state) => state.closeArtifactViewer)
  const setPendingWorkRestore = useShellStore((state) => state.setPendingWorkRestore)
  const seenPageTitles = new Set<string>()
  const pageTargets = [currentPage, ...recentPages].filter((target) => {
    const params = new URLSearchParams(target.href.split('?')[1] ?? '')
    if (params.has('conv') || target.href.startsWith('/chats')) return false
    const key = target.title.trim().toLocaleLowerCase()
    if (seenPageTitles.has(key)) return false
    seenPageTitles.add(key)
    return true
  })

  const pageIcon = (href: string) => {
    if (href.startsWith('/home/meetings')) return CalendarDays
    if (href.startsWith('/home/my-tasks')) return ListChecks
    if (href.startsWith('/home/inbox')) return Inbox
    if (href.startsWith('/brain')) return Brain
    if (href.startsWith('/team')) return Users
    if (href.startsWith('/flows')) return Workflow
    if (href.startsWith('/projects') || href.startsWith('/programs')) return FolderGit2
    return LayoutDashboard
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHistoryOpen(true)}
      onMouseLeave={() => setHistoryOpen(false)}
    >
      <button
        type="button"
        title={workAreaOpen ? 'Collapse page — chat full screen' : 'Show page'}
        aria-label={workAreaOpen ? 'Collapse page — chat full screen' : 'Show page'}
        aria-pressed={!workAreaOpen}
        aria-expanded={historyOpen}
        onClick={() => toggleWorkAreaOpen()}
        onFocus={() => setHistoryOpen(true)}
        className={cn('shell-topbar-icon-btn', !workAreaOpen && 'shell-topbar-icon-btn-active')}
      >
        <PanelRight />
      </button>
      {historyOpen ? (
        <div
          role="menu"
          aria-label="Recent work surfaces"
          className="dropdown-menu-solid p-spacing-2 gap-spacing-1 z-dropdown w-spacing-64 absolute right-0 top-full flex flex-col"
        >
          {pageTargets.map((target) => {
            const PageIcon = pageIcon(target.href)
            return (
              <button
                key={target.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  closeArtifactViewer()
                  setWorkAreaOpen(true)
                  // Entries without a payload must not wipe one set by another
                  // pick that is still in flight toward its landing route.
                  if (target.restore) setPendingWorkRestore(target.restore)
                  if (target.href !== currentPage.href) router.push(target.href)
                  setHistoryOpen(false)
                }}
                className={cn(
                  'hub-dock-flyout-row gap-spacing-2 text-left',
                  !activeTarget &&
                    target.id === currentPage.id &&
                    workAreaOpen &&
                    'bg-hover-subtle',
                )}
              >
                <PageIcon className="icon-sm shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{target.title}</span>
              </button>
            )
          })}
          {recentTargets.map((target) => (
            <button
              key={target.id}
              type="button"
              role="menuitem"
              onClick={() => {
                openArtifactViewer(target)
                setHistoryOpen(false)
              }}
              className={cn(
                'hub-dock-flyout-row gap-spacing-2 text-left',
                activeTarget?.id === target.id && workAreaOpen && 'bg-hover-subtle',
              )}
            >
              <FileImage className="icon-sm shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{target.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
