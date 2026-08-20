import {
  appendRetrievalReceipt,
  appendWebResearchSource,
  isBrainRetrievalReceipt,
  isWebResearchSource,
} from '@/lib/conversations/retrieval-receipts'
import { useChatStore } from '../store/use-chat-store'

export function applySourcePanelEvent(
  conversationId: string,
  messageId: string,
  payload: Record<string, unknown>,
): void {
  const store = useChatStore.getState()
  const current = (store.messagesByConversation[conversationId] ?? []).find(
    (message) => message.id === messageId,
  )
  if (!current) return
  const metadata = { ...(current.metadata ?? {}) }
  if (isBrainRetrievalReceipt(payload)) {
    metadata.retrieval_receipts = appendRetrievalReceipt(
      current.metadata?.retrieval_receipts,
      payload,
    )
  } else if (isWebResearchSource(payload)) {
    metadata.web_research_urls = appendWebResearchSource(
      current.metadata?.web_research_urls,
      payload,
    )
  } else {
    return
  }
  store.updateMessage(conversationId, messageId, { metadata })
}
