import type { FlowBuildClarification } from '@vibey/api-shared/types/flow-builder'
import { patchMessageMetadata } from '@/features/studio/services/chat.service'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { buildFlowClarificationContentBlock } from './flow-clarification-ui'

function isPendingClarificationBlock(block: unknown) {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return false
  const record = block as Record<string, unknown>
  if (record.type !== 'clarification') return false
  const status = record.status
  return status !== 'submitted' && status !== 'skipped'
}

function isFlowClarificationBlock(block: unknown) {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return false
  const record = block as Record<string, unknown>
  return record.type === 'clarification' && record.source === 'flow'
}

export async function syncFlowClarificationsToChat(
  conversationId: string,
  clarifications: FlowBuildClarification[],
) {
  const block = buildFlowClarificationContentBlock(clarifications)
  if (!block) return

  const store = useChatStore.getState()
  const messages = store.messagesByConversation[conversationId] ?? []
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  if (!latestAssistant) return

  const blocks =
    (latestAssistant.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
  const withoutStaleFlowClarifications = blocks.filter(
    (candidate) => !isFlowClarificationBlock(candidate) || isPendingClarificationBlock(candidate),
  )
  if (withoutStaleFlowClarifications.some(isPendingClarificationBlock)) return

  const nextBlocks = [...withoutStaleFlowClarifications, block]
  store.setOrderedBlocks(conversationId, latestAssistant.id, nextBlocks)
  await patchMessageMetadata(conversationId, latestAssistant.id, {
    content_blocks_ordered: nextBlocks,
  })
}
