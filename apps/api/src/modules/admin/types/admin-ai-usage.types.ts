export type AdminAiUsageTraceRow = {
  id: string
  created_at: string
  status: string | null
  channel: string | null
  model: string | null
  total_tokens: number | string | null
  cost_usd: number | string | null
}

export type AdminAiUsageAttemptRow = {
  id: string
  created_at: string
  status: string
  source_app: string
  source_path: string
  feature: string
  action: string | null
  provider: string
  requested_model: string | null
  resolved_model: string | null
  total_tokens: number | string | null
  final_cost_usd: number | string | null
  provider_cost_usd: number | string | null
  estimated_cost_usd: number | string | null
  ai_usage_event_id: string | null
  metadata_json: Record<string, unknown> | null
}

export type AdminAiUsageBillingCheckRow = {
  check_date: string
  created_at: string
  status: string
  openrouter_reported_cost: number | string | null
  db_computed_cost: number | string | null
  delta_percent: number | string | null
}

export type AdminAiUsageRoute = {
  id: 'openai' | 'openrouter' | 'google' | 'anthropic' | 'other'
  label: string
  traceCount: number
  completed: number
  failed: number
  tokens: number
  traceCostUsd: number
  providerAttempts: number
  providerCostUsd: number
  providerVerified: boolean
}

export type AdminAiUsageReport = {
  generatedAt: string
  days: number
  summary: {
    traces: number
    completed: number
    failed: number
    tokens: number
    traceCostUsd: number
    providerAttempts: number
    providerCostUsd: number
  }
  routes: AdminAiUsageRoute[]
  models: Array<{
    model: string
    routeId: AdminAiUsageRoute['id']
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
  }>
  opportunities: {
    oversizedContext: { count: number; tokens: number; costUsd: number }
    failedWithCost: { count: number; costUsd: number }
    unlinkedPaidAttempts: { count: number; costUsd: number }
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
