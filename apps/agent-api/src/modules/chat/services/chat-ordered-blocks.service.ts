import { Injectable } from '@nestjs/common'

type OrderedBlock = Record<string, unknown>

export interface CompletedPlatformToolBlock {
  block: OrderedBlock
}

export interface ChatOrderedBlocksState {
  blocks: OrderedBlock[]
  thinkingBlockId: string
}

@Injectable()
export class ChatOrderedBlocksService {
  private readonly maxThinkingChars = 10_000

  createState(
    messageId: string,
    completedPlatformTools: CompletedPlatformToolBlock[],
  ): ChatOrderedBlocksState {
    return {
      blocks: completedPlatformTools.map((tool) => ({ ...tool.block })),
      thinkingBlockId: `thinking-transcript-${messageId}`,
    }
  }

  appendText(state: ChatOrderedBlocksState, text: string): void {
    if (!text) return
    const last = state.blocks[state.blocks.length - 1]
    if (last?.type === 'text') {
      last.content = String(last.content ?? '') + text
      return
    }
    state.blocks.push({ type: 'text', id: `text-${Date.now()}`, content: text })
  }

  pushGenerationStart(state: ChatOrderedBlocksState, label: string, ts: number): void {
    if (!label.trim()) return
    const existingIdx = state.blocks.findIndex(
      (block) =>
        block?.type === 'generation' && block.state === 'active' && block.label === label,
    )
    if (existingIdx !== -1) return
    state.blocks.push({
      type: 'generation',
      id: `gen-${ts}`,
      label,
      state: 'active',
      startedAt: ts,
    })
  }

  completeGeneration(state: ChatOrderedBlocksState, ts: number): void {
    for (let i = state.blocks.length - 1; i >= 0; i--) {
      const block = state.blocks[i]
      if (block?.type === 'generation' && block.state === 'active') {
        block.state = 'complete'
        block.endedAt = ts
        return
      }
    }
  }

  pushSessionCompaction(state: ChatOrderedBlocksState, label: string, ts: number): void {
    const trimmed = label.trim() || 'Summarizing our conversation'
    const activeIdx = state.blocks.findIndex(
      (block) => block?.type === 'session_compaction' && block.state === 'active',
    )
    if (activeIdx !== -1) {
      state.blocks[activeIdx]!.label = trimmed
      return
    }
    state.blocks.push({
      type: 'session_compaction',
      id: `compaction-${ts}`,
      label: trimmed,
      state: 'active',
      timestamp: ts,
    })
  }

  completeSessionCompaction(state: ChatOrderedBlocksState, ts: number): void {
    for (let i = state.blocks.length - 1; i >= 0; i--) {
      const block = state.blocks[i]
      if (block?.type === 'session_compaction' && block.state === 'active') {
        block.state = 'complete'
        block.completedAt = ts
        return
      }
    }
  }

  pushToolStart(
    state: ChatOrderedBlocksState,
    name: string,
    label: string,
    action: string | undefined,
    ts: number,
    toolCallId?: string,
  ): void {
    const existingIdx = this.findDuplicateToolStartIndex(state, name, label, action, toolCallId)
    if (existingIdx !== -1) {
      const block = state.blocks[existingIdx]!
      const terminal = block.state === 'complete' || block.state === 'failed'
      block.id =
        typeof block.id === 'string' && block.id.trim()
          ? block.id
          : toolCallId || `tool-${name}-${ts}`
      block.name = name
      block.label = label
      if (action) block.action = action
      if (toolCallId) block.toolCallId = toolCallId
      if (!terminal) {
        block.state = 'active'
        delete block.endedAt
      }
      if (typeof block.startedAt !== 'number') block.startedAt = ts
      return
    }

    state.blocks.push({
      type: 'tool',
      id: toolCallId || `tool-${name}-${ts}`,
      name,
      label,
      ...(action ? { action } : {}),
      ...(toolCallId ? { toolCallId } : {}),
      state: 'active',
      startedAt: ts,
    })
  }

  completeTool(
    state: ChatOrderedBlocksState,
    name: string,
    status: 'completed' | 'failed',
    ts: number,
    toolCallId?: string,
  ): void {
    const idx = this.findToolBlockIndex(state, name, toolCallId)
    if (idx === -1) return
    const block = state.blocks[idx]!
    block.state = status === 'completed' ? 'complete' : 'failed'
    block.endedAt = ts
    delete block.preview
  }

  appendToolProgress(
    state: ChatOrderedBlocksState,
    name: string,
    detail: string,
    ts: number,
    toolCallId?: string,
  ): void {
    if (!detail.trim()) return
    const idx = this.findToolBlockIndex(state, name, toolCallId)
    if (idx === -1) return
    const block = state.blocks[idx]!
    const progress = Array.isArray(block.progress)
      ? (block.progress as Array<Record<string, unknown>>)
      : []
    progress.push({
      id: `tp-${name}-${ts}-${progress.length}`,
      detail,
      timestamp: ts,
    })
    block.progress = progress
  }

  pushUiBlock(state: ChatOrderedBlocksState, block: OrderedBlock, ts: number): void {
    const type = typeof block.type === 'string' ? block.type : ''
    if (!type) return
    if (type === 'agent_conversation' && block.delegationId) {
      const idx = state.blocks.findIndex(
        (candidate) =>
          candidate.type === 'agent_conversation' && candidate.delegationId === block.delegationId,
      )
      if (idx !== -1) {
        state.blocks[idx] = { ...state.blocks[idx], ...block, status: 'completed' }
        return
      }
    }
    if (type === 'chat_plan' && typeof block.plan_id === 'string') {
      const existingIdx = state.blocks.findIndex(
        (candidate) => candidate.type === 'chat_plan' && candidate.plan_id === block.plan_id,
      )
      if (existingIdx !== -1) {
        const existing = state.blocks[existingIdx]!
        const existingItems = Array.isArray(existing.items)
          ? (existing.items as Array<Record<string, unknown>>)
          : []
        const newItems = Array.isArray(block.items)
          ? (block.items as Array<Record<string, unknown>>)
          : []
        const mergedItems = existingItems.map((existingItem) => {
          const update = newItems.find((newItem) => newItem.id === existingItem.id)
          return update ? { ...existingItem, ...update } : existingItem
        })
        state.blocks[existingIdx] = {
          ...existing,
          items: mergedItems,
          plan_status: block.plan_status ?? existing.plan_status,
          version: block.version ?? existing.version,
        }
        return
      }
    }
    state.blocks.push({
      ...block,
      type,
      id:
        typeof block.id === 'string' && block.id.trim().length > 0
          ? block.id
          : `ui-${ts}-${state.blocks.length}`,
    })
  }

  upsertThinkingTranscript(state: ChatOrderedBlocksState, fullText: string): void {
    const capped =
      fullText.length > this.maxThinkingChars
        ? fullText.slice(fullText.length - this.maxThinkingChars)
        : fullText
    const existingIdx = state.blocks.findIndex((block) => block.type === 'thinking_transcript')
    const block = {
      type: 'thinking_transcript',
      id: state.thinkingBlockId,
      content: capped,
      state: 'active' as const,
      updatedAt: Date.now(),
    }
    if (existingIdx !== -1) {
      state.blocks[existingIdx] = block
      return
    }
    const firstTextIdx = state.blocks.findIndex((candidate) => candidate.type === 'text')
    const insertIndex = firstTextIdx === -1 ? state.blocks.length : firstTextIdx
    state.blocks.splice(insertIndex, 0, block)
  }

  completeThinkingTranscript(state: ChatOrderedBlocksState): void {
    const thinkingBlock = state.blocks.find(
      (block) => block.type === 'thinking_transcript' && block.state === 'active',
    )
    if (thinkingBlock) {
      thinkingBlock.state = 'complete'
    }
  }

  hasThinkingTranscript(state: ChatOrderedBlocksState): boolean {
    return state.blocks.some((block) => block.type === 'thinking_transcript')
  }

  private findToolBlockIndex(
    state: ChatOrderedBlocksState,
    name: string,
    toolCallId?: string,
  ): number {
    for (let i = state.blocks.length - 1; i >= 0; i--) {
      const block = state.blocks[i]
      if (block?.type !== 'tool') continue
      if (toolCallId && block.toolCallId === toolCallId) return i
      if (!toolCallId && block.name === name && block.state === 'active') return i
    }
    return -1
  }

  private findDuplicateToolStartIndex(
    state: ChatOrderedBlocksState,
    name: string,
    label: string,
    action?: string,
    toolCallId?: string,
  ): number {
    if (toolCallId) {
      return state.blocks.findIndex(
        (block) => block?.type === 'tool' && block.toolCallId === toolCallId,
      )
    }
    return state.blocks.findIndex(
      (block) =>
        block?.type === 'tool' &&
        block.name === name &&
        block.label === label &&
        block.action === action &&
        block.state === 'active',
    )
  }
}
