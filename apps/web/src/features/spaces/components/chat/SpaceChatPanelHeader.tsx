'use client'

import type { ReactNode } from 'react'
import { ConversationHeaderTitle } from '@/components/conversations'

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
    <header className="border-border px-spacing-3 py-spacing-1 flex shrink-0 items-center justify-between border-b">
      <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
        {leadingAction ? <div className="flex shrink-0 items-center">{leadingAction}</div> : null}
        {agentPicker ? <div className="flex shrink-0 items-center">{agentPicker}</div> : null}
        {conversationDetails ? (
          <div className="flex shrink-0 items-center">{conversationDetails}</div>
        ) : null}
        {layout === 'full' && title && conversationId ? (
          <ConversationHeaderTitle
            title={title}
            onRename={(nextTitle) => onRename(conversationId, nextTitle)}
            renameRequestNonce={renameRequestNonce}
          />
        ) : (
          <div className="min-w-0 flex-1" aria-hidden />
        )}
      </div>
      <div className="flex shrink-0 items-center">{actions}</div>
    </header>
  )
}
