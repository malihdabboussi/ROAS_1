import { randomUUID } from 'node:crypto'
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  coerceFiniteNumber,
  extractOpenRouterGenerationId,
  normalizeProviderBillingUsage,
  readOpenRouterGenerationId,
  readOpenRouterRequestId,
  type ProviderBillingAttemptInput,
  type ProviderBillingAttemptRow,
  type ProviderBillingOwnerType,
  type ProviderBillingUsage,
} from '@vibey/api-shared'
import { ProviderBillingSettlementService } from './provider-billing-settlement.service'

const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions'

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

@Injectable()
export class OpenRouterBillingClientService {
  private readonly logger = new Logger(OpenRouterBillingClientService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly settlement: ProviderBillingSettlementService,
  ) {}

  async createChatCompletion<T extends OpenRouterChatCompletionJson = OpenRouterChatCompletionJson>(
    input: OpenRouterChatCompletionInput,
  ): Promise<OpenRouterChatCompletionResult<T>> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY') || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENROUTER_API_KEY is not configured')
    }

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
