import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  fetchOpenRouterGeneration,
  normalizeProviderBillingUsage,
  OpenRouterGenerationLookupError,
  validateOpenRouterSettledCost,
  type ProviderBillingAttemptInput,
  type ProviderBillingAttemptRow,
  type ProviderBillingUsage,
  type ProviderOutputValidationState,
} from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { ProviderBillingRepository } from '../repositories/provider-billing.repository'

@Injectable()
export class ProviderBillingSettlementService {
  private readonly logger = new Logger(ProviderBillingSettlementService.name)
  private readonly missingProviderIdTtlMs = 2 * 60 * 60 * 1000

  constructor(
    private readonly repository: ProviderBillingRepository,
    private readonly creditsService: CreditsService,
    private readonly configService: ConfigService,
  ) {}

  async recordAttempt(input: ProviderBillingAttemptInput): Promise<ProviderBillingAttemptRow> {
    const status = input.providerGenerationId ? 'pending_settlement' : 'pending_provider_id'
    return this.repository.upsertAttempt(input, status)
  }

  async recordOutputValidation(input: {
    attemptId: string
    state: ProviderOutputValidationState
    error?: string | null
    metadata?: Record<string, unknown>
  }): Promise<ProviderBillingAttemptRow> {
    const attempt = await this.repository.findById(input.attemptId)
    if (!attempt) {
      throw new Error(`Provider billing attempt not found: ${input.attemptId}`)
    }
    const existingValidation = this.asRecord(attempt.metadata_json.image_output_validation)
    const incomingValidation = this.asRecord(input.metadata?.image_output_validation)
    return this.repository.updateAttempt(input.attemptId, {
      ...(input.state === 'provider_failed'
        ? {
            status: 'no_charge',
            final_cost_usd: 0,
            settled_at: new Date().toISOString(),
            locked_by: null,
            locked_at: null,
          }
        : {}),
      metadata_json: {
        ...attempt.metadata_json,
        ...(input.metadata ?? {}),
        image_output_validation: {
          ...existingValidation,
          ...incomingValidation,
          state: input.state,
          validated_at: new Date().toISOString(),
          error: input.error?.slice(0, 2000) ?? null,
        },
      },
    })
  }

  async reconcileDue(input: {
    limit: number
    workerId?: string
  }): Promise<{ claimed: number; settled: number; failed: number; skipped: number }> {
    const workerId = input.workerId ?? `api-provider-billing-${process.pid}`
    const attempts = await this.repository.claimDueAttempts(input.limit, workerId)
    let settled = 0
    let failed = 0
    let skipped = 0

    for (const attempt of attempts) {
      const result = await this.settleAttempt(attempt)
      if (result === 'settled') settled += 1
      else if (result === 'failed') failed += 1
      else skipped += 1
    }

    return { claimed: attempts.length, settled, failed, skipped }
  }

  async settleByIdOrGeneration(input: {
    attemptId?: string
    providerGenerationId?: string
  }): Promise<ProviderBillingAttemptRow | null> {
    const attempt = input.attemptId
      ? await this.repository.findById(input.attemptId)
      : input.providerGenerationId
        ? await this.repository.findByProviderGenerationId('openrouter', input.providerGenerationId)
        : null
    if (!attempt) return null
    const claimed = await this.repository.claimAttemptForSettlement(
      attempt.id,
      `api-provider-billing-immediate-${process.pid}`,
    )
    if (!claimed) return attempt
    await this.settleAttempt(claimed)
    return this.repository.findById(attempt.id)
  }

  private async settleAttempt(
    attempt: ProviderBillingAttemptRow,
  ): Promise<'settled' | 'failed' | 'skipped'> {
    if (
      attempt.status === 'settled' ||
      attempt.status === 'no_charge' ||
      attempt.ai_usage_event_id
    ) {
      return 'skipped'
    }

    const providerReportedCost = this.parseNumber(attempt.provider_cost_usd)
    if (providerReportedCost !== null && providerReportedCost > 0) {
      return this.settleProviderReportedCost(attempt)
    }

    if (!attempt.provider_generation_id) {
      return this.handleMissingProviderId(attempt)
    }

    if (attempt.provider !== 'openrouter') {
      return this.settleProviderReportedCost(attempt)
    }

    const apiKey = this.resolveOpenRouterApiKey(attempt)
    if (!apiKey) {
      await this.markRetryable(attempt, 'OpenRouter API key is not configured for this workload')
      return 'failed'
    }

    try {
      const settlement = await fetchOpenRouterGeneration({
        apiKey,
        generationId: attempt.provider_generation_id,
        appTitle: 'Vibey',
      })
      const zeroValidation = validateOpenRouterSettledCost(
        settlement,
        attempt.resolved_model ?? attempt.requested_model,
      )
      if (!zeroValidation.acceptable) {
        await this.markRetryable(
          attempt,
          `OpenRouter generation cost not settled: ${zeroValidation.reason ?? 'unknown'}`,
        )
        return 'failed'
      }
      const cost = settlement.costUsd ?? 0
      if (cost <= 0 || settlement.noCharge || settlement.cancelled) {
        await this.repository.updateAttempt(attempt.id, {
          status: 'no_charge',
          final_cost_usd: 0,
          provider_cost_usd: cost,
          resolved_model: settlement.resolvedModel ?? attempt.resolved_model,
          input_tokens: settlement.usage.input,
          output_tokens: settlement.usage.output,
          cache_read_tokens: settlement.usage.cacheRead,
          cache_write_tokens: settlement.usage.cacheWrite,
          total_tokens: settlement.usage.totalTokens,
          settled_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
          last_error: null,
          metadata_json: {
            ...attempt.metadata_json,
            openrouter_generation: settlement.raw,
            no_charge_reason: zeroValidation.reason ?? 'provider_no_charge',
          },
        })
        return 'settled'
      }

      return this.settleExactCost(attempt, {
        costUsd: cost,
        usage: settlement.usage,
        resolvedModel: settlement.resolvedModel ?? attempt.resolved_model,
        metadata: { openrouter_generation: settlement.raw },
      })
    } catch (error) {
      const message =
        error instanceof OpenRouterGenerationLookupError
          ? `${error.message}${error.responseBody ? `: ${error.responseBody}` : ''}`
          : error instanceof Error
            ? error.message
            : String(error)
      if (error instanceof OpenRouterGenerationLookupError && !error.retryable) {
        await this.markNonRetryable(attempt, message)
        return 'failed'
      }
      await this.markRetryable(attempt, message)
      return 'failed'
    }
  }

  private async settleProviderReportedCost(
    attempt: ProviderBillingAttemptRow,
  ): Promise<'settled' | 'failed' | 'skipped'> {
    const cost = this.parseNumber(attempt.provider_cost_usd)
    if (cost == null) {
      await this.markRetryable(attempt, 'Provider reported no settleable cost')
      return 'failed'
    }
    return this.settleExactCost(attempt, {
      costUsd: cost,
      usage: normalizeProviderBillingUsage({
        inputTokens: attempt.input_tokens,
        outputTokens: attempt.output_tokens,
        cacheReadTokens: attempt.cache_read_tokens,
        cacheWriteTokens: attempt.cache_write_tokens,
        totalTokens: attempt.total_tokens,
      }),
      resolvedModel: attempt.resolved_model,
      metadata: { provider_reported_cost: true },
    })
  }

  private async settleExactCost(
    attempt: ProviderBillingAttemptRow,
    settlement: {
      costUsd: number
      usage: ProviderBillingUsage
      resolvedModel?: string | null
      metadata?: Record<string, unknown>
    },
  ): Promise<'settled' | 'failed' | 'skipped'> {
    if (
      attempt.billing_owner_type === 'platform' ||
      attempt.billing_owner_type === 'subscription'
    ) {
      await this.repository.updateAttempt(attempt.id, {
        status: 'settled',
        final_cost_usd: settlement.costUsd,
        provider_cost_usd: settlement.costUsd,
        resolved_model: settlement.resolvedModel ?? attempt.resolved_model,
        input_tokens: settlement.usage.input,
        output_tokens: settlement.usage.output,
        cache_read_tokens: settlement.usage.cacheRead,
        cache_write_tokens: settlement.usage.cacheWrite,
        total_tokens: settlement.usage.totalTokens,
        credits_calculated: 0,
        credits_charged: 0,
        settled_at: new Date().toISOString(),
        locked_by: null,
        locked_at: null,
        last_error: null,
        metadata_json: {
          ...attempt.metadata_json,
          ...(settlement.metadata ?? {}),
          no_credit_debit_reason: attempt.billing_owner_type,
        },
      })
      return 'settled'
    }

    if (!attempt.user_id) {
      await this.repository.updateAttempt(attempt.id, {
        status: 'charge_failed',
        last_error: 'Cannot charge provider attempt without user_id',
        locked_by: null,
        locked_at: null,
      })
      return 'failed'
    }

    try {
      const usageEvent = await this.creditsService.settleIncurredProviderUsage({
        userId: attempt.user_id,
        orgId: attempt.org_id,
        campaignId: attempt.campaign_id,
        conversationId: attempt.conversation_id,
        feature: attempt.feature,
        action: attempt.action,
        provider: attempt.provider,
        modelName:
          settlement.resolvedModel ??
          attempt.resolved_model ??
          attempt.requested_model ??
          'unknown',
        serviceType: attempt.service_type,
        usage: settlement.usage,
        providerCostUsd: settlement.costUsd,
        costSource: 'provider_settlement_exact',
        generationIds: attempt.provider_generation_id ? [attempt.provider_generation_id] : [],
        providerBillingAttemptId: attempt.id,
        metadata: {
          provider_request_id: attempt.provider_request_id,
          attempt_key: attempt.attempt_key,
          source_app: attempt.source_app,
          source_path: attempt.source_path,
          ...(settlement.metadata ?? {}),
        },
        requestedModelId: attempt.requested_model,
        resolvedModelId: settlement.resolvedModel ?? attempt.resolved_model,
      })

      await this.repository.updateAttempt(attempt.id, {
        status: 'settled',
        final_cost_usd: settlement.costUsd,
        provider_cost_usd: settlement.costUsd,
        resolved_model: settlement.resolvedModel ?? attempt.resolved_model,
        input_tokens: settlement.usage.input,
        output_tokens: settlement.usage.output,
        cache_read_tokens: settlement.usage.cacheRead,
        cache_write_tokens: settlement.usage.cacheWrite,
        total_tokens: settlement.usage.totalTokens,
        credits_calculated: usageEvent.credits,
        credits_charged: usageEvent.credits,
        ai_usage_event_id: usageEvent.aiUsageEventId,
        settled_at: new Date().toISOString(),
        locked_by: null,
        locked_at: null,
        last_error: null,
        metadata_json: {
          ...attempt.metadata_json,
          ...(settlement.metadata ?? {}),
          overdraft_credits: usageEvent.overdraftCredits,
        },
      })
      return 'settled'
    } catch (error) {
      await this.repository.updateAttempt(attempt.id, {
        status: 'charge_failed',
        last_error: error instanceof Error ? error.message : String(error),
        locked_by: null,
        locked_at: null,
        next_attempt_at: this.nextRetryAt(attempt),
      })
      return 'failed'
    }
  }

  private async handleMissingProviderId(
    attempt: ProviderBillingAttemptRow,
  ): Promise<'settled' | 'failed' | 'skipped'> {
    const ageMs = Date.now() - new Date(attempt.created_at).getTime()
    if (ageMs < this.missingProviderIdTtlMs) {
      await this.repository.updateAttempt(attempt.id, {
        status: 'pending_provider_id',
        locked_by: null,
        locked_at: null,
      })
      return 'skipped'
    }
    await this.repository.updateAttempt(attempt.id, {
      status: 'unrecoverable',
      last_error: 'Provider generation id was never captured before TTL',
      locked_by: null,
      locked_at: null,
    })
    return 'failed'
  }

  private async markRetryable(attempt: ProviderBillingAttemptRow, error: string): Promise<void> {
    await this.repository.updateAttempt(attempt.id, {
      status: 'failed_retryable',
      last_error: error.slice(0, 2000),
      next_attempt_at: this.nextRetryAt(attempt),
      locked_by: null,
      locked_at: null,
    })
  }

  private async markNonRetryable(attempt: ProviderBillingAttemptRow, error: string): Promise<void> {
    await this.repository.updateAttempt(attempt.id, {
      status: 'charge_failed',
      last_error: error.slice(0, 2000),
      locked_by: null,
      locked_at: null,
    })
  }

  private nextRetryAt(attempt: ProviderBillingAttemptRow): string {
    const delayMinutes = Math.min(360, 2 ** Math.min(Math.max(attempt.attempts, 1), 8))
    return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
  }

  private parseNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private resolveOpenRouterApiKey(attempt: ProviderBillingAttemptRow): string | undefined {
    const scope = attempt.metadata_json.openrouter_key_scope
    const scopedKey =
      scope === 'interactive'
        ? 'OPENROUTER_INTERACTIVE_API_KEY'
        : scope === 'background'
          ? 'OPENROUTER_BACKGROUND_API_KEY'
          : scope === 'media'
            ? 'OPENROUTER_MEDIA_API_KEY'
            : null
    if (scopedKey) {
      const value = this.configService.get<string>(scopedKey) || process.env[scopedKey]
      if (value?.trim()) return value.trim()
    }
    const fallback =
      this.configService.get<string>('OPENROUTER_API_KEY') || process.env.OPENROUTER_API_KEY
    return fallback?.trim() || undefined
  }
}
