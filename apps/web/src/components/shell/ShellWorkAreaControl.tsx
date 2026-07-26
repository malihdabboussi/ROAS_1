'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FileImage, LayoutDashboard, PanelRight } from 'lucide-react'
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
  const pageTargets = [currentPage, ...recentPages.filter((target) => target.id !== currentPage.id)]

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
          className="dropdown-menu-solid p-spacing-2 gap-spacing-1 z-dropdown absolute right-0 top-full flex min-w-64 flex-col"
        >
          {pageTargets.map((target) => (
            <button
              key={target.id}
              type="button"
              role="menuitem"
              onClick={() => {
                closeArtifactViewer()
                setWorkAreaOpen(true)
                if (target.href !== currentPage.href) router.push(target.href)
                setHistoryOpen(false)
              }}
              className={cn(
                'hub-dock-flyout-row gap-spacing-2',
                !activeTarget && target.id === currentPage.id && workAreaOpen && 'bg-hover-subtle',
              )}
            >
              <LayoutDashboard className="icon-sm shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{target.title}</span>
            </button>
          ))}
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
                'hub-dock-flyout-row gap-spacing-2',
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
