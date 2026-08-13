'use client'

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { SpaceConversationActionsSurface } from '@/components/conversations'
import type { Conversation } from '@/lib/conversations'

interface SpaceConversationHeaderMenuProps {
  conversation: Conversation
  isOrgContext: boolean
  onRenameRequested: () => void
  onCopyConversationLink: (conversationId: string) => void
  onCopyConversationId: (conversationId: string) => void
  onOpenConversationInNewTab: (conversationId: string) => void
  onShareConversation: (conversation: Conversation) => void
  onTogglePinConversation: (conversationId: string, pinned: boolean) => void | Promise<void>
  onToggleArchiveConversation: (conversationId: string, archived: boolean) => void | Promise<void>
  onMoveConversation: (conversationId: string, campaignId: string | null) => void | Promise<void>
  onDuplicateConversation: (
    conversationId: string,
    campaignId?: string | null,
  ) => void | Promise<void>
  onDeleteConversation: (conversationId: string) => void | Promise<void>
}

export function SpaceConversationHeaderMenu({
  conversation,
  isOrgContext,
  onRenameRequested,
  onCopyConversationLink,
  onCopyConversationId,
  onOpenConversationInNewTab,
  onShareConversation,
  onTogglePinConversation,
  onToggleArchiveConversation,
  onMoveConversation,
  onDuplicateConversation,
  onDeleteConversation,
}: SpaceConversationHeaderMenuProps) {
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setAnchor((current) =>
            current ? null : { top: rect.bottom + 4, left: rect.right - 224 },
          )
        }}
        className="btn-icon-bare hover:bg-hover-subtle"
        aria-label="Conversation details"
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        title="Conversation details"
      >
        <MoreHorizontal className="icon-sm" aria-hidden />
      </button>
      <SpaceConversationActionsSurface
        menuConversation={anchor ? conversation : null}
        menuAnchor={anchor}
        isOrgContext={isOrgContext}
        onClose={() => setAnchor(null)}
        onCopyConversationLink={onCopyConversationLink}
        onCopyConversationId={onCopyConversationId}
        onOpenConversationInNewTab={onOpenConversationInNewTab}
        onShareConversation={onShareConversation}
        onRenameConversation={onRenameRequested}
        onTogglePinConversation={onTogglePinConversation}
        onToggleArchiveConversation={onToggleArchiveConversation}
        onMoveConversation={onMoveConversation}
        onDuplicateConversation={onDuplicateConversation}
        onDeleteConversation={onDeleteConversation}
      />
    </>
  )
}
