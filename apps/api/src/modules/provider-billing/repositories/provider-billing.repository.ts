import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient, type ProviderBillingAttemptRow } from '@vibey/api-shared'
import type { ProviderBillingAttemptInput } from '@vibey/api-shared'

@Injectable()
export class ProviderBillingRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  async upsertAttempt(
    input: ProviderBillingAttemptInput,
    status: ProviderBillingAttemptRow['status'],
  ): Promise<ProviderBillingAttemptRow> {
    const existingByAttemptKey = await this.findByAttemptKey(input.attemptKey)
    if (existingByAttemptKey && this.isTerminal(existingByAttemptKey)) return existingByAttemptKey
    if (input.providerGenerationId) {
      const existingByGeneration = await this.findByProviderGenerationId(
        input.provider,
        input.providerGenerationId,
      )
      if (existingByGeneration && existingByGeneration.attempt_key !== input.attemptKey) {
        return existingByGeneration
      }
    }
    const mergedMetadata = {
      ...(existingByAttemptKey?.metadata_json ?? {}),
      ...(input.metadata ?? {}),
    }
    const nextStatus = existingByAttemptKey?.status === 'settling' ? 'settling' : status
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
      status: nextStatus,
      last_error: null,
      next_attempt_at: new Date().toISOString(),
      metadata_json: mergedMetadata,
    }

    const { data, error } = await this.svc.client
      .from('provider_billing_attempts')
      .upsert(row, { onConflict: 'attempt_key' })
      .select('*')
      .single<ProviderBillingAttemptRow>()
    if (error) throw new Error(`Failed to upsert provider billing attempt: ${error.message}`)
    return data
  }

  async findByAttemptKey(attemptKey: string): Promise<ProviderBillingAttemptRow | null> {
    const { data, error } = await this.svc.client
      .from('provider_billing_attempts')
      .select('*')
      .eq('attempt_key', attemptKey)
      .maybeSingle<ProviderBillingAttemptRow>()
    if (error) throw new Error(`Failed to find provider billing attempt key: ${error.message}`)
    return data ?? null
  }

  async findById(id: string): Promise<ProviderBillingAttemptRow | null> {
    const { data, error } = await this.svc.client
      .from('provider_billing_attempts')
      .select('*')
      .eq('id', id)
      .maybeSingle<ProviderBillingAttemptRow>()
    if (error) throw new Error(`Failed to find provider billing attempt: ${error.message}`)
    return data ?? null
  }

  async findByProviderGenerationId(
    provider: string,
    providerGenerationId: string,
  ): Promise<ProviderBillingAttemptRow | null> {
    const { data, error } = await this.svc.client
      .from('provider_billing_attempts')
      .select('*')
      .eq('provider', provider)
      .eq('provider_generation_id', providerGenerationId)
      .maybeSingle<ProviderBillingAttemptRow>()
    if (error) throw new Error(`Failed to find provider generation: ${error.message}`)
    return data ?? null
  }

  async claimDueAttempts(limit: number, workerId: string): Promise<ProviderBillingAttemptRow[]> {
    const { data, error } = await this.svc.client.rpc('claim_provider_billing_attempts', {
      p_limit: limit,
      p_worker_id: workerId,
    })
    if (error) throw new Error(`Failed to claim provider billing attempts: ${error.message}`)
    return (data ?? []) as ProviderBillingAttemptRow[]
  }

  async claimAttemptForSettlement(
    id: string,
    workerId: string,
  ): Promise<ProviderBillingAttemptRow | null> {
    const { data, error } = await this.svc.client.rpc('claim_provider_billing_attempt', {
      p_attempt_id: id,
      p_worker_id: workerId,
    })
    if (error) throw new Error(`Failed to claim provider billing attempt: ${error.message}`)
    return (data ?? null) as ProviderBillingAttemptRow | null
  }

  async updateAttempt(
    id: string,
    patch: Partial<ProviderBillingAttemptRow> & Record<string, unknown>,
  ): Promise<ProviderBillingAttemptRow> {
    const { data, error } = await this.svc.client
      .from('provider_billing_attempts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single<ProviderBillingAttemptRow>()
    if (error) throw new Error(`Failed to update provider billing attempt: ${error.message}`)
    return data
  }

  private isTerminal(attempt: ProviderBillingAttemptRow): boolean {
    return Boolean(
      attempt.ai_usage_event_id ||
        attempt.status === 'settled' ||
        attempt.status === 'no_charge' ||
        attempt.status === 'unrecoverable',
    )
  }
}
