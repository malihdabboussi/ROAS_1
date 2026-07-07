import { Injectable, Logger } from '@nestjs/common'
import type { SendFn } from '../../chat/services/openclaw-proxy.service'
import { ChannelAgentRepository } from '../repositories/channel-agent.repository'

const PROGRESS_DEBOUNCE_MS = 3_000
type OrderedContentBlock = Record<string, unknown>

@Injectable()
export class ChannelAgentProgressService {
  constructor(private readonly repository: ChannelAgentRepository) {}

  createTracker(input: {
    messageId: string
    agentKey: string
    logger: Logger
  }): ChannelAgentProgressTracker {
    return new ChannelAgentProgressTracker(this.repository, input)
  }

  async updateMessageProgress(
    messageId: string,
    agentKey: string,
    phase?: string,
    orderedBlocks?: Array<Record<string, unknown>>,
  ): Promise<void> {
    const { data: msg } = await this.repository.findMessageMetadata(messageId)

    const existing = (msg as { metadata?: Record<string, unknown> })?.metadata ?? {}
    const agentStatus = (existing.agent_status as Record<string, string>) ?? {}
    agentStatus[agentKey] = 'processing'
    const agentPhases = (existing.agent_phases as Record<string, string>) ?? {}
    if (phase) {
      agentPhases[agentKey] = phase
    }
    const agentLastActivities = (existing.agent_last_activities as Record<string, string>) ?? {}
    agentLastActivities[agentKey] = new Date().toISOString()
    const agentContentBlocks = (existing.agent_content_blocks as Record<string, unknown>) ?? {}
    if (orderedBlocks) {
      agentContentBlocks[agentKey] = orderedBlocks
    }

    await this.repository.updateMessageMetadata(messageId, {
      ...existing,
      agent_status: agentStatus,
      agent_phases: agentPhases,
      agent_last_activities: agentLastActivities,
      agent_content_blocks: agentContentBlocks,
    })
  }

  async updateAgentStatus(
    messageId: string,
    agentKey: string,
    status: 'completed' | 'failed',
  ): Promise<void> {
    const { data: msg } = await this.repository.findMessageMetadata(messageId)

    const existing = (msg as { metadata?: Record<string, unknown> })?.metadata ?? {}
    const agentStatus = (existing.agent_status as Record<string, string>) ?? {}
    agentStatus[agentKey] = status
    const agentPhases = (existing.agent_phases as Record<string, string>) ?? {}
    delete agentPhases[agentKey]
    const agentLastActivities = (existing.agent_last_activities as Record<string, string>) ?? {}
    agentLastActivities[agentKey] = new Date().toISOString()
    const agentContentBlocks = (existing.agent_content_blocks as Record<string, unknown>) ?? {}
    delete agentContentBlocks[agentKey]

    await this.repository.updateMessageMetadata(messageId, {
      ...existing,
      agent_status: agentStatus,
      agent_phases: agentPhases,
      agent_last_activities: agentLastActivities,
      agent_content_blocks: agentContentBlocks,
    })
  }
}

class ChannelAgentProgressTracker {
  private responseContent = ''
  private pendingPhase: string | null = null
  private pendingBlocksWrite = false
  private lastDbWrite = 0
  private hasEverFlushedBlocks = false
  private readonly orderedBlocks: OrderedContentBlock[] = []
  private readonly toolKeyToIndex = new Map<string, number>()

  constructor(
    private readonly repository: ChannelAgentRepository,
    private readonly input: { messageId: string; agentKey: string; logger: Logger },
  ) {}

  get send(): SendFn {
    return async (type, data) => {
      if (type === 'content_delta' && typeof data.content === 'string') {
        this.responseContent += data.content
        this.appendTextBlock(data.content)
        this.pendingBlocksWrite = true
        await this.flushProgress()
        return
      }
      if (type === 'thinking_delta') {
        const thinkingText =
          typeof data.text === 'string'
            ? data.text
            : typeof data.delta === 'string'
              ? data.delta
              : ''
        if (thinkingText.trim()) {
          this.upsertThinkingBlock(thinkingText)
          this.pendingBlocksWrite = true
          await this.flushProgress()
        }
        return
      }
      if (type === 'status' && typeof data.phase === 'string') {
        this.pendingPhase = data.phase
        if (data.phase !== 'thinking') {
          this.completeThinkingBlock()
          this.pendingBlocksWrite = true
        }
        await this.flushProgress()
        return
      }
      if (type === 'tool_start' && typeof data.label === 'string') {
        this.pendingPhase = data.label
        this.startToolBlock(
          typeof data.name === 'string' ? data.name : 'tool',
          data.label,
          typeof data.action === 'string' ? data.action : undefined,
          typeof data.tool_call_id === 'string' ? data.tool_call_id : undefined,
        )
        this.pendingBlocksWrite = true
        await this.flushProgress()
        return
      }
      if (type === 'tool_update') {
        this.appendToolProgress(
          typeof data.name === 'string' ? data.name : 'tool',
          typeof data.detail === 'string' ? data.detail : '',
          typeof data.tool_call_id === 'string' ? data.tool_call_id : undefined,
        )
        this.pendingBlocksWrite = true
        await this.flushProgress()
        return
      }
      if (type === 'tool_content_preview') {
        this.setToolPreview(
          typeof data.name === 'string' ? data.name : 'tool',
          typeof data.content === 'string' ? data.content : '',
          typeof data.tool_call_id === 'string' ? data.tool_call_id : undefined,
        )
        this.pendingBlocksWrite = true
        await this.flushProgress()
        return
      }
      if (type === 'tool_end') {
        this.pendingPhase = 'thinking'
        this.completeToolBlock(
          typeof data.name === 'string' ? data.name : 'tool',
          data.status === 'failed' ? 'failed' : 'completed',
          typeof data.tool_call_id === 'string' ? data.tool_call_id : undefined,
          typeof data.error === 'string' ? data.error : undefined,
        )
        this.pendingBlocksWrite = true
        await this.flushProgress()
        return
      }
      if (type === 'ui_block') {
        this.appendUiBlock(data.block)
        this.pendingBlocksWrite = true
        await this.flushProgress()
      }
    }
  }

  getResponseContent(): string {
    return this.responseContent
  }

  resetResponseContent(): void {
    this.responseContent = ''
  }

  finalBlocks(): OrderedContentBlock[] {
    const normalized = this.cloneOrderedBlocks()
      .map((block) => {
        if (block.type === 'tool' && block.state === 'active') {
          return { ...block, state: 'complete', endedAt: Date.now() }
        }
        if (block.type === 'thinking_transcript' && block.state === 'active') {
          return { ...block, state: 'complete' }
        }
        return block
      })
      .filter((block) => {
        if (block.type === 'thinking_transcript') {
          const content = String(block.content ?? '').trim()
          return content.length > 0
        }
        return true
      })

    const hasTextBlock = normalized.some((b) => b.type === 'text')
    const replyText = this.responseContent.trim()
    if (!hasTextBlock && replyText.length > 0) {
      normalized.push({
        type: 'text',
        id: `text-final-${Date.now()}`,
        content: replyText,
      })
    }
    return normalized
  }

  toolSteps(blocks: OrderedContentBlock[]) {
    return blocks
      .filter((block) => block.type === 'tool')
      .map((block) => ({
        name: String(block.name ?? 'tool'),
        label: String(block.label ?? 'Tool'),
        status: block.state === 'failed' ? 'failed' : 'completed',
      }))
  }

  private cloneOrderedBlocks(): OrderedContentBlock[] {
    return this.orderedBlocks.map(
      (block) => JSON.parse(JSON.stringify(block)) as OrderedContentBlock,
    )
  }

  private appendTextBlock(chunk: string) {
    if (!chunk) return
    const last = this.orderedBlocks[this.orderedBlocks.length - 1]
    if (last && last.type === 'text') {
      last.content = `${String(last.content ?? '')}${chunk}`
      return
    }
    this.orderedBlocks.push({
      type: 'text',
      id: `text-${Date.now()}-${this.orderedBlocks.length}`,
      content: chunk,
    })
  }

  private upsertThinkingBlock(content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    const existingIdx = this.orderedBlocks.findIndex((b) => b.type === 'thinking_transcript')
    const block = {
      type: 'thinking_transcript',
      id: `thinking-${this.input.messageId}`,
      content: trimmed,
      state: 'active',
    }
    if (existingIdx === -1) {
      const firstNonTextIdx = this.orderedBlocks.findIndex((b) => b.type !== 'text')
      if (firstNonTextIdx !== -1) {
        this.orderedBlocks.splice(firstNonTextIdx, 0, block)
      } else {
        this.orderedBlocks.unshift(block)
      }
    } else {
      this.orderedBlocks[existingIdx] = block
    }
  }

  private completeThinkingBlock() {
    const idx = this.orderedBlocks.findIndex(
      (b) => b.type === 'thinking_transcript' && b.state === 'active',
    )
    if (idx === -1) return
    this.orderedBlocks[idx] = {
      ...this.orderedBlocks[idx],
      state: 'complete',
    }
  }

  private resolveToolKey(name: string, toolCallId?: string) {
    return toolCallId || name
  }

  private startToolBlock(name: string, label: string, action?: string, toolCallId?: string) {
    const id = toolCallId || `tool-${name}-${Date.now()}-${this.orderedBlocks.length}`
    const key = this.resolveToolKey(name, toolCallId)
    const idx = this.orderedBlocks.length
    this.orderedBlocks.push({
      type: 'tool',
      id,
      name,
      label,
      ...(action ? { action } : {}),
      ...(toolCallId ? { toolCallId: toolCallId } : {}),
      state: 'active',
      startedAt: Date.now(),
    })
    this.toolKeyToIndex.set(key, idx)
  }

  private resolveToolIndex(name: string, toolCallId?: string): number {
    const key = this.resolveToolKey(name, toolCallId)
    const mapped = this.toolKeyToIndex.get(key)
    if (mapped !== undefined) return mapped
    for (let i = this.orderedBlocks.length - 1; i >= 0; i--) {
      const block = this.orderedBlocks[i]
      if (
        block?.type === 'tool' &&
        block?.name === name &&
        (toolCallId ? block.toolCallId === toolCallId : true) &&
        block.state === 'active'
      ) {
        this.toolKeyToIndex.set(key, i)
        return i
      }
    }
    return -1
  }

  private appendToolProgress(name: string, detail: string, toolCallId?: string) {
    if (!detail.trim()) return
    const idx = this.resolveToolIndex(name, toolCallId)
    if (idx === -1) return
    const block = this.orderedBlocks[idx]
    const progress = Array.isArray(block.progress)
      ? (block.progress as Array<Record<string, unknown>>)
      : []
    progress.push({
      id: `tp-${name}-${Date.now()}-${progress.length}`,
      detail,
      timestamp: Date.now(),
    })
    this.orderedBlocks[idx] = {
      ...block,
      progress,
    }
  }

  private setToolPreview(name: string, preview: string, toolCallId?: string) {
    if (!preview.trim()) return
    const idx = this.resolveToolIndex(name, toolCallId)
    if (idx === -1) return
    this.orderedBlocks[idx] = {
      ...this.orderedBlocks[idx],
      preview,
    }
  }

  private completeToolBlock(
    name: string,
    status: 'completed' | 'failed',
    toolCallId?: string,
    error?: string,
  ) {
    const idx = this.resolveToolIndex(name, toolCallId)
    if (idx === -1) return
    const key = this.resolveToolKey(name, toolCallId)
    this.toolKeyToIndex.delete(key)
    const block = this.orderedBlocks[idx]
    this.orderedBlocks[idx] = {
      ...block,
      state: status === 'completed' ? 'complete' : 'failed',
      endedAt: Date.now(),
      ...(error ? { error } : {}),
    }
  }

  private appendUiBlock(block: unknown) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return
    const candidate = block as Record<string, unknown>
    const type = typeof candidate.type === 'string' ? candidate.type : ''
    if (!type) return
    this.orderedBlocks.push({
      ...candidate,
      type,
      id:
        typeof candidate.id === 'string' && candidate.id.trim().length > 0
          ? candidate.id
          : `ui-${Date.now()}-${this.orderedBlocks.length}`,
    })
  }

  private async flushProgress() {
    if (!this.pendingPhase && !this.pendingBlocksWrite) return
    const now = Date.now()
    const timeSinceLast = now - this.lastDbWrite
    const isFirstBlockFlush =
      this.pendingBlocksWrite && !this.hasEverFlushedBlocks && this.orderedBlocks.length > 0
    if (!isFirstBlockFlush && timeSinceLast < PROGRESS_DEBOUNCE_MS) return
    if (isFirstBlockFlush) this.hasEverFlushedBlocks = true
    this.lastDbWrite = now
    const phase = this.pendingPhase
    const blocks = this.pendingBlocksWrite ? this.cloneOrderedBlocks() : undefined
    this.pendingPhase = null
    this.pendingBlocksWrite = false
    const service = new ChannelAgentProgressService(this.repository)
    await service
      .updateMessageProgress(this.input.messageId, this.input.agentKey, phase ?? undefined, blocks)
      .catch((err) => {
        this.input.logger.warn(`Progress DB write failed: ${err}`)
      })
  }
}
