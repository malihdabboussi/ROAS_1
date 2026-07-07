'use client'

import { useMemo, type ReactNode } from 'react'
import type { MissionDeliverable } from '@/features/mission-control/types'
import { BrowserPreviewPanel } from '@/features/studio/components/chat/BrowserPreviewPanel'
import { LockedInGroup } from '@/features/studio/components/chat/LockedInGroup'
import { FinalOutputCards } from '@/features/studio/components/message-bubble/FinalOutputCards'
import {
  buildFinalAnswerLayoutSegments,
  buildOrderedLayoutSegments,
  coalesceConsecutiveReadTools,
  extractBrowserPanelData,
  formatDuration,
  type OrderedLayoutBaseSegment,
  type OrderedLayoutSegment,
} from '@/features/studio/components/message-bubble/message-bubble.utils'
import { MessageContentBlockSwitch } from '@/features/studio/components/message-bubble/MessageContentBlockSwitch'
import type { Message, MessageContentBlock } from '@/features/studio/types'
import type { ChannelMessage } from '../services/channels.service'
import { CampaignContextConfirmCard } from './CampaignContextConfirmCard'

const NOOP_REPLACE_UI_BLOCK = (_blockId: string, _nextBlock: MessageContentBlock) => {}
const NOOP_APPEND_UI_BLOCK = (
  _channelId: string,
  _messageId: string,
  _block: MessageContentBlock,
) => {}
const NOOP_SET_ORDERED_BLOCKS = (
  _channelId: string,
  _messageId: string,
  _blocks: Array<Record<string, unknown>>,
) => {}
const NOOP_SEND = (_content: string) => {}

export function ChannelOrderedBlocks({
  channelId,
  messageId,
  blocks,
  isStreaming,
  sourceMessage,
  onOpenDeliverablePreview,
  /** When source message is a user row (brainstorm progress), attribute preview to this agent */
  previewAgentKey,
  /** Task activity opts into the completed "Worked for..." wrapper; channel messages stay unchanged. */
  collapseCompletedWorkSummary = false,
  durationMs,
}: {
  channelId: string
  messageId: string
  blocks: MessageContentBlock[]
  isStreaming: boolean
  sourceMessage: ChannelMessage
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  previewAgentKey?: string | null
  collapseCompletedWorkSummary?: boolean
  durationMs?: number
}) {
  const latestPlanBlockIds = useMemo(() => {
    const lastIdxByPlanId = new Map<string, string>()
    for (const block of blocks) {
      if (block.type === 'chat_plan' && block.plan_id) {
        lastIdxByPlanId.set(block.plan_id, block.id)
      }
    }
    return new Set(lastIdxByPlanId.values())
  }, [blocks])

  const lastTextBlockId = isStreaming
    ? ([...blocks].reverse().find((block) => block.type === 'text')?.id ?? null)
    : null
  const isBeingWorkedOn =
    isStreaming ||
    blocks.some(
      (block) =>
        (block.type === 'tool' ||
          block.type === 'generation' ||
          block.type === 'thinking_transcript') &&
        block.state === 'active',
    )

  const displayBlocks = useMemo(
    () => coalesceConsecutiveReadTools(blocks, isStreaming),
    [blocks, isStreaming],
  )
  const shouldShowWorkedSummary =
    collapseCompletedWorkSummary && !isBeingWorkedOn && durationMs != null
  const { segments, toolIdxAfterPass } = shouldShowWorkedSummary
    ? buildFinalAnswerLayoutSegments(displayBlocks)
    : buildOrderedLayoutSegments(displayBlocks)
  const { browserScreenshots, browserActions, browserBlockIds, hasBrowserPanel } =
    extractBrowserPanelData(displayBlocks)
  const workedSummaryLabel =
    durationMs != null && durationMs > 0 ? `Worked for ${formatDuration(durationMs)}` : 'Worked'

  const syntheticMessage: Message = {
    id: messageId,
    conversation_id: channelId,
    role: 'assistant',
    content: null,
    content_blocks: null,
    metadata: {},
    created_at: new Date().toISOString(),
  }

  let browserPanelRendered = false
  const channelSource = {
    messageId: sourceMessage.id,
    createdAt: sourceMessage.created_at,
    agentKey:
      previewAgentKey ?? (sourceMessage.sender_type === 'agent' ? sourceMessage.sender_id : null),
  }

  const renderBlock = (block: MessageContentBlock) => {
    // Channel-local interactive card — the studio block switch only gets NOOP
    // handlers here, so it cannot resolve confirmations itself.
    if (block.type === 'campaign_context_confirm') {
      return (
        <CampaignContextConfirmCard
          key={block.id}
          block={block}
          channelId={channelId}
          messageId={sourceMessage.id}
          allBlocks={blocks}
        />
      )
    }
    return renderStudioBlock(block)
  }

  const renderStudioBlock = (block: MessageContentBlock) => (
    <MessageContentBlockSwitch
      key={block.id}
      block={block}
      ctx={{
        message: syntheticMessage,
        contentBlocksOrdered: blocks,
        isCurrentlyStreaming: isStreaming,
        isBeingWorkedOn,
        lastTextBlockId,
        latestPlanBlockIds,
        toolStyleIndex: toolIdxAfterPass - 1,
        replaceUiBlock: NOOP_REPLACE_UI_BLOCK,
        appendUiBlockToOrderedBlocks: NOOP_APPEND_UI_BLOCK,
        setOrderedBlocks: NOOP_SET_ORDERED_BLOCKS,
        sendOrApprove: NOOP_SEND,
        channelSource,
        onOpenDeliverablePreview,
      }}
    />
  )

  function renderLayoutSegments(
    layoutSegments: Array<OrderedLayoutBaseSegment | OrderedLayoutSegment>,
    keyPrefix: string,
  ): ReactNode[] {
    return layoutSegments.map((segment, segmentIndex) => {
      const segmentKey = `${keyPrefix}-${segmentIndex}`

      if (segment.kind === 'worked_summary') {
        const key = `${segmentKey}-${segment.blocks[0]?.id ?? 'worked-summary'}`
        return (
          <LockedInGroup
            key={key}
            blocks={segment.blocks}
            isStreaming={isStreaming}
            toolIdxOffset={segment.toolIdxOffset}
            mode="summary"
            summaryLabel={workedSummaryLabel}
          >
            <div className="gap-spacing-3 flex flex-col">
              {renderLayoutSegments(segment.segments, `${segmentKey}-summary`)}
            </div>
          </LockedInGroup>
        )
      }
      if (segment.kind === 'final_outputs') {
        return (
          <FinalOutputCards
            key={`${segmentKey}-final-outputs`}
            blocks={segment.blocks}
            deliverableSource={channelSource}
            onOpenDeliverablePreview={onOpenDeliverablePreview}
          />
        )
      }

      if (segment.kind === 'locked_in') {
        const key = `${segmentKey}-${segment.blocks[0]?.id ?? 'locked'}`
        const nonBrowserBlocks = segment.blocks.filter((block) => !browserBlockIds.has(block.id))
        const hasFirstBrowserBlock = segment.blocks.some((block) => browserBlockIds.has(block.id))
        const showPanel = hasBrowserPanel && hasFirstBrowserBlock && !browserPanelRendered
        if (showPanel) browserPanelRendered = true

        return (
          <div key={key}>
            {nonBrowserBlocks.length > 0 && (
              <LockedInGroup
                blocks={nonBrowserBlocks}
                isStreaming={isStreaming}
                toolIdxOffset={segment.toolIdxOffset}
              />
            )}
            {showPanel && (
              <BrowserPreviewPanel
                screenshots={browserScreenshots}
                actions={browserActions}
                isStreaming={isStreaming}
              />
            )}
          </div>
        )
      }

      const block = segment.block
      if (browserBlockIds.has(block.id)) {
        if (hasBrowserPanel && !browserPanelRendered) {
          browserPanelRendered = true
          return (
            <BrowserPreviewPanel
              key={`${segmentKey}-browser-panel-${block.id}`}
              screenshots={browserScreenshots}
              actions={browserActions}
              isStreaming={isStreaming}
            />
          )
        }
        return null
      }

      return renderBlock(block)
    })
  }

  return <div className="flex flex-col gap-1">{renderLayoutSegments(segments, 'main')}</div>
}
