'use client'

import { useMemo, type ReactNode } from 'react'
import type { MissionDeliverable } from '@/lib/missions'
import type { ImageGeneratedEvent } from '../../store/use-chat-store'
import type { DocumentAttachment, Message, MessageContentBlock } from '../../types'
import { BrowserPreviewPanel } from '../chat/BrowserPreviewPanel'
import { ChatAttachmentPreviews } from '../chat/ChatAttachmentPreviews'
import { GeneratedImage } from '../chat/InlineImageGen'
import { LockedInGroup } from '../chat/LockedInGroup'
import { AssistantActions } from './AssistantActions'
import { FinalOutputCards } from './FinalOutputCards'
import type { ContentBlockRenderContext } from './message-bubble.types'
import {
  buildFinalAnswerLayoutSegments,
  buildOrderedLayoutSegments,
  coalesceConsecutiveReadTools,
  extractBrowserPanelData,
  formatDuration,
  type OrderedLayoutBaseSegment,
  type OrderedLayoutSegment,
} from './message-bubble.utils'
import { MessageContentBlockSwitch } from './MessageContentBlockSwitch'

export function MessageBubbleOrderedBlocks({
  message,
  content,
  contentBlocksOrdered,
  messageDocuments,
  isCurrentlyStreaming,
  isBeingWorkedOn,
  latestPlanBlockIds,
  uniqueSseImages,
  replaceUiBlock,
  appendUiBlockToOrderedBlocks,
  setOrderedBlocks,
  sendOrApprove,
  deliverableBlockSource,
  onOpenDeliverablePreview,
  assistantInlineAction,
  allowFork = true,
  pinAssistantActions = false,
}: {
  message: Message
  content: string
  contentBlocksOrdered: MessageContentBlock[]
  messageDocuments: DocumentAttachment[]
  isCurrentlyStreaming: boolean
  isBeingWorkedOn: boolean
  latestPlanBlockIds: Set<string>
  uniqueSseImages: ImageGeneratedEvent[]
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
  deliverableBlockSource?: ContentBlockRenderContext['deliverableBlockSource']
  onOpenDeliverablePreview?: (d: MissionDeliverable) => void
  assistantInlineAction?: ReactNode
  allowFork?: boolean
  pinAssistantActions?: boolean
}) {
  const lastTextBlockId = isCurrentlyStreaming
    ? ([...contentBlocksOrdered].reverse().find((b) => b.type === 'text')?.id ?? null)
    : null

  /** Render-only view: merge consecutive `read` tool blocks into one live row that rotates label until a non-read tool starts or streaming ends. Source-of-truth `contentBlocksOrdered` stays intact for callbacks / persistence. */
  const displayBlocks = useMemo(
    () => coalesceConsecutiveReadTools(contentBlocksOrdered, isCurrentlyStreaming),
    [contentBlocksOrdered, isCurrentlyStreaming],
  )
  const storedDurationMs =
    typeof message.metadata?.duration_ms === 'number' ? message.metadata.duration_ms : undefined

  const shouldShowWorkedSummary = !isBeingWorkedOn && storedDurationMs != null
  const { segments, toolIdxAfterPass } = shouldShowWorkedSummary
    ? buildFinalAnswerLayoutSegments(displayBlocks)
    : buildOrderedLayoutSegments(displayBlocks)
  const { browserScreenshots, browserActions, browserBlockIds, hasBrowserPanel } =
    extractBrowserPanelData(displayBlocks)
  const workedSummaryLabel =
    storedDurationMs != null && storedDurationMs > 0
      ? `Worked for ${formatDuration(storedDurationMs)}`
      : 'Worked'

  let browserPanelRendered = false

  const blockCtxBase: Omit<ContentBlockRenderContext, 'toolStyleIndex'> = {
    message,
    contentBlocksOrdered,
    isCurrentlyStreaming,
    isBeingWorkedOn,
    lastTextBlockId,
    latestPlanBlockIds,
    replaceUiBlock,
    appendUiBlockToOrderedBlocks,
    setOrderedBlocks,
    sendOrApprove,
    deliverableBlockSource,
    onOpenDeliverablePreview,
  }

  function renderLayoutSegments(
    layoutSegments: Array<OrderedLayoutBaseSegment | OrderedLayoutSegment>,
    keyPrefix: string,
  ): ReactNode[] {
    return layoutSegments.map((seg, segIdx) => {
      const segmentKey = `${keyPrefix}-${segIdx}`
      if (seg.kind === 'worked_summary') {
        const key = `${segmentKey}-${seg.blocks[0]?.id ?? 'worked-summary'}`
        return (
          <LockedInGroup
            key={key}
            blocks={seg.blocks}
            isStreaming={isCurrentlyStreaming}
            toolIdxOffset={seg.toolIdxOffset}
            mode="summary"
            summaryLabel={workedSummaryLabel}
          >
            <div className="gap-spacing-3 flex flex-col">
              {renderLayoutSegments(seg.segments, `${segmentKey}-summary`)}
            </div>
          </LockedInGroup>
        )
      }
      if (seg.kind === 'final_outputs') {
        return (
          <FinalOutputCards
            key={`${segmentKey}-final-outputs`}
            blocks={seg.blocks}
            deliverableSource={deliverableBlockSource}
            onOpenDeliverablePreview={onOpenDeliverablePreview}
          />
        )
      }
      if (seg.kind === 'locked_in') {
        const key = `${segmentKey}-${seg.blocks[0]?.id ?? 'locked'}`
        const nonBrowserBlocks = seg.blocks.filter((b) => !browserBlockIds.has(b.id))
        const hasFirstBrowserBlock = seg.blocks.some((b) => browserBlockIds.has(b.id))
        const showPanel = hasBrowserPanel && hasFirstBrowserBlock && !browserPanelRendered
        if (showPanel) browserPanelRendered = true
        return (
          <div key={key}>
            {nonBrowserBlocks.length > 0 && (
              <LockedInGroup
                blocks={nonBrowserBlocks}
                isStreaming={isCurrentlyStreaming}
                toolIdxOffset={seg.toolIdxOffset}
              />
            )}
            {showPanel && (
              <BrowserPreviewPanel
                screenshots={browserScreenshots}
                actions={browserActions}
                isStreaming={isCurrentlyStreaming}
              />
            )}
          </div>
        )
      }
      const block = seg.block
      if (browserBlockIds.has(block.id)) {
        if (hasBrowserPanel && !browserPanelRendered) {
          browserPanelRendered = true
          return (
            <BrowserPreviewPanel
              key={`${segmentKey}-browser-panel-${block.id}`}
              screenshots={browserScreenshots}
              actions={browserActions}
              isStreaming={isCurrentlyStreaming}
            />
          )
        }
        return null
      }
      return (
        <MessageContentBlockSwitch
          key={`${segmentKey}-${block.id}`}
          block={block}
          ctx={{
            ...blockCtxBase,
            toolStyleIndex: toolIdxAfterPass - 1,
          }}
        />
      )
    })
  }

  return (
    <div data-message={message.id} className="body-1 text-chat group mx-2 flex min-w-0 flex-col overflow-x-hidden">
      <div className="gap-spacing-3 flex min-w-0 flex-col overflow-x-hidden">
        {renderLayoutSegments(segments, 'main')}
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
        conversationId={message.conversation_id}
        allowFork={allowFork}
        inlineAction={assistantInlineAction}
        pinActions={pinAssistantActions}
      />
    </div>
  )
}
