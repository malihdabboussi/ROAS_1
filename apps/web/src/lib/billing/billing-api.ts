/**
 * Billing API Service
 *
 * All billing-related API calls using V2's backend-client.
 * Routes to org billing endpoints when an org is active.
 */

import { backendFetch, backendGet, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'
import type {
  AgentBrainCheckoutResponse,
  AgentBrainStatusResponse,
  AgentSpendingResponse,
  AutoRechargeSettings,
  BillingStatusResponse,
  CheckoutResponse,
  CreditHistoryResponse,
  Invoice,
  PortalResponse,
  PurchaseCreditsResponse,
  SessionStatusResponse,
  SubscriptionPlan,
  SwitchIntervalResponse,
  UsageAnalyticsResponse,
  UsageEvent,
} from './billing.types'

// ============================================================================
// API Functions
// ============================================================================

const BILLING_STATUS_CACHE_PREFIX = 'billing-status'
const BILLING_STATUS_CACHE_TTL_MS = 60_000

function billingStatusCacheKey(): string {
  return `${BILLING_STATUS_CACHE_PREFIX}:${getActiveOrgIdFromStorage() ?? 'personal'}`
}

/** Drop every cached billing-status entry (all org/personal variants). */
export function invalidateBillingStatusCache(): void {
  invalidateCachedFetch(BILLING_STATUS_CACHE_PREFIX)
}

/**
 * Shared, deduped billing status used by the always-mounted chrome
 * (sidebar controller, AvatarDropdown): one request per
 * 60s window instead of one per call site. Pass `force` after plan/credit
 * mutations (e.g. credit purchase) or when opening UI that must show fresh
 * numbers.
 */
export function getBillingStatusCached(opts?: { force?: boolean }): Promise<BillingStatusResponse> {
  if (opts?.force) invalidateBillingStatusCache()
  return cachedFetch(billingStatusCacheKey(), getBillingStatus, {
    ttlMs: BILLING_STATUS_CACHE_TTL_MS,
  })
}

export async function getBillingStatus(): Promise<BillingStatusResponse> {
  const orgId = getActiveOrgIdFromStorage()
  if (orgId) {
    const res = await backendGet<{
      success: boolean
      balance: BillingStatusResponse['balance']
      plan: {
        name: string
        slug: string
        price: number
        billingPeriod: string
        baseCredits: number
      } | null
      autoRecharge: BillingStatusResponse['autoRecharge']
    }>(`/api/org/${orgId}/billing/status`)
    return {
      balance: res.balance,
      subscription: null,
      plan: res.plan
        ? {
            id: '',
            slug: res.plan.slug,
            name: res.plan.name,
            description: null,
            price_amount: res.plan.price,
            interval: res.plan.billingPeriod === 'annual' ? 'year' : 'month',
            base_credits: res.plan.baseCredits,
            stripe_price_id: null,
            is_active: true,
            rollover_cap: 0,
            can_buy_credits: true,
            max_campaigns: null,
            max_published_funnels: null,
            max_custom_domains: null,
            max_presentations: null,
            max_offers: null,
            max_sequences: null,
            max_brain_entries: null,
            max_storage_bytes: null,
            max_custom_themes: null,
            can_voice_input: true,
            can_image_gen: true,
            can_advanced_analytics: false,
            can_api_access: false,
            can_white_label: false,
          }
        : null,
      role: res.plan?.slug?.startsWith('enterprise') ? 'enterprise' : 'member',
      creditDiscountPercent: 0,
      usage: {
        campaigns: 0,
        publishedFunnels: 0,
        customDomains: 0,
        presentations: 0,
        offers: 0,
        sequences: 0,
        brainEntries: 0,
        storageBytes: 0,
        customThemes: 0,
      },
      autoRecharge: res.autoRecharge,
    }
  }
  return backendGet<BillingStatusResponse>('/api/billing/status')
}

export async function getPlans(): Promise<SubscriptionPlan[]> {
  const response = await backendGet<{ plans: SubscriptionPlan[] }>('/api/billing/plans')
  return response.plans ?? []
}

export async function getUsage(): Promise<UsageEvent[]> {
  const orgId = getActiveOrgIdFromStorage()
  if (orgId) {
    const res = await backendGet<{ success: boolean; items: UsageEvent[] }>(
      `/api/org/${orgId}/billing/usage`,
    )
    return res.items ?? []
  }
  const response = await backendGet<{ events: UsageEvent[] }>('/api/billing/usage')
  return response.events ?? []
}

export async function getInvoices(limit = 12): Promise<Invoice[]> {
  const orgId = getActiveOrgIdFromStorage()
  if (orgId) {
    const res = await backendGet<{ success: boolean; invoices: Invoice[] }>(
      `/api/org/${orgId}/billing/invoices?limit=${limit}`,
    )
    return res.invoices ?? []
  }
  const response = await backendGet<{ invoices: Invoice[] }>(`/api/billing/invoices?limit=${limit}`)
  return response.invoices ?? []
}

export async function getUsageAnalytics(options: {
  startDate: string
  endDate: string
}): Promise<UsageAnalyticsResponse> {
  const orgId = getActiveOrgIdFromStorage()
  const qs = new URLSearchParams({
    startDate: options.startDate,
    endDate: options.endDate,
  }).toString()
  const path = orgId
    ? `/api/org/${orgId}/billing/usage-analytics?${qs}`
    : `/api/billing/usage-analytics?${qs}`
  // #region agent log
  fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ea8738' },
    body: JSON.stringify({
      sessionId: 'ea8738',
      location: 'billing-api.ts:getUsageAnalytics',
      message: 'getUsageAnalytics request',
      data: {
        path,
        orgId,
        route: orgId ? 'org' : 'personal',
        startDate: options.startDate,
        endDate: options.endDate,
      },
      timestamp: Date.now(),
      hypothesisId: 'H1,H4',
    }),
  }).catch(() => {})
  // #endregion
  if (orgId) {
    const res = await backendGet<UsageAnalyticsResponse & { success?: boolean }>(path)
    return {
      dailySpending: res.dailySpending ?? [],
      categoryBreakdown: res.categoryBreakdown ?? [],
      totalCreditsSpent: res.totalCreditsSpent ?? 0,
      totalEvents: res.totalEvents ?? 0,
    }
  }
  return backendGet<UsageAnalyticsResponse>(path)
}

export async function getAgentSpending(options: {
  startDate: string
  endDate: string
  campaignIds?: string[]
}): Promise<AgentSpendingResponse> {
  const orgId = getActiveOrgIdFromStorage()
  const params = new URLSearchParams({
    startDate: options.startDate,
    endDate: options.endDate,
  })
  if (options.campaignIds && options.campaignIds.length > 0) {
    params.set('campaignIds', options.campaignIds.join(','))
  }
  const qs = params.toString()
  const path = orgId
    ? `/api/org/${orgId}/billing/agent-spending?${qs}`
    : `/api/billing/agent-spending?${qs}`
  // #region agent log
  fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ea8738' },
    body: JSON.stringify({
      sessionId: 'ea8738',
      location: 'billing-api.ts:getAgentSpending',
      message: 'getAgentSpending request',
      data: {
        path,
        orgId,
        route: orgId ? 'org' : 'personal',
        startDate: options.startDate,
        endDate: options.endDate,
      },
      timestamp: Date.now(),
      hypothesisId: 'H1,H4',
    }),
  }).catch(() => {})
  // #endregion
  if (orgId) {
    const res = await backendGet<AgentSpendingResponse & { success?: boolean }>(path)
    return {
      agents: res.agents ?? [],
    }
  }
  return backendGet<AgentSpendingResponse>(path)
}

export async function getCreditHistory(options?: {
  limit?: number
  offset?: number
}): Promise<CreditHistoryResponse> {
  const orgId = getActiveOrgIdFromStorage()
  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', options.limit.toString())
  if (options?.offset) params.set('offset', options.offset.toString())
  const qs = params.toString()
  if (orgId) {
    return backendGet<CreditHistoryResponse>(`/api/org/${orgId}/billing/usage${qs ? `?${qs}` : ''}`)
  }
  return backendGet<CreditHistoryResponse>(`/api/billing/credit-history${qs ? `?${qs}` : ''}`)
}

export async function createCheckout(
  planSlug: string,
  billingPeriod: 'monthly' | 'annual',
  successUrl?: string,
  cancelUrl?: string,
): Promise<CheckoutResponse> {
  const orgId = getActiveOrgIdFromStorage()
  if (orgId) {
    const res = await backendPost<{ success: boolean; sessionId: string; url: string }>(
      `/api/org/${orgId}/billing/checkout`,
      { planSlug, billingPeriod, successUrl, cancelUrl },
    )
    return { sessionId: res.sessionId, url: res.url }
  }
  return backendPost<CheckoutResponse>('/api/billing/checkout', {
    planSlug,
    billingPeriod,
    successUrl,
    cancelUrl,
  })
}

export async function purchaseCredits(
  packId: string,
  quantity = 1,
  successUrl?: string,
  cancelUrl?: string,
): Promise<PurchaseCreditsResponse> {
  const orgId = getActiveOrgIdFromStorage()
  if (orgId) {
    return backendPost<PurchaseCreditsResponse>(`/api/org/${orgId}/billing/purchase-credits`, {
      packId,
      quantity,
      successUrl,
      cancelUrl,
    })
  }
  return backendPost<PurchaseCreditsResponse>('/api/billing/purchase-credits', {
    packId,
    quantity,
    successUrl,
    cancelUrl,
  })
}

export async function createPortalSession(returnUrl?: string): Promise<PortalResponse> {
  const orgId = getActiveOrgIdFromStorage()
  if (orgId) {
    const res = await backendPost<{ success: boolean; url: string }>(
      `/api/org/${orgId}/billing/portal`,
      { returnUrl },
    )
    return { url: res.url }
  }
  return backendPost<PortalResponse>('/api/billing/portal', { returnUrl })
}

export async function getAutoRechargeSettings(): Promise<AutoRechargeSettings> {
  const orgId = getActiveOrgIdFromStorage()
  if (orgId) {
    return backendGet<AutoRechargeSettings>(`/api/org/${orgId}/billing/auto-recharge`)
  }
  return backendGet<AutoRechargeSettings>('/api/billing/auto-recharge')
}

export async function updateAutoRechargeSettings(payload: {
  enabled: boolean
  triggerCredits: number
  topupCredits: number
  monthlyCap?: number | null
}): Promise<AutoRechargeSettings> {
  const orgId = getActiveOrgIdFromStorage()
  if (orgId) {
    return backendPost<AutoRechargeSettings>(`/api/org/${orgId}/billing/auto-recharge`, payload)
  }
  return backendPost<AutoRechargeSettings>('/api/billing/auto-recharge', payload)
}

export async function getAgentBrainStatus(agentId: string): Promise<AgentBrainStatusResponse> {
  const orgId = getActiveOrgIdFromStorage()
  const params = new URLSearchParams()
  params.set('agentId', agentId)
  if (orgId) params.set('orgId', orgId)
  return backendGet<AgentBrainStatusResponse>(
    `/api/billing/agent-brain/status?${params.toString()}`,
  )
}

export async function getAgentBrainStatusBatch(
  agentIds: string[],
): Promise<Array<{ agentId: string; hasBrain: boolean; brainId: string | null }>> {
  if (agentIds.length === 0) return []
  const orgId = getActiveOrgIdFromStorage()
  const params = new URLSearchParams()
  params.set('agentIds', agentIds.join(','))
  if (orgId) params.set('orgId', orgId)
  const res = await backendGet<{
    statuses: Array<{ agentId: string; hasBrain: boolean; brainId: string | null }>
  }>(`/api/billing/agent-brains/batch?${params.toString()}`)
  return res.statuses
}

export async function createAgentBrainCheckout(
  agentId: string,
): Promise<AgentBrainCheckoutResponse> {
  const orgId = getActiveOrgIdFromStorage()
  return backendPost<AgentBrainCheckoutResponse>('/api/billing/agent-brain/checkout', {
    agentId,
    ...(orgId ? { orgId } : {}),
  })
}

export async function cancelAgentBrain(
  agentId: string,
): Promise<{ canceled: boolean; deletionAt: string | null }> {
  const res = await backendFetch(`/api/billing/agent-brain/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Backend error ${res.status}`)
  return res.json() as Promise<{ canceled: boolean; deletionAt: string | null }>
}

export async function cancelSubscription(
  reason?: string,
): Promise<{ success: boolean; periodEnd?: string }> {
  return backendPost<{ success: boolean; periodEnd?: string }>('/api/billing/cancel-subscription', {
    reason,
  })
}

export async function reactivateSubscription(): Promise<{ success: boolean }> {
  return backendPost<{ success: boolean }>('/api/billing/reactivate-subscription', {})
}

export async function switchInterval(
  targetInterval: 'month' | 'year',
): Promise<SwitchIntervalResponse> {
  return backendPost<SwitchIntervalResponse>('/api/billing/switch-interval', { targetInterval })
}

export async function getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
  return backendGet<SessionStatusResponse>(
    `/api/billing/session-status?sessionId=${encodeURIComponent(sessionId)}`,
  )
}

export async function redeemPromo(code: string): Promise<{ success: boolean; credits: number }> {
  return backendPost<{ success: boolean; credits: number }>('/api/billing/redeem-promo', { code })
}

export async function activateFreePlan(): Promise<{ success: boolean; alreadyActive: boolean }> {
  return backendPost<{ success: boolean; alreadyActive: boolean }>(
    '/api/billing/activate-free-plan',
    {},
  )
}

// ============================================================================
// Legacy compatibility export
// ============================================================================

export const billingApi = {
  getStatus: getBillingStatus,
  getStatusCached: getBillingStatusCached,
  getPlans,
  getUsage,
  getUsageAnalytics,
  getAgentSpending,
  getInvoices,
  getCreditHistory,
  createCheckout,
  purchaseCredits,
  createPortalSession,
  getAutoRechargeSettings,
  updateAutoRechargeSettings,
  getAgentBrainStatus,
  getAgentBrainStatusBatch,
  createAgentBrainCheckout,
  cancelAgentBrain,
  cancelSubscription,
  reactivateSubscription,
  switchInterval,
  getSessionStatus,
  redeemPromo,
}
