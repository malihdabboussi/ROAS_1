import type { SupabaseClient } from '@supabase/supabase-js'
import {
  brainEvalDataRepository,
  type BrainEvalDataRepository,
} from '../repositories/brain-eval-data.repository'
import type { UserWorkStreamEvent } from './user-work-eval.types'

const TEXT_MARGIN = 2
const CREDITS_PER_DOLLAR = 200

export type UserWorkAgentUsage = {
  model?: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  brainContextTokens: number
  contextWindowTokens?: number
  durationMs?: number
  latencyMs: number
}

export type UserWorkJudgeUsage = {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  providerCostUsd: number | null
  latencyMs: number
}

export type UserWorkCaseUsage = {
  agent: UserWorkAgentUsage
  judge: UserWorkJudgeUsage
}

export type UserWorkSuiteUsageSummary = {
  avgLatencyMs: number
  avgAgentLatencyMs: number
  avgJudgeLatencyMs: number
  avgInputTokens: number
  avgOutputTokens: number
  avgTotalTokens: number
  avgBrainContextTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  agentProviderCostUsd: number | null
  judgeProviderCostUsd: number | null
  providerCostUsd: number | null
  userCostUsd: number | null
  marginUsd: number | null
  estimatedCredits: number | null
  costUnknownCount: number
  pricingSource: 'token_providers_pricing' | 'openrouter' | 'partial' | 'unknown'
}

function readNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) && num >= 0 ? num : 0
}

export function extractAgentUsageFromEvents(
  events: UserWorkStreamEvent[],
  latencyMs: number,
): UserWorkAgentUsage {
  const done = [...events].reverse().find((event) => event.type === 'done')
  const data = done?.data ?? {}
  const usage = (data.usage ?? {}) as Record<string, unknown>
  const breakdown = (data.context_breakdown ?? {}) as Record<string, unknown>
  const slices = Array.isArray(breakdown.slices)
    ? (breakdown.slices as Array<Record<string, unknown>>)
    : []
  const brainSlice = slices.find((slice) => slice.id === 'brain')
  const inputTokens = readNumber(usage.input_tokens)
  const outputTokens = readNumber(usage.output_tokens)
  const totalTokens =
    readNumber(breakdown.totalTokens) ||
    readNumber(usage.total_tokens) ||
    inputTokens + outputTokens

  return {
    model: typeof breakdown.modelId === 'string' ? breakdown.modelId : undefined,
    inputTokens,
    outputTokens,
    totalTokens,
    brainContextTokens: readNumber(brainSlice?.tokens),
    contextWindowTokens: readNumber(data.context_window) || undefined,
    durationMs: readNumber(data.duration_ms) || undefined,
    latencyMs,
  }
}

export function parseOpenRouterJudgeUsage(input: {
  model: string
  latencyMs: number
  response: Record<string, unknown>
}): UserWorkJudgeUsage {
  const usage = (input.response.usage ?? {}) as Record<string, unknown>
  const inputTokens = readNumber(usage.prompt_tokens)
  const outputTokens = readNumber(usage.completion_tokens)
  const totalTokens = readNumber(usage.total_tokens) || inputTokens + outputTokens
  const cost = readNumber(usage.cost) || readNumber(usage.total_cost) || null

  return {
    model: input.model,
    inputTokens,
    outputTokens,
    totalTokens,
    providerCostUsd: cost === 0 ? 0 : cost,
    latencyMs: input.latencyMs,
  }
}

async function loadModelPricing(
  supabase: SupabaseClient,
  model: string,
  repository: BrainEvalDataRepository,
): Promise<{ inputPer1k: number | null; outputPer1k: number | null }> {
  return repository.loadModelPricing(supabase, model)
}

function normalizeModelName(model?: string): string | undefined {
  if (!model?.trim()) return undefined
  return model.replace(/^openrouter\//, '')
}

async function estimateUsageCost(
  supabase: SupabaseClient,
  usage: Pick<UserWorkAgentUsage | UserWorkJudgeUsage, 'model' | 'inputTokens' | 'outputTokens'>,
  knownProviderCostUsd: number | null,
  repository: BrainEvalDataRepository,
): Promise<{
  providerCostUsd: number | null
  costUnknownCount: number
  pricingSource: 'token_providers_pricing' | 'openrouter' | 'unknown'
}> {
  if (knownProviderCostUsd !== null) {
    return {
      providerCostUsd: knownProviderCostUsd,
      costUnknownCount: 0,
      pricingSource: 'openrouter',
    }
  }

  const model = normalizeModelName(usage.model)
  if (!model) {
    return { providerCostUsd: null, costUnknownCount: 1, pricingSource: 'unknown' }
  }

  const pricing = await loadModelPricing(supabase, model, repository)
  if (pricing.inputPer1k === null && pricing.outputPer1k === null) {
    return { providerCostUsd: null, costUnknownCount: 1, pricingSource: 'unknown' }
  }

  const inputCost =
    pricing.inputPer1k === null ? 0 : (usage.inputTokens / 1000) * pricing.inputPer1k
  const outputCost =
    pricing.outputPer1k === null ? 0 : (usage.outputTokens / 1000) * pricing.outputPer1k
  const unknownCount =
    (pricing.inputPer1k === null && usage.inputTokens > 0 ? 1 : 0) +
    (pricing.outputPer1k === null && usage.outputTokens > 0 ? 1 : 0)

  return {
    providerCostUsd: Number((inputCost + outputCost).toFixed(8)),
    costUnknownCount: unknownCount,
    pricingSource: unknownCount > 0 ? 'unknown' : 'token_providers_pricing',
  }
}

export async function summarizeUserWorkSuiteUsage(
  supabase: SupabaseClient,
  caseUsages: UserWorkCaseUsage[],
  repository: BrainEvalDataRepository = brainEvalDataRepository,
): Promise<UserWorkSuiteUsageSummary> {
  if (caseUsages.length === 0) {
    return {
      avgLatencyMs: 0,
      avgAgentLatencyMs: 0,
      avgJudgeLatencyMs: 0,
      avgInputTokens: 0,
      avgOutputTokens: 0,
      avgTotalTokens: 0,
      avgBrainContextTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      agentProviderCostUsd: null,
      judgeProviderCostUsd: null,
      providerCostUsd: null,
      userCostUsd: null,
      marginUsd: null,
      estimatedCredits: null,
      costUnknownCount: 0,
      pricingSource: 'unknown',
    }
  }

  const count = caseUsages.length
  const agentLatencies = caseUsages.map((item) => item.agent.latencyMs)
  const judgeLatencies = caseUsages.map((item) => item.judge.latencyMs)
  const totalInputTokens = caseUsages.reduce(
    (sum, item) => sum + item.agent.inputTokens + item.judge.inputTokens,
    0,
  )
  const totalOutputTokens = caseUsages.reduce(
    (sum, item) => sum + item.agent.outputTokens + item.judge.outputTokens,
    0,
  )
  const totalTokens = caseUsages.reduce(
    (sum, item) => sum + item.agent.totalTokens + item.judge.totalTokens,
    0,
  )
  const totalBrainContextTokens = caseUsages.reduce(
    (sum, item) => sum + item.agent.brainContextTokens,
    0,
  )

  let agentProviderCost = 0
  let judgeProviderCost = 0
  let costUnknownCount = 0
  const pricingSources = new Set<'token_providers_pricing' | 'openrouter' | 'unknown'>()

  for (const item of caseUsages) {
    const agentCost = await estimateUsageCost(supabase, item.agent, null, repository)
    const judgeCost = await estimateUsageCost(
      supabase,
      item.judge,
      item.judge.providerCostUsd,
      repository,
    )
    pricingSources.add(agentCost.pricingSource)
    pricingSources.add(judgeCost.pricingSource)
    costUnknownCount += agentCost.costUnknownCount + judgeCost.costUnknownCount
    if (agentCost.providerCostUsd === null) costUnknownCount += 1
    else agentProviderCost += agentCost.providerCostUsd
    if (judgeCost.providerCostUsd === null) costUnknownCount += 1
    else judgeProviderCost += judgeCost.providerCostUsd
  }

  const providerCostUsd =
    costUnknownCount > 0 && agentProviderCost + judgeProviderCost === 0
      ? null
      : Number((agentProviderCost + judgeProviderCost).toFixed(8))
  const userCostUsd =
    providerCostUsd === null ? null : Number((providerCostUsd * TEXT_MARGIN).toFixed(8))
  const marginUsd =
    providerCostUsd === null || userCostUsd === null
      ? null
      : Number((userCostUsd - providerCostUsd).toFixed(8))

  let pricingSource: UserWorkSuiteUsageSummary['pricingSource'] = 'unknown'
  if (pricingSources.has('openrouter') && pricingSources.size === 1) pricingSource = 'openrouter'
  else if (pricingSources.has('token_providers_pricing') && costUnknownCount === 0) {
    pricingSource = 'token_providers_pricing'
  } else if (providerCostUsd !== null) pricingSource = 'partial'

  return {
    avgLatencyMs:
      (agentLatencies.reduce((sum, value) => sum + value, 0) +
        judgeLatencies.reduce((sum, value) => sum + value, 0)) /
      count,
    avgAgentLatencyMs: agentLatencies.reduce((sum, value) => sum + value, 0) / count,
    avgJudgeLatencyMs: judgeLatencies.reduce((sum, value) => sum + value, 0) / count,
    avgInputTokens: totalInputTokens / count,
    avgOutputTokens: totalOutputTokens / count,
    avgTotalTokens: totalTokens / count,
    avgBrainContextTokens: totalBrainContextTokens / count,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    agentProviderCostUsd:
      agentProviderCost > 0 || costUnknownCount === 0 ? Number(agentProviderCost.toFixed(8)) : null,
    judgeProviderCostUsd:
      judgeProviderCost > 0 || costUnknownCount === 0 ? Number(judgeProviderCost.toFixed(8)) : null,
    providerCostUsd,
    userCostUsd,
    marginUsd,
    estimatedCredits: userCostUsd === null ? null : Math.ceil(userCostUsd * CREDITS_PER_DOLLAR),
    costUnknownCount,
    pricingSource,
  }
}

export function aggregateJudgeUsage(
  a: UserWorkJudgeUsage,
  b: UserWorkJudgeUsage,
): UserWorkJudgeUsage {
  const providerCostUsd =
    a.providerCostUsd === null && b.providerCostUsd === null
      ? null
      : Number(((a.providerCostUsd ?? 0) + (b.providerCostUsd ?? 0)).toFixed(8))
  return {
    model: a.model,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    providerCostUsd,
    latencyMs: a.latencyMs + b.latencyMs,
  }
}

export function aggregateCaseUsage(input: {
  agent: UserWorkAgentUsage
  judge: UserWorkJudgeUsage
}): UserWorkCaseUsage {
  return input
}
