export type AiUsageRouteId = 'openai' | 'openrouter' | 'google' | 'anthropic' | 'other'

export type AdminAiUsageReport = {
  generatedAt: string
  days: number
  range: {
    startDate: string
    endDate: string
    previousStartDate: string
    previousEndDate: string
  }
  comparison: {
    providerCostUsd: AiUsageComparison
    providerAttempts: AiUsageComparison
    tokens: AiUsageComparison
    failureRate: AiUsageComparison
  }
  daily: Array<{
    date: string
    providerCostUsd: number
    providerAttempts: number
    tokens: number
    failed: number
  }>
  modelSpend: Array<{ model: string; costUsd: number }>
  dailyModelSpend: Array<{ date: string; model: string; costUsd: number }>
  summary: {
    traces: number
    completed: number
    failed: number
    tokens: number
    traceCostUsd: number
    providerAttempts: number
    providerCostUsd: number
  }
  routes: Array<{
    id: AiUsageRouteId
    label: string
    traceCount: number
    completed: number
    failed: number
    tokens: number
    traceCostUsd: number
    providerAttempts: number
    providerCostUsd: number
    providerVerified: boolean
  }>
  models: Array<{
    model: string
    routeId: AiUsageRouteId
    traces: number
    completed: number
    failed: number
    tokens: number
    costUsd: number
  }>
  openRouterModels: Array<{
    workload: string
    requestedModel: string
    resolvedModel: string | null
    attempts: number
    tokens: number
    costUsd: number
    unsettled: number
    outputIssues: number
  }>
  opportunities: {
    oversizedContext: { count: number; tokens: number; costUsd: number }
    failedWithCost: { count: number; costUsd: number }
    unlinkedPaidAttempts: { count: number; costUsd: number }
    paidOutputInvalid: { count: number; costUsd: number }
    missingTraceUsage: number
    unsettledAttempts: number
    reconciliationStale: boolean
  }
  coverage: {
    attempts: number
    correlatedAttempts: number
    usageLinkedAttempts: number
  }
  reconciliation: Array<{
    date: string
    status: string
    providerCostUsd: number
    recordedCostUsd: number
    deltaPercent: number | null
  }>
  recentCostlyTraces: Array<{
    id: string
    createdAt: string
    channel: string
    model: string
    status: string
    tokens: number
    costUsd: number
  }>
}

export type AiUsageComparison = {
  current: number
  previous: number
  changePercent: number | null
}

export type AiUsageRange = {
  days?: number
  startDate?: string
  endDate?: string
}
