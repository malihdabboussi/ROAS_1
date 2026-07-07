'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTypewriter } from '@/lib/hooks/use-typewriter'
import type { MessageContentBlock } from '../../types'
import { ToolBlockInline } from './FlowTimeline'
import { ToolContentPreview } from './ToolContentPreview'

const GROUPABLE_TYPES = new Set(['thinking_transcript', 'tool'])

export function isGroupableBlock(block: MessageContentBlock): boolean {
  return GROUPABLE_TYPES.has(block.type)
}

const SEARCH_TOOLS = new Set(['web_search', 'web_fetch'])
const BRAIN_TOOL_NAMES = new Set(['brain_context'])
const BRAIN_TOOL_ACTIONS = new Set(['read_brain_context'])
const CONTEXT_TOOL_NAMES = new Set([
  'document_context',
  'artifact_context',
  'reference_context',
  'skill_context',
])
const CONTEXT_TOOL_ACTIONS = new Set([
  'read_attachments',
  'link_selected_items',
  'resolve_references',
  'load_requested_skills',
])
const READ_TOOL_NAMES = new Set(['read', 'read_document', 'read_skill'])
const READ_TOOL_ACTIONS = new Set(['read_file', 'read_document', 'list_project_files'])
const COMMAND_TOOL_NAMES = new Set(['exec', 'browser'])
const COMMAND_TOOL_ACTIONS = new Set([
  'create_file',
  'update_file',
  'delete_file',
  'create_project',
  'update_project_deps',
  'import_github_repo',
  'create_offer',
  'update_offer_step',
  'create_ad',
  'create_ad_campaign',
  'create_ad_set',
  'create_funnel',
  'add_funnel_page',
  'update_funnel_page',
  'patch_funnel_page',
  'create_presentation',
  'update_presentation',
  'create_sequence',
  'add_sequence_email',
  'create_avatar',
  'create_theme',
  'create_agent_skill',
  'update_agent_skill',
  'delete_agent_skill',
  'save_document',
  'use_integration',
  'publish_ad_to_meta',
  'update_ad_campaign',
  'update_ad_set',
  'generate_image',
  'generate_video',
  'create_agent',
  'send_user_message',
])

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function getToolGroupCount(block: Extract<MessageContentBlock, { type: 'tool' }>): number {
  const count = (block as { groupCount?: unknown }).groupCount
  return typeof count === 'number' && Number.isFinite(count) && count > 0 ? count : 1
}

function classifyTool(block: Extract<MessageContentBlock, { type: 'tool' }>) {
  if (BRAIN_TOOL_NAMES.has(block.name) || (block.action && BRAIN_TOOL_ACTIONS.has(block.action))) {
    return 'brain' as const
  }
  if (
    CONTEXT_TOOL_NAMES.has(block.name) ||
    (block.action && CONTEXT_TOOL_ACTIONS.has(block.action))
  ) {
    return 'context' as const
  }
  if (READ_TOOL_NAMES.has(block.name) || (block.action && READ_TOOL_ACTIONS.has(block.action))) {
    return 'read' as const
  }
  if (SEARCH_TOOLS.has(block.name)) return 'search' as const
  if (
    COMMAND_TOOL_NAMES.has(block.name) ||
    (block.action && COMMAND_TOOL_ACTIONS.has(block.action))
  ) {
    return 'command' as const
  }
  return 'tool' as const
}

export function buildActivityGroupLabel(blocks: MessageContentBlock[], hasActiveBlock: boolean) {
  if (hasActiveBlock) {
    const activeTool = blocks.find((block) => block.type === 'tool' && block.state === 'active')
    if (activeTool?.type === 'tool') return activeTool.label
    return 'Exploring...'
  }

  let brain = 0
  let context = 0
  let files = 0
  let searches = 0
  let commands = 0
  let tools = 0
  let thinking = 0

  for (const block of blocks) {
    if (block.type === 'thinking_transcript' && block.content?.trim()) {
      thinking++
      continue
    }
    if (block.type !== 'tool') continue
    const count = getToolGroupCount(block)
    const kind = classifyTool(block)
    if (kind === 'brain') brain += count
    else if (kind === 'context') context += count
    else if (kind === 'read') files += count
    else if (kind === 'search') searches += count
    else if (kind === 'command') commands += count
    else tools += count
  }

  const knownCategories = [brain, context, files, searches, commands].filter(
    (count) => count > 0,
  ).length
  const hasUnknown = tools > 0 || thinking > 0
  const totalKnown = brain + context + files + searches + commands

  if (knownCategories > 1 && !hasUnknown) {
    const parts: string[] = []
    if (brain > 0) parts.push('Brain context')
    if (context > 0) parts.push('linked context')
    if (files > 0) parts.push(pluralize(files, 'file'))
    if (searches > 0) parts.push(pluralize(searches, 'search', 'searches'))
    if (commands > 0) parts.push(`ran ${pluralize(commands, 'command')}`)
    return `Explored ${parts.join(', ')}`
  }
  if (knownCategories > 1 || (knownCategories > 0 && hasUnknown)) {
    const parts: string[] = []
    if (brain > 0) parts.push('Brain context')
    if (context > 0) parts.push('linked context')
    if (files > 0) parts.push(pluralize(files, 'file'))
    if (searches > 0) parts.push(pluralize(searches, 'search', 'searches'))
    if (commands > 0) parts.push(`ran ${pluralize(commands, 'command')}`)
    if (tools > 0) parts.push(pluralize(tools, 'tool'))
    if (thinking > 0) parts.push(pluralize(thinking, 'thought'))
    return `Explored ${parts.join(', ')}`
  }
  if (brain > 0) return 'Read Brain context'
  if (context > 0) return 'Linked context'
  if (files > 0) return `Read ${pluralize(files, 'file')}`
  if (searches > 0) return `Searched ${pluralize(searches, 'search', 'searches')}`
  if (commands > 0) return `Ran ${pluralize(commands, 'command')}`
  if (tools > 0) return `Worked ${pluralize(tools, 'tool')}`
  if (thinking > 0) return `Worked ${pluralize(thinking, 'thought')}`
  return totalKnown > 0 ? `Explored ${totalKnown} activities` : 'Worked'
}

interface LockedInGroupProps {
  blocks: MessageContentBlock[]
  isStreaming: boolean
  toolIdxOffset: number
  mode?: 'activity' | 'summary'
  summaryLabel?: string
  children?: ReactNode
}

export function LockedInGroup({
  blocks,
  isStreaming,
  toolIdxOffset,
  mode = 'activity',
  summaryLabel,
  children,
}: LockedInGroupProps) {
  const isSummaryMode = mode === 'summary'
  const hasCustomContent = children != null
  const blocksActive = isStreaming && blocks.some((b) => 'state' in b && b.state === 'active')
  const initiallyActive = isSummaryMode ? false : blocksActive
  const [expanded, setExpanded] = useState(initiallyActive)
  const [userScrolled, setUserScrolled] = useState(false)
  const [, setDurationSec] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<number | null>(null)

  const hasActiveBlock = isSummaryMode ? false : blocksActive

  useEffect(() => {
    if (isSummaryMode) return
    if (hasActiveBlock) {
      setExpanded(true)
      if (!startRef.current) {
        startRef.current = Date.now()
      }
      const interval = setInterval(() => {
        if (startRef.current) setDurationSec(Math.round((Date.now() - startRef.current) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
    // Grace period: wait 600ms before collapsing to survive tool_end → thinking gaps
    const collapseTimeout = setTimeout(() => {
      if (startRef.current) {
        setDurationSec(Math.round((Date.now() - startRef.current) / 1000))
      }
      setExpanded(false)
    }, 600)
    return () => clearTimeout(collapseTimeout)
  }, [hasActiveBlock, isSummaryMode])

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
    hasCustomContent ||
    blocks.some((b) => b.type === 'tool') ||
    blocks.some((b) => b.type === 'thinking_transcript' && !!b.content?.trim())

  if (!hasVisibleContent) return null

  const label = summaryLabel ?? buildActivityGroupLabel(blocks, hasActiveBlock)

  return (
    <div className={isSummaryMode ? 'overflow-hidden' : 'overflow-hidden rounded-lg'}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 py-1 pl-0 pr-3"
      >
        <span
          className={`body-3 font-medium ${hasActiveBlock ? 'text-shimmer-gradient animate-[shimmer_4s_infinite_linear]' : 'text-muted-foreground'}`}
        >
          {label}
        </span>
        {expanded ? (
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
        )}
      </button>
      {isSummaryMode ? <div className="border-border border-t" /> : null}
      <AnimatePresence initial={false}>
        {expanded && hasVisibleContent && (
          <motion.div
            key="locked-in-group-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="relative">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={
                  hasCustomContent
                    ? 'flex max-h-48 flex-col overflow-y-auto py-1'
                    : 'flex max-h-48 flex-col gap-1 overflow-y-auto py-1'
                }
              >
                {hasCustomContent
                  ? children
                  : blocks.map((block) => {
                      if (block.type === 'thinking_transcript') {
                        if (!block.content?.trim()) return null
                        return (
                          <ThinkingInner
                            key={block.id}
                            content={block.content}
                            isActive={!isSummaryMode && isStreaming && block.state === 'active'}
                          />
                        )
                      }
                      if (block.type === 'tool') {
                        const displayBlock =
                          !isStreaming && block.state === 'active'
                            ? { ...block, state: 'complete' as const }
                            : block
                        const hasPreview = isStreaming && !!block.preview
                        return (
                          <div key={block.id}>
                            <ToolBlockInline block={displayBlock} styleIndex={toolIdx++} />
                            {hasPreview && (
                              <ToolContentPreview
                                content={block.preview!}
                                isActive={block.state === 'active'}
                              />
                            )}
                          </div>
                        )
                      }
                      return null
                    })}
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[var(--color-background)] to-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ThinkingInner({ content, isActive }: { content: string; isActive: boolean }) {
  const displayContent = content
    .replace(/^Reasoning:\s*/i, '')
    .trimStart()
    .split('\n')
    .map((line) => line.replace(/^_/, '').replace(/_$/, ''))
    .join('\n')

  const { displayText } = useTypewriter({
    text: displayContent,
    enabled: isActive,
  })

  return (
    <div
      className="text-muted-foreground body-3 py-0.5 pl-0 pr-3"
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {displayText}
    </div>
  )
}
