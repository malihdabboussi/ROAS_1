import type { ReactNode } from 'react'
import { missionDeliverableFromContentBlock } from '@/lib/missions'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import type { MessageContentBlock } from '../../types'
import { ToolBlockInline } from '../chat/FlowTimeline'
import { GeneratedAudio, GeneratedImage, GeneratedVideo } from '../chat/InlineImageGen'
import { IntegrationConnectCard } from '../chat/IntegrationConnectCard'
import { SessionCompactionDivider } from '../chat/SessionCompactionDivider'
import { ThinkingTranscriptBlock } from '../chat/ThinkingTranscriptBlock'
import { ToolContentPreview } from '../chat/ToolContentPreview'
import { MarkdownContent } from './MarkdownContent'
import { messageContentBlockMeta } from './MessageContentBlockSwitchMeta'
import type { ContentBlockRenderContext } from './message-bubble.types'
import { isInvalidIntegrationConnectProvider, parseContent } from './message-bubble.utils'
import { PdfCard } from './PdfCard'

export function messageContentBlockPartA(
  block: MessageContentBlock,
  ctx: ContentBlockRenderContext,
): ReactNode | undefined {
  const {
    isCurrentlyStreaming,
    isBeingWorkedOn,
    lastTextBlockId,
    toolStyleIndex,
    sendOrApprove,
    channelSource,
    deliverableBlockSource,
    onOpenDeliverablePreview,
  } = ctx

  if (block.type === 'pdf_file' || block.type === 'docx_file') {
    const deliverableSource = channelSource ?? deliverableBlockSource
    const openPreview =
      deliverableSource && onOpenDeliverablePreview
        ? missionDeliverableFromContentBlock(block, {
            messageId: deliverableSource.messageId,
            createdAt: deliverableSource.createdAt,
            agentKey: deliverableSource.agentKey,
          })
        : null
    if (openPreview && onOpenDeliverablePreview) {
      return (
        <button
          key={block.id}
          type="button"
          onClick={() => onOpenDeliverablePreview(openPreview)}
          className="hover:bg-hover-subtle w-full max-w-[400px] cursor-pointer rounded-xl text-left transition-colors"
        >
          <PdfCard url={block.url} label={block.label} />
        </button>
      )
    }
    return <PdfCard key={block.id} url={block.url} label={block.label} />
  }

  if (block.type === 'media_asset') {
    const deliverableSource = channelSource ?? deliverableBlockSource
    const openPreview =
      deliverableSource && onOpenDeliverablePreview
        ? missionDeliverableFromContentBlock(block, {
            messageId: deliverableSource.messageId,
            createdAt: deliverableSource.createdAt,
            agentKey: deliverableSource.agentKey,
          })
        : null
    const body =
      block.kind === 'video' ? (
        <GeneratedVideo url={block.url} prompt={block.prompt} />
      ) : block.kind === 'audio' ? (
        <GeneratedAudio url={block.url} prompt={block.prompt} />
      ) : block.kind === 'file' ? (
        <PdfCard url={block.url} label={block.fileName ?? block.title} />
      ) : (
        <GeneratedImage
          url={block.url}
          prompt={block.prompt ?? block.title}
          mediaAssetId={block.mediaAssetId}
          spaceId={block.spaceId}
        />
      )
    if (openPreview && onOpenDeliverablePreview) {
      return (
        <button
          key={block.id}
          type="button"
          onClick={() => onOpenDeliverablePreview(openPreview)}
          className="hover:bg-hover-subtle w-full max-w-[400px] cursor-pointer rounded-xl text-left transition-colors"
        >
          {body}
        </button>
      )
    }
    return <div key={block.id}>{body}</div>
  }

  if (block.type === 'text') {
    if (!block.content.trim()) return null
    const isStreamingText = isCurrentlyStreaming && block.id === lastTextBlockId
    const textSegs = parseContent(block.content)
    const hasInlineMedia = textSegs.some((s) => s.type !== 'text')
    if (!hasInlineMedia) {
      return <MarkdownContent key={block.id} content={block.content} streaming={isStreamingText} />
    }
    const lastTxtIdx = isStreamingText
      ? textSegs.reduce((idx, s, i) => (s.type === 'text' ? i : idx), -1)
      : -1
    return (
      <div key={block.id}>
        {textSegs.map((ts, si) => {
          if (ts.type === 'text')
            return (
              <MarkdownContent
                key={si}
                content={ts.value}
                streaming={isStreamingText && si === lastTxtIdx}
              />
            )
          if (ts.type === 'video')
            return <GeneratedVideo key={`vid-${si}`} url={ts.url} prompt={ts.prompt} />
          if (ts.type === 'audio')
            return <GeneratedAudio key={`aud-${si}`} url={ts.url} prompt={ts.prompt} />
          if (ts.type === 'pdf') return <PdfCard key={`pdf-${si}`} url={ts.url} label={ts.label} />
          return <GeneratedImage key={`img-${si}`} url={ts.url} prompt={ts.alt} />
        })}
      </div>
    )
  }

  if (block.type === 'session_compaction') {
    const isActive = isBeingWorkedOn && block.state === 'active'
    return <SessionCompactionDivider key={block.id} label={block.label} isActive={isActive} />
  }

  if (block.type === 'generation') {
    const isActive = isBeingWorkedOn && block.state === 'active'
    return (
      <div key={block.id} className="my-2 flex items-center gap-2.5 py-0.5">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
          <VibeyChatOrb state="streaming" style="elastic" />
        </div>
        <span
          className={`body-3 font-medium ${
            isActive ? 'text-shimmer-gradient' : 'text-muted-foreground'
          }`}
        >
          {block.label}
        </span>
      </div>
    )
  }

  if (block.type === 'tool') {
    const displayBlock =
      !isBeingWorkedOn && block.state === 'active'
        ? { ...block, state: 'complete' as const }
        : block
    const hasPreview = isCurrentlyStreaming && !!block.preview
    return (
      <div key={block.id}>
        <ToolBlockInline block={displayBlock} styleIndex={toolStyleIndex} />
        {hasPreview && (
          <ToolContentPreview content={block.preview!} isActive={block.state === 'active'} />
        )}
      </div>
    )
  }

  if (block.type === 'thinking_transcript') {
    if (!block.content?.trim()) return null
    return (
      <ThinkingTranscriptBlock
        key={block.id}
        content={block.content}
        isActive={isCurrentlyStreaming && block.state === 'active'}
      />
    )
  }

  if (block.type === 'integration_connect') {
    if (isInvalidIntegrationConnectProvider(block.provider)) {
      const failedTool: Extract<MessageContentBlock, { type: 'tool' }> = {
        type: 'tool',
        id: block.id,
        name: 'vibey_backend',
        action: 'check_integration_connection',
        label: 'Checking integration connection failed',
        state: 'failed',
        startedAt: 0,
        endedAt: 0,
      }
      return <ToolBlockInline key={block.id} block={failedTool} styleIndex={0} />
    }
    return (
      <IntegrationConnectCard
        key={block.id}
        provider={block.provider}
        title={block.title}
        description={block.description}
        status={block.status}
        problem={block.problem}
        primaryAction={block.primaryAction}
        secondaryActions={block.secondaryActions}
        doctor={block.doctor}
        onSendInstruction={sendOrApprove}
      />
    )
  }

  const metaBlock = messageContentBlockMeta(block, ctx)
  if (metaBlock !== undefined) return metaBlock

  return undefined
}
