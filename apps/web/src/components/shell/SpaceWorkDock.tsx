'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, type ReactNode } from 'react'
import { FolderOpen } from 'lucide-react'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { cn } from '@/lib/utils/cn'
import { SPACE_WORK_DOCK_MESSAGES } from './space-work-dock.messages.config'
import { SpaceWorkTabStrip } from './SpaceWorkTabStrip'
import { selectSpaceWorkSession, useShellStore } from './use-shell-store'

type SpaceWorkDockProps = {
  children: ReactNode
  className?: string
}

export function SpaceWorkDock({ children, className }: SpaceWorkDockProps) {
  const router = useRouter()
  const pathname = usePathname() ?? '/spaces'
  const searchParams = useSearchParams()
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const session = useShellStore((s) => selectSpaceWorkSession(s, activeSpaceId))
  const activateSpaceWorkTab = useShellStore((s) => s.activateSpaceWorkTab)
  const closeSpaceWorkTab = useShellStore((s) => s.closeSpaceWorkTab)
  const setSpaceWorkOpen = useShellStore((s) => s.setSpaceWorkOpen)

  const replaceItemParam = useCallback(
    (itemId: string | null) => {
      if (!activeSpaceId) return
      const params = new URLSearchParams(searchParams.toString())
      params.set('space', activeSpaceId)
      if (itemId) params.set('item', itemId)
      else params.delete('item')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [activeSpaceId, pathname, router, searchParams],
  )

  const onSelect = useCallback(
    (tabId: string) => {
      if (!activeSpaceId) return
      setSpaceWorkOpen(true)
      activateSpaceWorkTab(activeSpaceId, tabId)
      replaceItemParam(tabId)
    },
    [activateSpaceWorkTab, activeSpaceId, replaceItemParam, setSpaceWorkOpen],
  )

  const onClose = useCallback(
    (tabId: string) => {
      if (!activeSpaceId) return
      const wasActive = session.activeTabId === tabId
      closeSpaceWorkTab(activeSpaceId, tabId)
      if (!wasActive) return
      const next = useShellStore.getState().spaceWorkBySpaceId[activeSpaceId]?.activeTabId ?? null
      replaceItemParam(next)
    },
    [activeSpaceId, closeSpaceWorkTab, replaceItemParam, session.activeTabId],
  )

  return (
    <div className={cn('shell-space-work-dock', className)}>
      <SpaceWorkTabStrip
        tabs={session.tabs}
        activeTabId={session.activeTabId}
        onSelect={onSelect}
        onClose={onClose}
      />
      {session.tabs.length === 0 ? (
        <div className="shell-space-work-empty" aria-live="polite">
          <FolderOpen className="icon-md text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="body-2 text-foreground font-medium">
              {SPACE_WORK_DOCK_MESSAGES.emptyTitle}
            </p>
            <p className="body-3 text-muted-foreground">{SPACE_WORK_DOCK_MESSAGES.emptyBody}</p>
          </div>
        </div>
      ) : null}
      <div className="shell-space-work-dock-body">{children}</div>
    </div>
  )
}
