'use client'

import { PersistedFileChips } from '@/components/chat/FileAttachments'
import { ChatMarkdownDocument } from '@/components/chat/ChatMarkdownDocument'
import {
  GeneratedAudio,
  GeneratedImage,
  GeneratedVideo,
} from '@/components/chat/GeneratedMedia'
import { PdfCard } from '@/components/chat/PdfCard'
import { parseContent } from '@/lib/chat/chat-content-segments'
import type { MessageContentBlock } from '@/lib/chat/message-content-blocks'
import { attachmentUrlsToDocuments } from '@/lib/chat/chat-attachment-preview'
import type { ChannelMessage } from '@/lib/channels'
import type { MissionDeliverable } from '@/lib/missions'
import { CHAT_MARKDOWN_CLASSNAME } from '@/lib/utils/chat-markdown.utils'
import { ChannelOrderedBlocks } from './ChannelOrderedBlocks'
import {
  hasVisibleChannelMessageContent,
  isChannelMessageHtml,
  stripTrailingEmptyParagraphs,
} from './channel-message-bubble-utils'

export function ChannelMessageBody({
  message,
  rawContent,
  onOpenDeliverablePreview,
}: {
  message: ChannelMessage
  rawContent: string
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
}) {
  const attachmentUrls = Array.isArray(message.metadata?.attachments)
    ? (message.metadata.attachments as unknown[]).filter(
        (url): url is string => typeof url === 'string' && url.trim().length > 0,
      )
    : []
  const attachmentDocuments = attachmentUrlsToDocuments(attachmentUrls)
  const hasAttachments = attachmentDocuments.length > 0
  const hasVisibleBody = hasVisibleChannelMessageContent(rawContent)
  const orderedBlocksRaw =
    ((message.metadata as Record<string, unknown> | null)?.content_blocks_ordered as unknown[]) ??
    []
  const orderedBlocks = orderedBlocksRaw.filter((block): block is MessageContentBlock => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return false
    const candidate = block as Record<string, unknown>
    return typeof candidate.type === 'string'
  })
  const hasOrderedBlocks = orderedBlocks.length > 0
  const orderedBlocksStreaming = orderedBlocks.some((block) => {
    if (
      block.type === 'tool' ||
      block.type === 'thinking_transcript' ||
      block.type === 'generation'
    ) {
      return block.state === 'active'
    }
    return false
  })
  const rawSegments = parseContent(rawContent)
  const rawHasInlineMedia = rawSegments.some((segment) => segment.type !== 'text')

  return (
    <>
      {hasOrderedBlocks ? (
        <ChannelOrderedBlocks
          channelId={message.channel_id}
          messageId={message.id}
          blocks={orderedBlocks}
          isStreaming={orderedBlocksStreaming}
          sourceMessage={message}
          onOpenDeliverablePreview={onOpenDeliverablePreview}
        />
      ) : hasVisibleBody ? (
        rawHasInlineMedia ? (
          <div className="w-full max-w-full [&_p:first-child]:mt-0">
            <div className="flex flex-col gap-2">
              {rawSegments.map((segment, segmentIndex) => {
                if (segment.type === 'text') {
                  if (isChannelMessageHtml(segment.value)) {
                    return (
                      <div
                        key={`text-${segmentIndex}`}
                        dangerouslySetInnerHTML={{
                          __html: stripTrailingEmptyParagraphs(segment.value),
                        }}
                        className={`flex flex-col gap-1 ${CHAT_MARKDOWN_CLASSNAME} [&_span.channel-mention]:text-primary [&>*]:!my-0 [&_blockquote_p]:!my-0 [&_li>p]:!my-0 [&_li]:leading-normal [&_ol]:space-y-0 [&_p]:!my-0 [&_span.channel-mention]:font-medium [&_ul]:space-y-0`}
                      />
                    )
                  }
                  return (
                    <ChatMarkdownDocument
                      key={`text-${segmentIndex}`}
                      markdown={segment.value}
                      className="flex flex-col gap-1 [&_span.channel-mention]:text-primary [&>*]:!my-0 [&_blockquote_p]:!my-0 [&_li>p]:!my-0 [&_li]:leading-normal [&_ol]:space-y-0 [&_p]:!my-0 [&_span.channel-mention]:font-medium [&_ul]:space-y-0"
                    />
                  )
                }
                if (segment.type === 'video') {
                  return (
                    <GeneratedVideo
                      key={`video-${segmentIndex}`}
                      url={segment.url}
                      prompt={segment.prompt}
                    />
                  )
                }
                if (segment.type === 'audio') {
                  return (
                    <GeneratedAudio
                      key={`audio-${segmentIndex}`}
                      url={segment.url}
                      prompt={segment.prompt}
                    />
                  )
                }
                if (segment.type === 'pdf') {
                  return (
                    <PdfCard key={`pdf-${segmentIndex}`} url={segment.url} label={segment.label} />
                  )
                }
                return (
                  <GeneratedImage
                    key={`image-${segmentIndex}`}
                    url={segment.url}
                    prompt={segment.alt}
                  />
                )
              })}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-full [&_p:first-child]:mt-0">
            {isChannelMessageHtml(rawContent) ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: stripTrailingEmptyParagraphs(rawContent),
                }}
                className={`flex flex-col gap-1 ${CHAT_MARKDOWN_CLASSNAME} [&_span.channel-mention]:text-primary [&>*]:!my-0 [&_blockquote_p]:!my-0 [&_li>p]:!my-0 [&_li]:leading-normal [&_ol]:space-y-0 [&_p]:!my-0 [&_span.channel-mention]:font-medium [&_ul]:space-y-0`}
              />
            ) : (
              <ChatMarkdownDocument
                markdown={rawContent}
                className="flex flex-col gap-1 [&_span.channel-mention]:text-primary [&>*]:!my-0 [&_blockquote_p]:!my-0 [&_li>p]:!my-0 [&_li]:leading-normal [&_ol]:space-y-0 [&_p]:!my-0 [&_span.channel-mention]:font-medium [&_ul]:space-y-0"
              />
            )}
          </div>
        )
      ) : hasAttachments ? null : (
        <div className="w-full max-w-full">
          <p className="body-2 text-muted-foreground m-0 italic">[No content]</p>
        </div>
      )}

      {hasAttachments && <PersistedFileChips documents={attachmentDocuments} />}
    </>
  )
}
