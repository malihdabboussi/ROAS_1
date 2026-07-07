import { readFileSync } from 'fs'
import { join } from 'path'
import { ConfigService } from '@nestjs/config'
import { config as loadEnv } from 'dotenv'
import { SpaceRetrievalService } from '../../../spaces-retrieval/services/space-retrieval.service'
import {
  BrainRerankerService,
  type BrainRerankerUsageSummary,
} from '../../services/brain-reranker.service'
import { BrainSufficiencyService } from '../../services/brain-sufficiency.service'
import { EmbeddingService, type BrainEmbeddingUsageSummary } from '../../services/embedding.service'
import { BrainEvalRunner } from '../brain-eval-runner'
import type {
  BrainEvalAdapter,
  BrainEvalAnswer,
  BrainEvalCase,
  BrainEvalEvidenceType,
  BrainEvalRetrievedCandidate,
} from '../brain-eval.types'
import {
  brainEvalDataRepository,
  createEvalServiceClient,
} from '../repositories/brain-eval-data.repository'
import {
  appendEvalHistory,
  DATASET_BASELINE,
  optionalEnv,
  requireEnv,
  resolveSourceRefsInCases,
  tagValue,
  writeRunJson,
} from './space-retrieval-eval.util'

loadEnv({ path: join(process.cwd(), '../api/.env') })
loadEnv({ path: join(process.cwd(), '.env') })

const fixturePaths = [
  join(__dirname, 'fixtures', 'space-retrieval-mvp-golden-set.json'),
  join(__dirname, 'fixtures', 'vibey-space-yc-demo-golden-set.json'),
]
const historyPath = join(__dirname, 'logs', 'space-eval-history.md')
const defaultOutputDir = join(__dirname, 'logs')

type EvalUsageSummary = {
  embedding: BrainEmbeddingUsageSummary
  reranker: BrainRerankerUsageSummary
  providerCostUsd: number | null
  userCostUsd: number | null
  estimatedCredits: number | null
  costUnknownCount: number
  pricingSource: 'token_providers_pricing' | 'partial' | 'unknown'
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
    estimatedCredits: hasUnknown ? null : Math.ceil(userCost * 200),
    costUnknownCount: (embeddingProviderCost === null ? 1 : 0) + reranker.costUnknownCount,
    pricingSource: hasUnknown
      ? knownProviderCost > 0
        ? 'partial'
        : 'unknown'
      : 'token_providers_pricing',
  }
}

function loadCases(): BrainEvalCase[] {
  const limitEnv = Number(process.env.SPACE_EVAL_LIMIT)
  const offsetEnv = Number(process.env.SPACE_EVAL_OFFSET)
  const levelFilter = optionalEnv('SPACE_EVAL_LEVEL')
  let cases = fixturePaths.flatMap(
    (path) => JSON.parse(readFileSync(path, 'utf8')) as BrainEvalCase[],
  )
  if (levelFilter) cases = cases.filter((evalCase) => evalCase.level === levelFilter)
  const offset = Number.isFinite(offsetEnv) && offsetEnv > 0 ? offsetEnv : 0
  const limit = Number.isFinite(limitEnv) && limitEnv > 0 ? limitEnv : undefined
  return limit ? cases.slice(offset, offset + limit) : cases.slice(offset)
}

function evalConcurrency(): number {
  const concurrency = Number(process.env.SPACE_EVAL_CONCURRENCY ?? 10)
  return Number.isFinite(concurrency) && concurrency > 0 ? Math.floor(concurrency) : 10
}

async function main() {
  process.env.SPACE_SEMANTIC_RETRIEVAL = '1'

  const rawCases = loadCases()
  const supabase = createEvalServiceClient(requireEnv)
  const cases = await resolveSourceRefsInCases(supabase, rawCases)
  const unresolved = cases.filter(
    (evalCase) =>
      evalCase.tags.some((tag) => tag.startsWith('source:')) &&
      evalCase.expectedEvidenceIds.length === 0,
  )
  if (unresolved.length > 0) {
    throw new Error(
      `Unresolved source refs (run backfill first): ${unresolved.map((c) => c.id).join(', ')}`,
    )
  }

  const embedding = new EmbeddingService(new ConfigService(), undefined)
  const reranker = new BrainRerankerService()
  const retrieval = new SpaceRetrievalService(embedding, reranker, new BrainSufficiencyService())
  embedding.resetUsageSummary()
  reranker.resetUsageSummary()
  const contextSufficientByCase = new Map<string, boolean>()

  const adapter: BrainEvalAdapter = {
    async retrieve(evalCase): Promise<BrainEvalRetrievedCandidate[]> {
      if (!evalCase.userId) throw new Error(`${evalCase.id}: userId is required`)
      const spaceId = tagValue(evalCase, 'space:')
      const result = await retrieval.search(supabase, {
        query: evalCase.question,
        userId: evalCase.userId,
        orgId: evalCase.orgId,
        spaceId,
        mode: spaceId ? 'current_space' : 'all_accessible',
        limit: 50,
      })
      contextSufficientByCase.set(evalCase.id, result.context_sufficient)
      return result.results.map((candidate) => ({
        id: candidate.id,
        family: 'user',
        kind: candidate.source_type,
        title: candidate.title,
        snippet: candidate.snippet,
        sourceId: candidate.source_id,
        sourceTitle: candidate.source_title,
        score: candidate.scores.final,
        scores: candidate.scores,
      }))
    },
    async resolveEvidenceTypes({ evidenceIds }): Promise<Record<string, BrainEvalEvidenceType>> {
      return Object.fromEntries(evidenceIds.map((id) => [id, 'evidence_chunk']))
    },
    async answer({ evalCase, retrieved }): Promise<BrainEvalAnswer> {
      return {
        text: evalCase.expectedAnswer,
        evidenceIds: retrieved.map((candidate) => candidate.id).slice(0, 10),
        contextSufficient: contextSufficientByCase.get(evalCase.id) ?? retrieved.length > 0,
        promptTokens: 0,
        completionTokens: 0,
      }
    },
  }

  const suite = await new BrainEvalRunner(adapter).runSuite('yc-demo-space-retrieval', cases, {
    concurrency: evalConcurrency(),
  })
  const failures = suite.cases.filter(
    (evalCase) =>
      evalCase.scores.retrieval_recall < 1 ||
      evalCase.contextSufficient !== evalCase.expectedContextSufficient,
  )
  const totalUsage = await summarizeEvalUsage(
    supabase,
    embedding.getUsageSummary(),
    reranker.getUsageSummary(),
  )
  const outputDir = optionalEnv('SPACE_EVAL_OUTPUT_DIR') ?? defaultOutputDir
  const outputPath = writeRunJson(outputDir, 'space-retrieval', {
    suiteName: suite.suiteName,
    dataset_baseline: DATASET_BASELINE,
    caseCount: suite.caseCount,
    scores: suite.scores,
    passAt10: suite.passAt10,
    passAt20: suite.passAt20,
    passAt50: suite.passAt50,
    laneScores: suite.laneScores,
    strategyScores: suite.strategyScores,
    missingByObjectType: suite.missingByObjectType,
    categoryScores: suite.categoryScores,
    totalUsage,
    failures,
    cases: suite.cases,
  })

  const summary = {
    suiteName: suite.suiteName,
    dataset_baseline: DATASET_BASELINE,
    caseCount: suite.caseCount,
    scores: suite.scores,
    passAt10: suite.passAt10,
    passAt20: suite.passAt20,
    passAt50: suite.passAt50,
    laneScores: suite.laneScores,
    strategyScores: suite.strategyScores,
    missingByObjectType: suite.missingByObjectType,
    categoryScores: suite.categoryScores,
    totalUsage,
    failures: failures.map((evalCase) => ({
      caseId: evalCase.caseId,
      category: evalCase.category,
      passAt10: evalCase.passAt10,
      passAt20: evalCase.passAt20,
      passAt50: evalCase.passAt50,
      failureMode: evalCase.failureMode,
      retrieval_recall: evalCase.scores.retrieval_recall,
      contextSufficient: evalCase.contextSufficient,
      expectedContextSufficient: evalCase.expectedContextSufficient,
      expectedEvidenceIds: evalCase.expectedEvidenceIds,
      retrievedEvidenceIds: evalCase.retrievedEvidenceIds.slice(0, 10),
    })),
    outputPath,
  }

  console.log(JSON.stringify(summary, null, 2))

  appendEvalHistory(
    historyPath,
    `\n### ${new Date().toISOString().slice(0, 16).replace('T', ' ')} — space retrieval eval\n\n` +
      `- dataset_baseline: ${DATASET_BASELINE}\n` +
      `- cases: ${suite.caseCount}\n` +
      `- pass@10: ${suite.passAt10.toFixed(3)}\n` +
      `- pass@20: ${suite.passAt20.toFixed(3)}\n` +
      `- pass@50: ${suite.passAt50.toFixed(3)}\n` +
      `- retrieval_recall: ${suite.scores.retrieval_recall.toFixed(3)}\n` +
      `- failures: ${failures.length}\n` +
      `- output: \`${outputPath}\`\n`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
