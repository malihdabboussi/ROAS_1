import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { CHAT_MARKDOWN_CLASSNAME, renderChatMarkdown } from './markdown'
import { stripEmoji } from './strip-emoji'
import { buildOrderedLayoutSegments } from './layout-blocks'
import { LockedInGroupExt } from './LockedInGroupExt'
import { ThinkingTranscriptBlockExt } from './ThinkingTranscriptBlockExt'
import { ToolBlockInlineExt } from './tool-inline'
import { ToolContentPreviewExt } from './ToolContentPreviewExt'
import { VibeyChatOrb } from '../ui/VibeyChatOrb'
import type { ChatMessage, ContentBlock, ToolBlock } from './types'

const SLASH_CMD_REGEX = /(^|\s)(\/[a-zA-Z][a-zA-Z0-9_-]*)/gm
const USER_MSG_MAX_LINES = 3

function highlightSlashCommands(text: string): ReactNode {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match
  SLASH_CMD_REGEX.lastIndex = 0
  while ((match = SLASH_CMD_REGEX.exec(text)) !== null) {
    const prefix = match[1]!
    const cmd = match[2]!
    const start = match.index
    if (start + prefix.length > lastIndex) {
      parts.push(text.slice(lastIndex, start + prefix.length))
    }
    parts.push(
      <span key={start} className="slash-command-highlight">
        {cmd}
      </span>,
    )
    lastIndex = start + prefix.length + cmd.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 1 ? parts : text
}

function MarkdownContent({ content }: { content: string }) {
  const cleaned = stripEmoji(content, { preserveFormatting: true })
  const html = useMemo(() => renderChatMarkdown(cleaned), [cleaned])
  return (
    <div className="relative">
      <div className={CHAT_MARKDOWN_CLASSNAME} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

function UserMessageBubble({ messageId, content }: { messageId: string; content: string }) {
  const highlighted = useMemo(() => highlightSlashCommands(content), [content])
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [content])

  return (
    <div data-message={messageId} className="card-glass card-glass-user px-spacing-4 py-spacing-2 group relative chat-user-bubble">
      <div className="absolute right-2 top-2 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleCopy()
          }}
          className="btn-icon-glass chat-user-copy-btn opacity-0 transition-opacity"
          aria-label="Copy message"
        >
          {copied ? (
            <Check className="text-muted-foreground icon-3-5" />
          ) : (
            <Copy className="text-muted-foreground icon-3-5" />
          )}
        </button>
      </div>
      <div
        className="body-1 text-chat overflow-hidden"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: USER_MSG_MAX_LINES,
          WebkitBoxOrient: 'vertical',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
        }}
      >
        {highlighted}
      </div>
    </div>
  )
}

function normalizeBlocks(blocks: ContentBlock[], toolsFallback: ToolBlock[]): ContentBlock[] {
  if (blocks.length > 0) return blocks
  return toolsFallback.map((t) => ({ type: 'tool' as const, id: t.id, tool: t }))
}

/** True until tools, text, generation, or non-empty thinking exist (empty thinking row alone still shows orb placeholder). */
function streamingHasNoVisibleBlocks(blocks: ContentBlock[], toolsFallback: ToolBlock[]): boolean {
  const merged = normalizeBlocks(blocks, toolsFallback)
  if (merged.length === 0) return true
  for (const b of merged) {
    if (b.type === 'tool') return false
    if (b.type === 'text' && b.content?.trim()) return false
    if (b.type === 'generation') return false
    if (b.type === 'thinking_transcript' && b.content?.trim()) return false
  }
  return true
}

function AssistantMessageBody({
  blocks,
  toolsFallback,
  isStreaming,
}: {
  blocks: ContentBlock[]
  toolsFallback: ToolBlock[]
  isStreaming: boolean
}) {
  const merged = normalizeBlocks(blocks, toolsFallback)
  const { segments } = buildOrderedLayoutSegments(merged)
  let toolStyleIdx = 0

  return (
    <>
      {segments.map((seg, segIdx) => {
        if (seg.kind === 'locked_in') {
          return (
            <LockedInGroupExt
              key={`locked-${segIdx}`}
              blocks={seg.blocks}
              isStreaming={isStreaming}
              toolIdxOffset={seg.toolIdxOffset}
            />
          )
        }
        const block = seg.block
        if (block.type === 'text' && block.content?.trim()) {
          return <MarkdownContent key={block.id} content={block.content} />
        }
        if (block.type === 'generation') {
          const isActive = isStreaming && block.state === 'active'
          return (
            <div key={block.id} className="flex items-center gap-2-5 py-0-5" style={{ margin: '8px 0' }}>
              <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
                <VibeyChatOrb state="streaming" style="elastic" />
              </div>
              <span
                className={`body-3 font-medium ${isActive ? 'text-shimmer-gradient' : 'text-muted-foreground'}`}
              >
                {block.label}
              </span>
            </div>
          )
        }
        if (block.type === 'thinking_transcript') {
          if (!block.content?.trim()) return null
          return (
            <ThinkingTranscriptBlockExt
              key={block.id}
              content={block.content}
              isActive={isStreaming && block.state === 'active'}
            />
          )
        }
        if (block.type === 'tool' && block.tool) {
          const displayBlock =
            !isStreaming && block.tool.state === 'active'
              ? { ...block.tool, state: 'complete' as const }
              : block.tool
          const hasPreview = isStreaming && !!displayBlock.preview
          const idx = toolStyleIdx++
          return (
            <div key={block.id}>
              <ToolBlockInlineExt block={displayBlock} styleIndex={idx} />
              {hasPreview && (
                <ToolContentPreviewExt
                  content={displayBlock.preview!}
                  isActive={displayBlock.state === 'active'}
                />
              )}
            </div>
          )
        }
        return null
      })}
    </>
  )
}

interface Props {
  message: ChatMessage
  isStreaming?: boolean
  streamBlocks?: ContentBlock[]
  streamTools?: ToolBlock[]
  /** Shown with VibeyChatOrb before any tool/thinking/content blocks arrive (avoids dots → orb flash). */
  streamStatusMessage?: string | null
}

function StreamingThinkingPlaceholder({ statusMessage }: { statusMessage?: string | null }) {
  return (
    <div className="flex items-center gap-2-5 py-0-5">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
        <VibeyChatOrb state="thinking" style="elastic" />
      </div>
      <span className="body-3 font-medium text-shimmer-gradient">
        {statusMessage?.trim() || 'Thinking…'}
      </span>
    </div>
  )
}

export function MessageBubble({ message, isStreaming, streamBlocks, streamTools, streamStatusMessage }: Props) {
  const isUser = message.role === 'user'

  const persistedBlocks = useMemo(() => {
    if (isUser) return []
    const raw = message.metadata?.content_blocks_ordered
    return Array.isArray(raw) ? (raw as ContentBlock[]) : []
  }, [isUser, message.metadata])

  const assistantPlainHtml = useMemo(() => {
    if (isUser || isStreaming) return ''
    const cleaned = stripEmoji(message.content ?? '', { preserveFormatting: true })
    return renderChatMarkdown(cleaned)
  }, [isUser, isStreaming, message.content])

  if (isUser) {
    return <UserMessageBubble messageId={message.id} content={message.content ?? ''} />
  }

  if (isStreaming) {
    const showPlaceholder = streamingHasNoVisibleBlocks(streamBlocks ?? [], streamTools ?? [])
    return (
      <div data-message={message.id} className="group body-1 text-chat mx-2 flex flex-col">
        <div className="flex flex-col gap-spacing-3">
          {showPlaceholder ? (
            <StreamingThinkingPlaceholder statusMessage={streamStatusMessage} />
          ) : (
            <AssistantMessageBody
              blocks={streamBlocks ?? []}
              toolsFallback={streamTools ?? []}
              isStreaming
            />
          )}
        </div>
      </div>
    )
  }

  if (persistedBlocks.length > 0) {
    const toolsInBlocks = persistedBlocks
      .filter((b): b is Extract<ContentBlock, { type: 'tool' }> => b.type === 'tool' && !!b.tool)
      .map((b) => b.tool)
    return (
      <div data-message={message.id} className="group body-1 text-chat mx-2 flex flex-col">
        <div className="flex flex-col gap-spacing-3">
          <AssistantMessageBody blocks={persistedBlocks} toolsFallback={toolsInBlocks} isStreaming={false} />
        </div>
      </div>
    )
  }

  return (
    <div data-message={message.id} className="group body-1 text-chat mx-2 flex flex-col">
      <div className="flex flex-col gap-spacing-3">
        {assistantPlainHtml ? (
          <div className="relative">
            <div className={CHAT_MARKDOWN_CLASSNAME} dangerouslySetInnerHTML={{ __html: assistantPlainHtml }} />
          </div>
        ) : (
          <span className="text-muted-foreground body-3">…</span>
        )}
      </div>
    </div>
  )
}
