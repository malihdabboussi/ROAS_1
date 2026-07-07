'use client'

import { MessageCircleQuestion, Search } from 'lucide-react'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { cn } from '@/lib/utils/cn'
import type { FlowsPanelTab } from '../../types/flows-page.types'

function SectionTab({
  selected,
  onSelect,
  icon,
  label,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'hover:bg-hover-subtle relative flex min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
        selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
      {selected ? (
        <span className="bg-foreground absolute bottom-0 left-2 right-2 h-0.5 rounded-full" />
      ) : null}
    </button>
  )
}

export function FlowsSectionTabs({
  activeTab,
  onSelectTab,
  showClarificationsTab,
}: {
  activeTab: FlowsPanelTab
  onSelectTab: (tab: FlowsPanelTab) => void
  showClarificationsTab?: boolean
}) {
  if (!showClarificationsTab) return null

  return (
    <div className="border-border flex w-full min-w-0 shrink-0 items-center border-b px-4">
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1">
        <SectionTab
          selected={activeTab === 'browse'}
          onSelect={() => onSelectTab('browse')}
          icon={<Search className="h-3.5 w-3.5 shrink-0" />}
          label={FLOWS_UI.browseTab}
        />
        <SectionTab
          selected={activeTab === 'clarifications'}
          onSelect={() => onSelectTab('clarifications')}
          icon={<MessageCircleQuestion className="h-3.5 w-3.5 shrink-0" />}
          label={FLOWS_UI.clarificationsTab}
        />
      </div>
    </div>
  )
}
