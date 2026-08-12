import type { MessageContentBlock } from '../../types'
import type { BrowserAction } from '../chat/BrowserPreviewPanel'
import { isGroupableBlock } from '../chat/LockedInGroup'

export { parseContent, type ParsedContentSegment } from '@/lib/chat/chat-content-segments'

type ToolBlock = Extract<MessageContentBlock, { type: 'tool' }>
type CoalescedToolBlock = ToolBlock & { groupCount?: number }
export type FinalOutputBlock = Extract<
  MessageContentBlock,
  | { type: 'artifact_preview' }
  | { type: 'document_card' }
  | { type: 'pdf_file' }
  | { type: 'docx_file' }
  | { type: 'media_asset' }
  | { type: 'project_preview' }
  | { type: 'widget_preview' }
>
const READ_TOOL_NAMES = new Set(['read', 'read_document', 'read_skill'])
const FINAL_OUTPUT_TYPES = new Set([
  'artifact_preview',
  'document_card',
  'pdf_file',
  'docx_file',
  'media_asset',
  'project_preview',
  'widget_preview',
])

function isReadToolBlock(block: MessageContentBlock): block is ToolBlock {
  return block.type === 'tool' && READ_TOOL_NAMES.has(block.name)
}

/**
 * Visual-only: collapse consecutive `read` tool blocks into one virtual tool block.
 *
 * Reads (workspace context scans) arrive as many separate `tool_start`/`tool_end` pairs
 * — one per file. Rendering each as its own row creates a busy "list of reads" while the
 * agent is just gathering context. We render them as a single, label-rotating row that
 * keeps the orange orb spinning until:
 *   - a non-read tool block appears after the group (next real action started), OR
 *   - the stream is no longer active (no more reads coming).
 *
 * Source-of-truth `content_blocks_ordered` is NOT mutated; this is render-time only.
 */
export function coalesceConsecutiveReadTools(
  blocks: MessageContentBlock[],
  isStreaming: boolean,
): MessageContentBlock[] {
  const result: MessageContentBlock[] = []
  let i = 0
  while (i < blocks.length) {
    const b = blocks[i]!
    if (isReadToolBlock(b)) {
      const reads: ToolBlock[] = []
      let j = i
      while (j < blocks.length) {
        const candidate = blocks[j]
        if (!candidate || !isReadToolBlock(candidate)) break
        reads.push(candidate)
        j++
      }
      const isLastGroup = j === blocks.length
      const anyFailed = reads.some((r) => r.state === 'failed')
      const anyActive = reads.some((r) => r.state === 'active')
      /** Group stays open (orb) only while we're streaming AND no later block has appeared after it. */
      const groupOpen = isStreaming && isLastGroup
      const state: ToolBlock['state'] = anyFailed
        ? 'failed'
        : groupOpen || anyActive
          ? 'active'
          : 'complete'
      const latestActive = [...reads].reverse().find((r) => r.state === 'active')
      const visibleSource: ToolBlock = latestActive ?? reads[reads.length - 1]!
      const startedAt = reads[0]!.startedAt
      const endedAt =
        state === 'active' ? undefined : Math.max(...reads.map((r) => r.endedAt ?? r.startedAt))
      const merged: CoalescedToolBlock = {
        type: 'tool',
        id: reads[0]!.id,
        name: visibleSource.name,
        label: visibleSource.label,
        state,
        startedAt,
        groupCount: reads.length,
        ...(endedAt !== undefined ? { endedAt } : {}),
      }
      result.push(merged)
      i = j
    } else {
      result.push(b)
      i++
    }
  }
  return result
}

export function isInvalidIntegrationConnectProvider(provider: string): boolean {
  const p = provider.trim().toLowerCase()
  return p === '' || p === 'unknown'
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
}

export type OrderedLayoutBaseSegment =
  | { kind: 'block'; block: MessageContentBlock }
  | { kind: 'locked_in'; blocks: MessageContentBlock[]; toolIdxOffset: number }

export type OrderedLayoutSegment =
  | OrderedLayoutBaseSegment
  | {
      kind: 'worked_summary'
      blocks: MessageContentBlock[]
      segments: OrderedLayoutBaseSegment[]
      toolIdxOffset: number
    }
  | { kind: 'final_outputs'; blocks: FinalOutputBlock[] }

function buildOrderedLayoutSegmentsFrom(
  contentBlocksOrdered: MessageContentBlock[],
  initialToolIdx: number,
): {
  segments: OrderedLayoutBaseSegment[]
  toolIdxAfterPass: number
} {
  let toolIdx = initialToolIdx
  const segments: OrderedLayoutBaseSegment[] = []
  let activeGroup: MessageContentBlock[] | null = null
  let activeGroupToolOffset = 0
  for (const block of contentBlocksOrdered) {
    if (block.type === 'status') continue
    if (isGroupableBlock(block)) {
      if (!activeGroup) {
        activeGroup = []
        activeGroupToolOffset = toolIdx
      }
      if (block.type === 'tool') toolIdx++
      activeGroup.push(block)
    } else {
      if (activeGroup) {
        segments.push({
          kind: 'locked_in',
          blocks: activeGroup,
          toolIdxOffset: activeGroupToolOffset,
        })
        activeGroup = null
      }
      if (block.type === 'tool') toolIdx++
      segments.push({ kind: 'block', block })
    }
  }
  if (activeGroup) {
    segments.push({
      kind: 'locked_in',
      blocks: activeGroup,
      toolIdxOffset: activeGroupToolOffset,
    })
  }
  return { segments, toolIdxAfterPass: toolIdx }
}

export function buildOrderedLayoutSegments(contentBlocksOrdered: MessageContentBlock[]): {
  segments: OrderedLayoutBaseSegment[]
  toolIdxAfterPass: number
} {
  return buildOrderedLayoutSegmentsFrom(contentBlocksOrdered, 0)
}

function countToolBlocks(blocks: MessageContentBlock[]): number {
  return blocks.reduce((count, block) => count + (block.type === 'tool' ? 1 : 0), 0)
}

function finalOutputBlockKey(block: FinalOutputBlock): string {
  if (block.type === 'artifact_preview') return `artifact:${block.artifactType}:${block.artifactId}`
  if (block.type === 'document_card') {
    return `document:${block.spaceItemId ?? block.documentId ?? block.id}`
  }
  if (block.type === 'media_asset') return `media:${block.mediaAssetId ?? block.url}`
  if (block.type === 'project_preview') return `project:${block.project_id}`
  if (block.type === 'widget_preview') return `widget:${block.id}`
  return `${block.type}:${block.url || block.id}`
}

export function isFinalOutputBlock(block: MessageContentBlock): block is FinalOutputBlock {
  return FINAL_OUTPUT_TYPES.has(block.type)
}

export function extractFinalOutputBlocks(blocks: MessageContentBlock[]): FinalOutputBlock[] {
  const seen = new Set<string>()
  const outputs: FinalOutputBlock[] = []
  for (const block of blocks) {
    if (!isFinalOutputBlock(block)) continue
    const key = finalOutputBlockKey(block)
    if (seen.has(key)) continue
    seen.add(key)
    outputs.push(block)
  }
  return outputs
}

function isPendingClarificationBlock(block: MessageContentBlock): boolean {
  if (block.type !== 'clarification') return false
  const status = block.status
  return status !== 'submitted' && status !== 'skipped'
}

export function buildFinalAnswerLayoutSegments(contentBlocksOrdered: MessageContentBlock[]): {
  segments: OrderedLayoutSegment[]
  toolIdxAfterPass: number
} {
  const baseLayout = buildOrderedLayoutSegments(contentBlocksOrdered)
  const finalTextIdx = [...contentBlocksOrdered]
    .reverse()
    .findIndex((block) => block.type === 'text' && block.content.trim().length > 0)

  if (finalTextIdx === -1) return baseLayout

  const finalTextAbsoluteIdx = contentBlocksOrdered.length - 1 - finalTextIdx
  if (finalTextAbsoluteIdx <= 0) return baseLayout

  const pendingClarifications: MessageContentBlock[] = []
  const prefix = contentBlocksOrdered.slice(0, finalTextAbsoluteIdx).filter((block) => {
    if (!isPendingClarificationBlock(block)) return true
    pendingClarifications.push(block)
    return false
  })

  const toolsBeforeTail = countToolBlocks(prefix)
  const tailLayout = buildOrderedLayoutSegmentsFrom(
    contentBlocksOrdered.slice(finalTextAbsoluteIdx),
    toolsBeforeTail,
  )
  const finalOutputBlocks = extractFinalOutputBlocks(contentBlocksOrdered)
  const suppressInlineMediaKeys = new Set(
    finalOutputBlocks
      .filter(
        (block): block is Extract<FinalOutputBlock, { type: 'media_asset' }> =>
          block.type === 'media_asset',
      )
      .map(finalOutputBlockKey),
  )
  const summarySource = prefix.filter((block) => {
    if (block.type !== 'media_asset') return true
    return !suppressInlineMediaKeys.has(finalOutputBlockKey(block))
  })
  const summaryLayout = buildOrderedLayoutSegments(summarySource)
  if (
    summaryLayout.segments.length === 0 &&
    pendingClarifications.length === 0 &&
    finalOutputBlocks.length === 0
  ) {
    return baseLayout
  }

  const segments: OrderedLayoutSegment[] = []
  if (summaryLayout.segments.length > 0) {
    segments.push({
      kind: 'worked_summary',
      blocks: summarySource.filter((block) => block.type !== 'status'),
      segments: summaryLayout.segments,
      toolIdxOffset: 0,
    })
  }
  segments.push(...tailLayout.segments)
  for (const block of pendingClarifications) {
    segments.push({ kind: 'block', block })
  }
  if (finalOutputBlocks.length > 0) {
    segments.push({ kind: 'final_outputs', blocks: finalOutputBlocks })
  }

  return {
    segments,
    toolIdxAfterPass: baseLayout.toolIdxAfterPass,
  }
}

export function extractBrowserPanelData(contentBlocksOrdered: MessageContentBlock[]): {
  browserScreenshots: Array<{ id: string; imageUrl: string; pageUrl?: string }>
  browserActions: BrowserAction[]
  browserBlockIds: Set<string>
  browserPanelInsertIdx: number
  hasBrowserPanel: boolean
} {
  const browserScreenshots: Array<{ id: string; imageUrl: string; pageUrl?: string }> = []
  const browserActions: BrowserAction[] = []
  const browserBlockIds = new Set<string>()
  let browserPanelInsertIdx = -1
  for (let i = 0; i < contentBlocksOrdered.length; i++) {
    const b = contentBlocksOrdered[i]!
    if (b.type === 'tool' && b.name === 'browser') {
      browserActions.push({
        id: b.id,
        label: b.label,
        state: b.state === 'active' ? 'active' : b.state === 'failed' ? 'failed' : 'complete',
        timestamp: b.startedAt,
      })
      browserBlockIds.add(b.id)
      if (browserPanelInsertIdx === -1) browserPanelInsertIdx = i
    }
    if (b.type === 'browser_screenshot') {
      browserScreenshots.push({ id: b.id, imageUrl: b.imageUrl, pageUrl: b.pageUrl })
      browserBlockIds.add(b.id)
      if (browserPanelInsertIdx === -1) browserPanelInsertIdx = i
    }
  }
  const hasBrowserPanel = browserScreenshots.length > 0 || browserActions.length > 0
  return {
    browserScreenshots,
    browserActions,
    browserBlockIds,
    browserPanelInsertIdx,
    hasBrowserPanel,
  }
}
