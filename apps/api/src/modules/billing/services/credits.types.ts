export interface TokenUsage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
}

export interface CreditCalculation {
  apiCost: number
  credits: number
  breakdown: {
    inputCost: number
    outputCost: number
    cacheReadCost: number
    cacheWriteCost: number
  }
  pricingTier?: TextPricingTierSelection
}

export interface TextBillingContext {
  contextWindowTokens?: number
  requestedModelId?: string
  resolvedModelId?: string
  modelSettings?: unknown
}

export interface TextPricingTierSelection {
  provider: string | null
  modelName: string
  pricingProfile: string
  tokenThresholdMin: number
  tokenThresholdMax: number | null
  inputSideTokens: number
  source: 'llm_model_pricing_tiers' | 'precomputed'
}

export interface TextPricingTierRow {
  provider: string
  model_name: string
  pricing_profile: string
  token_threshold_min: number
  token_threshold_max: number | null
  input_tokens_1k: string | number | null
  output_tokens_1k: string | number | null
  cache_read_1k: string | number | null
  cache_write_1k: string | number | null
}

export interface CreditBalance {
  baseCredits: number
  baseCreditsUsed: number
  rolloverCredits: number
  purchasedCredits: number
  purchasedCreditsUsed: number
  totalAvailable: number
  totalUsed: number
}

export interface MonthlyCreditUsageRow {
  id: string
  month: string
  base_allowance?: number | null
  base_credits_used?: number | null
  rollover_credits?: number | null
  purchased_credits_used?: number | null
  total_credits_used?: number | null
  total_credits_purchased?: number | null
}

export interface AutoRechargeConfig {
  is_enabled: boolean
  trigger_credits: number
  topup_credits: number
  last_recharged_at: string | null
  monthly_cap_cents: number | null
}

export interface OrgAutoRechargeConfig {
  is_enabled: boolean
  threshold_credits: number
  recharge_amount: number
  max_monthly_recharges: number
}

export interface CreditsOwnerResolution {
  creditsOwnerId: string
  billingType: 'personal' | 'org'
  orgId: string | null
  orgMemberId: string | null
}
