export type AdminAccountKind = 'user' | 'org'

export interface AdminCreditBalance {
  baseCredits: number
  baseCreditsUsed: number
  rolloverCredits: number
  purchasedCredits: number
  purchasedCreditsUsed: number
  totalAvailable: number
  totalUsed: number
}

export interface AdminAccountSummary {
  totalTokens: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalCredits: number
  totalComputedCost: number
  billedCostUsd: number
  eventCount: number
  avgDailyCredits: number
  avgDailyComputedCost: number
  avgDailyBilledCostUsd: number
  projectedMonthlyCredits: number
  projectedMonthlyComputedCost: number
  daysUntilCreditsRunOut: number | null
}

export interface AdminSubscriptionDetail {
  id: string
  status: string
  plan_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  slug: string | null
  name: string | null
  base_credits: number
  price_amount: number
  interval: string | null
}

export interface AdminUserAccountDetail {
  id: string
  email: string | null
  name: string | null
  display_name: string | null
  full_name: string | null
  role: string
  fly_machine_id: string | null
  created_at: string | null
  updated_at: string | null
  plan: AdminSubscriptionDetail | null
  balance: AdminCreditBalance
  lifetime: AdminAccountSummary
}

export interface AdminOrgAccountDetail {
  id: string
  name: string | null
  slug: string | null
  account_type: string | null
  owner_id: string | null
  owner: { id: string; email: string | null; name: string | null } | null
  status: string | null
  created_at: string | null
  updated_at: string | null
  plan: AdminSubscriptionDetail | null
  balance: AdminCreditBalance
  lifetime: AdminAccountSummary
}

export interface AdminDailyUsagePoint {
  date: string
  tokens: number
  credits: number
  computedCost: number
  billedCostUsd: number
  eventCount: number
}

export interface AdminFeatureBreakdownRow {
  feature: string
  action: string
  tokens: number
  credits: number
  computedCost: number
  billedCostUsd: number
  eventCount: number
}

export interface AdminModelBreakdownRow {
  provider: string
  modelName: string
  serviceType: string
  tokens: number
  credits: number
  computedCost: number
  billedCostUsd: number
  eventCount: number
}

export interface AdminRecentUsageEvent {
  id: string
  created_at: string
  user_id: string | null
  org_id: string | null
  campaign_id: string | null
  conversation_id: string | null
  feature: string | null
  action: string | null
  provider: string | null
  model_name: string | null
  service_type: string | null
  tokens: number
  credits: number
  computedCost: number
  billedCostUsd: number
}

export interface AdminCreditLedger {
  purchases: Array<Record<string, unknown>>
  monthlyUsage: Array<Record<string, unknown>>
}

export interface AdminOrgMemberUsage {
  id: string
  user_id: string
  role: string
  status: string
  joined_at: string | null
  last_active_at: string | null
  identity: { id: string; email: string | null; name: string | null } | null
  credit_limit: Record<string, unknown> | null
  usage: AdminAccountSummary
}

export interface AdminAccountFlag {
  severity: 'info' | 'warning' | 'danger'
  label: string
  detail: string
}

export interface AdminAccountDashboardBase {
  kind: AdminAccountKind
  range: { days: 7 | 14 | 30 | 90; from: string; to: string }
  summary: AdminAccountSummary
  dailyUsage: AdminDailyUsagePoint[]
  featureBreakdown: AdminFeatureBreakdownRow[]
  modelBreakdown: AdminModelBreakdownRow[]
  recentEvents: AdminRecentUsageEvent[]
  creditLedger: AdminCreditLedger
  flags: AdminAccountFlag[]
}

export interface AdminUserDashboard extends AdminAccountDashboardBase {
  kind: 'user'
  account: AdminUserAccountDetail
}

export interface AdminOrgDashboard extends AdminAccountDashboardBase {
  kind: 'org'
  account: AdminOrgAccountDetail
  members: AdminOrgMemberUsage[]
}

export type AdminAccountDashboard = AdminUserDashboard | AdminOrgDashboard

export interface AdminAccountRangeSliceBase {
  rangeOnly: true
  range: AdminAccountDashboardBase['range']
  summary: AdminAccountSummary
  dailyUsage: AdminDailyUsagePoint[]
  featureBreakdown: AdminFeatureBreakdownRow[]
  modelBreakdown: AdminModelBreakdownRow[]
  recentEvents: AdminRecentUsageEvent[]
  flags: AdminAccountFlag[]
}

export interface AdminUserAccountRangeSlice extends AdminAccountRangeSliceBase {
  memberUsage?: undefined
}

export interface AdminOrgAccountRangeSlice extends AdminAccountRangeSliceBase {
  memberUsage: Array<{ user_id: string; usage: AdminAccountSummary }>
}

export type AdminAccountRangeSlice = AdminUserAccountRangeSlice | AdminOrgAccountRangeSlice
