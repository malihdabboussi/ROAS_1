'use client'

import { RxDoubleArrowRight } from 'react-icons/rx'
import { List, Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

interface TeamHrSideChatRailProps {
  agentName?: string
  imageUrl?: string | null
  onExpand: () => void
  onNewConversation: () => void
  onOpenConversations: () => void
}

export function TeamHrSideChatRail({
  agentName = 'Jaime',
  imageUrl = null,
  onExpand,
  onNewConversation,
  onOpenConversations,
}: TeamHrSideChatRailProps) {
  return (
    <div className="surface-card gap-spacing-2 px-spacing-2 py-spacing-3 flex h-full min-h-0 flex-col items-center overflow-hidden rounded-2xl border border-[var(--border)]">
      <Tooltip label={`Expand ${agentName} chat`} side="right">
        <button
          type="button"
          onClick={onExpand}
          className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors hover:bg-[var(--color-hover-subtle)]"
          aria-label={`Expand ${agentName} chat`}
        >
          <RxDoubleArrowRight className="icon-sm" aria-hidden />
        </button>
      </Tooltip>

      <div className="surface-bg h-spacing-8 w-spacing-8 shrink-0 overflow-hidden rounded-xl border border-border">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center">
            <span className="body-4 font-semibold uppercase">{agentName.slice(0, 1)}</span>
          </div>
        )}
      </div>

      <div className="mt-spacing-3 gap-spacing-2 flex shrink-0 flex-col items-center">
        <Tooltip label="New conversation" side="right">
          <button
            type="button"
            onClick={onNewConversation}
            className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors hover:bg-[var(--color-hover-subtle)]"
            aria-label="New conversation"
          >
            <Plus className="icon-sm" />
          </button>
        </Tooltip>
        <Tooltip label="Conversations" side="right">
          <button
            type="button"
            onClick={onOpenConversations}
            className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors hover:bg-[var(--color-hover-subtle)]"
            aria-label="Conversations"
          >
            <List className="icon-sm" />
          </button>
        </Tooltip>
      </div>

      <div className="px-spacing-1 pb-spacing-1 pt-spacing-2 mt-auto flex w-full shrink-0 items-center justify-center">
        <span
          className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {agentName}
        </span>
      </div>
    </div>
  )
}
