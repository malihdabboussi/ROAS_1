'use client'

import { FileText, ListChecks, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { SPACE_WORK_DOCK_MESSAGES } from './space-work-dock.messages.config'
import type { SpaceWorkTab } from './space-work-tabs'

type SpaceWorkTabStripProps = {
  tabs: SpaceWorkTab[]
  activeTabId: string | null
  onSelect: (tabId: string) => void
  onClose: (tabId: string) => void
}

export function SpaceWorkTabStrip({
  tabs,
  activeTabId,
  onSelect,
  onClose,
}: SpaceWorkTabStripProps) {
  if (tabs.length === 0) return null

  return (
    <div className="shell-space-work-tab-strip" role="tablist" aria-label="Open Space items">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId
        const Icon = tab.kind === 'doc' ? FileText : ListChecks
        return (
          <div
            key={tab.id}
            className={cn('shell-space-work-tab', active && 'shell-space-work-tab-active')}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              title={tab.title}
              onClick={() => onSelect(tab.id)}
              className="shell-space-work-tab-main"
            >
              <Icon className="icon-xs text-muted-foreground shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{tab.title}</span>
            </button>
            <button
              type="button"
              title={SPACE_WORK_DOCK_MESSAGES.closeTab}
              aria-label={`${SPACE_WORK_DOCK_MESSAGES.closeTab}: ${tab.title}`}
              onClick={(event) => {
                event.stopPropagation()
                onClose(tab.id)
              }}
              className="shell-space-work-tab-close"
            >
              <X className="icon-xs" aria-hidden />
            </button>
          </div>
        )
      })}
    </div>
  )
}
