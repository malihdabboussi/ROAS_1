import { useChatStore } from '@/features/studio/store/use-chat-store'
import {
  setConversationPinned,
  withConversationPinned,
  type Conversation,
} from '@/lib/conversations'
import { invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'

export function mergeStoreConversationRow(
  row: Conversation,
  storeRow: Conversation,
): Conversation {
  return {
    ...row,
    ...storeRow,
    metadata: { ...row.metadata, ...storeRow.metadata },
  }
}

function applyMetadata(
  conversationId: string,
  metadata: Conversation['metadata'],
  setConversations: (updater: (prev: Conversation[]) => Conversation[]) => void,
) {
  useChatStore.getState().updateConversation(conversationId, { metadata })
  setConversations((prev) =>
    prev.map((row) => (row.id === conversationId ? { ...row, metadata } : row)),
  )
}

export async function persistConversationPinned(input: {
  conversationId: string
  pinned: boolean
  current: Conversation | undefined
  setConversations: (updater: (prev: Conversation[]) => Conversation[]) => void
}): Promise<void> {
  const previous = input.current ?? null
  if (input.current) {
    applyMetadata(
      input.conversationId,
      withConversationPinned(input.current, input.pinned).metadata,
      input.setConversations,
    )
  }
  try {
    const updated = await setConversationPinned(input.conversationId, input.pinned)
    invalidateCachedFetch('shell-conversations:')
    applyMetadata(input.conversationId, updated.metadata, input.setConversations)
  } catch (error) {
    if (previous) applyMetadata(input.conversationId, previous.metadata, input.setConversations)
    throw error
  }
}
