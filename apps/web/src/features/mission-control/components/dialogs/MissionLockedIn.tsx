'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ToolBlockInline } from '@/components/chat/ToolBlockInline'
import type { MessageContentBlock } from '@/lib/chat/message-content-blocks'
import { useMissionExecStream } from '../../hooks/useMissionExecStream'
import type { MissionSubtask } from '../../types'
import { resolveSubtaskOutputDisplay } from './subtask-detail'

const SEARCH_TOOLS = new Set(['web_search', 'web_fetch'])

export function resolveMissionStreamText(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (trimmed.startsWith('```') && !fencedMatch) return null

  const candidate = fencedMatch?.[1]?.trim() ?? trimmed
  if (!candidate.startsWith('{')) return trimmed

  try {
    const parsed = JSON.parse(candidate) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return resolveSubtaskOutputDisplay(parsed as Record<string, unknown>)?.body ?? null
  } catch {
    return null
  }
}

function buildClosedSummary(blocks: MessageContentBlock[]): string {
  let searches = 0
  let tools = 0
  for (const block of blocks) {
    if (block.type !== 'tool') continue
    if (SEARCH_TOOLS.has(block.name)) searches++
    else tools++
  }
  const parts: string[] = []
  if (tools > 0) parts.push(`${tools} tool${tools !== 1 ? 's' : ''}`)
  if (searches > 0) parts.push(`${searches} search${searches !== 1 ? 'es' : ''}`)
  return parts.join(', ')
}

interface MissionLockedInProps {
  subtask: MissionSubtask
  /** Keep the stream open when first mounted (e.g. subtask detail panel). */
  defaultOpen?: boolean
  maxHeightClass?: string
}

export function MissionLockedIn({
  subtask,
  defaultOpen = false,
  maxHeightClass = 'max-h-48',
}: MissionLockedInProps) {
  const { blocks, isStreaming } = useMissionExecStream(subtask)
  const hasActiveBlock = isStreaming && blocks.some((b) => 'state' in b && b.state === 'active')
  const [expanded, setExpanded] = useState(defaultOpen || isStreaming || hasActiveBlock)
  const [userCollapsed, setUserCollapsed] = useState(false)
  const [userScrolled, setUserScrolled] = useState(false)
  const [showTopFade, setShowTopFade] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const updateScrollFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    setUserScrolled(!isAtBottom)
    const hasOverflow = el.scrollHeight > el.clientHeight + 1
    setShowTopFade(hasOverflow && el.scrollTop > 4)
  }, [])

  useEffect(() => {
    if (userCollapsed) return
    if (isStreaming || hasActiveBlock || defaultOpen) {
      setExpanded(true)
      return
    }
    const collapseTimeout = setTimeout(() => {
      setExpanded(false)
    }, 600)
    return () => clearTimeout(collapseTimeout)
  }, [isStreaming, hasActiveBlock, defaultOpen, userCollapsed])

  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    updateScrollFades()
  })

  const handleScroll = () => {
    updateScrollFades()
  }

  const hasVisibleContent =
    blocks.some((b) => b.type === 'tool') ||
    blocks.some((b) => b.type === 'thinking_transcript' && !!b.content?.trim()) ||
    blocks.some((b) => b.type === 'text' && !!b.content.trim())

  if (!hasVisibleContent && !isStreaming) return null

  const live = isStreaming || hasActiveBlock
  const summary = live ? '' : buildClosedSummary(blocks)
  const label = live ? 'Locked in...' : summary ? `Locked in · ${summary}` : 'Locked in'

  let toolIdx = 0

  return (
    <div className="mt-2 overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={() => {
          const next = !expanded
          setExpanded(next)
          setUserCollapsed(!next)
        }}
        className="flex w-full items-center gap-2 py-1 pl-0 pr-3"
      >
        <span
          className={`body-3 font-medium ${live ? 'text-shimmer-gradient animate-[shimmer_4s_infinite_linear]' : 'text-muted-foreground'}`}
        >
          {label}
        </span>
        {expanded ? (
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
        )}
      </button>
      {expanded && (hasVisibleContent || isStreaming) && (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={`flex ${maxHeightClass} flex-col gap-1 overflow-y-auto py-1`}
          >
            {blocks.map((block) => {
              if (block.type === 'thinking_transcript') {
                if (!block.content?.trim()) return null
                const displayText = block.content
                  .replace(/^Reasoning:\s*/i, '')
                  .trimStart()
                  .split('\n')
                  .map((line) => line.replace(/^_/, '').replace(/_$/, ''))
                  .join('\n')
                return (
                  <div
                    key={block.id}
                    className="text-muted-foreground body-3 whitespace-pre-wrap break-words py-0.5 pl-0 pr-3"
                  >
                    {displayText}
                  </div>
                )
              }
              if (block.type === 'tool') {
                const displayBlock =
                  !isStreaming && block.state === 'active'
                    ? { ...block, state: 'complete' as const }
                    : block
                return (
                  <ToolBlockInline key={block.id} block={displayBlock} styleIndex={toolIdx++} />
                )
              }
              if (block.type === 'text') {
                const displayContent = resolveMissionStreamText(block.content)
                if (!displayContent) return null
                return (
                  <div
                    key={block.id}
                    className="body-3 text-foreground whitespace-pre-wrap break-words py-0.5 pl-0 pr-3"
                  >
                    {displayContent}
                  </div>
                )
              }
              return null
            })}
          </div>
          {showTopFade ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[var(--color-background)] to-transparent" />
          ) : null}
        </div>
      )}
    </div>
  )
}
