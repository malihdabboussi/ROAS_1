import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ContentBlock } from './types'
import { ThinkingTranscriptBlockExt } from './ThinkingTranscriptBlockExt'
import { ToolBlockInlineExt } from './tool-inline'
import { ToolContentPreviewExt } from './ToolContentPreviewExt'

const SEARCH_TOOLS = new Set(['web_search', 'web_fetch'])

function buildClosedSummary(blocks: ContentBlock[]): string {
  let searches = 0
  let tools = 0
  for (const block of blocks) {
    if (block.type !== 'tool' || !block.tool) continue
    if (SEARCH_TOOLS.has(block.tool.name)) searches++
    else tools++
  }
  const parts: string[] = []
  if (tools > 0) parts.push(`${tools} tool${tools !== 1 ? 's' : ''}`)
  if (searches > 0) parts.push(`${searches} search${searches !== 1 ? 'es' : ''}`)
  return parts.join(', ')
}

interface Props {
  blocks: ContentBlock[]
  isStreaming: boolean
  toolIdxOffset: number
}

export function LockedInGroupExt({ blocks, isStreaming, toolIdxOffset }: Props) {
  const blocksActive = isStreaming && blocks.some((b) => 'state' in b && (b as { state?: string }).state === 'active')
  const initiallyActive = blocksActive
  const [expanded, setExpanded] = useState(initiallyActive)
  const [userScrolled, setUserScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const hasActiveBlock = blocksActive

  useEffect(() => {
    if (hasActiveBlock) {
      setExpanded(true)
      return
    }
    const collapseTimeout = setTimeout(() => {
      setExpanded(false)
    }, 600)
    return () => clearTimeout(collapseTimeout)
  }, [hasActiveBlock])

  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  })

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    setUserScrolled(!isAtBottom)
  }

  let toolIdx = toolIdxOffset
  const hasVisibleContent =
    blocks.some((b) => b.type === 'tool') ||
    blocks.some((b) => b.type === 'thinking_transcript' && !!(b as Extract<ContentBlock, { type: 'thinking_transcript' }>).content?.trim())

  if (!hasVisibleContent) return null

  const summary = hasActiveBlock ? '' : buildClosedSummary(blocks)
  const label = hasActiveBlock ? 'Locked in...' : summary ? `Locked in · ${summary}` : 'Locked in'

  return (
    <div className="overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 py-1 pl-0 pr-spacing-3"
      >
        <span
          className={`body-3 font-medium ${hasActiveBlock ? 'text-shimmer-gradient' : 'text-muted-foreground'}`}
        >
          {label}
        </span>
        {expanded ? (
          <ChevronDown className="text-muted-foreground" style={{ width: 14, height: 14 }} />
        ) : (
          <ChevronRight className="text-muted-foreground" style={{ width: 14, height: 14 }} />
        )}
      </button>
      {expanded && hasVisibleContent && (
        <div style={{ position: 'relative' }}>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex flex-col gap-1 overflow-y-auto py-1"
            style={{ maxHeight: '12rem' }}
          >
            {blocks.map((block) => {
              if (block.type === 'thinking_transcript') {
                if (!block.content?.trim()) return null
                return (
                  <div key={block.id} className="pr-spacing-3">
                    <ThinkingTranscriptBlockExt
                      content={block.content}
                      isActive={isStreaming && block.state === 'active'}
                    />
                  </div>
                )
              }
              if (block.type === 'tool' && block.tool) {
                const displayBlock =
                  !isStreaming && block.tool.state === 'active'
                    ? { ...block.tool, state: 'complete' as const }
                    : block.tool
                const hasPreview = isStreaming && !!displayBlock.preview
                const idx = toolIdx
                toolIdx++
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
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-8"
            style={{
              background: 'linear-gradient(to bottom, var(--color-background), transparent)',
            }}
          />
        </div>
      )}
    </div>
  )
}
