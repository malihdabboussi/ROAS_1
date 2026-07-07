'use client'

import {
  isConversationArchived,
  isConversationPinned,
  type Conversation,
} from '@/lib/conversations'
import { ConversationActionsMenu } from './ConversationActionsMenu'

interface SpaceConversationActionsSurfaceProps {
  menuConversation: Conversation | null
  menuAnchor: { top: number; left: number } | null
  isOrgContext: boolean
  onClose: () => void
  onCopyConversationLink: (conversationId: string) => void
  onCopyConversationId?: (conversationId: string) => void
  onOpenConversationInNewTab?: (conversationId: string) => void
  onShareConversation: (conversation: Conversation) => void
  onRenameConversation: (conversation: Conversation) => void
  onTogglePinConversation: (conversationId: string, pinned: boolean) => void | Promise<void>
  onToggleArchiveConversation: (conversationId: string, archived: boolean) => void | Promise<void>
  onMoveConversation: (conversationId: string, campaignId: string | null) => void | Promise<void>
  onDuplicateConversation: (
    conversationId: string,
    campaignId?: string | null,
  ) => void | Promise<void>
  onDeleteConversation: (conversationId: string) => void
}

function hasLevel(conversation: Conversation | null, required: 'view' | 'edit' | 'admin') {
  if (!conversation) return false
  const weight = { view: 1, edit: 2, admin: 3 } as const
  const level = conversation.effective_level ?? 'admin'
  return weight[level] >= weight[required]
}

export function SpaceConversationActionsSurface({
  menuConversation,
  menuAnchor,
  isOrgContext,
  onClose,
  onCopyConversationLink,
  onCopyConversationId,
  onOpenConversationInNewTab,
  onShareConversation,
  onRenameConversation,
  onTogglePinConversation,
  onToggleArchiveConversation,
  onMoveConversation,
  onDuplicateConversation,
  onDeleteConversation,
}: SpaceConversationActionsSurfaceProps) {
  return (
    <ConversationActionsMenu
      open={menuConversation !== null}
      anchor={menuAnchor}
      isPinned={menuConversation ? isConversationPinned(menuConversation) : false}
      isArchived={menuConversation ? isConversationArchived(menuConversation) : false}
      currentCampaignId={menuConversation?.campaign_id ?? null}
      showCopyLink={isOrgContext}
      showShare
      shareEnabled={isOrgContext}
      canEdit={hasLevel(menuConversation, 'edit')}
      canAdmin={hasLevel(menuConversation, 'admin')}
      onClose={onClose}
      onCopyLink={() => menuConversation && onCopyConversationLink(menuConversation.id)}
      onCopyId={
        onCopyConversationId && menuConversation
          ? () => onCopyConversationId(menuConversation.id)
          : undefined
      }
      onOpenInNewTab={
        onOpenConversationInNewTab && menuConversation
          ? () => onOpenConversationInNewTab(menuConversation.id)
          : undefined
      }
      onShare={() => menuConversation && onShareConversation(menuConversation)}
      onRename={() => menuConversation && onRenameConversation(menuConversation)}
      onTogglePin={() =>
        menuConversation &&
        void onTogglePinConversation(menuConversation.id, !isConversationPinned(menuConversation))
      }
      onMoveTo={(campaignId) =>
        menuConversation && void onMoveConversation(menuConversation.id, campaignId)
      }
      onDuplicate={() => menuConversation && void onDuplicateConversation(menuConversation.id)}
      onDuplicateTo={(campaignId) =>
        menuConversation && void onDuplicateConversation(menuConversation.id, campaignId)
      }
      onToggleArchive={() =>
        menuConversation &&
        void onToggleArchiveConversation(
          menuConversation.id,
          !isConversationArchived(menuConversation),
        )
      }
      onDelete={() => menuConversation && onDeleteConversation(menuConversation.id)}
    />
  )
}
