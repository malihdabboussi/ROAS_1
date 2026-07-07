import { Injectable, type Logger } from '@nestjs/common'
import type { SendFn } from '../../chat/services/openclaw-proxy.service'
import { TaskAgentRepository } from '../repositories/task-agent.repository'

const PROGRESS_DEBOUNCE_MS = 3_000
type OrderedContentBlock = Record<string, unknown>
type TaskAgentToolStep = { name: string; label: string; status: string; error?: string }
type TaskExecutionTerminalStatus = 'done' | 'failed' | 'cancelled'

@Injectable()
export class TaskAgentProgressService {
  constructor(private readonly repository: TaskAgentRepository) {}

  createTracker(input: {
    activityId: string
    itemId: string
    agentKey: string
    logger: Logger
  }): TaskAgentProgressTracker {
    return new TaskAgentProgressTracker(this, input)
  }

  async updateActivityProgress(
    activityId: string,
    agentKey: string,
    phase?: string,
    orderedBlocks?: OrderedContentBlock[],
  ): Promise<void> {
    const { data: row } = await this.repository.findActivityPayload(activityId)

    const existing = ((row as Record<string, unknown>)?.payload ?? {}) as Record<string, unknown>
    const updated: Record<string, unknown> = { ...existing, agent_key: agentKey }
    if (phase) updated.phase = phase
    if (orderedBlocks) updated.content_blocks_ordered = orderedBlocks

    await this.repository.updateActivityPayload(activityId, updated)
  }

  async completeActivity(
    activityId: string,
    agentKey: string,
    status: TaskExecutionTerminalStatus,
    content: string,
    blocks: OrderedContentBlock[],
    error?: string,
    toolSteps?: TaskAgentToolStep[],
    durationMs?: number,
  ): Promise<void> {
    const { data: row } = await this.repository.findActivityPayload(activityId)
    const existing = ((row as Record<string, unknown>)?.payload ?? {}) as Record<string, unknown>
    const payload: Record<string, unknown> = {
      ...existing,
      status,
      agent_key: agentKey,
      content: content.trim(),
      content_blocks_ordered: blocks,
    }
    if (toolSteps?.length) payload.tool_steps = toolSteps
    if (error) payload.error = error
    if (typeof durationMs === 'number' && Number.isFinite(durationMs)) {
      payload.duration_ms = Math.max(0, Math.round(durationMs))
    }

    await this.repository.updateActivityPayload(activityId, payload)
  }

  async finalizeItemExecution(
    itemId: string,
    spaceId: string,
    status: TaskExecutionTerminalStatus,
    logger: Logger,
    executionBatchId?: string | null,
  ): Promise<void> {
    if (!executionBatchId) {
      await this.setItemExecutionStatus(itemId, spaceId, status)
      await this.triggerAutomationResume(itemId, spaceId, status, logger)
      return
    }

    const batchStatus = await this.resolveBatchFinalStatus(itemId, executionBatchId)
    if (!batchStatus) return
    await this.setItemExecutionStatus(itemId, spaceId, batchStatus)
    await this.triggerAutomationResume(itemId, spaceId, batchStatus, logger)
  }

  private async resolveBatchFinalStatus(
    itemId: string,
    executionBatchId: string,
  ): Promise<TaskExecutionTerminalStatus | null> {
    const { data } = await this.repository.listBatchActivityPayloads(itemId, executionBatchId)
    const payloads = ((data ?? []) as Array<{ payload?: Record<string, unknown> }>).map(
      (row) => row.payload ?? {},
    )
    const expected = new Set<string>()
    for (const payload of payloads) {
      const keys = Array.isArray(payload.execution_batch_agent_keys)
        ? payload.execution_batch_agent_keys
        : []
      for (const key of keys) {
        if (typeof key === 'string' && key.trim()) expected.add(key.trim())
      }
    }
    if (expected.size === 0) {
      for (const payload of payloads) {
        if (typeof payload.agent_key === 'string' && payload.agent_key.trim()) {
          expected.add(payload.agent_key.trim())
        }
      }
    }
    if (expected.size === 0) return null

    const statusByAgent = new Map<string, unknown>()
    for (const payload of payloads) {
      const agentKey = typeof payload.agent_key === 'string' ? payload.agent_key.trim() : ''
      if (agentKey) statusByAgent.set(agentKey, payload.status)
    }

    let hasCancelled = false
    let hasFailure = false
    for (const agentKey of expected) {
      const agentStatus = statusByAgent.get(agentKey)
      if (agentStatus !== 'done' && agentStatus !== 'failed' && agentStatus !== 'cancelled') {
        return null
      }
      if (agentStatus === 'cancelled') hasCancelled = true
      if (agentStatus === 'failed') hasFailure = true
    }
    if (hasCancelled) return 'cancelled'
    return hasFailure ? 'failed' : 'done'
  }

  async setItemExecutionStatus(
    itemId: string,
    spaceId: string,
    status: 'running' | TaskExecutionTerminalStatus,
  ): Promise<void> {
    await this.repository.updateTaskExecutionStatus(itemId, spaceId, status)
  }

  async triggerAutomationResume(
    itemId: string,
    spaceId: string,
    status: TaskExecutionTerminalStatus,
    logger: Logger,
  ): Promise<void> {
    const apiUrl = (
      process.env.MAIN_API_URL ??
      process.env.API_URL ??
      process.env.BACKEND_URL ??
      ''
    ).replace(/\/+$/, '')
    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
    if (!apiUrl || !internalToken) return

    const { data: pausedRun } = await this.repository.findPausedAutomationRun(itemId)

    if (!pausedRun) return

    fetch(`${apiUrl}/api/internal/spaces/${spaceId}/automations/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
      body: JSON.stringify({
        run_state_id: pausedRun.id,
        task_status: status === 'cancelled' ? 'failed' : status,
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch((err) => {
      logger.error(`Automation resume call failed: ${err}`)
    })
  }
}

class TaskAgentProgressTracker {
  private responseContent = ''
  private pendingPhase: string | null = null
  private pendingBlocksWrite = false
  private lastDbWrite = 0
  private hasEverFlushedBlocks = false
  private readonly orderedBlocks: OrderedContentBlock[] = []
  private readonly toolKeyToIndex = new Map<string, number>()

  constructor(
    private readonly progressService: TaskAgentProgressService,
    private readonly input: {
      activityId: string
      itemId: string
      agentKey: string
      logger: Logger
    },
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
        if (block.type === 'thinking_transcript')
          return String(block.content ?? '').trim().length > 0
        return true
      })

    const hasTextBlock = normalized.some((block) => block.type === 'text')
    const replyText = this.responseContent.trim()
    if (!hasTextBlock && replyText.length > 0) {
      normalized.push({ type: 'text', id: `text-final-${Date.now()}`, content: replyText })
    }
    return normalized
  }

  toolSteps(blocks: OrderedContentBlock[]): TaskAgentToolStep[] {
    return blocks
      .filter((block) => block.type === 'tool')
      .map((block) => ({
        name: String(block.name ?? 'tool'),
        label: String(block.label ?? 'Tool'),
        status: block.state === 'failed' ? 'failed' : 'completed',
        ...(typeof block.error === 'string' ? { error: block.error } : {}),
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
    const now = Date.now()
    const maxThinkingChars = 10_000
    const capped =
      trimmed.length > maxThinkingChars ? trimmed.slice(trimmed.length - maxThinkingChars) : trimmed
    let activeIdx = -1
    for (let i = this.orderedBlocks.length - 1; i >= 0; i--) {
      const block = this.orderedBlocks[i]
      if (block?.type === 'thinking_transcript' && block.state === 'active') {
        activeIdx = i
        break
      }
    }
    if (activeIdx !== -1) {
      this.orderedBlocks[activeIdx] = {
        ...this.orderedBlocks[activeIdx],
        content: capped,
        updatedAt: now,
      }
      return
    }
    this.orderedBlocks.push({
      type: 'thinking_transcript',
      id: `thinking-${this.input.itemId}-${now}-${this.orderedBlocks.length}`,
      content: capped,
      state: 'active',
      updatedAt: now,
    })
  }

  private completeThinkingBlock() {
    let idx = -1
    for (let i = this.orderedBlocks.length - 1; i >= 0; i--) {
      const block = this.orderedBlocks[i]
      if (block?.type === 'thinking_transcript' && block.state === 'active') {
        idx = i
        break
      }
    }
    if (idx === -1) return
    this.orderedBlocks[idx] = { ...this.orderedBlocks[idx], state: 'complete' }
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
      ...(toolCallId ? { toolCallId } : {}),
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
    this.orderedBlocks[idx] = { ...block, progress }
  }

  private setToolPreview(name: string, preview: string, toolCallId?: string) {
    if (!preview.trim()) return
    const idx = this.resolveToolIndex(name, toolCallId)
    if (idx === -1) return
    this.orderedBlocks[idx] = { ...this.orderedBlocks[idx], preview }
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
    await this.progressService
      .updateActivityProgress(
        this.input.activityId,
        this.input.agentKey,
        phase ?? undefined,
        blocks,
      )
      .catch((err) => {
        this.input.logger.warn(`Task activity progress write failed: ${err}`)
      })
  }
}
