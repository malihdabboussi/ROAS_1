'use client'

export {
  clearConversationTeamDraft,
  createNewConversation,
  deleteConversation,
  deleteMessagesFrom,
  duplicateConversation,
  fetchConversations,
  fetchMessages,
  getOrCreateAgentConversation,
  isStreamActive,
  mergeMessagesPreservingOrderedBlocks,
  needsStreamRecovery,
  recoverConversation,
  renameConversation,
  requestStopStream,
  selectConversation,
  sendMessageStreaming,
  shouldSkipStreamRecovery,
  suggestConversationTitle,
} from '@/features/studio/services/chat.service'
export { initStreamResilience } from '@/features/studio/services/stream-resilience'
export { useChatStore } from '@/features/studio/store/use-chat-store'
export type {
  Conversation,
  DocumentAttachment,
  HighlightedArtifact,
  Message,
  MessageReference,
} from '@/features/studio/types'
