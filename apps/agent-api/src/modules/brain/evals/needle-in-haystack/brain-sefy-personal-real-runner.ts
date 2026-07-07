import { readFileSync } from 'fs'
import { join } from 'path'
import { ConfigService } from '@nestjs/config'
import { config as loadEnv } from 'dotenv'
import { BrainRerankerService } from '../../services/brain-reranker.service'
import { BrainRetrievalService } from '../../services/brain-retrieval.service'
import { BrainSufficiencyService } from '../../services/brain-sufficiency.service'
import { EmbeddingService } from '../../services/embedding.service'
import { BrainEvalRunner } from '../brain-eval-runner'
import type {
  BrainEvalAdapter,
  BrainEvalAnswer,
  BrainEvalCase,
  BrainEvalFamily,
  BrainEvalRetrievedCandidate,
} from '../brain-eval.types'
import { createEvalServiceClient } from '../repositories/brain-eval-data.repository'

loadEnv({ path: join(process.cwd(), '../api/.env') })
loadEnv({ path: join(process.cwd(), '.env') })

const fixturePath = join(__dirname, 'fixtures', 'sefy-personal-brain-golden-set.json')

type SearchResultSnapshot = {
  contextSufficient: boolean
  evidenceIds: string[]
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

async function main() {
  const allCases = JSON.parse(readFileSync(fixturePath, 'utf8')) as BrainEvalCase[]
  const limitEnv = Number(process.env.BRAIN_EVAL_LIMIT)
  const cases = Number.isFinite(limitEnv) && limitEnv > 0 ? allCases.slice(0, limitEnv) : allCases
  const supabase = createEvalServiceClient(requireEnv)
  const embedding = new EmbeddingService(new ConfigService(), undefined)
  const retrieval = new BrainRetrievalService(
    embedding,
    new BrainRerankerService(),
    new BrainSufficiencyService(),
  )
  const resultByCase = new Map<string, SearchResultSnapshot>()

  const adapter: BrainEvalAdapter = {
    async retrieve(evalCase): Promise<BrainEvalRetrievedCandidate[]> {
      if (!evalCase.userId) throw new Error(`${evalCase.id}: userId is required`)
      const result = await retrieval.search({
        supabase,
        userClient: supabase,
        family: normalizeFamily(evalCase.family),
        brainId: evalCase.brainId,
        agentKey: evalCase.agentKey,
        query: evalCase.question,
        userId: evalCase.userId,
        orgId: evalCase.orgId,
        requiredAccess: 'query',
        limit: 10,
      })
      const retrieved = result.results.map((candidate) => candidate.id)
      resultByCase.set(evalCase.id, {
        contextSufficient: result.context_sufficient,
        evidenceIds: retrieved,
      })
      return result.results.map((candidate) => ({
        id: candidate.id,
        family: candidate.family,
        kind: candidate.kind,
        title: candidate.title,
        snippet: candidate.snippet,
        sourceId: candidate.source_id,
        sourceTitle: candidate.source_title,
        score: candidate.scores.final,
      }))
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
  const suite = await runner.runSuite('sefy-personal-real-brain-retrieval', cases)
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
        failures: failures.map((evalCase) => ({
          caseId: evalCase.caseId,
          family: evalCase.family,
          retrieval_recall: evalCase.scores.retrieval_recall,
          contextSufficient: evalCase.contextSufficient,
          expectedContextSufficient: evalCase.expectedContextSufficient,
          expectedEvidenceIds: evalCase.expectedEvidenceIds,
          retrievedEvidenceIds: evalCase.retrievedEvidenceIds.slice(0, 10),
        })),
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
