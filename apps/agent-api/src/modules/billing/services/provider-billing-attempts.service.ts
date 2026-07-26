import { Injectable, Logger } from '@nestjs/common'
import {
  SupabaseServiceClient,
  type ProviderBillingAttemptInput,
  type ProviderOutputValidationState,
} from '@vibey/api-shared'

@Injectable()
export class ProviderBillingAttemptsService {
  private readonly logger = new Logger(ProviderBillingAttemptsService.name)

  constructor(private readonly svc: SupabaseServiceClient) {}

  async recordAttempt(input: ProviderBillingAttemptInput): Promise<void> {
    const status = input.providerGenerationId ? 'pending_settlement' : 'pending_provider_id'
    const row = {
      attempt_key: input.attemptKey,
      source_app: input.sourceApp,
      source_path: input.sourcePath,
      billing_owner_type: input.billingOwnerType,
      user_id: input.userId ?? null,
      org_id: input.orgId ?? null,
      campaign_id: input.campaignId ?? null,
      conversation_id: input.conversationId ?? null,
      feature: input.feature,
      action: input.action ?? null,
      service_type: input.serviceType,
      provider: input.provider,
      requested_model: input.requestedModel ?? null,
      resolved_model: input.resolvedModel ?? null,
      provider_generation_id: input.providerGenerationId ?? null,
      provider_request_id: input.providerRequestId ?? null,
      input_tokens: input.inputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
      cache_read_tokens: input.cacheReadTokens ?? null,
      cache_write_tokens: input.cacheWriteTokens ?? null,
      total_tokens: input.totalTokens ?? null,
      provider_cost_usd: input.providerCostUsd ?? null,
      estimated_cost_usd: input.estimatedCostUsd ?? null,
      status,
      last_error: null,
      next_attempt_at: new Date().toISOString(),
      metadata_json: input.metadata ?? {},
    }

    const { error } = await this.svc.client
      .from('provider_billing_attempts')
      .upsert(row, { onConflict: 'attempt_key' })

    if (!error) return
    const message = `Provider billing attempt write failed attemptKey=${input.attemptKey} providerGenerationId=${input.providerGenerationId ?? 'none'} error=${error.message}`
    this.logger.error(message)
    throw new Error(message)
  }

  async recordOutputValidation(input: {
    attemptKey: string
    state: ProviderOutputValidationState
    error?: string | null
    metadata?: Record<string, unknown>
  }): Promise<void> {
    const { data: existing, error: readError } = await this.svc.client
      .from('provider_billing_attempts')
      .select('metadata_json')
      .eq('attempt_key', input.attemptKey)
      .maybeSingle<{ metadata_json: Record<string, unknown> | null }>()
    if (readError) {
      throw new Error(`Provider output validation read failed: ${readError.message}`)
    }
    const existingValidation = this.asRecord(existing?.metadata_json?.image_output_validation)
    const incomingValidation = this.asRecord(input.metadata?.image_output_validation)
    const { error } = await this.svc.client
      .from('provider_billing_attempts')
      .update({
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
          ...(existing?.metadata_json ?? {}),
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
      .eq('attempt_key', input.attemptKey)
    if (error) {
      throw new Error(`Provider output validation write failed: ${error.message}`)
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }
}
