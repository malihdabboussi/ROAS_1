export declare const PROVIDER_BILLING_ATTEMPT_STATUSES: readonly ["pending_provider_id", "pending_settlement", "settling", "settled", "no_charge", "failed_retryable", "unrecoverable", "charge_failed"];
export type ProviderBillingAttemptStatus = (typeof PROVIDER_BILLING_ATTEMPT_STATUSES)[number];
export type ProviderBillingOwnerType = 'personal' | 'org' | 'platform' | 'subscription';
export type ProviderBillingServiceType = 'text' | 'image' | 'audio' | 'fixed' | string;
export interface ProviderBillingAttemptInput {
    attemptKey: string;
    sourceApp: string;
    sourcePath: string;
    billingOwnerType: ProviderBillingOwnerType;
    userId?: string | null;
    orgId?: string | null;
    campaignId?: string | null;
    conversationId?: string | null;
    feature: string;
    action?: string | null;
    serviceType: ProviderBillingServiceType;
    provider: string;
    requestedModel?: string | null;
    resolvedModel?: string | null;
    providerGenerationId?: string | null;
    providerRequestId?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    cacheReadTokens?: number | null;
    cacheWriteTokens?: number | null;
    totalTokens?: number | null;
    providerCostUsd?: number | null;
    estimatedCostUsd?: number | null;
    metadata?: Record<string, unknown>;
}
export interface ProviderBillingAttemptRow {
    id: string;
    attempt_key: string;
    source_app: string;
    source_path: string;
    billing_owner_type: ProviderBillingOwnerType;
    user_id: string | null;
    org_id: string | null;
    campaign_id: string | null;
    conversation_id: string | null;
    feature: string;
    action: string | null;
    service_type: ProviderBillingServiceType;
    provider: string;
    requested_model: string | null;
    resolved_model: string | null;
    provider_generation_id: string | null;
    provider_request_id: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    cache_read_tokens: number | null;
    cache_write_tokens: number | null;
    total_tokens: number | null;
    provider_cost_usd: number | string | null;
    estimated_cost_usd: number | string | null;
    final_cost_usd: number | string | null;
    credits_calculated: number | null;
    credits_charged: number | null;
    ai_usage_event_id: string | null;
    status: ProviderBillingAttemptStatus;
    last_error: string | null;
    attempts: number;
    next_attempt_at: string;
    locked_by: string | null;
    locked_at: string | null;
    metadata_json: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    settled_at: string | null;
}
export interface ProviderBillingUsage {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
}
export interface OpenRouterGenerationSettlement {
    generationId: string;
    model?: string;
    resolvedModel?: string;
    providerName?: string;
    costUsd: number | null;
    usage: ProviderBillingUsage;
    cancelled: boolean;
    noCharge: boolean;
    status?: string;
    finishReason?: string;
    raw: Record<string, unknown>;
}
export interface ZeroCostValidationResult {
    acceptable: boolean;
    reason?: 'free_model' | 'cancelled' | 'no_charge' | 'paid_model_zero_cost' | 'missing_cost';
}
