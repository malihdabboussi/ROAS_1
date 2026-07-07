import { createHash, randomUUID } from 'crypto'
import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  coerceFiniteNumber,
  isModelStrategy,
  normalizeProviderBillingUsage,
  readOpenRouterGenerationId,
  readOpenRouterRequestId,
  resolveModelForStrategy,
} from '@vibey/api-shared'
import { ProviderBillingAttemptsService } from '../../billing/services/provider-billing-attempts.service'
import { ArtifactVisualDocRepository } from '../repositories/artifact-visual-doc.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'

const DEFAULT_VISUAL_DOC_STRATEGY = 'auto' as const
const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions'

const VISUAL_DOC_SYSTEM_PROMPT = `You convert a source document into a single self-contained HTML page that visually presents the same information.

Return exactly one HTML document.

Constraints:
- Begin with <!doctype html><html> and end with </html>.
- Include one inline <style> block.
- Do not use <script> tags.
- Do not use iframes.
- Do not load fonts, scripts, stylesheets, images, or assets over the network unless an image URL already exists in the source.
- Use semantic HTML: header, main, section, h1-h3, ul, table, figure.
- Present content as cards, sections, columns, timelines, or grids only when it improves clarity.
- Preserve every fact, link, and image from the source.
- Do not invent content.
- Make it responsive for mobile screens.
- Use the optional style_hint and extra_prompt only to shape the layout.
- Output HTML only. No markdown fences. No commentary.`

type SpaceItemRow = {
  id: string
  space_id: string
  title: string | null
  doc_body: string | null
  custom_data: Record<string, unknown> | null
}

@Injectable()
export class ArtifactVisualDocService {
  private readonly logger = new Logger(ArtifactVisualDocService.name)

  constructor(
    private readonly repository: ArtifactVisualDocRepository = new ArtifactVisualDocRepository(),
    @Optional() private readonly providerBillingAttempts?: ProviderBillingAttemptsService,
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      generate_visual_html: (data, sessionKey, onProgress) =>
        this.generateVisualHtml(target, data, sessionKey, onProgress),
    }
  }

  private async generateVisualHtml(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    const itemId = String(input.item_id ?? '').trim()
    const requestedSpaceId = String(input.space_id ?? '').trim()
    const styleHint = String(input.style_hint ?? '').trim()
    const prompt = String(input.prompt ?? '').trim()
    const force = input.force === true || input.force === 'true' || input.force === 1

    if (!itemId) return { success: false, error: 'item_id is required' }

    const userId = target.resolveUserId(sessionKey)
    const supabase = (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient

    const { data: item, error: itemError } = await this.repository.findSpaceDoc(supabase, {
      itemId,
      requestedSpaceId,
    })
    if (itemError) throw itemError
    if (!item) return { success: false, error: 'Space doc not found' }

    const row = item as SpaceItemRow
    const customData =
      row.custom_data && typeof row.custom_data === 'object' && !Array.isArray(row.custom_data)
        ? row.custom_data
        : {}
    const viewType = String(customData._view_type ?? '').trim()
    if (viewType !== 'doc') return { success: false, error: 'Space item is not a doc' }

    const source = String(row.doc_body ?? '').trim() || prompt
    if (!source.trim()) {
      return { success: false, error: 'Doc has no source content to visualize' }
    }

    const sourceHash = this.hashSource(source)
    const existingHtml = String(customData._doc_visual_html ?? '').trim()
    const existingHash = String(customData._doc_visual_source_hash ?? '').trim()
    if (!force && existingHtml && existingHash === sourceHash) {
      return this.buildResult(row, existingHtml, sourceHash, customData)
    }

    const orgId =
      typeof target.resolveOrgId === 'function'
        ? ((target.resolveOrgId(sessionKey) as string | null) ?? null)
        : null
    const conversationId =
      sessionKey && typeof target.parseConversationId === 'function'
        ? ((target.parseConversationId(sessionKey) as string | null) ?? null)
        : null

    try {
      await onProgress?.('Designing your visual doc')
      const html = await this.generateHtmlWithOpenRouter(target, {
        source,
        styleHint,
        prompt,
        sessionKey,
        userId,
        orgId,
        conversationId,
      })
      const sanitized = this.sanitizeGeneratedHtml(html)
      if (sanitized.length < 80) {
        throw new Error('Generated HTML was too short')
      }

      const now = new Date().toISOString()
      const nextCustomData = {
        ...customData,
        _doc_visual_html: sanitized,
        _doc_visual_status: 'ready',
        _doc_visual_updated_at: now,
        _doc_visual_source_hash: sourceHash,
        _doc_visual_last_error: null,
      }
      const { data: updated, error: updateError } = await this.repository.updateVisualDocReady(
        supabase,
        {
          itemId: row.id,
          spaceId: row.space_id,
          customData: nextCustomData,
          now,
        },
      )
      if (updateError) throw updateError
      await onProgress?.('Visual doc is ready')
      return this.buildResult(updated as SpaceItemRow, sanitized, sourceHash, nextCustomData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Visual doc generation failed'
      this.logger.error(`generate_visual_html failed for item=${itemId}: ${message}`)
      await this.repository.updateVisualDocError(supabase, {
        itemId: row.id,
        spaceId: row.space_id,
        customData,
        message,
      })
      return { success: false, error: message }
    }
  }

  private buildResult(
    item: SpaceItemRow,
    html: string,
    sourceHash: string,
    customData: Record<string, unknown>,
  ) {
    const title = item.title?.trim() || 'Visual doc'
    return {
      success: true,
      item_id: item.id,
      space_id: item.space_id,
      title,
      html,
      source_hash: sourceHash,
      custom_data: customData,
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `visual-doc-${item.id}`,
          artifactType: 'visual-doc',
          artifactId: item.id,
          spaceId: item.space_id,
          name: title,
          subtitle: 'Visual doc',
          status: 'ready',
        },
      ],
    }
  }

  private resolveModel(target: Record<string, any>, sessionKey?: string): string {
    const autoModel = resolveModelForStrategy(DEFAULT_VISUAL_DOC_STRATEGY, 'chat').modelId
    if (!sessionKey) return autoModel
    const conversationId = target.parseConversationId?.(sessionKey) as string | null
    if (!conversationId) return autoModel
    const ctx = target.requestContext?.get?.(conversationId) as { modelId?: string | null } | null
    const requested = ctx?.modelId?.trim()
    if (!requested) return autoModel
    if (isModelStrategy(requested)) return resolveModelForStrategy(requested, 'chat').modelId
    return requested
  }

  private async generateHtmlWithOpenRouter(
    target: Record<string, any>,
    input: {
      source: string
      styleHint: string
      prompt: string
      sessionKey?: string
      userId: string
      orgId: string | null
      conversationId: string | null
    },
  ): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY || ''
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured')

    const model = this.resolveModel(target, input.sessionKey)
    const attemptKey = [
      'artifact-visual-doc',
      input.conversationId ?? 'conversationless',
      randomUUID(),
    ].join(':')
    const baseAttempt = {
      attemptKey,
      sourceApp: 'agent-api',
      sourcePath: 'artifacts/artifact-visual-doc',
      billingOwnerType: input.orgId ? 'org' : 'personal',
      userId: input.userId,
      orgId: input.orgId,
      conversationId: input.conversationId,
      feature: 'artifacts',
      action: 'generate_visual_html',
      serviceType: 'text',
      provider: 'openrouter',
      requestedModel: model,
      metadata: {
        session_key_present: Boolean(input.sessionKey),
        source_chars: input.source.length,
      },
    } as const

    if (!this.providerBillingAttempts) {
      throw new Error('Provider billing attempts service is required for visual doc generation')
    }

    await this.providerBillingAttempts.recordAttempt(baseAttempt)
    const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: VISUAL_DOC_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `<source_html>\n${input.source}\n</source_html>\n\n<style_hint>${input.styleHint}</style_hint>\n<extra_prompt>${input.prompt}</extra_prompt>`,
          },
        ],
      }),
    })
    const providerGenerationId = readOpenRouterGenerationId(response.headers)
    const providerRequestId = readOpenRouterRequestId(response.headers)
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`OpenRouter visual doc call failed: ${response.status} ${body.slice(0, 200)}`)
    }
    const json = (await response.json()) as {
      id?: string
      model?: string
      usage?: Record<string, unknown>
      choices?: Array<{ message?: { content?: string } }>
    }
    const usage = normalizeProviderBillingUsage({
      inputTokens: json.usage?.prompt_tokens ?? json.usage?.input_tokens,
      outputTokens: json.usage?.completion_tokens ?? json.usage?.output_tokens,
      cacheReadTokens: json.usage?.cache_read_input_tokens ?? json.usage?.cache_read_tokens,
      cacheWriteTokens: json.usage?.cache_creation_input_tokens ?? json.usage?.cache_write_tokens,
      totalTokens: json.usage?.total_tokens,
    })
    await this.providerBillingAttempts.recordAttempt({
      ...baseAttempt,
      resolvedModel: json.model ?? model,
      providerGenerationId: providerGenerationId ?? json.id ?? null,
      providerRequestId,
      inputTokens: usage.input,
      outputTokens: usage.output,
      cacheReadTokens: usage.cacheRead,
      cacheWriteTokens: usage.cacheWrite,
      totalTokens: usage.totalTokens,
      providerCostUsd: coerceFiniteNumber(json.usage?.cost),
      metadata: {
        ...baseAttempt.metadata,
        openrouter_response_id: json.id ?? null,
        openrouter_usage: json.usage ?? null,
      },
    })
    const content = json.choices?.[0]?.message?.content?.trim() ?? ''
    if (!content) throw new Error('OpenRouter returned empty visual doc HTML')
    return content
  }

  private hashSource(value: string): string {
    return createHash('sha256').update(value.trim()).digest('hex')
  }

  private sanitizeGeneratedHtml(value: string): string {
    let html = value.trim()
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '')
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    html = html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    html = html.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    html = html.replace(/\s(?:href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, '')
    if (!/^<!doctype html>/i.test(html)) {
      html = `<!doctype html>\n${html}`
    }
    if (!/<html[\s>]/i.test(html)) {
      html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html.replace(/^<!doctype html>\s*/i, '')}</body></html>`
    }
    return html
  }
}
