import { useChatStore } from '@/features/studio/store/use-chat-store'
import { invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { clientScopeMatchesRecord, type ResolvedClientScope } from '@/lib/client-scope'
import {
  setConversationPinned,
  withConversationPinned,
  type Conversation,
} from '@/lib/conversations'

export function mergeConversationsWithStore(
  prev: Conversation[],
  storeConversations: Conversation[],
  historyAgentKey: string | null,
  clientScope?: ResolvedClientScope | null,
): Conversation[] {
  const scopedStoreRows = storeConversations.filter(
    (row) =>
      (historyAgentKey === null || row.agent_id === historyAgentKey) &&
      (!clientScope || clientScopeMatchesRecord(clientScope, row)),
  )
  if (scopedStoreRows.length === 0) return prev
  const previousIds = new Set(prev.map((row) => row.id))
  const storeRowById = new Map(scopedStoreRows.map((row) => [row.id, row]))
  const insertedRows = scopedStoreRows.filter((row) => !previousIds.has(row.id))
  let changed = insertedRows.length > 0
  const mergedRows = prev.map((row) => {
    const storeRow = storeRowById.get(row.id)
    if (!storeRow) return row
    const merged = mergeStoreConversationRow(row, storeRow)
    if (merged !== row) changed = true
    return merged
  })
  if (!changed) return prev
  return [...insertedRows, ...mergedRows]
}

export function mergeStoreConversationRow(row: Conversation, storeRow: Conversation): Conversation {
  const metadata = { ...row.metadata, ...storeRow.metadata }
  const next: Conversation = {
    ...row,
    ...storeRow,
    metadata,
  }
  if (
    next.title === row.title &&
    next.updated_at === row.updated_at &&
    next.campaign_id === row.campaign_id &&
    next.agent_id === row.agent_id &&
    next.status === row.status &&
    next.last_message_at === row.last_message_at &&
    next.is_unread === row.is_unread &&
    next.needs_action === row.needs_action &&
    JSON.stringify(next.metadata) === JSON.stringify(row.metadata)
  ) {
    return row
  }
  return next
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
