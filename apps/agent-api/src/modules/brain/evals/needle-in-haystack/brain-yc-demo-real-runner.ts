import { readFileSync } from 'fs'
import { join } from 'path'
import { ConfigService } from '@nestjs/config'
import { config as loadEnv } from 'dotenv'
import {
  BrainRerankerService,
  type BrainRerankerUsageSummary,
} from '../../services/brain-reranker.service'
import { BrainRetrievalService } from '../../services/brain-retrieval.service'
import { BrainSufficiencyService } from '../../services/brain-sufficiency.service'
import { EmbeddingService, type BrainEmbeddingUsageSummary } from '../../services/embedding.service'
import { BrainEvalRunner } from '../brain-eval-runner'
import type {
  BrainEvalAdapter,
  BrainEvalAnswer,
  BrainEvalCase,
  BrainEvalEvidenceType,
  BrainEvalFamily,
  BrainEvalRetrievedCandidate,
} from '../brain-eval.types'
import {
  brainEvalDataRepository,
  createEvalServiceClient,
} from '../repositories/brain-eval-data.repository'

loadEnv({ path: join(process.cwd(), '../api/.env') })
loadEnv({ path: join(process.cwd(), '.env') })

const fixturePaths = [
  join(__dirname, 'fixtures', 'vibey-brain-yc-demo-golden-set.json'),
  join(__dirname, 'fixtures', 'vibey-brain-cortex-coverage-set.json'),
]

type SearchResultSnapshot = {
  contextSufficient: boolean
  evidenceIds: string[]
}

type SearchTarget = {
  family: 'user' | 'agent' | 'customer' | 'company'
  brainId?: string
  agentKey?: string
}

type EvalUsageSummary = {
  embedding: BrainEmbeddingUsageSummary
  reranker: BrainRerankerUsageSummary
  providerCostUsd: number | null
  userCostUsd: number | null
  marginUsd: number | null
  estimatedCredits: number | null
  costUnknownCount: number
  pricingSource: 'token_providers_pricing' | 'partial' | 'unknown'
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function normalizeFamily(family: BrainEvalFamily): 'user' | 'agent' | 'customer' | 'company' {
  if (family === 'shared') return 'user'
  return family
}

function searchTargetsForCase(evalCase: BrainEvalCase, allCases: BrainEvalCase[]): SearchTarget[] {
  if (
    evalCase.family !== 'shared' &&
    evalCase.category !== 'cross_brain' &&
    evalCase.category !== 'shared_access'
  ) {
    return [
      {
        family: normalizeFamily(evalCase.family),
        brainId: evalCase.brainId,
        agentKey: evalCase.agentKey,
      },
    ]
  }

  const targets: SearchTarget[] = []
  for (const family of ['user', 'agent', 'customer', 'company'] as const) {
    const source = allCases.find((candidate) => candidate.family === family && candidate.brainId)
    if (source?.brainId) {
      targets.push({
        family,
        brainId: source.brainId,
        agentKey: source.agentKey,
      })
    }
  }
  return targets
}

async function resolveEvidenceTypes(
  supabase: any,
  evidenceIds: string[],
): Promise<Record<string, BrainEvalEvidenceType>> {
  return brainEvalDataRepository.resolveEvidenceTypes(supabase, evidenceIds)
}

async function loadInputPricePer1k(supabase: any, model: string): Promise<number | null> {
  return brainEvalDataRepository.loadInputPricePer1k(supabase, model)
}

async function summarizeEvalUsage(
  supabase: any,
  embedding: BrainEmbeddingUsageSummary,
  reranker: BrainRerankerUsageSummary,
): Promise<EvalUsageSummary> {
  const embeddingInputPrice = await loadInputPricePer1k(supabase, embedding.model)
  const embeddingProviderCost =
    embeddingInputPrice === null ? null : (embedding.inputTokens / 1000) * embeddingInputPrice
  const knownProviderCost = (embeddingProviderCost ?? 0) + reranker.providerCostUsd
  const hasUnknown = embeddingProviderCost === null || reranker.costUnknownCount > 0
  const userCost = knownProviderCost * 2
  return {
    embedding,
    reranker,
    providerCostUsd: hasUnknown ? null : Number(knownProviderCost.toFixed(8)),
    userCostUsd: hasUnknown ? null : Number(userCost.toFixed(8)),
    marginUsd: hasUnknown ? null : Number((userCost - knownProviderCost).toFixed(8)),
    estimatedCredits: hasUnknown ? null : Math.ceil(userCost * 200),
    costUnknownCount: (embeddingProviderCost === null ? 1 : 0) + reranker.costUnknownCount,
    pricingSource: hasUnknown
      ? knownProviderCost > 0
        ? 'partial'
        : 'unknown'
      : 'token_providers_pricing',
  }
}

async function main() {
  const cases = fixturePaths
    .flatMap((path) => JSON.parse(readFileSync(path, 'utf8')) as BrainEvalCase[])
    .filter((evalCase) => evalCase.level === 'yc_demo')
  const supabase = createEvalServiceClient(requireEnv)
  const embedding = new EmbeddingService(new ConfigService(), undefined)
  const reranker = new BrainRerankerService()
  const retrieval = new BrainRetrievalService(embedding, reranker, new BrainSufficiencyService())
  embedding.resetUsageSummary()
  reranker.resetUsageSummary()
  const resultByCase = new Map<string, SearchResultSnapshot>()
  const evidenceTypeCache = new Map<string, BrainEvalEvidenceType>()

  const adapter: BrainEvalAdapter = {
    async retrieve(evalCase): Promise<BrainEvalRetrievedCandidate[]> {
      if (!evalCase.userId) throw new Error(`${evalCase.id}: userId is required`)
      const userId = evalCase.userId
      const targets = searchTargetsForCase(evalCase, cases)
      const results = await Promise.all(
        targets.map((target) =>
          retrieval.search({
            supabase,
            userClient: supabase,
            family: target.family,
            brainId: target.brainId,
            agentKey: target.agentKey,
            query: evalCase.question,
            userId,
            orgId: evalCase.orgId,
            requiredAccess: 'query',
            limit: 50,
          }),
        ),
      )
      const candidates = results
        .flatMap((result) => result.results)
        .sort((a, b) => b.scores.final - a.scores.final)
      const deduped = [
        ...new Map(candidates.map((candidate) => [candidate.id, candidate])).values(),
      ]
      const retrieved = deduped.map((candidate) => candidate.id)
      resultByCase.set(evalCase.id, {
        contextSufficient: results.some((result) => result.context_sufficient),
        evidenceIds: retrieved.slice(0, 10),
      })
      return deduped.map((candidate) => ({
        id: candidate.id,
        family: candidate.family,
        kind: candidate.kind,
        title: candidate.title,
        snippet: candidate.snippet,
        sourceId: candidate.source_id,
        sourceTitle: candidate.source_title,
        score: candidate.scores.final,
        scores: {
          semantic: candidate.scores.semantic,
          lexical: candidate.scores.lexical,
          graph: candidate.scores.graph,
          rerank: candidate.scores.rerank,
          final: candidate.scores.final,
        },
      }))
    },
    async resolveEvidenceTypes({ evidenceIds }) {
      const missing = evidenceIds.filter((id) => !evidenceTypeCache.has(id))
      if (missing.length > 0) {
        const resolved = await resolveEvidenceTypes(supabase, missing)
        for (const id of missing) evidenceTypeCache.set(id, resolved[id] ?? 'unknown')
      }
      return Object.fromEntries(
        evidenceIds.map((id) => [id, evidenceTypeCache.get(id) ?? 'unknown']),
      )
    },
    async answer({ evalCase, retrieved }): Promise<BrainEvalAnswer> {
      const result = resultByCase.get(evalCase.id)
      return {
        text: evalCase.expectedAnswer,
        evidenceIds: result?.evidenceIds ?? retrieved.map((candidate) => candidate.id),
        contextSufficient: result?.contextSufficient ?? retrieved.length > 0,
        promptTokens: 0,
        completionTokens: 0,
      }
    },
  }

  const runner = new BrainEvalRunner(adapter)
  const suite = await runner.runSuite('yc-demo-real-brain-retrieval', cases)
  const failures = suite.cases.filter(
    (evalCase) =>
      evalCase.scores.retrieval_recall < 1 ||
      evalCase.contextSufficient !== evalCase.expectedContextSufficient,
  )

  console.log(
    JSON.stringify(
      {
        suiteName: suite.suiteName,
        caseCount: suite.caseCount,
        scores: suite.scores,
        passAt10: suite.passAt10,
        passAt20: suite.passAt20,
        passAt50: suite.passAt50,
        laneScores: suite.laneScores,
        strategyScores: suite.strategyScores,
        missingByObjectType: suite.missingByObjectType,
        totalUsage: await summarizeEvalUsage(
          supabase,
          embedding.getUsageSummary(),
          reranker.getUsageSummary(),
        ),
        rerankerUsage: reranker.getUsageSummary(),
        failures: failures.map((evalCase) => ({
          caseId: evalCase.caseId,
          family: evalCase.family,
          category: evalCase.category,
          difficulty: evalCase.difficulty,
          passAt10: evalCase.passAt10,
          passAt20: evalCase.passAt20,
          passAt50: evalCase.passAt50,
          failureMode: evalCase.failureMode,
          retrieval_recall: evalCase.scores.retrieval_recall,
          retrieval_precision: evalCase.scores.retrieval_precision,
          contextSufficient: evalCase.contextSufficient,
          expectedContextSufficient: evalCase.expectedContextSufficient,
          expectedEvidenceIds: evalCase.expectedEvidenceIds,
          expectedEvidenceTypes: evalCase.expectedEvidenceTypes,
          retrievedEvidenceIds: evalCase.retrievedEvidenceIds.slice(0, 10),
          retrievedEvidenceTypes: Object.fromEntries(
            evalCase.retrievedEvidenceIds
              .slice(0, 10)
              .map((id) => [id, evalCase.retrievedEvidenceTypes[id] ?? 'unknown']),
          ),
          laneHitAt10: evalCase.laneHitAt10,
          laneHitAt20: evalCase.laneHitAt20,
          laneHitAt50: evalCase.laneHitAt50,
          strategyHitAt10: evalCase.strategyHitAt10,
          strategyHitAt20: evalCase.strategyHitAt20,
          strategyHitAt50: evalCase.strategyHitAt50,
        })),
        categoryScores: suite.categoryScores,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
