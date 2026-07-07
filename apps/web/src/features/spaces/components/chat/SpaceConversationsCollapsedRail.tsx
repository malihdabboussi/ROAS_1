'use client'

import { RxDoubleArrowRight } from 'react-icons/rx'
import { Plus, Search } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

const CONVERSATION_RAIL_ICON_BUTTON_CLASS =
  'text-muted-foreground hover:text-foreground hover:bg-[var(--color-hover-subtle)] h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors'

export interface SpaceConversationsCollapsedRailProps {
  onExpand: () => void
  onNewConversation: () => void
  onOpenSearch: () => void
}

/** Icon rail shown when the parent sidebar is collapsed (Spaces chat width-transition pattern). */
export function SpaceConversationsCollapsedRail({
  onExpand,
  onNewConversation,
  onOpenSearch,
}: SpaceConversationsCollapsedRailProps) {
  return (
    <div className="gap-spacing-2 p-spacing-2 flex h-full min-h-0 w-full shrink-0 flex-col items-center">
      <Tooltip label="Expand conversations" side="right">
        <button
          type="button"
          onClick={onExpand}
          className={CONVERSATION_RAIL_ICON_BUTTON_CLASS}
          aria-label="Expand conversations"
        >
          <RxDoubleArrowRight className="icon-sm" aria-hidden />
        </button>
      </Tooltip>
      <Tooltip label="New conversation" side="right">
        <button
          type="button"
          onClick={onNewConversation}
          className={CONVERSATION_RAIL_ICON_BUTTON_CLASS}
          aria-label="New conversation"
        >
          <Plus className="icon-sm" aria-hidden />
        </button>
      </Tooltip>
      <Tooltip label="Search conversations" side="right">
        <button
          type="button"
          onClick={onOpenSearch}
          className={CONVERSATION_RAIL_ICON_BUTTON_CLASS}
          aria-label="Search conversations"
        >
          <Search className="icon-sm" aria-hidden />
        </button>
      </Tooltip>
      <div className="mt-auto flex shrink-0 items-center justify-center">
        <span
          className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Conversations
        </span>
      </div>
    </div>
  )
}
