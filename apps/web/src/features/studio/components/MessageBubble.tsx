'use client'

import { memo, useCallback, useMemo } from 'react'
import { useVoiceApproval } from '@/components/chat/VoiceApprovalContext'
import { patchMessageMetadata, sendMessageStreaming } from '../services/chat.service'
import {
  useChatStore,
  type FlowTimelineBlock,
  type ImageGeneratedEvent,
} from '../store/use-chat-store'
import type {
  DocumentAttachment,
  HighlightedArtifact,
  MessageContentBlock,
  MessageReference,
} from '../types'
import { ChatAttachmentPreviews } from './chat/ChatAttachmentPreviews'
import { GeneratedAudio, GeneratedImage, GeneratedVideo } from './chat/InlineImageGen'
import { PersistedFlowTimeline, PersistedToolSteps } from './chat/StatusIndicator'
import { AssistantActions } from './message-bubble/AssistantActions'
import { MarkdownContent } from './message-bubble/MarkdownContent'
import type { MessageBubbleProps } from './message-bubble/message-bubble.types'
import { parseContent, type ParsedContentSegment } from './message-bubble/message-bubble.utils'
import { MessageBubbleOrderedBlocks } from './message-bubble/MessageBubbleOrderedBlocks'
import { PdfCard } from './message-bubble/PdfCard'
import { UserMessageBubble } from './message-bubble/UserMessageBubble'

const EMPTY_IMAGE_EVENTS: ImageGeneratedEvent[] = []

function MessageBubbleComponent({
  message,
  isStreaming = false,
  stickyUser = false,
  isEditable = false,
  onEditSubmit,
  conversationIdOverride,
  knownSkillKeys,
  agentKey,
  campaignId,
  onOpenDeliverablePreview,
  assistantInlineAction,
  allowFork = true,
  pinAssistantActions = false,
}: MessageBubbleProps) {
  const appendUiBlockToOrderedBlocks = useChatStore((s) => s.appendUiBlockToOrderedBlocks)
  const setOrderedBlocks = useChatStore((s) => s.setOrderedBlocks)
  const voiceApproval = useVoiceApproval()
  const isUser = message.role === 'user'
  const content = message.content ?? ''
  const messageDocuments = (message.metadata?.documents as DocumentAttachment[] | undefined) ?? []

  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const hasConversationOverride = conversationIdOverride !== undefined
  const effectiveConversationId = hasConversationOverride
    ? conversationIdOverride
    : activeConversationId
  const conversationStreamUi = useChatStore((s) =>
    hasConversationOverride && conversationIdOverride
      ? (s.conversationStreamUI[conversationIdOverride] ?? null)
      : null,
  )
  const globalImageGeneratedEvents = useChatStore((s) => s.imageGeneratedEvents)
  const streamingMessageId = useChatStore((s) =>
    effectiveConversationId
      ? (s.streamingMessageIdsByConversation[effectiveConversationId] ?? null)
      : null,
  )
  const imageGeneratedEvents = conversationIdOverride
    ? (conversationStreamUi?.imageGeneratedEvents ?? EMPTY_IMAGE_EVENTS)
    : hasConversationOverride
      ? EMPTY_IMAGE_EVENTS
      : globalImageGeneratedEvents

  const isReconnecting = useChatStore((s) =>
    effectiveConversationId
      ? s.reconnectingConversationIds.includes(effectiveConversationId)
      : false,
  )

  const isCurrentlyStreaming = isStreaming && message.id === streamingMessageId
  const isBeingWorkedOn =
    isCurrentlyStreaming ||
    (isStreaming && !message.metadata?.duration_ms) ||
    (isReconnecting && !message.metadata?.duration_ms)
  const sseImages: ImageGeneratedEvent[] = isCurrentlyStreaming ? imageGeneratedEvents : []

  if (isUser) {
    const highlightedArtifacts =
      (message.metadata?.highlighted_artifacts as HighlightedArtifact[] | undefined) ?? []
    const messageReferences =
      (message.metadata?.message_references as MessageReference[] | undefined) ?? []

    return (
      <UserMessageBubble
        messageId={message.id}
        content={content}
        documents={messageDocuments}
        highlightedArtifacts={highlightedArtifacts}
        messageReferences={messageReferences}
        stickyUser={stickyUser}
        isEditable={isEditable}
        onEditSubmit={onEditSubmit}
        conversationId={effectiveConversationId}
        knownSkillKeys={knownSkillKeys}
        agentKey={agentKey}
        campaignId={campaignId}
      />
    )
  }

  const contentBlocksOrdered =
    (message.metadata?.content_blocks_ordered as MessageContentBlock[]) ?? []
  const hasOrderedBlocks = contentBlocksOrdered.length > 0
  const replaceUiBlock = (blockId: string, nextBlock: MessageContentBlock) => {
    const nextBlocks = contentBlocksOrdered.map((candidate) =>
      candidate.id === blockId ? nextBlock : candidate,
    )
    setOrderedBlocks(
      message.conversation_id,
      message.id,
      nextBlocks as Array<Record<string, unknown>>,
    )
    void patchMessageMetadata(message.conversation_id, message.id, {
      content_blocks_ordered: nextBlocks,
    })
  }

  const messageDelegationId = (message.metadata as Record<string, unknown> | undefined)
    ?.delegation_id as string | undefined
  const sendOrApprove = useCallback(
    (sendContent: string) => {
      if (voiceApproval && messageDelegationId) {
        voiceApproval(messageDelegationId, sendContent)
      } else {
        void sendMessageStreaming({
          conversation_id: message.conversation_id,
          content: sendContent,
          suppressUserMessage: true,
        })
      }
    },
    [voiceApproval, messageDelegationId, message.conversation_id],
  )

  const persistedFlowBlocks = (message.metadata?.flow_blocks as FlowTimelineBlock[]) ?? []
  const rawSteps = (message.metadata?.tool_steps as Array<string | { label: string }>) ?? []
  const toolSteps = rawSteps.map((s) => (typeof s === 'string' ? s : s.label))
  const showPersistedFlow = !isStreaming && !hasOrderedBlocks && persistedFlowBlocks.length > 0
  const showPersistedSteps =
    !showPersistedFlow && !isStreaming && !hasOrderedBlocks && toolSteps.length > 0
  const segments = parseContent(content)
  const hasMedia = segments.some((s) => s.type !== 'text')
  const hasSseImages = sseImages.length > 0
  const renderedUrls = new Set(
    segments
      .filter((s): s is ParsedContentSegment & { type: 'image' } => s.type === 'image')
      .map((s) => s.url),
  )
  const uniqueSseImages = sseImages.filter((evt) => evt.url && !renderedUrls.has(evt.url))

  const latestPlanBlockIds = useMemo(() => {
    const lastIdxByPlanId = new Map<string, string>()
    for (const b of contentBlocksOrdered) {
      if (b.type === 'chat_plan' && b.plan_id) lastIdxByPlanId.set(b.plan_id, b.id)
    }
    return new Set(lastIdxByPlanId.values())
  }, [contentBlocksOrdered])

  const deliverableBlockSource = useMemo(
    () =>
      onOpenDeliverablePreview
        ? {
            messageId: message.id,
            createdAt: message.created_at,
            agentKey: agentKey ?? null,
          }
        : null,
    [onOpenDeliverablePreview, message.id, message.created_at, agentKey],
  )

  if (hasOrderedBlocks) {
    return (
      <MessageBubbleOrderedBlocks
        message={message}
        conversationId={effectiveConversationId}
        content={content}
        contentBlocksOrdered={contentBlocksOrdered}
        messageDocuments={messageDocuments}
        isCurrentlyStreaming={isCurrentlyStreaming}
        isBeingWorkedOn={isBeingWorkedOn}
        latestPlanBlockIds={latestPlanBlockIds}
        uniqueSseImages={uniqueSseImages}
        replaceUiBlock={replaceUiBlock}
        appendUiBlockToOrderedBlocks={appendUiBlockToOrderedBlocks}
        setOrderedBlocks={setOrderedBlocks}
        sendOrApprove={sendOrApprove}
        deliverableBlockSource={deliverableBlockSource}
        onOpenDeliverablePreview={onOpenDeliverablePreview}
        assistantInlineAction={assistantInlineAction}
        allowFork={allowFork}
        pinAssistantActions={pinAssistantActions}
      />
    )
  }

  if (!hasMedia && !hasSseImages && !showPersistedSteps) {
    return (
      <div data-message={message.id} className="body-1 text-chat px-spacing-2 group flex flex-col">
        <div className="gap-spacing-3 flex flex-col">
          <MarkdownContent content={content} streaming={isCurrentlyStreaming} />
          <ChatAttachmentPreviews documents={messageDocuments} />
        </div>
        <AssistantActions
          content={content}
          isStreaming={isBeingWorkedOn}
          messageId={message.id}
          conversationId={effectiveConversationId ?? undefined}
          allowFork={allowFork}
          inlineAction={assistantInlineAction}
          pinActions={pinAssistantActions}
        />
      </div>
    )
  }

  const lastTextSegmentIndex = isCurrentlyStreaming
    ? segments.reduce((idx, segment, i) => (segment.type === 'text' ? i : idx), -1)
    : -1

  return (
    <div data-message={message.id} className="body-1 text-chat px-spacing-2 group flex flex-col">
      <div className="gap-spacing-3 flex flex-col">
        {showPersistedFlow && <PersistedFlowTimeline blocks={persistedFlowBlocks} />}
        {showPersistedSteps && <PersistedToolSteps steps={toolSteps} />}

        {segments.map((segment, i) => {
          if (segment.type === 'text') {
            return (
              <MarkdownContent
                key={i}
                content={segment.value}
                streaming={isCurrentlyStreaming && i === lastTextSegmentIndex}
              />
            )
          }
          if (segment.type === 'video') {
            return <GeneratedVideo key={`vid-${i}`} url={segment.url} prompt={segment.prompt} />
          }
          if (segment.type === 'audio') {
            return <GeneratedAudio key={`aud-${i}`} url={segment.url} prompt={segment.prompt} />
          }
          if (segment.type === 'pdf') {
            return <PdfCard key={`pdf-${i}`} url={segment.url} label={segment.label} />
          }
          return <GeneratedImage key={`img-${i}`} url={segment.url} prompt={segment.alt} />
        })}

        {uniqueSseImages.map((evt, i) => (
          <GeneratedImage
            key={`sse-img-${evt.timestamp}-${i}`}
            url={evt.url}
            prompt={evt.target !== 'general' ? `Image for ${evt.target}` : undefined}
          />
        ))}
        <ChatAttachmentPreviews documents={messageDocuments} />
      </div>
      <AssistantActions
        content={content}
        isStreaming={isBeingWorkedOn}
        messageId={message.id}
        conversationId={effectiveConversationId ?? undefined}
        allowFork={allowFork}
        inlineAction={assistantInlineAction}
        pinActions={pinAssistantActions}
      />
    </div>
  )
}

export const MessageBubble = memo(
  MessageBubbleComponent,
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.metadata === next.message.metadata &&
    prev.isStreaming === next.isStreaming &&
    prev.stickyUser === next.stickyUser &&
    prev.isEditable === next.isEditable &&
    prev.onEditSubmit === next.onEditSubmit &&
    prev.conversationIdOverride === next.conversationIdOverride &&
    prev.knownSkillKeys === next.knownSkillKeys &&
    prev.agentKey === next.agentKey &&
    prev.campaignId === next.campaignId &&
    prev.onOpenDeliverablePreview === next.onOpenDeliverablePreview &&
    prev.assistantInlineAction === next.assistantInlineAction &&
    prev.allowFork === next.allowFork &&
    prev.pinAssistantActions === next.pinAssistantActions,
)
