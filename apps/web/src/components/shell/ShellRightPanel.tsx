'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { ShellRightPanelFiles } from './ShellRightPanelFiles'
import { ShellRightPanelSources } from './ShellRightPanelSources'
import { ShellRightPanelTasks } from './ShellRightPanelTasks'
import { useShellStore, type ShellRightPanelTab } from './use-shell-store'

const TABS: { id: ShellRightPanelTab; label: string }[] = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'files', label: 'Files' },
  { id: 'sources', label: 'Sources' },
]

function defaultTabForPath(pathname: string): ShellRightPanelTab {
  if (pathname === '/home' || pathname.startsWith('/home/')) return 'tasks'
  if (
    pathname.startsWith('/spaces') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/brain')
  ) {
    return 'files'
  }
  return 'tasks'
}

export function ShellRightPanel() {
  const pathname = usePathname() ?? '/home'
  const open = useShellStore((s) => s.rightPanel.open)
  const tab = useShellStore((s) => s.rightPanel.tab)
  const setRightPanelTab = useShellStore((s) => s.setRightPanelTab)

  useEffect(() => {
    if (!open) return
    setRightPanelTab(defaultTabForPath(pathname))
  }, [pathname, open, setRightPanelTab])

  if (!open) return null

  return (
    <aside className="border-border bg-background flex h-full w-[300px] shrink-0 flex-col overflow-hidden border-l">
      <div className="border-border flex shrink-0 gap-1 border-b p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setRightPanelTab(t.id)}
            className={cn(
              'body-3 flex-1 rounded-lg px-2 py-1.5 transition-colors',
              tab === t.id
                ? 'bg-secondary text-foreground font-medium'
                : 'text-muted-foreground hover:bg-hover-subtle',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'tasks' ? <ShellRightPanelTasks /> : null}
        {tab === 'files' ? <ShellRightPanelFiles /> : null}
        {tab === 'sources' ? <ShellRightPanelSources /> : null}
      </div>
    </aside>
  )
}
