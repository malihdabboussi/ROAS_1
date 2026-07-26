import { randomUUID } from 'node:crypto'
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  coerceFiniteNumber,
  extractOpenRouterGenerationId,
  fetchOpenRouterGeneration,
  normalizeProviderBillingUsage,
  parseOpenRouterImageOutput,
  ProviderOutputValidationError,
  readOpenRouterGenerationId,
  readOpenRouterRequestId,
  summarizeOpenRouterImageResponse,
  type ProviderBillingAttemptInput,
  type ProviderBillingAttemptRow,
  type ProviderBillingOwnerType,
  type ProviderBillingUsage,
} from '@vibey/api-shared'
import { ProviderBillingSettlementService } from './provider-billing-settlement.service'

const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_IMAGES_URL = 'https://openrouter.ai/api/v1/images'

export type OpenRouterBillingOwner = {
  userId?: string | null
  orgId?: string | null
  campaignId?: string | null
  conversationId?: string | null
  billingOwnerType?: ProviderBillingOwnerType
}

export type OpenRouterChatCompletionJson = {
  id?: unknown
  model?: unknown
  usage?: Record<string, unknown>
  choices?: Array<{ message?: { content?: unknown } }>
  [key: string]: unknown
}

export type OpenRouterChatCompletionInput = {
  owner: OpenRouterBillingOwner
  feature: string
  action: string
  sourcePath: string
  serviceType?: string
  model: string
  body: Record<string, unknown>
  metadata?: Record<string, unknown>
  signal?: AbortSignal
}

export type OpenRouterChatCompletionResult<T extends OpenRouterChatCompletionJson> = {
  data: T
  raw: string
  attempt: ProviderBillingAttemptRow
  settledAttempt: ProviderBillingAttemptRow | null
  providerGenerationId: string | null
  providerRequestId: string | null
  usage: ProviderBillingUsage
  providerCostUsd: number | null
}

export type OpenRouterImageInput = {
  owner: OpenRouterBillingOwner
  feature: string
  action: string
  sourcePath: string
  model: string
  prompt: string
  aspectRatio: string
  inputReferences?: Array<{ base64: string; mimeType: string }>
  metadata?: Record<string, unknown>
  signal?: AbortSignal
}

export type OpenRouterImageResult = {
  buffer: Buffer
  mimeType: string
  attempt: ProviderBillingAttemptRow
  providerGenerationId: string | null
  providerRequestId: string | null
  usage: ProviderBillingUsage
  providerCostUsd: number | null
}

@Injectable()
export class OpenRouterBillingClientService {
  private readonly logger = new Logger(OpenRouterBillingClientService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly settlement: ProviderBillingSettlementService,
  ) {}

  async createImage(input: OpenRouterImageInput): Promise<OpenRouterImageResult> {
    const apiKey = this.getApiKey()
    const baseAttemptInput = this.buildAttemptInput({
      owner: input.owner,
      feature: input.feature,
      action: input.action,
      sourcePath: input.sourcePath,
      serviceType: 'image',
      model: input.model,
      body: {},
      metadata: input.metadata,
    })
    baseAttemptInput.metadata = {
      ...(baseAttemptInput.metadata ?? {}),
      image_output_validation: {
        state: 'pending',
        endpoint: '/api/v1/images',
      },
    }
    const initialAttempt = await this.settlement.recordAttempt(baseAttemptInput)

    const response = await fetch(OPENROUTER_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vibey.ai',
        'X-Title': 'Vibey',
      },
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        n: 1,
        aspect_ratio: input.aspectRatio,
        output_format: 'png',
        ...(input.inputReferences?.length
          ? {
              input_references: input.inputReferences.map((image) => ({
                type: 'image_url',
                image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
              })),
            }
          : {}),
      }),
      signal: input.signal,
    })
    const raw = await response.text()
    const providerGenerationId = readOpenRouterGenerationId(response.headers)
    const providerRequestId = readOpenRouterRequestId(response.headers)

    if (!response.ok) {
      await this.settlement.recordOutputValidation({
        attemptId: initialAttempt.id,
        state: 'provider_failed',
        error: `OpenRouter image request failed with status ${response.status}`,
        metadata: {
          image_output_validation: {
            endpoint: '/api/v1/images',
            response_status: response.status,
          },
        },
      })
      this.logger.error(
        `OpenRouter image generation failed sourcePath=${input.sourcePath} status=${response.status} body=${raw.slice(0, 400)}`,
      )
      throw new ServiceUnavailableException('AI image provider failed')
    }

    const payload = this.tryParseJson(raw)
    const parsed = parseOpenRouterImageOutput(payload)
    const responseGenerationId =
      providerGenerationId ??
      (payload && typeof payload.id === 'string' ? extractOpenRouterGenerationId(payload.id) : null)
    const responseUsage = parsed?.usage ?? this.extractUsage(payload ?? {})
    const providerCostUsd = parsed?.providerCostUsd ?? this.extractCost(payload ?? {})
    const responseAttempt = await this.settlement.recordAttempt({
      ...baseAttemptInput,
      resolvedModel: parsed?.resolvedModel ?? input.model,
      providerGenerationId: responseGenerationId,
      providerRequestId,
      inputTokens: responseUsage.input,
      outputTokens: responseUsage.output,
      cacheReadTokens: responseUsage.cacheRead,
      cacheWriteTokens: responseUsage.cacheWrite,
      totalTokens: responseUsage.totalTokens,
      providerCostUsd,
      metadata: {
        ...(baseAttemptInput.metadata ?? {}),
        openrouter_response_id: payload && typeof payload.id === 'string' ? payload.id : null,
        openrouter_usage: payload && typeof payload.usage === 'object' ? payload.usage : null,
        image_output_validation: {
          state: 'pending',
          endpoint: '/api/v1/images',
        },
      },
    })

    if (parsed) {
      const validatedAttempt = await this.settlement.recordOutputValidation({
        attemptId: responseAttempt.id,
        state: 'validated',
        metadata: {
          image_output_validation: {
            endpoint: '/api/v1/images',
            parser_version: 1,
            response_shape: summarizeOpenRouterImageResponse(payload),
          },
        },
      })
      await this.settleImageAttempt(validatedAttempt)
      return {
        buffer: Buffer.from(parsed.imageBytesB64, 'base64'),
        mimeType: parsed.mimeType,
        attempt: validatedAttempt,
        providerGenerationId: responseGenerationId,
        providerRequestId,
        usage: parsed.usage,
        providerCostUsd,
      }
    }

    const providerVerification = await this.verifyImageProviderEffect({
      apiKey,
      providerGenerationId: responseGenerationId,
      providerCostUsd,
    })
    const state = providerVerification.confirmed ? 'paid_output_invalid' : 'output_invalid'
    const invalidAttempt = await this.settlement.recordOutputValidation({
      attemptId: responseAttempt.id,
      state,
      error: 'OpenRouter returned HTTP 200 without a valid image payload',
      metadata: {
        image_output_validation: {
          endpoint: '/api/v1/images',
          parser_version: 1,
          provider_effect_confirmed: providerVerification.confirmed,
          verification_source: providerVerification.source,
          response_shape: summarizeOpenRouterImageResponse(payload),
          generation: providerVerification.generation,
        },
      },
    })
    await this.settleImageAttempt(invalidAttempt)
    throw new ProviderOutputValidationError({
      attemptId: invalidAttempt.id,
      providerGenerationId: responseGenerationId,
      providerCostUsd: providerVerification.costUsd ?? providerCostUsd,
      providerEffectConfirmed: providerVerification.confirmed,
    })
  }

  async createChatCompletion<T extends OpenRouterChatCompletionJson = OpenRouterChatCompletionJson>(
    input: OpenRouterChatCompletionInput,
  ): Promise<OpenRouterChatCompletionResult<T>> {
    const apiKey = this.getApiKey()

    const baseAttempt = this.buildAttemptInput(input)
    await this.settlement.recordAttempt(baseAttempt)

    const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vibey.ai',
        'X-Title': 'Vibey',
      },
      body: JSON.stringify({ ...input.body, model: input.model }),
      signal: input.signal,
    })
    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(
        `OpenRouter chat completion failed sourcePath=${input.sourcePath} status=${response.status} body=${raw.slice(0, 400)}`,
      )
      throw new ServiceUnavailableException('AI provider failed')
    }

    const data = this.parseJson<T>(raw, input.sourcePath)
    const providerGenerationId =
      readOpenRouterGenerationId(response.headers) ?? extractOpenRouterGenerationId(data.id)
    const providerRequestId = readOpenRouterRequestId(response.headers)
    const usage = this.extractUsage(data)
    const providerCostUsd = this.extractCost(data)

    const attempt = await this.settlement.recordAttempt({
      ...baseAttempt,
      resolvedModel: typeof data.model === 'string' ? data.model : input.model,
      providerGenerationId,
      providerRequestId,
      inputTokens: usage.input,
      outputTokens: usage.output,
      cacheReadTokens: usage.cacheRead,
      cacheWriteTokens: usage.cacheWrite,
      totalTokens: usage.totalTokens,
      providerCostUsd,
      metadata: {
        ...(baseAttempt.metadata ?? {}),
        openrouter_response_id: typeof data.id === 'string' ? data.id : null,
        openrouter_usage: data.usage ?? null,
      },
    })

    let settledAttempt: ProviderBillingAttemptRow | null = null
    if (providerGenerationId || providerCostUsd !== null) {
      try {
        settledAttempt = await this.settlement.settleByIdOrGeneration({ attemptId: attempt.id })
      } catch (error) {
        this.logger.warn(
          `OpenRouter immediate settlement deferred attemptId=${attempt.id} error=${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    return {
      data,
      raw,
      attempt,
      settledAttempt,
      providerGenerationId,
      providerRequestId,
      usage,
      providerCostUsd,
    }
  }

  private buildAttemptInput(input: OpenRouterChatCompletionInput): ProviderBillingAttemptInput {
    const ownerType = input.owner.billingOwnerType ?? this.resolveOwnerType(input.owner)
    const ownerKey = input.owner.orgId ?? input.owner.userId ?? ownerType
    return {
      attemptKey: [
        'openrouter',
        input.sourcePath,
        input.feature,
        input.action,
        ownerKey,
        randomUUID(),
      ].join(':'),
      sourceApp: 'api',
      sourcePath: input.sourcePath,
      billingOwnerType: ownerType,
      userId: input.owner.userId ?? null,
      orgId: input.owner.orgId ?? null,
      campaignId: input.owner.campaignId ?? null,
      conversationId: input.owner.conversationId ?? null,
      feature: input.feature,
      action: input.action,
      serviceType: input.serviceType ?? 'text',
      provider: 'openrouter',
      requestedModel: input.model,
      resolvedModel: null,
      metadata: input.metadata ?? {},
    }
  }

  private getApiKey(): string {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY') || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENROUTER_API_KEY is not configured')
    }
    return apiKey
  }

  private tryParseJson(raw: string): OpenRouterChatCompletionJson | null {
    try {
      return JSON.parse(raw) as OpenRouterChatCompletionJson
    } catch {
      return null
    }
  }

  private async settleImageAttempt(attempt: ProviderBillingAttemptRow): Promise<void> {
    if (!attempt.provider_generation_id && coerceFiniteNumber(attempt.provider_cost_usd) === null) {
      return
    }
    try {
      await this.settlement.settleByIdOrGeneration({ attemptId: attempt.id })
    } catch (error) {
      this.logger.warn(
        `OpenRouter image settlement deferred attemptId=${attempt.id} error=${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async verifyImageProviderEffect(input: {
    apiKey: string
    providerGenerationId: string | null
    providerCostUsd: number | null
  }): Promise<{
    confirmed: boolean
    source: 'response_cost' | 'generation_lookup' | 'unconfirmed'
    costUsd: number | null
    generation: Record<string, unknown> | null
  }> {
    if (input.providerCostUsd !== null && input.providerCostUsd > 0) {
      return {
        confirmed: true,
        source: 'response_cost',
        costUsd: input.providerCostUsd,
        generation: null,
      }
    }
    if (!input.providerGenerationId) {
      return { confirmed: false, source: 'unconfirmed', costUsd: null, generation: null }
    }
    try {
      const generation = await fetchOpenRouterGeneration({
        apiKey: input.apiKey,
        generationId: input.providerGenerationId,
        appTitle: 'Vibey',
        referer: 'https://vibey.ai',
      })
      const confirmed =
        !generation.cancelled && generation.costUsd !== null && generation.costUsd > 0
      return {
        confirmed,
        source: 'generation_lookup',
        costUsd: generation.costUsd,
        generation: generation.raw,
      }
    } catch (error) {
      this.logger.warn(
        `OpenRouter image verification deferred generationId=${input.providerGenerationId} error=${error instanceof Error ? error.message : String(error)}`,
      )
      return { confirmed: false, source: 'unconfirmed', costUsd: null, generation: null }
    }
  }

  private resolveOwnerType(owner: OpenRouterBillingOwner): ProviderBillingOwnerType {
    if (owner.orgId) return 'org'
    if (owner.userId) return 'personal'
    return 'platform'
  }

  private parseJson<T extends OpenRouterChatCompletionJson>(raw: string, sourcePath: string): T {
    try {
      return JSON.parse(raw) as T
    } catch (error) {
      this.logger.error(
        `OpenRouter returned non-JSON response sourcePath=${sourcePath} error=${error instanceof Error ? error.message : String(error)}`,
      )
      throw new ServiceUnavailableException('AI provider returned invalid data')
    }
  }

  private extractUsage(data: OpenRouterChatCompletionJson): ProviderBillingUsage {
    const usage = data.usage ?? {}
    return normalizeProviderBillingUsage({
      inputTokens: usage.prompt_tokens ?? usage.input_tokens,
      outputTokens: usage.completion_tokens ?? usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens ?? usage.cache_read_tokens,
      cacheWriteTokens: usage.cache_creation_input_tokens ?? usage.cache_write_tokens,
      totalTokens: usage.total_tokens,
    })
  }

  private extractCost(data: OpenRouterChatCompletionJson): number | null {
    const usage = data.usage ?? {}
    return (
      coerceFiniteNumber(usage.cost) ??
      coerceFiniteNumber(data.total_cost) ??
      coerceFiniteNumber(data.cost)
    )
  }
}
