'use client'

import { ChevronLeft } from 'lucide-react'
import { ChatHistoryFilterMenu } from '@/components/conversations/ChatHistoryFilterMenu'
import type { ChatHistoryFilterState } from '@/lib/conversations'

interface ShellChatMenuFilterControlsProps {
  filters: ChatHistoryFilterState
  onFiltersChange: (filters: ChatHistoryFilterState) => void
  historyAgentKey: string | null
  agentOptions: Array<{ key: string; label: string }>
  onAgentKeyChange: (agentKey: string | null) => void
  onOpenAllChats: () => void
  onCollapse?: () => void
  simpleSidebar: boolean
}

export function ShellChatMenuFilterControls({
  filters,
  onFiltersChange,
  historyAgentKey,
  agentOptions,
  onAgentKeyChange,
  onOpenAllChats,
  onCollapse,
  simpleSidebar,
}: ShellChatMenuFilterControlsProps) {
  return (
    <div className="gap-spacing-1 flex items-center">
      <ChatHistoryFilterMenu
        value={filters}
        onChange={onFiltersChange}
        agentKey={historyAgentKey}
        agentOptions={agentOptions}
        onAgentKeyChange={onAgentKeyChange}
        onOpenAllChats={onOpenAllChats}
        alwaysShowOpenAllChats={simpleSidebar}
      />
      {onCollapse ? (
        <button
          type="button"
          onClick={onCollapse}
          className="nav-glass-text-purple p-spacing-1 hover:text-foreground flex items-center justify-center transition-colors"
          aria-label={simpleSidebar ? 'Collapse menu' : 'Collapse chat history'}
          title={simpleSidebar ? 'Collapse menu' : 'Collapse chat history'}
        >
          <ChevronLeft className="icon-xs" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
