import { Injectable, Logger, Optional } from '@nestjs/common'
import { resolveUiBlocksFromToolResult } from '../../shared/ui-block-extractor'
import { BrainLiveOpenClawGatewayClient } from '../integrations/brain-live-openclaw-gateway.client'
import type { DelegationState } from './brain-live.types'

type DelegationEventHandler = (type: string, data: Record<string, unknown>) => void

interface StreamRequest {
  delegationId: string
  gatewayUrl: string
  headers: Record<string, string>
  payload: Record<string, unknown>
  state: DelegationState
  onEvent: DelegationEventHandler
}

interface StreamLoopOptions extends StreamRequest {
  mode: 'delegation' | 'queue'
  queueContentAccum?: { value: string }
}

@Injectable()
export class BrainLiveDelegationStreamService {
  private readonly logger = new Logger(BrainLiveDelegationStreamService.name)

  constructor(
    @Optional()
    private readonly gatewayClient: BrainLiveOpenClawGatewayClient = new BrainLiveOpenClawGatewayClient(),
  ) {}

  async streamDelegation(request: StreamRequest): Promise<void> {
    const shouldPostProcess = await this.runStreamLoop({ ...request, mode: 'delegation' })
    if (!shouldPostProcess) return

    if (request.state.content) {
      request.state.orderedBlocks.push({
        type: 'text',
        id: `text-${Date.now()}`,
        content: request.state.content,
      })
    }

    request.onEvent('delegation_complete', {
      delegation_id: request.delegationId,
      status: request.state.status,
    })
  }

  async streamQueuedMessage(request: StreamRequest): Promise<void> {
    const queueContentAccum = { value: '' }
    const shouldPostProcess = await this.runStreamLoop({
      ...request,
      mode: 'queue',
      queueContentAccum,
    })
    if (!shouldPostProcess) return

    if (queueContentAccum.value) {
      request.state.orderedBlocks.push({
        type: 'text',
        id: `text-${Date.now()}`,
        content: queueContentAccum.value,
      })
    }

    request.onEvent('queue_message_done', { delegation_id: request.delegationId })
  }

  private async runStreamLoop(options: StreamLoopOptions): Promise<boolean> {
    const activeToolLabels: Record<string, string> = {}
    const activeToolArgs: Record<string, Record<string, unknown> | undefined> = {}
    const activeToolActions: Record<string, string | undefined> = {}
    const IDLE_TIMEOUT_MS = 120_000
    const abortController = new AbortController()
    let idleTimer: ReturnType<typeof setTimeout> | null = setTimeout(
      () => abortController.abort(),
      IDLE_TIMEOUT_MS,
    )
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => abortController.abort(), IDLE_TIMEOUT_MS)
    }

    try {
      const res = await this.gatewayClient.postResponses({
        gatewayUrl: options.gatewayUrl,
        headers: options.headers,
        payload: options.payload,
        signal: abortController.signal,
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        this.logger.error(
          `${options.mode === 'delegation' ? 'openclaw' : 'queue_message'}_stream_error delegation=${options.delegationId} status=${res.status} body=${errText.slice(0, 300)}`,
        )
        if (options.mode === 'delegation') {
          options.state.status = 'failed'
          options.state.content = `Error: gateway returned ${res.status}`
        }
        return false
      }

      const reader = res.body?.getReader()
      if (!reader) {
        if (options.mode === 'delegation') {
          options.state.status = 'failed'
          options.state.content = 'No response body'
        }
        return false
      }

      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        resetIdleTimer()
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]' || !data) continue

          let evt: Record<string, unknown>
          try {
            evt = JSON.parse(data)
          } catch {
            continue
          }

          this.handleEvent(options, evt, {
            activeToolLabels,
            activeToolArgs,
            activeToolActions,
          })
        }
      }

      if (options.mode === 'delegation' && options.state.status === 'running') {
        options.state.status = 'completed'
        options.state.completedAt = Date.now()
      }
    } catch (err) {
      this.logger.error(
        `${options.mode === 'delegation' ? 'openclaw' : 'queue_message'}_stream_failed delegation=${options.delegationId} err=${err instanceof Error ? err.message : String(err)}`,
      )
      if (options.mode === 'delegation') {
        options.state.status = 'failed'
        options.state.completedAt = Date.now()
      }
    } finally {
      if (idleTimer) clearTimeout(idleTimer)
    }

    return true
  }

  private handleEvent(
    options: StreamLoopOptions,
    evt: Record<string, unknown>,
    active: {
      activeToolLabels: Record<string, string>
      activeToolArgs: Record<string, Record<string, unknown> | undefined>
      activeToolActions: Record<string, string | undefined>
    },
  ): void {
    const type = (evt.type as string) ?? ''

    switch (type) {
      case 'response.output_text.delta':
        this.handleContentDelta(options, evt)
        break
      case 'response.status':
        if (options.mode === 'delegation') this.handleStatus(options, evt)
        break
      case 'response.tool.start':
        this.handleToolStart(options, evt, active)
        break
      case 'response.tool.update':
        this.handleToolUpdate(options, evt)
        break
      case 'response.tool.done':
        this.handleToolDone(options, evt, active)
        break
      case 'response.artifact.start':
        this.handleGenerationStart(options, evt)
        break
      case 'response.artifact.done':
        this.handleGenerationDone(options, evt)
        break
      case 'response.reasoning.delta':
        this.handleReasoningDelta(options, evt)
        break
      case 'response.tool_args.delta':
        if (options.mode === 'delegation') this.handleToolArgsDelta(options, evt)
        break
      case 'response.completed':
        if (options.mode === 'delegation') {
          options.state.status = 'completed'
          options.state.completedAt = Date.now()
        }
        this.completeActiveThinkingBlock(options.state)
        break
      case 'response.failed':
        if (options.mode === 'delegation') {
          options.state.status = 'failed'
          options.state.completedAt = Date.now()
        }
        this.completeActiveThinkingBlock(options.state)
        break
    }
  }

  private handleContentDelta(options: StreamLoopOptions, evt: Record<string, unknown>): void {
    const delta = (evt.delta as string) ?? ''
    if (!delta) return
    options.state.content += delta
    if (options.queueContentAccum) options.queueContentAccum.value += delta
    options.onEvent('content_delta', { content: delta })
  }

  private handleStatus(options: StreamLoopOptions, evt: Record<string, unknown>): void {
    const phase = (evt.phase as string) ?? 'thinking'
    const message = typeof evt.message === 'string' ? evt.message : undefined
    const ts = Date.now()
    if (phase === 'compacting') {
      const label = message?.trim() || 'Summarizing our conversation'
      const activeIdx = options.state.orderedBlocks.findIndex(
        (b) => b.type === 'session_compaction' && b.state === 'active',
      )
      if (activeIdx !== -1) {
        options.state.orderedBlocks[activeIdx]!.label = label
      } else {
        options.state.orderedBlocks.push({
          type: 'session_compaction',
          id: `compaction-${ts}`,
          label,
          state: 'active',
          timestamp: ts,
        })
      }
    } else {
      for (let i = options.state.orderedBlocks.length - 1; i >= 0; i--) {
        const block = options.state.orderedBlocks[i]
        if (block?.type === 'session_compaction' && block.state === 'active') {
          block.state = 'complete'
          block.completedAt = ts
          break
        }
      }
    }
    options.onEvent('status', { phase, ...(message ? { message } : {}) })
  }

  private handleToolStart(
    options: StreamLoopOptions,
    evt: Record<string, unknown>,
    active: {
      activeToolLabels: Record<string, string>
      activeToolArgs: Record<string, Record<string, unknown> | undefined>
      activeToolActions: Record<string, string | undefined>
    },
  ): void {
    const name = (evt.name as string) ?? 'tool'
    const toolCallId = (evt.tool_call_id as string) ?? ''
    const args = (evt.args as Record<string, unknown>) ?? {}
    const label = (args.label as string) ?? name
    const action = (args.action as string) ?? undefined
    const key = toolCallId || name
    active.activeToolLabels[key] = label
    active.activeToolArgs[key] = args
    if (action) active.activeToolActions[key] = action
    options.state.currentTool = label
    const ts = Date.now()
    options.state.orderedBlocks.push({
      type: 'tool',
      id: `tool-${name}-${ts}`,
      name,
      label,
      state: 'active',
      startedAt: ts,
    })
    options.onEvent('tool_start', {
      name,
      label,
      ...(action ? { action } : {}),
      ...(toolCallId ? { tool_call_id: toolCallId } : {}),
    })
  }

  private handleToolUpdate(options: StreamLoopOptions, evt: Record<string, unknown>): void {
    const name = (evt.name as string) ?? 'tool'
    const toolCallId = (evt.tool_call_id as string) ?? ''
    const partialResult = evt.partial_result as Record<string, unknown> | undefined
    const detail =
      typeof partialResult?.detail === 'string'
        ? partialResult.detail
        : typeof partialResult?.message === 'string'
          ? partialResult.message
          : ''
    if (!detail) return
    options.onEvent('tool_update', {
      name,
      detail,
      ...(toolCallId ? { tool_call_id: toolCallId } : {}),
    })
  }

  private handleToolDone(
    options: StreamLoopOptions,
    evt: Record<string, unknown>,
    active: {
      activeToolLabels: Record<string, string>
      activeToolArgs: Record<string, Record<string, unknown> | undefined>
      activeToolActions: Record<string, string | undefined>
    },
  ): void {
    const name = (evt.name as string) ?? 'tool'
    const toolCallId = (evt.tool_call_id as string) ?? ''
    const isError = (evt.is_error as boolean) ?? false
    const toolStatus = isError ? 'failed' : 'completed'
    const key = toolCallId || name
    const label = active.activeToolLabels[key] ?? name
    const action = active.activeToolActions[key]
    const toolArgs = active.activeToolArgs[key]
    delete active.activeToolLabels[key]
    delete active.activeToolArgs[key]
    delete active.activeToolActions[key]
    options.state.toolSteps.push({ name, label, status: toolStatus })
    options.state.currentTool = null
    const ts = Date.now()
    const toolBlock = [...options.state.orderedBlocks]
      .reverse()
      .find((b) => b.type === 'tool' && b.name === name && b.state === 'active')
    if (toolBlock) {
      toolBlock.state = toolStatus === 'completed' ? 'complete' : 'failed'
      toolBlock.endedAt = ts
    }
    options.onEvent('tool_end', {
      name,
      label,
      status: toolStatus,
      ...(toolCallId ? { tool_call_id: toolCallId } : {}),
    })

    const uiBlocks = resolveUiBlocksFromToolResult({
      name,
      action,
      toolArgs,
      result: evt.result,
      status: toolStatus as 'completed' | 'failed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })
    for (const block of uiBlocks) {
      options.onEvent('ui_block', { block })
      options.state.orderedBlocks.push({
        ...block,
        id: `ui-${ts}-${Math.random().toString(36).slice(2, 6)}`,
      })
    }
  }

  private handleGenerationStart(options: StreamLoopOptions, evt: Record<string, unknown>): void {
    const label = (evt.label as string) ?? 'Generating...'
    const ts = Date.now()
    options.state.orderedBlocks.push({
      type: 'generation',
      id: `gen-${ts}`,
      label,
      state: 'active',
      startedAt: ts,
    })
    options.onEvent('generation_start', { label })
  }

  private handleGenerationDone(options: StreamLoopOptions, evt: Record<string, unknown>): void {
    const label = (evt.label as string) ?? 'Done'
    const isError = (evt.is_error as boolean) ?? false
    const ts = Date.now()
    const genBlock = [...options.state.orderedBlocks]
      .reverse()
      .find((b) => b.type === 'generation' && b.state === 'active')
    if (genBlock) {
      genBlock.state = 'complete'
      genBlock.endedAt = ts
    }
    options.onEvent('generation_end', { label, status: isError ? 'failed' : 'completed' })
  }

  private handleReasoningDelta(options: StreamLoopOptions, evt: Record<string, unknown>): void {
    const delta = (evt.delta as string) ?? ''
    const text = (evt.text as string) ?? ''
    if (!delta) return
    options.state.thinkingText = (options.state.thinkingText ?? '') + delta
    const THINKING_BLOCK_ID = 'thinking-transcript'
    const MAX_THINKING = 8000
    const capped =
      options.state.thinkingText.length > MAX_THINKING
        ? options.state.thinkingText.slice(options.state.thinkingText.length - MAX_THINKING)
        : options.state.thinkingText
    const existIdx = options.state.orderedBlocks.findIndex((b) => b.type === 'thinking_transcript')
    const thinkBlock = {
      type: 'thinking_transcript' as const,
      id: THINKING_BLOCK_ID,
      content: capped,
      state: 'active' as const,
    }
    if (existIdx !== -1) {
      options.state.orderedBlocks[existIdx] = thinkBlock
    } else {
      options.state.orderedBlocks.unshift(thinkBlock)
    }
    options.onEvent('thinking_delta', { delta, text: text || capped })
  }

  private handleToolArgsDelta(options: StreamLoopOptions, evt: Record<string, unknown>): void {
    const name = (evt.name as string) ?? ''
    const partialJson = (evt.partial_json as string) ?? ''
    if (!name || !partialJson) return
    options.onEvent('tool_args_delta', {
      name,
      partial_json: partialJson,
      tool_call_id: (evt.tool_call_id as string) ?? '',
    })
  }

  private completeActiveThinkingBlock(state: DelegationState): void {
    const thinkBlock = state.orderedBlocks.find(
      (b) => b.type === 'thinking_transcript' && b.state === 'active',
    )
    if (thinkBlock) thinkBlock.state = 'complete'
  }
}
