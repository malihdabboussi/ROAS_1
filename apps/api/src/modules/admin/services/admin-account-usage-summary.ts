import { CREDITS_PER_DOLLAR } from '../../billing/constants/credit-allowances'
import type { CreditBalance } from '../../billing/services/credits.service'

export type UsageRow = {
  id: string
  user_id: string | null
  org_id: string | null
  campaign_id: string | null
  conversation_id: string | null
  feature: string | null
  action: string | null
  provider: string | null
  model_name: string | null
  service_type: string | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_write_tokens: number | null
  total_tokens: number | null
  computed_cost: number | null
  credits_charged: number | null
  metadata_json: Record<string, unknown> | null
  created_at: string
}

export type AdminAccountSummary = {
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

type DailyUsageRow = {
  date: string
  tokens: number
  credits: number
  computedCost: number
  billedCostUsd: number
  eventCount: number
}

export function summarizeUsage(
  rows: UsageRow[],
  days: number,
  balance?: CreditBalance,
): AdminAccountSummary {
  const total = rows.reduce(
    (acc, row) => {
      acc.inputTokens += Number(row.input_tokens ?? 0)
      acc.outputTokens += Number(row.output_tokens ?? 0)
      acc.cacheReadTokens += Number(row.cache_read_tokens ?? 0)
      acc.cacheWriteTokens += Number(row.cache_write_tokens ?? 0)
      acc.totalTokens += Number(row.total_tokens ?? 0)
      acc.totalComputedCost += Number(row.computed_cost ?? 0)
      acc.totalCredits += Number(row.credits_charged ?? 0)
      acc.eventCount += 1
      return acc
    },
    {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalCredits: 0,
      totalComputedCost: 0,
      eventCount: 0,
    },
  )

  const avgDailyCredits = total.totalCredits / Math.max(1, days)
  const avgDailyComputedCost = total.totalComputedCost / Math.max(1, days)
  const billedCostUsd = creditsToBilledCostUsd(total.totalCredits)
  const avgDailyBilledCostUsd = billedCostUsd / Math.max(1, days)

  return {
    ...total,
    billedCostUsd,
    avgDailyCredits,
    avgDailyComputedCost,
    avgDailyBilledCostUsd,
    projectedMonthlyCredits: avgDailyCredits * 30,
    projectedMonthlyComputedCost: avgDailyComputedCost * 30,
    daysUntilCreditsRunOut:
      balance && avgDailyCredits > 0 ? Math.floor(balance.totalAvailable / avgDailyCredits) : null,
  }
}

export function mergeSummaries(
  a: AdminAccountSummary,
  b: AdminAccountSummary,
): AdminAccountSummary {
  return summarizeUsage(
    [
      {
        id: 'merged',
        user_id: null,
        org_id: null,
        campaign_id: null,
        conversation_id: null,
        feature: null,
        action: null,
        provider: null,
        model_name: null,
        service_type: null,
        input_tokens: a.inputTokens + b.inputTokens,
        output_tokens: a.outputTokens + b.outputTokens,
        cache_read_tokens: a.cacheReadTokens + b.cacheReadTokens,
        cache_write_tokens: a.cacheWriteTokens + b.cacheWriteTokens,
        total_tokens: a.totalTokens + b.totalTokens,
        computed_cost: a.totalComputedCost + b.totalComputedCost,
        credits_charged: a.totalCredits + b.totalCredits,
        metadata_json: null,
        created_at: new Date().toISOString(),
      },
    ],
    1,
  )
}

export function buildDailyUsage(rows: UsageRow[], days: number, from: string) {
  const byDate = new Map<string, DailyUsageRow>()
  const start = new Date(from)

  for (let i = 0; i < days; i += 1) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + i)
    const key = date.toISOString().split('T')[0]
    byDate.set(key, emptyDailyRow(key))
  }

  for (const row of rows) {
    const key = row.created_at.split('T')[0]
    const daily = byDate.get(key) ?? emptyDailyRow(key)
    daily.tokens += Number(row.total_tokens ?? 0)
    daily.credits += Number(row.credits_charged ?? 0)
    daily.computedCost += Number(row.computed_cost ?? 0)
    daily.billedCostUsd += creditsToBilledCostUsd(Number(row.credits_charged ?? 0))
    daily.eventCount += 1
    byDate.set(key, daily)
  }

  return Array.from(byDate.values())
}

export function buildFeatureBreakdown(rows: UsageRow[]) {
  const byKey = new Map<string, any>()
  for (const row of rows) {
    const feature = row.feature || 'unknown'
    const action = row.action || 'unknown'
    const key = `${feature}:${action}`
    const current = byKey.get(key) ?? {
      feature,
      action,
      tokens: 0,
      credits: 0,
      computedCost: 0,
      billedCostUsd: 0,
      eventCount: 0,
    }
    current.tokens += Number(row.total_tokens ?? 0)
    current.credits += Number(row.credits_charged ?? 0)
    current.computedCost += Number(row.computed_cost ?? 0)
    current.billedCostUsd += creditsToBilledCostUsd(Number(row.credits_charged ?? 0))
    current.eventCount += 1
    byKey.set(key, current)
  }
  return Array.from(byKey.values())
    .sort((a, b) => b.credits - a.credits)
    .slice(0, 20)
}

export function buildModelBreakdown(rows: UsageRow[]) {
  const byKey = new Map<string, any>()
  for (const row of rows) {
    const provider = row.provider || 'unknown'
    const modelName = row.model_name || 'unknown'
    const serviceType = row.service_type || 'unknown'
    const key = `${provider}:${modelName}:${serviceType}`
    const current = byKey.get(key) ?? {
      provider,
      modelName,
      serviceType,
      tokens: 0,
      credits: 0,
      computedCost: 0,
      billedCostUsd: 0,
      eventCount: 0,
    }
    current.tokens += Number(row.total_tokens ?? 0)
    current.credits += Number(row.credits_charged ?? 0)
    current.computedCost += Number(row.computed_cost ?? 0)
    current.billedCostUsd += creditsToBilledCostUsd(Number(row.credits_charged ?? 0))
    current.eventCount += 1
    byKey.set(key, current)
  }
  return Array.from(byKey.values())
    .sort((a, b) => b.computedCost - a.computedCost)
    .slice(0, 20)
}

export function buildRecentEvents(rows: UsageRow[]) {
  return rows
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30)
    .map((row) => ({
      id: row.id,
      created_at: row.created_at,
      user_id: row.user_id,
      org_id: row.org_id,
      campaign_id: row.campaign_id,
      conversation_id: row.conversation_id,
      feature: row.feature,
      action: row.action,
      provider: row.provider,
      model_name: row.model_name,
      service_type: row.service_type,
      tokens: Number(row.total_tokens ?? 0),
      credits: Number(row.credits_charged ?? 0),
      computedCost: Number(row.computed_cost ?? 0),
      billedCostUsd: creditsToBilledCostUsd(Number(row.credits_charged ?? 0)),
    }))
}

export function buildFlags(rows: UsageRow[], summary: AdminAccountSummary, balance: CreditBalance) {
  const daily = buildDailyUsage(rows, 30, getDateRangeFrom(30))
  const activeDays = daily.filter((row) => row.credits > 0)
  const avgActiveCredits =
    activeDays.reduce((sum, row) => sum + row.credits, 0) / Math.max(1, activeDays.length)
  const peak = activeDays.reduce((max, row) => Math.max(max, row.credits), 0)
  const flags: Array<{ severity: 'info' | 'warning' | 'danger'; label: string; detail: string }> =
    []

  if (summary.daysUntilCreditsRunOut !== null && summary.daysUntilCreditsRunOut <= 7) {
    flags.push({
      severity: 'danger',
      label: 'Credits may run out soon',
      detail: `${summary.daysUntilCreditsRunOut} days left at the current daily average.`,
    })
  }

  if (peak > 0 && peak >= avgActiveCredits * 3) {
    flags.push({
      severity: 'warning',
      label: 'Usage spike detected',
      detail: `Peak daily usage is ${Math.round(peak).toLocaleString()} credits.`,
    })
  }

  if (balance.totalAvailable <= 0 && summary.totalCredits > 0) {
    flags.push({
      severity: 'danger',
      label: 'No credits left',
      detail: 'Recent usage exists but the current balance is empty.',
    })
  }

  if (flags.length === 0) {
    flags.push({
      severity: 'info',
      label: 'No billing flags',
      detail: 'Usage and balance are in the expected range.',
    })
  }

  return flags
}

function emptyDailyRow(date: string) {
  return { date, tokens: 0, credits: 0, computedCost: 0, billedCostUsd: 0, eventCount: 0 }
}

function creditsToBilledCostUsd(credits: number) {
  return credits / CREDITS_PER_DOLLAR
}

function getDateRangeFrom(days: number) {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  start.setUTCHours(0, 0, 0, 0)
  return start.toISOString()
}
