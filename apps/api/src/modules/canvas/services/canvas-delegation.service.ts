import { randomUUID } from 'node:crypto'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdStrategy, type AdStrategyKey } from '@vibey/api-shared'
import { AdConceptGenerationService } from '../../media/services/ad-concept-generation.service'
import { MediaService, type SendFn } from '../../media/services/media.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import type { DelegateToAgentDto } from '../dto'
import { CanvasRepository } from '../repositories/canvas.repository'

@Injectable()
export class CanvasDelegationService {
  private readonly logger = new Logger(CanvasDelegationService.name)

  constructor(
    private readonly canvasRepo: CanvasRepository,
    private readonly userAgentApi: UserAgentApiService,
    private readonly mediaService: MediaService,
    private readonly adConceptGeneration: AdConceptGenerationService,
  ) {}

  async delegateToAgentStream(
    supabase: SupabaseClient,
    userId: string,
    dto: DelegateToAgentDto,
    send: SendFn,
    orgId?: string | null,
  ): Promise<void> {
    const node = await this.canvasRepo.getNode(supabase, dto.node_id)
    if (!node || node.user_id !== userId) throw new NotFoundException('Node not found')

    const canvas = await this.canvasRepo.getCanvasById(supabase, dto.canvas_id, userId)
    if (!canvas || canvas.id !== node.canvas_id) throw new NotFoundException('Canvas not found')

    await this.canvasRepo.updateNode(supabase, dto.node_id, { status: 'generating' })
    await send('agent_status', { status: 'generating', message: 'Starting agent…' })

    const envelope = this.buildCanvasBriefEnvelope(dto, node, canvas)
    const userMessage = JSON.stringify(envelope, null, 2)

    const usedGateway = await this.tryAgentGatewayStream(
      userId,
      dto.agent_key,
      userMessage,
      canvas.ad_set_id,
      orgId,
      send,
    )

    if (usedGateway) {
      await this.finalizeNodeFromDelegation(supabase, dto.node_id, dto, send)
      return
    }

    await this.runFallbackGeneration(supabase, userId, dto, send, orgId)
  }

  private buildCanvasBriefEnvelope(
    dto: DelegateToAgentDto,
    node: { kind: string; payload: Record<string, unknown> },
    canvas: { id: string; ad_set_id: string; default_model_id: string },
  ): Record<string, unknown> {
    const strategy = dto.strategy_key ? getAdStrategy(dto.strategy_key as AdStrategyKey) : undefined
    return {
      type: 'ad_creative_canvas_delegate',
      canvas_id: dto.canvas_id,
      ad_set_id: canvas.ad_set_id,
      node_id: dto.node_id,
      node_kind: node.kind,
      agent_key: dto.agent_key,
      intent: dto.intent,
      user_brief: dto.user_brief,
      strategy_key: dto.strategy_key ?? null,
      strategy: strategy ?? null,
      model: dto.model ?? canvas.default_model_id,
      parent_image_asset_id: dto.parent_image_asset_id ?? null,
      node_payload: node.payload,
    }
  }

  private async tryAgentGatewayStream(
    userId: string,
    agentKey: string,
    userMessage: string,
    adSetId: string,
    orgId: string | null | undefined,
    send: SendFn,
  ): Promise<boolean> {
    try {
      const sessionKey = `agent:canvas:${agentKey}:${userId}:${randomUUID()}::adset:${adSetId}`
      const body = {
        model: agentKey,
        stream: true,
        input: userMessage,
        instructions:
          'You are an ad creative agent working on the Ad Creative Canvas. Follow the canvas brief envelope JSON. Update creative nodes with image prompts, copy, and structured payloads. Use available ad-builder skills when appropriate.',
        metadata: {
          user_id: userId,
          agent_key: agentKey,
          ad_set_id: adSetId,
          ...(orgId ? { org_id: orgId } : {}),
        },
      }

      const res = await this.userAgentApi.invoke(
        userId,
        '/api/artifacts/openclaw/responses',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openclaw-internal': 'true',
            'x-openclaw-session-key': sessionKey,
            'x-openclaw-agent-id': agentKey,
            ...(orgId ? { 'x-org-id': orgId } : {}),
          },
          body: JSON.stringify(body),
        },
        { timeoutMs: 900_000, logTag: `canvas_delegate user=${userId} agent=${agentKey}` },
      )

      const ct = (res.headers.get('content-type') ?? '').toLowerCase()
      if (!res.ok) {
        this.logger.warn(`Canvas agent gateway returned ${res.status}`)
        return false
      }

      if (!ct.includes('text/event-stream') || !res.body) {
        const text = await res.text()
        await send('agent_status', { status: 'complete', message: 'Agent finished' })
        if (text.trim()) {
          await send('agent_tool', { tool: 'response', output: text.slice(0, 4000) })
        }
        return true
      }

      await this.proxyOpenClawSse(res, send)
      return true
    } catch (err) {
      this.logger.warn(
        `Canvas agent gateway unavailable, using fallback: ${err instanceof Error ? err.message : String(err)}`,
      )
      return false
    }
  }

  private async proxyOpenClawSse(response: Response, send: SendFn): Promise<void> {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulatedText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let splitAt = buffer.indexOf('\n\n')
      while (splitAt >= 0) {
        const rawEvent = buffer.slice(0, splitAt)
        buffer = buffer.slice(splitAt + 2)
        const parsed = this.parseSseEvent(rawEvent)
        if (parsed && parsed !== '[DONE]') {
          const eventText = this.extractSseText(parsed)
          if (eventText) {
            accumulatedText += eventText
            await send('agent_status', { status: 'streaming', delta: eventText })
          }
          if (parsed.type === 'response.tool_call' || parsed.type === 'tool_call') {
            await send('agent_tool', parsed)
          }
          if (parsed.type === 'response.failed') {
            throw new Error(this.extractSseFailureReason(parsed))
          }
        }
        splitAt = buffer.indexOf('\n\n')
      }
    }

    if (accumulatedText.trim()) {
      await send('agent_tool', { tool: 'final_text', output: accumulatedText })
    }
  }

  private async runFallbackGeneration(
    supabase: SupabaseClient,
    userId: string,
    dto: DelegateToAgentDto,
    send: SendFn,
    orgId?: string | null,
  ): Promise<void> {
    await send('agent_status', { status: 'fallback', message: 'Generating concept…' })

    const conceptResult = await this.adConceptGeneration.generateConceptsText(
      {
        audience: dto.user_brief,
        offer_cta: dto.intent,
        brand_guidelines: '',
        attached_asset_instructions: dto.parent_image_asset_id
          ? `Reference parent image asset: ${dto.parent_image_asset_id}`
          : '',
        reference_description: dto.strategy_key ?? '',
      },
      { userId, orgId },
    )

    await send('agent_tool', {
      tool: 'generate_ad_concepts',
      output: conceptResult.text.slice(0, 2000),
    })
    await send('agent_status', { status: 'generating_image', message: 'Creating image…' })

    const prompt = `${dto.user_brief}\n\nConcept direction:\n${conceptResult.text.slice(0, 2000)}`
    const model = dto.model ?? 'gemini-3.1-flash-image-preview'

    let imageUrl: string | undefined
    let imageAssetId: string | undefined

    await this.mediaService.generateImageStream(
      {
        prompt,
        aspect_ratio: '1:1',
        model,
        category: 'ad_creative',
        tags: ['canvas', 'agent-fallback'],
      },
      { id: userId },
      async (type, data) => {
        if (type === 'generation_progress') {
          await send('agent_status', { status: 'generating_image', ...data })
        }
        if (type === 'generation_complete') {
          imageUrl = data.url as string | undefined
          const asset = data.asset as { id?: string } | undefined
          imageAssetId = asset?.id
        }
        if (type === 'error') {
          throw new Error(String(data.error ?? 'Image generation failed'))
        }
      },
      orgId,
    )

    const updatedNode = await this.canvasRepo.patchNodePayload(supabase, dto.node_id, {
      agent_key: dto.agent_key,
      intent: dto.intent,
      user_brief: dto.user_brief,
      concept_text: conceptResult.text,
      image_url: imageUrl ?? null,
      canvas_node_id: dto.node_id,
    })

    if (imageAssetId) {
      await this.canvasRepo.updateNode(supabase, dto.node_id, {
        image_asset_id: imageAssetId,
        status: 'ready',
      })
    } else {
      await this.canvasRepo.updateNode(supabase, dto.node_id, { status: 'ready' })
    }

    await send('node_updated', { node: updatedNode })
    await send('complete', { node_id: dto.node_id, image_url: imageUrl ?? null })
  }

  private async finalizeNodeFromDelegation(
    supabase: SupabaseClient,
    nodeId: string,
    dto: DelegateToAgentDto,
    send: SendFn,
  ): Promise<void> {
    const updatedNode = await this.canvasRepo.patchNodePayload(supabase, nodeId, {
      agent_key: dto.agent_key,
      intent: dto.intent,
      user_brief: dto.user_brief,
      canvas_node_id: nodeId,
      delegated_at: new Date().toISOString(),
    })
    await this.canvasRepo.updateNode(supabase, nodeId, { status: 'ready' })
    await send('node_updated', { node: updatedNode })
    await send('complete', { node_id: nodeId })
  }

  private parseSseEvent(rawEvent: string): Record<string, unknown> | '[DONE]' | null {
    const lines = rawEvent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
    if (lines.length === 0) return null
    const payload = lines.join('\n')
    if (payload === '[DONE]') return '[DONE]'
    try {
      return JSON.parse(payload) as Record<string, unknown>
    } catch {
      return null
    }
  }

  private extractSseText(event: Record<string, unknown>): string {
    if (typeof event.delta === 'string') return event.delta
    if (typeof event.text === 'string') return event.text
    if (typeof event.content === 'string') return event.content
    const choices = event.choices as
      | Array<{ delta?: { content?: string }; message?: { content?: string } }>
      | undefined
    const choiceText = choices?.[0]?.delta?.content ?? choices?.[0]?.message?.content
    return typeof choiceText === 'string' ? choiceText : ''
  }

  private extractSseFailureReason(event: Record<string, unknown>): string {
    const candidates: Array<unknown> = [
      event.error,
      (event.response as Record<string, unknown> | undefined)?.error,
    ]
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue
      const error = candidate as Record<string, unknown>
      const message = typeof error.message === 'string' ? error.message.trim() : ''
      if (!message) continue
      const code = typeof error.code === 'string' ? error.code.trim() : ''
      return code ? `${code}: ${message}` : message
    }
    if (typeof event.message === 'string' && event.message.trim()) return event.message.trim()
    return 'Agent stream failed'
  }
}
