'use client'

import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Conversation, ConversationListGroup } from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'

export function PinnedConversationSection({
  group,
  expanded,
  onToggle,
  renderConversationRow,
}: {
  group: ConversationListGroup
  expanded: boolean
  onToggle: () => void
  renderConversationRow: (conversation: Conversation, sectionId: string) => ReactNode
}) {
  return (
    <div className="px-spacing-3 pb-spacing-1">
      <ConversationHubSectionHeader label={group.label} expanded={expanded} onToggle={onToggle} />
      {expanded ? (
        <div className="gap-spacing-1 flex flex-col">
          {group.items.map((conversation) => renderConversationRow(conversation, group.id))}
        </div>
      ) : null}
    </div>
  )
}

export function ConversationHubSectionHeader({
  label,
  expanded,
  onToggle,
}: {
  label: string
  expanded: boolean
  onToggle: () => void
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight
  return (
    <button
      type="button"
      className="hub-menu-section-label gap-spacing-1 group flex w-full items-center text-left"
      aria-expanded={expanded}
      onClick={onToggle}
    >
      {label}
      <Chevron
        className="icon-xs opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        aria-hidden
      />
    </button>
  )
}

interface SpaceConversationSectionsProps {
  groups: ConversationListGroup[]
  sectionCollapsed: Partial<Record<string, boolean>>
  rowCapForSection: (sectionId: string, total: number) => number
  onToggleSectionCollapsed: (sectionId: string) => void
  onShowMoreInSection: (sectionId: string) => void
  renderConversationRow: (conversation: Conversation, sectionId: string) => ReactNode
  /** When true, skip section headers (flat list / groupBy none). */
  hideEmptyLabels?: boolean
  dividedRows?: boolean
}

export function SpaceConversationSections({
  groups,
  sectionCollapsed,
  rowCapForSection,
  onToggleSectionCollapsed,
  onShowMoreInSection,
  renderConversationRow,
  hideEmptyLabels = true,
  dividedRows = false,
}: SpaceConversationSectionsProps) {
  return (
    <div className="flex flex-col">
      {groups.map((group, index) => {
        const showHeader = !(hideEmptyLabels && group.label.trim() === '')
        const collapsed = sectionCollapsed[group.id] === true
        const cap = rowCapForSection(group.id, group.items.length)
        const visibleItems = collapsed ? [] : group.items.slice(0, cap)
        const hiddenRemaining = collapsed ? 0 : Math.max(0, group.items.length - cap)
        return (
          <div key={group.id} className="flex flex-col">
            {showHeader ? (
              <button
                type="button"
                onClick={() => onToggleSectionCollapsed(group.id)}
                aria-expanded={!collapsed}
                className={cn(
                  'group/section typo-xs text-muted-foreground hover:text-foreground gap-spacing-1 rounded-spacing-2 px-spacing-2 pb-spacing-1 flex w-full items-center text-left font-semibold transition-colors',
                  index === 0 ? 'pt-spacing-1' : 'pt-spacing-4',
                )}
              >
                <span>{group.label}</span>
                <ChevronRight
                  className={cn(
                    'icon-sm shrink-0 opacity-0 transition-[opacity,transform] duration-200 group-hover/section:opacity-100 group-focus-visible/section:opacity-100',
                    collapsed ? 'rotate-0' : 'rotate-90',
                  )}
                  aria-hidden
                />
              </button>
            ) : null}
            {!collapsed ? (
              <div className={cn('flex flex-col', !dividedRows && 'gap-spacing-1')}>
                {visibleItems.map((conversation) => renderConversationRow(conversation, group.id))}
                {hiddenRemaining > 0 ? (
                  <button
                    type="button"
                    onClick={() => onShowMoreInSection(group.id)}
                    className="body-3 text-muted-foreground/60 hover:text-foreground px-spacing-2 py-spacing-1 rounded-spacing-3 text-left font-medium transition-colors"
                  >
                    more
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
