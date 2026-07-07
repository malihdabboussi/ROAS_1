import { describe, expect, it } from 'vitest'
import type { UserWorkEvalCase } from './user-work-eval.types'
import {
  buildUnavailableProbeResult,
  evaluateProbe,
  type ProbeResponse,
} from './user-work-retrieval-probe'

const baseCase: UserWorkEvalCase = {
  id: 'probe-test',
  taskType: 'answer_query',
  userPrompt: 'How does Foundry scale?',
  expectedOutcome: 'test',
  requiredContext: ['six retainers a year', 'Devi Ramanathan'],
  forbiddenClaims: ['enterprise-grade'],
  expectations: [],
  expectedContextSufficient: true,
  expectedBrainScopes: ['user', 'customer'],
  allowedActions: ['search_user_brain'],
  disallowedActions: [],
  tags: ['test'],
}

function makeProbe(overrides: Partial<ProbeResponse> = {}): ProbeResponse {
  return {
    preloadText: '',
    preloadTextLength: 0,
    perFamily: { user: null, agent: null, customer: null, company: null },
    latencyMs: 100,
    ...overrides,
  }
}

describe('evaluateProbe', () => {
  it('passes when all required phrases are found in retrieved candidates', () => {
    const probe = makeProbe({
      perFamily: {
        user: {
          count: 1,
          context_sufficient: true,
          candidates: [
            {
              title: 'Operating principle',
              snippet: 'Foundry takes six retainers a year on purpose.',
              content: '',
              source_title: 'user-brain seed',
            },
          ],
          missing: [],
        },
        customer: {
          count: 1,
          context_sufficient: true,
          candidates: [
            {
              title: 'Plinthworks',
              snippet: 'Devi Ramanathan wants brand-defense framing.',
              content: '',
              source_title: 'customer-brain seed',
            },
          ],
          missing: [],
        },
        agent: null,
        company: null,
      },
    })
    const result = evaluateProbe({
      evalCase: baseCase,
      finalAnswer: 'Some answer text.',
      probe,
    })
    expect(result.passed).toBe(true)
    expect(result.preloadMissing).toEqual([])
    expect(result.preloadMissingInBrain).toEqual([])
    expect(result.preloadMissingNotInBrain).toEqual([])
    expect(result.preloadFound).toHaveLength(2)
    expect(result.phrases).toHaveLength(2)
    expect(result.phrases.every((p) => p.location === 'retrieved')).toBe(true)
    expect(result.retrievalRecall).toBe(1)
    expect(result.brainCoverage).toBe(1)
    expect(result.probeAvailable).toBe(true)
    expect(result.groundTruthAvailable).toBe(false)
  })

  it('finds phrase in preload text when not in candidates', () => {
    const probe = makeProbe({
      preloadText:
        'USER BRAIN — Key Memories:\n- Six retainers a year on purpose to protect quality.',
      preloadTextLength: 80,
      perFamily: { user: null, agent: null, customer: null, company: null },
    })
    const result = evaluateProbe({
      evalCase: { ...baseCase, requiredContext: ['six retainers a year'] },
      finalAnswer: 'ok',
      probe,
    })
    expect(result.passed).toBe(true)
    expect(result.preloadFound[0]?.family).toBe('preload')
  })

  it('classifies missing phrase as not_in_brain when ground truth missing', () => {
    const probe = makeProbe({
      preloadText: 'unrelated brain content',
      preloadTextLength: 21,
      groundTruth: {
        'fourteen-day organic move': { in_memories: 0, in_cortex: 0, in_pages: 0, total: 0 },
      },
    })
    const result = evaluateProbe({
      evalCase: { ...baseCase, requiredContext: ['fourteen-day organic move'] },
      finalAnswer: 'ok',
      probe,
    })
    expect(result.passed).toBe(false)
    expect(result.preloadMissing).toContain('fourteen-day organic move')
    expect(result.preloadMissingNotInBrain).toContain('fourteen-day organic move')
    expect(result.preloadMissingInBrain).toEqual([])
    expect(result.phrases[0]?.location).toBe('not_in_brain')
    expect(result.groundTruthAvailable).toBe(true)
    expect(result.failureReasons.join(' ')).toMatch(/NOT IN BRAIN/)
  })

  it('classifies missing phrase as in_brain_but_missed when ground truth says yes', () => {
    const probe = makeProbe({
      preloadText: 'unrelated brain content',
      preloadTextLength: 21,
      groundTruth: {
        'kill criterion': { in_memories: 26, in_cortex: 6, in_pages: 6, total: 38 },
      },
    })
    const result = evaluateProbe({
      evalCase: { ...baseCase, requiredContext: ['kill criterion'] },
      finalAnswer: 'ok',
      probe,
    })
    expect(result.passed).toBe(false)
    expect(result.preloadMissingInBrain).toContain('kill criterion')
    expect(result.preloadMissingNotInBrain).toEqual([])
    expect(result.phrases[0]?.location).toBe('in_brain_but_missed')
    expect(result.phrases[0]?.inBrainCount).toBe(38)
    expect(result.retrievalRecall).toBe(0)
    expect(result.brainCoverage).toBe(1)
    expect(result.failureReasons.join(' ')).toMatch(/recall miss/)
  })

  it('flags forbidden phrases that appear in preload as informational', () => {
    const probe = makeProbe({
      preloadText: 'Avoid generic enterprise-grade language. Foundry stays specific.',
      preloadTextLength: 60,
    })
    const result = evaluateProbe({
      evalCase: { ...baseCase, requiredContext: [] },
      finalAnswer: 'ok',
      probe,
    })
    expect(result.forbiddenInPreload).toHaveLength(1)
    expect(result.forbiddenInPreload[0]?.phrase).toBe('enterprise-grade')
  })

  it('does not fail retrieval when abstain answer is confident (abstention is synthesis concern)', () => {
    const probe = makeProbe()
    const result = evaluateProbe({
      evalCase: { ...baseCase, expectedContextSufficient: false, requiredContext: [] },
      finalAnswer: 'The answer is definitively 6 retainers a year.',
      probe,
    })
    expect(result.passed).toBe(true)
    expect(result.abstentionFailed).toBe(true)
  })

  it('does not flag abstention when answer caveats', () => {
    const probe = makeProbe()
    const result = evaluateProbe({
      evalCase: { ...baseCase, expectedContextSufficient: false, requiredContext: [] },
      finalAnswer: 'I do not have enough context to confirm that.',
      probe,
    })
    expect(result.passed).toBe(true)
    expect(result.abstentionFailed).toBe(false)
  })

  it('handles number-word and hyphen variants when matching', () => {
    const probe = makeProbe({
      preloadText: 'Saltline is on day 73 of the retainer; risk is around month 3.',
      preloadTextLength: 70,
    })
    const result = evaluateProbe({
      evalCase: { ...baseCase, requiredContext: ['day 73', 'month three'] },
      finalAnswer: 'ok',
      probe,
    })
    expect(result.passed).toBe(true)
    expect(result.preloadMissing).toEqual([])
  })

  it('records lane counts from per-family results', () => {
    const probe = makeProbe({
      perFamily: {
        user: { count: 4, context_sufficient: true, candidates: [], missing: [] },
        customer: { count: 2, context_sufficient: true, candidates: [], missing: [] },
        company: { count: 1, context_sufficient: false, candidates: [], missing: ['x'] },
        agent: null,
      },
    })
    const result = evaluateProbe({
      evalCase: { ...baseCase, requiredContext: [] },
      finalAnswer: 'ok',
      probe,
    })
    expect(result.laneCounts.user).toBe(4)
    expect(result.laneCounts.customer).toBe(2)
    expect(result.laneCounts.company).toBe(1)
    expect(result.laneCounts.agent).toBe(0)
  })

  it('computes retrieval recall = retrieved / (retrieved + recall miss)', () => {
    const probe = makeProbe({
      perFamily: {
        user: {
          count: 1,
          context_sufficient: true,
          candidates: [
            {
              title: 'memory',
              snippet: 'Foundry six retainers a year cap.',
              content: '',
              source_title: null,
            },
          ],
          missing: [],
        },
        agent: null,
        customer: null,
        company: null,
      },
      groundTruth: {
        'six retainers a year': { in_memories: 5, in_cortex: 1, in_pages: 1, total: 7 },
        'kill criterion': { in_memories: 26, in_cortex: 6, in_pages: 6, total: 38 },
      },
    })
    const result = evaluateProbe({
      evalCase: { ...baseCase, requiredContext: ['six retainers a year', 'kill criterion'] },
      finalAnswer: 'ok',
      probe,
    })
    expect(result.retrievalRecall).toBe(0.5)
    expect(result.brainCoverage).toBe(1)
  })
})

describe('buildUnavailableProbeResult', () => {
  it('returns a passing result so probe failure does not block when probe unavailable', () => {
    const result = buildUnavailableProbeResult('probe disabled')
    expect(result.passed).toBe(true)
    expect(result.probeAvailable).toBe(false)
    expect(result.groundTruthAvailable).toBe(false)
    expect(result.preloadFound).toEqual([])
    expect(result.preloadMissing).toEqual([])
    expect(result.phrases).toEqual([])
  })
})
