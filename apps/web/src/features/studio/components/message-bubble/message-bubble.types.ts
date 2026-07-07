import type { ReactNode } from 'react'
import type { MissionDeliverable } from '@/lib/missions'
import type { ChatModelSettings } from '../../services/chat.service'
import type { DocumentAttachment, Message, MessageContentBlock } from '../../types'

export type ContentBlockChannelSource = {
  messageId: string
  createdAt: string
  agentKey: string | null
}

export type ContentBlockRenderContext = {
  message: Message
  contentBlocksOrdered: MessageContentBlock[]
  isCurrentlyStreaming: boolean
  isBeingWorkedOn: boolean
  lastTextBlockId: string | null
  toolStyleIndex: number
  latestPlanBlockIds: Set<string>
  replaceUiBlock: (blockId: string, nextBlock: MessageContentBlock) => void
  appendUiBlockToOrderedBlocks: (
    conversationId: string,
    messageId: string,
    block: MessageContentBlock,
  ) => void
  setOrderedBlocks: (
    conversationId: string,
    messageId: string,
    blocks: Array<Record<string, unknown>>,
  ) => void
  sendOrApprove: (content: string) => void
  /** Channel chat / thread: identifies the parent message when mapping blocks → MissionDeliverable */
  channelSource?: ContentBlockChannelSource | null
  /** Studio campaign chat: synthetic source when not in a channel */
  deliverableBlockSource?: ContentBlockChannelSource | null
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
}

export interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  stickyUser?: boolean
  isEditable?: boolean
  onEditSubmit?: (
    newContent: string,
    documents?: DocumentAttachment[],
    model?: string,
    modelSettings?: ChatModelSettings,
  ) => void
  /** When provided (e.g. team chat, widget), use instead of activeConversationId for streaming lookup */
  conversationIdOverride?: string | null
  /** Known skill keys for teal vs purple slash-command highlighting */
  knownSkillKeys?: Set<string>
  /** Agent key used to fetch skills/workflows in the inline edit ChatInput */
  agentKey?: string
  /** Campaign id used to fetch @ mention data in the inline edit ChatInput */
  campaignId?: string
  /** Campaign studio chat opens the same DeliverablePreviewModal as channels */
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  /** Inline button rendered inside AssistantActions, immediately left of the 3-dot menu. */
  assistantInlineAction?: ReactNode
  /** Allows surfaces without authenticated Studio context to hide the assistant fork action. */
  allowFork?: boolean
  /** When true, post-turn actions stay visible; otherwise they appear on message hover. */
  pinAssistantActions?: boolean
}
