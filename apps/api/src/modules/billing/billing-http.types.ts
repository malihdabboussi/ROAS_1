import type { CreditBalance } from './services/credits.service'

export interface CheckoutBody {
  planSlug: string
  billingPeriod: 'monthly' | 'annual'
  successUrl?: string
  cancelUrl?: string
}

export interface PurchaseCreditsBody {
  packId: string
  quantity?: number
  successUrl?: string
  cancelUrl?: string
}

export interface RedeemPromoBody {
  code: string
}

export interface PortalBody {
  returnUrl?: string
}

export interface AgentBrainCheckoutBody {
  agentId: string
  orgId?: string
}

export interface AutoRechargeSettings {
  is_enabled: boolean
  trigger_credits: number
  topup_credits: number
  last_recharged_at: string | null
  monthly_cap_cents: number | null
}

export interface UpdateAutoRechargeBody {
  enabled: boolean
  triggerCredits: number
  topupCredits: number
  monthlyCap?: number | null
}

export interface SubscriptionPlan {
  id: string
  slug: string
  name: string
  price_amount: number
  interval: string
  base_credits: number
  stripe_price_id: string | null
  is_active: boolean
  rollover_cap: number
  can_buy_credits: boolean
  max_campaigns: number | null
  max_published_funnels: number | null
  max_custom_domains: number | null
  max_presentations: number | null
  max_offers: number | null
  max_sequences: number | null
  max_brain_entries: number | null
  max_storage_bytes: number | null
  max_custom_themes: number | null
  can_voice_input: boolean
  can_image_gen: boolean
  can_advanced_analytics: boolean
  can_api_access: boolean
  can_white_label: boolean
}

export interface UserSubscription {
  plan_id: string
  status: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
}

export interface UsageEvent {
  id: string
  feature: string
  action: string
  credits_charged: number
  computed_cost: number
  model_name: string | null
  service_type: string | null
  created_at: string
}

export type BillingStatusResponse = {
  balance: CreditBalance
  subscription: UserSubscription | null
  plan: SubscriptionPlan | null
  role: string
  creditDiscountPercent: number
  usage: {
    campaigns: number
    publishedFunnels: number
    customDomains: number
    presentations: number
    offers: number
    sequences: number
    brainEntries: number
    storageBytes: number
    customThemes: number
  }
  autoRecharge: AutoRechargeSettings
  addons: Array<{ slug: string; agentId: string | null }>
}
