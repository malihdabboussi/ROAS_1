import type { ContentBlock } from './types'

export function isGroupableBlock(block: ContentBlock): boolean {
  return block.type === 'thinking_transcript' || block.type === 'tool'
}

export type OrderedLayoutSegment =
  | { kind: 'block'; block: ContentBlock }
  | { kind: 'locked_in'; blocks: ContentBlock[]; toolIdxOffset: number }

export function buildOrderedLayoutSegments(contentBlocksOrdered: ContentBlock[]): {
  segments: OrderedLayoutSegment[]
  toolIdxAfterPass: number
} {
  let toolIdx = 0
  const segments: OrderedLayoutSegment[] = []
  let firstRoundGroup: ContentBlock[] | null = null
  let firstRoundToolOffset = 0
  let seenText = false
  for (const block of contentBlocksOrdered) {
    if (!seenText && isGroupableBlock(block)) {
      if (!firstRoundGroup) {
        firstRoundGroup = []
        firstRoundToolOffset = toolIdx
      }
      if (block.type === 'tool') toolIdx++
      firstRoundGroup.push(block)
    } else {
      if (firstRoundGroup) {
        segments.push({
          kind: 'locked_in',
          blocks: firstRoundGroup,
          toolIdxOffset: firstRoundToolOffset,
        })
        firstRoundGroup = null
      }
      if (block.type === 'text') seenText = true
      if (block.type === 'tool') toolIdx++
      segments.push({ kind: 'block', block })
    }
  }
  if (firstRoundGroup) {
    segments.push({
      kind: 'locked_in',
      blocks: firstRoundGroup,
      toolIdxOffset: firstRoundToolOffset,
    })
  }
  return { segments, toolIdxAfterPass: toolIdx }
}
