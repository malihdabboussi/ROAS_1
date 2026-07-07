export interface FinancesSummary {
  mrr: number
  arr: number
  addonMrr: number
  addonCount: number
  creditPackRevenue: number
  creditPackCount: number
  totalCreditsSold: number
  totalRevenue: number
  totalCost30d: number
  totalRequests30d: number
  totalTokens30d: number
  totalCredits30d: number
  avgDailyCost: number
  activePaidUsers: number
}

export interface Profitability {
  netProfit: number
  profitMargin: number
  roi: number
  costPerCustomer: number
  revenuePerCustomer: number
  profitPerCustomer: number
}

export interface FeatureBreakdownRow {
  feature: string
  totalCost: number
  requests: number
  credits: number
  avgPerRequest: number
}

export interface PlanBreakdownRow {
  plan: string
  count: number
  mrr: number
}

export interface CostTrendPoint {
  date: string
  totalCost: number
  totalRequests: number
}

export interface RevenueTrendPoint {
  date: string
  revenue: number
}

export type AdminBillingScope = 'all' | 'personal' | 'organization'

export interface FinancesData {
  scope: AdminBillingScope
  rangeDays: number
  rangeFrom: string
  rangeTo: string
  summary: FinancesSummary
  profitability: Profitability
  featureBreakdown: FeatureBreakdownRow[]
  planBreakdown: PlanBreakdownRow[]
  costTrend30d: CostTrendPoint[]
  revenueTrend30d: RevenueTrendPoint[]
}

export type DateRangePreset = '1' | '7' | '14' | '30' | '90' | 'custom'

export interface DateRangeOption {
  label: string
  value: DateRangePreset
}
