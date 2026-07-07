import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { BRAIN_PUBLIC_BENCHMARK_BASELINES, BrainEvalRunner } from '../brain-eval-runner'
import type {
  BrainEvalAdapter,
  BrainEvalCase,
  BrainEvalRetrievedCandidate,
} from '../brain-eval.types'

const fixturePath = join(__dirname, 'fixtures', 'vibey-brain-golden-set.json')
const ycDemoFixturePath = join(__dirname, 'fixtures', 'vibey-brain-yc-demo-golden-set.json')

function loadGoldenSet(): BrainEvalCase[] {
  return [
    ...(JSON.parse(readFileSync(fixturePath, 'utf8')) as BrainEvalCase[]),
    ...(JSON.parse(readFileSync(ycDemoFixturePath, 'utf8')) as BrainEvalCase[]),
  ]
}

function loadTinyGoldenSet(): BrainEvalCase[] {
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as BrainEvalCase[]
}

const candidatesByCaseId: Record<string, BrainEvalRetrievedCandidate[]> = {
  'user-prefers-subtle-copy': [
    {
      id: 'mem-user-copy-1',
      family: 'user',
      kind: 'memory',
      title: 'Customer-facing copy preference',
      snippet: 'Sefy prefers subtle and non-pushy customer-facing launch copy.',
      sourceId: 'source-copy-1',
      sourceTitle: 'Launch copy feedback',
      score: 0.94,
    },
  ],
  'agent-domain-title-match': [
    {
      id: 'sk-agent-ipin-1',
      family: 'agent',
      kind: 'sk_entry',
      title: 'IPIN lookup rule',
      snippet: 'The Tennis Support agent should check IPIN before answering.',
      sourceId: 'source-agent-1',
      sourceTitle: 'Tennis support playbook',
      score: 0.91,
    },
  ],
  'customer-paraphrase-recall': [
    {
      id: 'mem-customer-acme-1',
      family: 'customer',
      kind: 'memory',
      title: 'Acme renewal billing request',
      snippet: 'Acme asked for invoices to be sent before renewal.',
      sourceId: 'customer-acme',
      sourceTitle: 'Acme call',
      score: 0.89,
    },
  ],
  'company-title-priority': [
    {
      id: 'company-protocol-approval-1',
      family: 'company',
      kind: 'company_object',
      title: 'Approval before mutation',
      snippet: 'Agents ask before creating or changing workspace objects.',
      sourceId: 'company-standard-1',
      sourceTitle: 'Company operating standard',
      score: 0.93,
    },
  ],
  'shared-query-access': [
    {
      id: 'share-user-query-1',
      family: 'shared',
      kind: 'memory',
      title: 'Direct Brain query share',
      snippet: 'A direct share with query access allows search.',
      sourceId: 'brain-share-1',
      sourceTitle: 'Brain share policy',
      score: 0.9,
    },
  ],
  'insufficient-vague-context': [],
}

const adapter: BrainEvalAdapter = {
  async retrieve(evalCase) {
    return candidatesByCaseId[evalCase.id] ?? []
  },
  async answer({ evalCase, retrieved }) {
    return {
      text: evalCase.expectedAnswer,
      evidenceIds: retrieved.map((candidate) => candidate.id),
      contextSufficient: retrieved.length > 0,
      promptTokens: 320,
      completionTokens: 80,
    }
  },
}

describe('Vibey Brain golden set eval foundation', () => {
  it('loads deterministic cases across Brain families', () => {
    const cases = loadGoldenSet()

    expect(cases).toHaveLength(106)
    expect(cases.filter((evalCase) => evalCase.level === 'tiny_golden_fixture')).toHaveLength(6)
    expect(cases.filter((evalCase) => evalCase.level === 'yc_demo')).toHaveLength(100)
    expect(new Set(cases.map((evalCase) => evalCase.family))).toEqual(
      new Set(['user', 'agent', 'customer', 'company', 'shared']),
    )
  })

  it('records baseline metrics for pinned evidence cases', async () => {
    const runner = new BrainEvalRunner(adapter)
    const result = await runner.runSuite('vibey-brain-golden-set', loadTinyGoldenSet())

    expect(result.caseCount).toBe(6)
    expect(result.scores.retrieval_recall).toBe(1)
    expect(result.scores.answer_correctness).toBe(1)
    expect(result.scores.context_sufficiency).toBe(1)
    expect(
      result.cases.find((evalCase) => evalCase.caseId === 'insufficient-vague-context'),
    ).toMatchObject({
      contextSufficient: false,
      expectedContextSufficient: false,
    })
  })

  it('reports pass@k diagnostics without changing top-10 retrieval scoring', async () => {
    const expectedId = 'candidate-12'
    const deepCandidates: BrainEvalRetrievedCandidate[] = Array.from(
      { length: 12 },
      (_, index) => ({
        id: `candidate-${index + 1}`,
        family: 'user',
        kind: 'memory',
        title: `Candidate ${index + 1}`,
        snippet: `Candidate ${index + 1}`,
        score: 1 - index * 0.01,
      }),
    )
    const runner = new BrainEvalRunner({
      async retrieve() {
        return deepCandidates
      },
    })
    const evalCase: BrainEvalCase = {
      id: 'deep-pass-diagnostic',
      level: 'tiny_golden_fixture',
      family: 'user',
      question: 'What is the deep candidate?',
      expectedAnswer: '',
      expectedEvidenceIds: [expectedId],
      expectedContextSufficient: true,
      category: 'factual_recall',
      difficulty: 'medium',
      tags: [],
    }

    const result = await runner.runSuite('pass-k-diagnostics', [evalCase])
    const caseResult = result.cases[0]

    expect(caseResult.scores.retrieval_recall).toBe(0)
    expect(caseResult.passAt10).toBe(false)
    expect(caseResult.passAt20).toBe(true)
    expect(caseResult.passAt50).toBe(true)
    expect(caseResult.failureMode).toBe('found_at_20')
    expect(result.categoryScores.factual_recall.passAt20).toBe(1)
  })

  it('tracks public benchmark baseline order without running heavy suites first', () => {
    expect(BRAIN_PUBLIC_BENCHMARK_BASELINES.map((benchmark) => benchmark.name)).toEqual([
      'longmemeval_s',
      'sufficient_context',
      'locomo',
      'beam_100k',
      'beam_1m',
      'beam_10m',
    ])
    expect(BRAIN_PUBLIC_BENCHMARK_BASELINES[0]).toMatchObject({
      phase: 'first',
      status: 'planned',
    })
    expect(BRAIN_PUBLIC_BENCHMARK_BASELINES.at(-1)).toMatchObject({
      phase: 'endgame',
      status: 'planned',
    })
  })
})
