'use client'

import { X } from 'lucide-react'
import type { ChatHistoryFilterState, ConversationAgentDisplay } from '@/lib/conversations'

export function ShellChatMenuActiveFilters({
  historyAgentKey,
  agentByKey,
  selectedAgentRole,
  filters,
  onAgentKeyChange,
  onFiltersChange,
}: {
  historyAgentKey: string | null
  agentByKey: Record<string, ConversationAgentDisplay>
  selectedAgentRole?: string | null
  filters: ChatHistoryFilterState
  onAgentKeyChange: (agentKey: string | null) => void
  onFiltersChange: (filters: ChatHistoryFilterState) => void
}) {
  const hasActiveFilters =
    Boolean(historyAgentKey) || filters.type !== 'all' || filters.lastActivity !== 'all'
  if (!hasActiveFilters) return null

  return (
    <div className="gap-spacing-1 px-spacing-1 mt-spacing-2 flex flex-wrap">
      {historyAgentKey ? (
        <ChatHistoryFilterChip
          label={agentByKey[historyAgentKey]?.name ?? historyAgentKey}
          description={[
            'Agent',
            agentByKey[historyAgentKey]?.name ?? historyAgentKey,
            selectedAgentRole?.trim(),
          ]
            .filter(Boolean)
            .join(' · ')}
          tone="purple"
          onRemove={() => onAgentKeyChange(null)}
        />
      ) : null}
      {filters.type !== 'all' ? (
        <ChatHistoryFilterChip
          label={
            filters.type === 'in_app' ? 'In app' : filters.type === 'slack' ? 'Slack' : 'Telegram'
          }
          description={`Type: ${filters.type === 'in_app' ? 'In app' : filters.type === 'slack' ? 'Slack' : 'Telegram'}`}
          tone="blue"
          onRemove={() => onFiltersChange({ ...filters, type: 'all' })}
        />
      ) : null}
      {filters.lastActivity !== 'all' ? (
        <ChatHistoryFilterChip
          label={filters.lastActivity}
          description={`Last activity: ${filters.lastActivity}`}
          tone="cyan"
          onRemove={() => onFiltersChange({ ...filters, lastActivity: 'all' })}
        />
      ) : null}
    </div>
  )
}

function ChatHistoryFilterChip({
  label,
  description,
  tone,
  onRemove,
}: {
  label: string
  description: string
  tone: 'blue' | 'cyan' | 'green' | 'muted' | 'purple'
  onRemove: () => void
}) {
  return (
    <span
      className={`badge-glass badge-glass-sm badge-glass-${tone} gap-spacing-1 inline-flex min-w-0 items-center`}
      title={description}
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-foreground shrink-0"
        aria-label={`Remove ${label} filter`}
        title={`Remove ${description.toLowerCase()} filter`}
      >
        <X className="icon-xs" aria-hidden />
      </button>
    </span>
  )
}
