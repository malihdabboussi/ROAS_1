'use client'

import type { ReactNode } from 'react'
import { ConversationHeaderTitle } from '@/components/conversations'
import { cn } from '@/lib/utils/cn'

interface SpaceChatPanelHeaderProps {
  layout: 'full' | 'compact'
  leadingAction?: ReactNode
  agentPicker: ReactNode
  conversationDetails?: ReactNode
  title: string
  conversationId: string | null
  renameRequestNonce: number
  onRename: (conversationId: string, title: string) => void | Promise<void>
  actions: ReactNode
}

export function SpaceChatPanelHeader({
  layout,
  leadingAction,
  agentPicker,
  conversationDetails,
  title,
  conversationId,
  renameRequestNonce,
  onRename,
  actions,
}: SpaceChatPanelHeaderProps) {
  return (
    <div className="pt-spacing-2 pb-spacing-1 relative shrink-0 px-3 md:px-4">
      <div className={cn('mx-auto w-full max-w-3xl', layout === 'full' && 'pr-spacing-20')}>
        <div className="min-h-spacing-10 gap-spacing-2 flex items-center">
          {leadingAction ? <div className="flex shrink-0 items-center">{leadingAction}</div> : null}
          {agentPicker ? <div className="flex shrink-0 items-center">{agentPicker}</div> : null}
          {layout === 'full' && title && conversationId ? (
            <ConversationHeaderTitle
              title={title}
              onRename={(nextTitle) => onRename(conversationId, nextTitle)}
              renameRequestNonce={renameRequestNonce}
            />
          ) : (
            <div className="min-w-0 flex-1" aria-hidden />
          )}
          {layout === 'compact' ? (
            <div className="flex shrink-0 items-center">{actions}</div>
          ) : null}
        </div>
      </div>
      {layout === 'full' ? (
        <div className="right-spacing-3 top-spacing-2 gap-spacing-1 absolute flex shrink-0 items-center">
          {conversationDetails}
          {actions}
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 translate-y-full bg-gradient-to-b from-[var(--color-background)] to-transparent" />
    </div>
  )
}
