/**
 * Billing types — matched to V2 NestJS backend response shapes.
 */

// ============================================================
// Credit Balance (from CreditsService.getBalance)
// ============================================================

export interface CreditBalance {
  baseCredits: number
  baseCreditsUsed: number
  rolloverCredits: number
  purchasedCredits: number
  purchasedCreditsUsed: number
  totalAvailable: number
  totalUsed: number
}

// ============================================================
// Subscription Plan (from subscription_plans table)
// ============================================================

export interface SubscriptionPlan {
  id: string
  slug: string
  name: string
  description: string | null
  price_amount: number // in cents
  interval: 'month' | 'year'
  base_credits: number
  stripe_price_id: string | null
  is_active: boolean
  rollover_cap: number
  can_buy_credits: boolean
  max_campaigns: number | null // null = unlimited
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

// ============================================================
// User Subscription (from user_subscriptions table)
// ============================================================

export interface UserSubscription {
  plan_id: string
  status: 'active' | 'trialing' | 'past_due' | 'unpaid' | 'canceled'
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
}

// ============================================================
// GET /api/billing/status response
// ============================================================

export interface ResourceUsage {
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

export interface ActiveAddon {
  slug: string
  agentId: string
}

export interface BillingStatusResponse {
  balance: CreditBalance
  subscription: UserSubscription | null
  plan: SubscriptionPlan | null
  role: string
  creditDiscountPercent: number
  usage: ResourceUsage
  autoRecharge: AutoRechargeSettings
  addons?: ActiveAddon[]
}

export interface AutoRechargeSettings {
  is_enabled: boolean
  trigger_credits: number
  topup_credits: number
  last_recharged_at: string | null
  monthly_cap_cents: number | null
}

// ============================================================
// Session Status (polling after Stripe checkout)
// ============================================================

export interface SessionStatusResponse {
  processed: boolean
  type: 'subscription' | 'credit_purchase' | 'unknown'
  planName?: string
  creditsAdded?: number
}

// ============================================================
// GET /api/billing/plans response
// ============================================================

export interface PlansResponse {
  plans: SubscriptionPlan[]
}

// ============================================================
// Usage Events (from ai_usage_events table)
// ============================================================

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

export interface UsageResponse {
  events: UsageEvent[]
}

// ============================================================
// Credit Packs
// ============================================================

export interface CreditPack {
  id: string
  name: string
  slug: string
  credits: number
  price: number
}

// ============================================================
// Invoices
// ============================================================

export interface Invoice {
  stripe_invoice_id: string
  amount_paid: number
  amount_due: number
  currency: string
  status: string
  invoice_pdf?: string | null
  hosted_invoice_url?: string | null
  created: number // Unix timestamp
}

// ============================================================
// Credit History
// ============================================================

export interface CreditHistoryItem {
  id: string
  action: string
  feature: string
  model: string
  credits: number
  timestamp: string
  conversationTitle: string | null
  campaignName: string | null
  agentName: string | null
  agentImageUrl?: string | null
}

// ============================================================
// GET /api/billing/usage-analytics
// ============================================================

export interface UsageAnalyticsDailyRow {
  date: string
  credits: number
}

export interface UsageAnalyticsCategoryRow {
  feature: string
  credits: number
  count: number
}

export interface UsageAnalyticsResponse {
  dailySpending: UsageAnalyticsDailyRow[]
  categoryBreakdown: UsageAnalyticsCategoryRow[]
  totalCreditsSpent: number
  totalEvents: number
}

// ============================================================
// GET /api/billing/agent-spending
// ============================================================

export interface AgentSpendingRow {
  agentKey: string
  agentName: string
  imageUrl?: string | null
  credits: number
  costUsd: number
  eventCount: number
}

export interface AgentSpendingResponse {
  agents: AgentSpendingRow[]
}

export interface CreditHistoryResponse {
  items: CreditHistoryItem[]
  total: number
  hasMore: boolean
}

// ============================================================
// Checkout / Portal responses
// ============================================================

export interface CheckoutResponse {
  sessionId: string
  url: string
  charged?: boolean
}

export interface OneClickPurchaseResponse {
  charged: true
  credits: number
  amount: number
  paymentId: string
}

export type PurchaseCreditsResponse = CheckoutResponse | OneClickPurchaseResponse

export interface PortalResponse {
  url: string
}

export interface AgentBrainStatusResponse {
  hasBrain: boolean
  brainId: string | null
}

export interface AgentBrainCheckoutResponse {
  charged: boolean
  brainId: string
  subscriptionItemId: string
  url?: string
  sessionId?: string
}

export interface SwitchIntervalResponse {
  success: boolean
  newPlan: {
    name: string
    slug: string
    interval: string
    price_amount: number
  }
}
