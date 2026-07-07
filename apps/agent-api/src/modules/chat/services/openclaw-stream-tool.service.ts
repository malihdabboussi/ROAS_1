import { Injectable, Optional } from '@nestjs/common'
import { ErrorReporter, RouteTraceReporter } from '@vibey/api-shared'
import {
  isCampaignToolName,
  isRecord,
  resolveUiBlocksFromToolResult,
} from '../../shared/ui-block-extractor'
import { convertUiBlockToText } from './openclaw-ui-block-text'
import {
  extractCampaignAction,
  formatToolFailureMessage,
  inferToolErrorCategory,
  isHiddenCampaignAction,
  resolveLabel,
  resolveToolUpdateDetail,
} from './openclaw-tool-events'
import { buildToolTraceSummary } from './openclaw-tool-trace-summary'
import type { OpenClawStreamContext, OpenClawStreamState } from './openclaw-stream-state'
import { logFirstStreamTiming } from './openclaw-stream-state'
import { ResponseFilterService } from './response-filter.service'

@Injectable()
export class OpenClawStreamToolService {
  private static readonly A2A_ACTION_NAMES = new Set(['ask_agent', 'delegate_to_agent'])
  private static readonly TASK_OUTPUT_BLOCK_TYPES = new Set([
    'artifact_preview',
    'document_card',
    'pdf_file',
    'docx_file',
    'project_preview',
    'widget_preview',
    'browser_screenshot',
    'media_asset',
  ])

  constructor(
    private readonly responseFilter: ResponseFilterService,
    private readonly errorReporter: ErrorReporter,
    @Optional() private readonly routeTraceReporter?: RouteTraceReporter,
  ) {}

  async handleEvent(
    type: string,
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<boolean> {
    switch (type) {
      case 'response.tool.start':
        await this.handleToolStart(evt, context, state)
        return true
      case 'response.tool.update':
        await this.handleToolUpdate(evt, context, state)
        return true
      case 'response.tool.done':
        await this.handleToolDone(evt, context, state)
        return true
      default:
        return false
    }
  }

  private async handleToolStart(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const name = (evt.name as string) ?? 'tool'
    const toolCallId = (evt.tool_call_id as string) ?? ''
    const args = (evt.args as Record<string, unknown>) ?? {}
    logFirstStreamTiming(state, context, 'event_tool_start', {
      name,
      tool_call_id_present: Boolean(toolCallId),
      has_args: Object.keys(args).length > 0,
    })
    const toolSpanKey = toolCallId || name
    const { label, hidden, action } = resolveLabel(name, args)
    state.sawToolStart = true

    if (context.streamTimingLogsEnabled) {
      context.logger.log(`[Tool Start] ${name} \u2192 ${hidden ? 'HIDDEN' : label}`)
    }
    if (toolCallId) state.toolNameByCallId[toolCallId] = name
    if (isHiddenCampaignAction(name, action)) {
      state.activeToolActions[toolSpanKey] = action
      return
    }
    if (toolCallId && state.earlyStartedToolIds.has(toolCallId)) return
    this.reportToolRouteEvent('start', name, action, toolCallId, 'active', context)

    const safeLabel = label
      ? this.responseFilter.filterChunk(label, context.options.relaxedResponseFilter)
      : ''
    if (toolCallId && state.artifactToolCallIds.has(toolCallId)) {
      await context.options.send('status', { phase: 'executing' })
    } else if (hidden || !safeLabel) {
      state.hiddenToolStartCount++
      state.hiddenToolNameCounts[name] = (state.hiddenToolNameCounts[name] ?? 0) + 1
      await context.options.send('status', { phase: 'executing' })
    } else {
      await context.options.send('status', { phase: 'executing' })
      state.activeToolLabels[toolSpanKey] = safeLabel
      if (action) state.activeToolActions[toolSpanKey] = action
      await context.options.send('tool_start', {
        name,
        label: safeLabel,
        ...(action ? { action } : {}),
        ...(toolCallId ? { tool_call_id: toolCallId } : {}),
      })
    }
  }

  private async handleToolUpdate(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const eventToolCallId = (evt.tool_call_id as string) ?? ''
    const explicitName = (evt.name as string) ?? ''
    const name =
      explicitName ||
      (eventToolCallId ? (state.toolNameByCallId[eventToolCallId] ?? 'tool') : 'tool')
    logFirstStreamTiming(state, context, 'event_tool_update', {
      name,
      tool_call_id_present: Boolean(eventToolCallId),
    })
    const toolSpanKey = eventToolCallId || name
    const updateAction =
      state.activeToolActions[toolSpanKey] || extractCampaignAction(evt.partial_result)
    if (isHiddenCampaignAction(name, updateAction)) {
      if (updateAction) state.activeToolActions[toolSpanKey] = updateAction
      return
    }

    await this.recoverCampaignToolStart(name, eventToolCallId, evt, context, state)
    const a2aPayload = this.tryParseA2AMessage(name, evt.partial_result)
    if (a2aPayload) {
      await context.options.send('a2a_message', a2aPayload)
      return
    }

    const detail = resolveToolUpdateDetail(name, evt.partial_result)
    const safeDetail = detail
      ? this.responseFilter.filterChunk(detail, context.options.relaxedResponseFilter)
      : ''
    if (!safeDetail) return
    await context.options.send('status', { phase: 'executing' })
    await context.options.send('tool_update', {
      name,
      detail: safeDetail,
      ...(eventToolCallId ? { tool_call_id: eventToolCallId } : {}),
    })
  }

  private async recoverCampaignToolStart(
    name: string,
    eventToolCallId: string,
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const toolSpanKey = eventToolCallId || name
    if (
      !isCampaignToolName(name) ||
      state.activeToolLabels[toolSpanKey] ||
      !isRecord(evt.partial_result)
    ) {
      return
    }
    const { label, hidden, action } = resolveLabel(
      name,
      evt.partial_result as Record<string, unknown>,
    )
    const safeLabel = label
      ? this.responseFilter.filterChunk(label, context.options.relaxedResponseFilter)
      : ''
    if (hidden || !safeLabel) return
    state.activeToolLabels[toolSpanKey] = safeLabel
    if (action) state.activeToolActions[toolSpanKey] = action
    await context.options.send('status', { phase: 'executing' })
    await context.options.send('tool_start', {
      name,
      label: safeLabel,
      ...(action ? { action } : {}),
      ...(eventToolCallId ? { tool_call_id: eventToolCallId } : {}),
    })
  }

  private async handleToolDone(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const name = (evt.name as string) ?? 'tool'
    const toolCallId = (evt.tool_call_id as string) ?? ''
    logFirstStreamTiming(state, context, 'event_tool_done', {
      name,
      tool_call_id_present: Boolean(toolCallId),
      is_error: evt.is_error === true,
    })
    const toolSpanKey = toolCallId || name
    const isError = (evt.is_error as boolean) ?? false
    const status = isError ? 'failed' : 'completed'
    const errorDetail = isError ? formatToolFailureMessage(evt.result) : undefined
    const action =
      (evt.action as string | undefined) ?? state.activeToolActions[toolSpanKey] ?? undefined
    const toolArgs = isRecord(evt.args) ? (evt.args as Record<string, unknown>) : undefined
    const result = evt.result as unknown
    const toolAction =
      (typeof evt.action === 'string' && evt.action.trim()) ||
      (typeof toolArgs?.action === 'string' ? toolArgs.action : '') ||
      ''
    if (isHiddenCampaignAction(name, toolAction)) {
      this.clearToolState(name, toolCallId, toolSpanKey, state)
      return
    }
    if (context.streamTimingLogsEnabled) {
      context.logger.log(`[Tool End] ${name} \u2192 ${status}`)
    }
    const traceSummary = buildToolTraceSummary({
      name,
      action,
      toolCallId,
      args: toolArgs,
      result,
    })
    this.reportToolFailureIfNeeded(name, action, toolCallId, errorDetail, context, traceSummary)

    state.hiddenToolEndCount++
    if (isError) state.hiddenToolFailedCount++

    if (toolCallId && state.artifactToolCallIds.has(toolCallId)) {
      await this.emitArtifactUiBlocks(name, action, toolArgs, result, status, context, state)
      await context.options.send('status', { phase: 'thinking' })
      delete state.toolNameByCallId[toolCallId]
      return
    }

    await this.emitVisibleToolEnd(
      name,
      action,
      toolCallId,
      toolArgs,
      result,
      errorDetail,
      status,
      traceSummary,
      context,
      state,
    )
    this.clearToolState(name, toolCallId, toolSpanKey, state)
    this.updateMetaCaches(name, action, result, status, state)
    await this.emitUiBlocks(name, action, toolArgs, result, status, context, state)
  }

  private reportToolFailureIfNeeded(
    name: string,
    action: string | undefined,
    toolCallId: string,
    errorDetail: string | undefined,
    context: OpenClawStreamContext,
    traceSummary: ReturnType<typeof buildToolTraceSummary>,
  ): void {
    if (!errorDetail) return
    context.logger.warn(
      `[Tool Failed] ${name}${action ? ` action=${action}` : ''} error=${errorDetail}`,
    )
    this.errorReporter.report({
      app: 'agent-api',
      severity: 'error',
      feature: 'tool',
      error_code: 'tool_error',
      message: `Tool failed: ${name}${action ? ` (${action})` : ''} \u2014 ${errorDetail}`,
      category: inferToolErrorCategory(errorDetail),
      context: {
        agentId: context.agentId,
        toolName: name,
        action,
        toolCallId,
        conversationId: context.options.conversationId,
        model: context.resolvedModel,
        trace_id: context.options.traceId,
        message_id: context.options.messageId,
        request_id: context.options.requestId,
        run_id: context.options.runId,
        tool_error_code: traceSummary.error_code,
        error_class: traceSummary.error_class,
        workflow_class: traceSummary.workflow_class,
        effect_state: traceSummary.effect_state,
        retry_policy: traceSummary.retry_policy,
        observability: traceSummary.observability,
      },
      user_id: context.options.userId,
      agent_key: context.agentId,
      trace_id: context.options.traceId,
      message_id: context.options.messageId,
      request_id: context.options.requestId,
      run_id: context.options.runId,
      conversation_id: context.options.conversationId,
    })
  }

  private async emitVisibleToolEnd(
    name: string,
    action: string | undefined,
    toolCallId: string,
    toolArgs: Record<string, unknown> | undefined,
    result: unknown,
    errorDetail: string | undefined,
    status: 'completed' | 'failed',
    traceSummary: ReturnType<typeof buildToolTraceSummary>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const toolSpanKey = toolCallId || name
    let label = state.activeToolLabels[toolSpanKey]
    if (!label && isCampaignToolName(name) && toolArgs) {
      const resolved = resolveLabel(name, toolArgs)
      const safeLabel = resolved.label
        ? this.responseFilter.filterChunk(resolved.label, context.options.relaxedResponseFilter)
        : ''
      if (!resolved.hidden && safeLabel) {
        label = safeLabel
        if (resolved.action) state.activeToolActions[toolSpanKey] = resolved.action
        await context.options.send('status', { phase: 'executing' })
        await context.options.send('tool_start', {
          name,
          label: safeLabel,
          ...(resolved.action ? { action: resolved.action } : {}),
          ...(toolCallId ? { tool_call_id: toolCallId } : {}),
        })
      }
    }
    if (!label) return
    await context.options.send('tool_end', {
      name,
      label,
      status,
      ...(toolCallId ? { tool_call_id: toolCallId } : {}),
      ...(errorDetail ? { error: errorDetail } : {}),
    })
    state.toolSteps.push({
      name,
      label,
      status,
      ...(errorDetail ? { error: errorDetail } : {}),
      ...traceSummary,
    })
    this.reportToolRouteEvent(
      'complete',
      name,
      action,
      toolCallId,
      status,
      context,
      traceSummary,
      errorDetail,
    )
    delete state.activeToolLabels[toolSpanKey]
    await context.options.send('status', { phase: 'thinking' })
  }

  private reportToolRouteEvent(
    stage: string,
    name: string,
    action: string | undefined,
    toolCallId: string,
    status: 'active' | 'completed' | 'failed',
    context: OpenClawStreamContext,
    traceSummary?: ReturnType<typeof buildToolTraceSummary>,
    errorDetail?: string,
  ): void {
    this.routeTraceReporter?.report({
      request_id: context.options.requestId,
      trace_id: context.options.traceId,
      message_id: context.options.messageId,
      run_id: context.options.runId,
      conversation_id: context.options.conversationId,
      user_id: context.options.userId,
      surface: 'agent-api',
      service: 'openclaw',
      route: name,
      method: 'TOOL',
      event_type: 'tool_call',
      stage,
      status,
      error_code: traceSummary?.error_code ?? null,
      error_class: traceSummary?.error_class ?? null,
      workflow_class: traceSummary?.workflow_class ?? null,
      effect_state: traceSummary?.effect_state ?? null,
      retry_policy: traceSummary?.retry_policy ?? null,
      observability: {
        tool_name: name,
        action: action ?? null,
        tool_call_id: toolCallId || null,
        error: errorDetail ?? null,
        ...(traceSummary?.observability ? { tool_observability: traceSummary.observability } : {}),
      },
    })
  }

  private async emitArtifactUiBlocks(
    name: string,
    action: string | undefined,
    toolArgs: Record<string, unknown> | undefined,
    result: unknown,
    status: 'completed' | 'failed',
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const uiBlocks = resolveUiBlocksFromToolResult({
      name,
      action,
      toolArgs,
      result,
      status,
      cachedMetaAdAccounts: state.cachedMetaAdAccounts,
      cachedMetaPages: state.cachedMetaPages,
    })
    this.recordArtifactOutputBlocks(uiBlocks, state)
    for (const block of uiBlocks) {
      if (context.options.channel !== 'telegram' && context.options.channel !== 'slack') {
        await context.options.send('ui_block', { block })
      }
    }
  }

  private async emitUiBlocks(
    name: string,
    action: string | undefined,
    toolArgs: Record<string, unknown> | undefined,
    result: unknown,
    status: 'completed' | 'failed',
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const uiBlocks = resolveUiBlocksFromToolResult({
      name,
      action,
      toolArgs,
      result,
      status,
      cachedMetaAdAccounts: state.cachedMetaAdAccounts,
      cachedMetaPages: state.cachedMetaPages,
    })
    this.recordArtifactOutputBlocks(uiBlocks, state)
    for (const block of uiBlocks) {
      if (context.options.channel === 'telegram' || context.options.channel === 'slack') {
        const fallbackText = convertUiBlockToText(block)
        if (!fallbackText) continue
        if (!state.hasEmittedContent) {
          state.hasEmittedContent = true
          await context.options.send('status', {
            phase: 'streaming',
            message: 'Writing response',
          })
        }
        state.fullContent += `\n\n${fallbackText}`
        await context.options.send('content_delta', { content: `\n\n${fallbackText}` })
      } else {
        await context.options.send('ui_block', { block })
      }
    }
  }

  private recordArtifactOutputBlocks(
    blocks: Array<Record<string, unknown>>,
    state: OpenClawStreamState,
  ): void {
    for (const block of blocks) {
      if (!this.isArtifactOutputBlock(block)) continue
      state.artifactOutputBlocks.push(block)
    }
  }

  private isArtifactOutputBlock(block: Record<string, unknown>): boolean {
    if (!isRecord(block)) return false
    return (
      typeof block.type === 'string' &&
      OpenClawStreamToolService.TASK_OUTPUT_BLOCK_TYPES.has(block.type)
    )
  }

  private updateMetaCaches(
    name: string,
    action: string | undefined,
    result: unknown,
    status: 'completed' | 'failed',
    state: OpenClawStreamState,
  ): void {
    if (!isCampaignToolName(name) || status !== 'completed') return
    if (action === 'list_meta_ad_accounts' && isRecord(result)) {
      const payload = Array.isArray(result.data) ? result.data : []
      state.cachedMetaAdAccounts.length = 0
      for (const entry of payload) {
        if (!isRecord(entry)) continue
        const id = typeof entry.id === 'string' ? entry.id : ''
        const accountName = typeof entry.name === 'string' ? entry.name : ''
        if (!id || !accountName) continue
        state.cachedMetaAdAccounts.push({
          id,
          name: accountName,
          ...(typeof entry.currency === 'string' ? { currency: entry.currency } : {}),
        })
      }
    }
    if (action === 'list_meta_pages' && isRecord(result)) {
      const payload = Array.isArray(result.data) ? result.data : []
      state.cachedMetaPages.length = 0
      for (const entry of payload) {
        if (!isRecord(entry)) continue
        const id = typeof entry.id === 'string' ? entry.id : ''
        const pageName = typeof entry.name === 'string' ? entry.name : ''
        if (!id || !pageName) continue
        const pageItem = this.buildMetaPage(entry, id, pageName)
        state.cachedMetaPages.push(pageItem)
      }
    }
  }

  private buildMetaPage(
    entry: Record<string, unknown>,
    id: string,
    name: string,
  ): {
    id: string
    name: string
    instagram_business_account?: { id: string; username?: string }
  } {
    const pageItem: {
      id: string
      name: string
      instagram_business_account?: { id: string; username?: string }
    } = { id, name }
    const iba = isRecord(entry.instagram_business_account)
      ? entry.instagram_business_account
      : null
    if (iba && typeof iba.id === 'string') {
      pageItem.instagram_business_account = {
        id: iba.id,
        ...(typeof iba.username === 'string' ? { username: iba.username } : {}),
      }
    }
    return pageItem
  }

  private clearToolState(
    name: string,
    toolCallId: string,
    toolSpanKey: string,
    state: OpenClawStreamState,
  ): void {
    delete state.activeToolActions[toolSpanKey]
    if (toolCallId) delete state.toolNameByCallId[toolCallId]
    if (!toolCallId) delete state.toolNameByCallId[name]
  }

  private tryParseA2AMessage(
    toolName: string,
    partialResult: unknown,
  ): Record<string, unknown> | null {
    if (!OpenClawStreamToolService.A2A_ACTION_NAMES.has(toolName) && !isCampaignToolName(toolName)) {
      const partial = isRecord(partialResult) ? partialResult : null
      const action = partial?.action as string | undefined
      if (!action || !OpenClawStreamToolService.A2A_ACTION_NAMES.has(action)) return null
    }

    const partial = isRecord(partialResult) ? partialResult : null
    const raw = partial?.message ?? partial?.detail
    if (typeof raw !== 'string') return null

    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && parsed.type === 'a2a_message') {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
    return null
  }
}
