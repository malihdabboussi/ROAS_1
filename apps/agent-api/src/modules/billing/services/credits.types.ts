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

export interface CreditBalance {
  baseCredits: number
  baseCreditsUsed: number
  rolloverCredits: number
  purchasedCredits: number
  purchasedCreditsUsed: number
  totalAvailable: number
  totalUsed: number
}

export interface CreditsOwnerResolution {
  creditsOwnerId: string
  billingType: 'personal' | 'org'
  orgId: string | null
  orgMemberId: string | null
}
