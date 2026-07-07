import { Injectable } from '@nestjs/common'
import { isCampaignToolName } from '../../shared/ui-block-extractor'
import {
  extractContentFromPartialToolArgs,
  extractStringFieldFromPartialJson,
  humanizeToolAction,
  isHiddenCampaignAction,
  PREVIEW_EXCLUDED_ACTIONS,
} from './openclaw-tool-events'
import type { OpenClawStreamContext, OpenClawStreamState } from './openclaw-stream-state'
import { logFirstStreamTiming } from './openclaw-stream-state'
import { ResponseFilterService } from './response-filter.service'

@Injectable()
export class OpenClawStreamContentService {
  constructor(private readonly responseFilter: ResponseFilterService) {}

  async handleEvent(
    type: string,
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<boolean> {
    switch (type) {
      case 'response.created':
        logFirstStreamTiming(state, context, 'event_response_created')
        return true
      case 'response.in_progress':
        logFirstStreamTiming(state, context, 'event_response_in_progress')
        return true
      case 'response.output_text.start':
        logFirstStreamTiming(state, context, 'event_output_text_start')
        return true
      case 'response.output_text.delta':
        await this.handleTextDelta(evt, context, state)
        return true
      case 'response.output_text.done':
        return true
      case 'response.reasoning.delta':
        await this.handleReasoningDelta(evt, context, state)
        return true
      case 'response.status':
        await this.handleStatus(evt, context)
        return true
      case 'response.artifact.start':
        await this.handleArtifactStart(evt, context, state)
        return true
      case 'response.artifact.done':
        await this.handleArtifactDone(evt, context, state)
        return true
      case 'response.tool_args.delta':
        await this.handleToolArgsDelta(evt, context, state)
        return true
      default:
        return false
    }
  }

  private async handleTextDelta(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const delta = (evt.delta as string) ?? ''
    if (!delta) return
    logFirstStreamTiming(state, context, 'event_output_text_delta', {
      delta_chars: delta.length,
    })

    let filtered = delta
    if (!context.options.disableResponseFilter) {
      const gated = this.responseFilter.enforceChunkPolicy(
        delta,
        context.options.relaxedResponseFilter,
      )
      if (gated.blocked) {
        await this.ensureStreamingStarted(context, state)
        if (!state.emittedHardBlockFallback) {
          state.emittedHardBlockFallback = true
          state.fullContent += gated.content
          if (gated.content) {
            await context.options.send('content_delta', { content: gated.content })
          }
        }
        return
      }
      filtered = gated.content
    }
    if (!filtered) return

    await this.ensureStreamingStarted(context, state)
    state.fullContent += filtered
    await context.options.send('content_delta', { content: filtered })
  }

  private async handleReasoningDelta(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const delta = (evt.delta as string) ?? ''
    const text = (evt.text as string) ?? ''
    if (delta || text) {
      logFirstStreamTiming(state, context, 'event_reasoning_delta', {
        delta_chars: delta.length,
        text_chars: text.length,
      })
    }
    if (delta) {
      await context.options.send('thinking_delta', { delta, text })
    }
  }

  private async handleStatus(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
  ): Promise<void> {
    const phase = (evt.phase as string) ?? 'thinking'
    const message = typeof evt.message === 'string' ? evt.message : undefined
    await context.options.send('status', { phase, ...(message ? { message } : {}) })
  }

  private async handleArtifactStart(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const artifactId = (evt.artifact_id as string) ?? ''
    const label = (evt.label as string) ?? 'Generating page'
    if (artifactId) state.artifactToolCallIds.add(artifactId)
    state.activeArtifactLabels[artifactId || label] = label
    await context.options.send('status', { phase: 'executing' })
    await context.options.send('tool_start', { name: 'artifact', label })
  }

  private async handleArtifactDone(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const artifactId = (evt.artifact_id as string) ?? ''
    const isError = (evt.is_error as boolean) ?? false
    const status = isError ? 'failed' : 'completed'
    const label =
      state.activeArtifactLabels[artifactId] ?? (evt.label as string) ?? 'Generating page'
    await context.options.send('tool_end', {
      name: 'artifact',
      label,
      status,
      ...(isError ? { error: 'Artifact generation failed' } : {}),
    })
    delete state.activeArtifactLabels[artifactId]
    if (artifactId) state.artifactToolCallIds.delete(artifactId)
    await context.options.send('status', { phase: 'thinking' })
  }

  private async handleToolArgsDelta(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    if (!state.contentPreviewEnabled) return
    const partialJson = (evt.partial_json as string) ?? ''
    if (!partialJson) return
    const toolCallId = (evt.tool_call_id as string) ?? ''
    const name = (evt.name as string) ?? ''
    logFirstStreamTiming(state, context, 'event_tool_args_delta', {
      name: name || 'unknown',
      tool_call_id_present: Boolean(toolCallId),
      partial_json_chars: partialJson.length,
    })
    if (!isCampaignToolName(name)) return

    state.contentPreviewBuffer = partialJson
    await this.maybeEmitEarlyToolStart(name, toolCallId, context, state)
    await this.maybeEmitToolContentPreview(name, toolCallId, context, state)
  }

  private async maybeEmitEarlyToolStart(
    name: string,
    toolCallId: string,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    if (!toolCallId || state.earlyStartedToolIds.has(toolCallId)) return
    const partialLabel = extractStringFieldFromPartialJson(
      state.contentPreviewBuffer,
      'label',
      0,
      true,
    )
    const partialAction = extractStringFieldFromPartialJson(
      state.contentPreviewBuffer,
      'action',
      0,
      true,
    )
    if (isHiddenCampaignAction(name, partialAction ?? undefined)) return
    if (!partialLabel && !partialAction) return

    state.earlyStartedToolIds.add(toolCallId)
    const displayLabel = partialLabel || `Working on ${humanizeToolAction(partialAction!)}`
    const safeLabel = displayLabel
      ? this.responseFilter.filterChunk(displayLabel, context.options.relaxedResponseFilter)
      : ''
    state.sawToolStart = true
    const toolSpanKey = toolCallId || name
    state.activeToolLabels[toolSpanKey] = safeLabel
    if (partialAction) state.activeToolActions[toolSpanKey] = partialAction
    await context.options.send('status', { phase: 'executing' })
    await context.options.send('tool_start', {
      name,
      label: safeLabel,
      ...(partialAction ? { action: partialAction } : {}),
      ...(toolCallId ? { tool_call_id: toolCallId } : {}),
    })
  }

  private async maybeEmitToolContentPreview(
    name: string,
    toolCallId: string,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const parsed = this.parseContentPreviewBuffer(state.contentPreviewBuffer)
    const dataObj =
      parsed && parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
        ? (parsed.data as Record<string, unknown>)
        : null
    const previewContent = parsed
      ? typeof parsed.content === 'string'
        ? parsed.content
        : typeof dataObj?.content === 'string'
          ? dataObj.content
          : null
      : extractContentFromPartialToolArgs(state.contentPreviewBuffer)
    if (!previewContent || previewContent.length === 0) return

    const now = Date.now()
    if (now - state.lastContentPreviewAt < 100) return
    state.lastContentPreviewAt = now

    const action = parsed && typeof parsed.action === 'string' ? parsed.action : undefined
    const partialAction =
      action ??
      extractStringFieldFromPartialJson(state.contentPreviewBuffer, 'action', 0, true) ??
      undefined
    if (isHiddenCampaignAction(name, partialAction)) return
    if (partialAction && PREVIEW_EXCLUDED_ACTIONS.has(partialAction)) return

    await context.options.send('tool_content_preview', {
      name,
      content: this.responseFilter.filterChunk(
        previewContent,
        context.options.relaxedResponseFilter,
      ),
      ...(action ? { action } : {}),
      ...(toolCallId ? { tool_call_id: toolCallId } : {}),
    })
  }

  private parseContentPreviewBuffer(raw: string): Record<string, unknown> | null {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return null
    }
  }

  private async ensureStreamingStarted(
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    if (state.hasEmittedContent) return
    state.hasEmittedContent = true
    await context.options.send('status', { phase: 'streaming', message: 'Writing response' })
  }
}
