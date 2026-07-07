import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { BrainEvalRunner } from '../brain-eval-runner'
import type {
  BrainEvalAdapter,
  BrainEvalCase,
  BrainEvalRetrievedCandidate,
} from '../brain-eval.types'

const tinyFixturePath = join(__dirname, 'fixtures', 'space-retrieval-mvp-golden-set.json')
const ycFixturePath = join(__dirname, 'fixtures', 'vibey-space-yc-demo-golden-set.json')

function loadTinyGoldenSet(): BrainEvalCase[] {
  return JSON.parse(readFileSync(tinyFixturePath, 'utf8')) as BrainEvalCase[]
}

function loadAllFixtures(): BrainEvalCase[] {
  return [
    ...loadTinyGoldenSet(),
    ...(JSON.parse(readFileSync(ycFixturePath, 'utf8')) as BrainEvalCase[]),
  ]
}

const candidatesByCaseId: Record<string, BrainEvalRetrievedCandidate[]> = {
  'space-doc-semantic-pricing': [
    {
      id: 'tiny-chunk-retainer-guardrails',
      family: 'user',
      kind: 'space_doc',
      title: 'Foundry — retainer scope guardrails',
      snippet: 'Foundry caps retainers at six per year on purpose.',
      score: 0.94,
      scores: { semantic: 0.94, final: 0.94 },
    },
  ],
  'space-task-exact-title': [
    {
      id: 'tiny-chunk-wiki-task',
      family: 'user',
      kind: 'space_task',
      title: 'Audit wiki pages for stale scope language',
      snippet: 'Audit wiki pages for stale scope language',
      score: 0.91,
      scores: { lexical: 0.91, final: 0.91 },
    },
  ],
  'space-negative-decoy': [
    {
      id: 'tiny-chunk-helms-mission',
      family: 'user',
      kind: 'mission',
      title: 'Helmsmark controller repositioning narrative',
      snippet: 'Controller repositioning narrative for Helmsmark.',
      score: 0.93,
      scores: { semantic: 0.93, final: 0.93 },
    },
  ],
  'space-insufficient-context': [],
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
      promptTokens: 0,
      completionTokens: 0,
    }
  },
}

describe('Space retrieval golden set eval foundation', () => {
  it('loads deterministic tiny fixtures and yc_demo space cases', () => {
    const cases = loadAllFixtures()
    expect(cases.filter((evalCase) => evalCase.level === 'tiny_golden_fixture')).toHaveLength(4)
    expect(cases.filter((evalCase) => evalCase.level === 'yc_demo')).toHaveLength(15)
    expect(cases.every((evalCase) => evalCase.tags.some((tag) => tag.startsWith('space:')))).toBe(
      true,
    )
  })

  it('records baseline metrics for pinned tiny evidence cases', async () => {
    const runner = new BrainEvalRunner(adapter)
    const result = await runner.runSuite('space-retrieval-mvp', loadTinyGoldenSet())

    expect(result.caseCount).toBe(4)
    expect(result.scores.retrieval_recall).toBe(1)
    expect(result.passAt10).toBe(1)
    expect(
      result.cases.find((evalCase) => evalCase.caseId === 'space-insufficient-context'),
    ).toMatchObject({
      contextSufficient: false,
      expectedContextSufficient: false,
    })
  })

  it('runs eval cases concurrently when requested without reordering results', async () => {
    let activeRetrievals = 0
    let maxActiveRetrievals = 0
    const cases = loadTinyGoldenSet()
    const runner = new BrainEvalRunner({
      async retrieve(evalCase) {
        activeRetrievals += 1
        maxActiveRetrievals = Math.max(maxActiveRetrievals, activeRetrievals)
        await new Promise((resolve) => setTimeout(resolve, 10))
        activeRetrievals -= 1
        return candidatesByCaseId[evalCase.id] ?? []
      },
      async answer({ evalCase, retrieved }) {
        return {
          text: evalCase.expectedAnswer,
          evidenceIds: retrieved.map((candidate) => candidate.id),
          contextSufficient: retrieved.length > 0,
          promptTokens: 0,
          completionTokens: 0,
        }
      },
    })

    const result = await runner.runSuite('space-retrieval-concurrent-mvp', cases, {
      concurrency: 2,
    })

    expect(maxActiveRetrievals).toBe(2)
    expect(result.cases.map((evalCase) => evalCase.caseId)).toEqual(
      cases.map((evalCase) => evalCase.id),
    )
  })

  it('flags decoy hits when a wrong-space chunk ranks in results', async () => {
    const runner = new BrainEvalRunner({
      async retrieve() {
        return [
          {
            id: 'tiny-chunk-plinth-decoy',
            family: 'user',
            kind: 'space_doc',
            title: 'Plinthworks — positioning v3',
            snippet: 'Wrong space decoy',
            score: 0.99,
          },
          {
            id: 'tiny-chunk-helms-mission',
            family: 'user',
            kind: 'mission',
            title: 'Helmsmark controller repositioning narrative',
            snippet: 'Correct mission',
            score: 0.5,
          },
        ]
      },
    })
    const evalCase = loadTinyGoldenSet().find((item) => item.id === 'space-negative-decoy')!
    const result = await runner.runSuite('decoy-check', [evalCase])
    expect(result.cases[0]?.scores.retrieval_precision).toBe(0)
    expect(result.cases[0]?.failureMode).toBe('decoy_hit')
  })
})
