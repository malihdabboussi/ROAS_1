'use client'

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  SECTION_LABEL,
  SECTION_ORDER,
  type Conversation,
  type ConversationSection,
} from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'

interface SpaceConversationSectionsProps {
  grouped: Record<ConversationSection, Conversation[]>
  sectionCollapsed: Partial<Record<ConversationSection, boolean>>
  rowCapForSection: (section: ConversationSection, total: number) => number
  onToggleSectionCollapsed: (section: ConversationSection) => void
  onShowMoreInSection: (section: ConversationSection) => void
  renderConversationRow: (conversation: Conversation, section: ConversationSection) => ReactNode
}

export function SpaceConversationSections({
  grouped,
  sectionCollapsed,
  rowCapForSection,
  onToggleSectionCollapsed,
  onShowMoreInSection,
  renderConversationRow,
}: SpaceConversationSectionsProps) {
  return (
    <div className="flex flex-col">
      {SECTION_ORDER.reduce<ConversationSection[]>((acc, section) => {
        if (grouped[section].length > 0) acc.push(section)
        return acc
      }, []).map((section, index) => {
        const items = grouped[section]
        const collapsed = sectionCollapsed[section] === true
        const cap = rowCapForSection(section, items.length)
        const visibleItems = collapsed ? [] : items.slice(0, cap)
        const hiddenRemaining = collapsed ? 0 : Math.max(0, items.length - cap)
        return (
          <div key={section} className="flex flex-col">
            <button
              type="button"
              onClick={() => onToggleSectionCollapsed(section)}
              aria-expanded={!collapsed}
              className={cn(
                'group/section typo-xs text-muted-foreground hover:text-foreground gap-spacing-1 flex w-full items-center rounded-spacing-2 px-spacing-2 pb-spacing-1 text-left font-semibold transition-colors',
                index === 0 ? 'pt-spacing-1' : 'pt-spacing-4',
              )}
            >
              <span>{SECTION_LABEL[section]}</span>
              <ChevronRight
                className={cn(
                  'icon-sm shrink-0 opacity-0 transition-[opacity,transform] duration-200 group-hover/section:opacity-100 group-focus-visible/section:opacity-100',
                  collapsed ? 'rotate-0' : 'rotate-90',
                )}
                aria-hidden
              />
            </button>
            {!collapsed ? (
              <div className="gap-spacing-1 flex flex-col">
                {visibleItems.map((conversation) => renderConversationRow(conversation, section))}
                {hiddenRemaining > 0 ? (
                  <button
                    type="button"
                    onClick={() => onShowMoreInSection(section)}
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
