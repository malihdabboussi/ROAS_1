import { describe, expect, it, vi } from 'vitest'
import { UserWorkEvalRunner } from './user-work-eval-runner'
import type {
  UserWorkAgentRunner,
  UserWorkEvalCase,
  UserWorkJudge,
  UserWorkJudgeResult,
  UserWorkProbeRunner,
  UserWorkRetrievalProbeResult,
} from './user-work-eval.types'
import {
  parseUserWorkAdversarialResult,
  parseUserWorkJudgePass1Result,
  parseUserWorkJudgeResult,
  USER_WORK_RUBRIC_VERSION,
} from './user-work-judge'
import { contentDeltaText } from './user-work-stream.util'
import { extractToolCallSummary } from './user-work-tool-calls.util'
import {
  aggregateJudgeUsage,
  extractAgentUsageFromEvents,
  parseOpenRouterJudgeUsage,
  summarizeUserWorkSuiteUsage,
} from './user-work-usage.util'

const mockAgentUsage = {
  model: 'mock/agent',
  inputTokens: 1200,
  outputTokens: 300,
  totalTokens: 1500,
  brainContextTokens: 80,
  latencyMs: 1200,
}

const mockJudgeUsage = {
  model: 'mock/judge',
  inputTokens: 400,
  outputTokens: 120,
  totalTokens: 520,
  providerCostUsd: 0.002,
  latencyMs: 800,
}

const evalCase: UserWorkEvalCase = {
  id: 'harness-outcome',
  taskType: 'answer_query',
  userPrompt: 'How many retainers does Foundry take per year on purpose?',
  expectedOutcome: 'Answer states six retainers per year as a deliberate cap.',
  requiredContext: ['six retainers a year'],
  forbiddenClaims: ['unlimited clients'],
  expectations: [
    'States six retainers per year as a deliberate cap',
    'Explains why the cap is intentional',
    'Does not claim unlimited client volume',
    'References founder-hours-per-client quality',
  ],
  expectedContextSufficient: true,
  expectedBrainScopes: ['user'],
  allowedActions: ['search_user_brain'],
  disallowedActions: [],
  validationSet: true,
  tags: ['harness'],
}

function judgeResult(input: Partial<UserWorkJudgeResult>): UserWorkJudgeResult {
  return {
    rubricVersion: USER_WORK_RUBRIC_VERSION,
    scores: {
      taskCompletion: 5,
      contextUsefulness: 5,
      groundedness: 5,
      synthesisQuality: 5,
      irrelevanceControl: 5,
      abstentionQuality: 5,
    },
    weightedScore: 5,
    passed: true,
    hardFails: {
      unsupportedCriticalClaim: false,
      missingRequiredContext: false,
      falseSufficiency: false,
      taskNotAddressed: false,
    },
    expectations: evalCase.expectations.map((text) => ({
      text,
      passed: true,
      evidence: 'Present in final answer.',
      source: 'llm' as const,
    })),
    expectationPassRate: 1,
    claims: [],
    evidence: ['Final answer states six retainers per year on purpose.'],
    failureReasons: [],
    ...input,
  }
}

describe('User-work eval harness', () => {
  it('aggregates mocked agent and judge results', async () => {
    const agentRunner: UserWorkAgentRunner = {
      async run({ evalCase: inputCase }) {
        return {
          caseId: inputCase.id,
          agentKey: 'vibey',
          finalAnswer: 'Foundry takes six retainers a year on purpose.',
          events: [
            {
              type: 'tool_start',
              data: {
                name: 'campaign_capability',
                action: 'search_brain_context',
                tool_call_id: 'tool-1',
              },
            },
            {
              type: 'done',
              data: {
                duration_ms: 1200,
                usage: { input_tokens: 1200, output_tokens: 300 },
                context_breakdown: {
                  modelId: 'mock/agent',
                  totalTokens: 1500,
                  slices: [{ id: 'brain', tokens: 80 }],
                },
              },
            },
          ],
          brainActionCalls: [],
          latencyMs: 1200,
          usage: mockAgentUsage,
          toolCalls: {
            totalToolCalls: 1,
            brainToolCalls: 1,
            byToolName: { campaign_capability: 1 },
            byBrainAction: { search_brain_context: 1 },
          },
        }
      },
    }
    const judge: UserWorkJudge = {
      async judge() {
        return { ...judgeResult({}), usage: mockJudgeUsage }
      },
    }

    const result = await new UserWorkEvalRunner(agentRunner, judge, async (caseUsages) => ({
      avgLatencyMs: 2000,
      avgAgentLatencyMs:
        caseUsages.reduce((sum, item) => sum + item.agent.latencyMs, 0) / caseUsages.length,
      avgJudgeLatencyMs:
        caseUsages.reduce((sum, item) => sum + item.judge.latencyMs, 0) / caseUsages.length,
      avgInputTokens:
        caseUsages.reduce((sum, item) => sum + item.agent.inputTokens + item.judge.inputTokens, 0) /
        caseUsages.length,
      avgOutputTokens:
        caseUsages.reduce(
          (sum, item) => sum + item.agent.outputTokens + item.judge.outputTokens,
          0,
        ) / caseUsages.length,
      avgTotalTokens:
        caseUsages.reduce((sum, item) => sum + item.agent.totalTokens + item.judge.totalTokens, 0) /
        caseUsages.length,
      avgBrainContextTokens:
        caseUsages.reduce((sum, item) => sum + item.agent.brainContextTokens, 0) /
        caseUsages.length,
      totalInputTokens: caseUsages.reduce(
        (sum, item) => sum + item.agent.inputTokens + item.judge.inputTokens,
        0,
      ),
      totalOutputTokens: caseUsages.reduce(
        (sum, item) => sum + item.agent.outputTokens + item.judge.outputTokens,
        0,
      ),
      totalTokens: caseUsages.reduce(
        (sum, item) => sum + item.agent.totalTokens + item.judge.totalTokens,
        0,
      ),
      agentProviderCostUsd: null,
      judgeProviderCostUsd: 0.002,
      providerCostUsd: 0.002,
      userCostUsd: 0.004,
      marginUsd: 0.002,
      estimatedCredits: 1,
      costUnknownCount: 1,
      pricingSource: 'partial',
    })).runSuite('mock-user-work', [evalCase])

    expect(result.caseCount).toBe(1)
    expect(result.passRate).toBe(1)
    expect(result.validationPassRate).toBe(1)
    expect(result.validationCaseCount).toBe(1)
    expect(result.averageScore).toBe(5)
    expect(result.retrievalPassRate).toBe(1)
    expect(result.synthesisPassRate).toBe(1)
    expect(result.synthesisPassRateWhenRetrieved).toBe(1)
    expect(result.failureBreakdown).toEqual({
      retrievalRecall: 0,
      notInBrain: 0,
      synthesis: 0,
      mixed: 0,
      errored: 0,
    })
    expect(result.cases[0]?.diagnostics).toMatchObject({
      retrievalPassed: true,
      synthesisPassed: true,
      failureType: 'none',
    })
    expect(result.cases[0]?.agentRun.finalAnswer).toContain('six retainers')
  })

  it('skips adversarial when pass1 expectations fail', async () => {
    const adversarialSpy = vi.fn()
    const agentRunner: UserWorkAgentRunner = {
      async run({ evalCase: inputCase }) {
        return {
          caseId: inputCase.id,
          agentKey: 'vibey',
          finalAnswer: 'Foundry takes six retainers a year on purpose.',
          events: [],
          brainActionCalls: [],
          latencyMs: 900,
        }
      },
    }
    const judge: UserWorkJudge = {
      async judge() {
        return {
          ...judgeResult({
            passed: false,
            expectations: [
              {
                text: evalCase.expectations[0]!,
                passed: false,
                evidence: 'Missing cap explanation.',
                source: 'llm',
              },
            ],
            expectationPassRate: 0,
          }),
          usage: mockJudgeUsage,
        }
      },
      adversarialRecheck: adversarialSpy,
    }

    const result = await new UserWorkEvalRunner(agentRunner, judge).runSuite('mock-user-work', [
      evalCase,
    ])

    expect(adversarialSpy).not.toHaveBeenCalled()
    expect(result.passRate).toBe(0)
    expect(result.retrievalPassRate).toBe(1)
    expect(result.synthesisPassRate).toBe(0)
    expect(result.failureBreakdown).toEqual({
      retrievalRecall: 0,
      notInBrain: 0,
      synthesis: 1,
      mixed: 0,
      errored: 0,
    })
    expect(result.cases[0]?.diagnostics.failureType).toBe('synthesis')
  })

  it('fails when adversarial flips an expectation', async () => {
    const agentRunner: UserWorkAgentRunner = {
      async run({ evalCase: inputCase }) {
        return {
          caseId: inputCase.id,
          agentKey: 'vibey',
          finalAnswer: 'Foundry takes six retainers a year on purpose.',
          events: [],
          brainActionCalls: [],
          latencyMs: 900,
        }
      },
    }
    const judge: UserWorkJudge = {
      async judge() {
        return { ...judgeResult({}), usage: mockJudgeUsage }
      },
      async adversarialRecheck() {
        return {
          passed: false,
          flippedExpectations: [evalCase.expectations[0]!],
          failureReasons: ['Keyword mention without substance.'],
          usage: { ...mockJudgeUsage, latencyMs: 400, totalTokens: 300 },
        }
      },
    }

    const result = await new UserWorkEvalRunner(agentRunner, judge).runSuite('mock-user-work', [
      evalCase,
    ])

    expect(result.passRate).toBe(0)
    expect(result.cases[0]?.judge.adversarial?.flippedExpectations.length).toBe(1)
    expect(result.cases[0]?.diagnostics).toMatchObject({
      retrievalPassed: true,
      synthesisPassed: false,
      failureType: 'synthesis',
    })
  })

  it('fails hybrid pass when soft score is below threshold despite binary pass', async () => {
    const agentRunner: UserWorkAgentRunner = {
      async run({ evalCase: inputCase }) {
        return {
          caseId: inputCase.id,
          agentKey: 'vibey',
          finalAnswer: 'Foundry takes six retainers a year on purpose.',
          events: [],
          brainActionCalls: [],
          latencyMs: 900,
        }
      },
    }
    const judge: UserWorkJudge = {
      async judge() {
        return {
          ...judgeResult({
            weightedScore: 3.2,
            scores: {
              taskCompletion: 3,
              contextUsefulness: 3,
              groundedness: 3,
              synthesisQuality: 4,
              irrelevanceControl: 4,
              abstentionQuality: 3,
            },
            passed: false,
          }),
          usage: mockJudgeUsage,
        }
      },
    }

    const result = await new UserWorkEvalRunner(agentRunner, judge).runSuite('mock-user-work', [
      evalCase,
    ])

    expect(result.passRate).toBe(0)
  })

  it('reads content_delta from content field (SSE protocol)', () => {
    expect(contentDeltaText({ content: 'hello' })).toBe('hello')
    expect(contentDeltaText({ text: 'legacy' })).toBe('legacy')
    expect(contentDeltaText({ content: 'primary', text: 'ignored' })).toBe('primary')
    expect(contentDeltaText({})).toBe('')
  })

  it('parses v3 judge JSON with expectations and claims', () => {
    const parsed = parseUserWorkJudgePass1Result(
      JSON.stringify({
        rubricVersion: USER_WORK_RUBRIC_VERSION,
        expectations: [
          { text: 'States six retainers', passed: true, evidence: 'Answer says six retainers.' },
        ],
        claims: [
          {
            claim: 'Foundry caps at six retainers',
            type: 'factual',
            verified: true,
            evidence: 'Explicit in answer.',
          },
        ],
        scores: {
          taskCompletion: 5,
          contextUsefulness: 5,
          groundedness: 5,
          synthesisQuality: 5,
          irrelevanceControl: 5,
          abstentionQuality: 5,
        },
        hardFails: {
          unsupportedCriticalClaim: false,
          missingRequiredContext: false,
          falseSufficiency: false,
          taskNotAddressed: false,
        },
        evidence: ['Answer is complete.'],
        failureReasons: [],
      }),
    )

    expect(parsed.rubricVersion).toBe(USER_WORK_RUBRIC_VERSION)
    expect(parsed.expectations).toHaveLength(1)
    expect(parsed.claims).toHaveLength(1)
    expect(parsed.passed).toBe(true)
  })

  it('parses legacy v2-shaped judge JSON via compatibility helper', () => {
    const parsed = parseUserWorkJudgeResult(
      JSON.stringify({
        rubricVersion: USER_WORK_RUBRIC_VERSION,
        scores: {
          taskCompletion: 5,
          contextUsefulness: 5,
          groundedness: 5,
          synthesisQuality: 5,
          irrelevanceControl: 5,
          abstentionQuality: 5,
        },
        hardFails: {
          unsupportedCriticalClaim: false,
          missingRequiredContext: false,
          falseSufficiency: false,
          taskNotAddressed: false,
        },
        evidence: ['Answer is complete.'],
        failureReasons: [],
      }),
    )

    expect(parsed.weightedScore).toBe(5)
    expect(parsed.passed).toBe(true)
  })

  it('parses adversarial judge JSON', () => {
    const parsed = parseUserWorkAdversarialResult(
      JSON.stringify({
        flippedExpectations: ['States six retainers per year'],
        failureReasons: ['Surface keyword only.'],
      }),
    )
    expect(parsed.passed).toBe(false)
    expect(parsed.flippedExpectations).toHaveLength(1)
  })

  it('aggregates dual judge usage', () => {
    const combined = aggregateJudgeUsage(mockJudgeUsage, {
      ...mockJudgeUsage,
      inputTokens: 200,
      outputTokens: 50,
      totalTokens: 250,
      latencyMs: 300,
      providerCostUsd: 0.001,
    })
    expect(combined.totalTokens).toBe(770)
    expect(combined.latencyMs).toBe(1100)
  })

  it('extracts agent usage from done SSE events', () => {
    const usage = extractAgentUsageFromEvents(
      [
        {
          type: 'done',
          data: {
            duration_ms: 2500,
            usage: { input_tokens: 19854, output_tokens: 420 },
            context_window: 1000000,
            context_breakdown: {
              modelId: 'openrouter/anthropic/claude-sonnet-4.6',
              totalTokens: 20274,
              slices: [{ id: 'brain', tokens: 69 }],
            },
          },
        },
      ],
      2600,
    )

    expect(usage).toMatchObject({
      model: 'openrouter/anthropic/claude-sonnet-4.6',
      inputTokens: 19854,
      outputTokens: 420,
      totalTokens: 20274,
      brainContextTokens: 69,
      contextWindowTokens: 1000000,
      durationMs: 2500,
      latencyMs: 2600,
    })
  })

  it('parses OpenRouter judge usage and cost', () => {
    const usage = parseOpenRouterJudgeUsage({
      model: 'google/gemini-3.5-flash',
      latencyMs: 900,
      response: {
        usage: {
          prompt_tokens: 800,
          completion_tokens: 120,
          total_tokens: 920,
          cost: 0.0012,
        },
      },
    })

    expect(usage).toMatchObject({
      model: 'google/gemini-3.5-flash',
      inputTokens: 800,
      outputTokens: 120,
      totalTokens: 920,
      providerCostUsd: 0.0012,
      latencyMs: 900,
    })
  })

  it('estimates suite usage cost from token provider pricing rows', async () => {
    const supabase = {
      from: () => {
        const builder = {
          select: () => builder,
          eq: () => builder,
          in: async () => ({
            data: [
              { unit_type: 'input_tokens_1k', cost_per_unit: 0.001 },
              { unit_type: 'output_tokens_1k', cost_per_unit: 0.002 },
            ],
            error: null,
          }),
        }
        return builder
      },
    }

    const summary = await summarizeUserWorkSuiteUsage(supabase as any, [
      {
        agent: {
          model: 'openrouter/mock/agent',
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          brainContextTokens: 100,
          latencyMs: 1000,
        },
        judge: {
          model: 'mock/judge',
          inputTokens: 2000,
          outputTokens: 1000,
          totalTokens: 3000,
          providerCostUsd: null,
          latencyMs: 500,
        },
      },
    ])

    expect(summary).toMatchObject({
      providerCostUsd: 0.006,
      userCostUsd: 0.012,
      marginUsd: 0.006,
      estimatedCredits: 3,
      costUnknownCount: 0,
      pricingSource: 'token_providers_pricing',
    })
  })

  it('counts total and brain tool calls from SSE events', () => {
    const summary = extractToolCallSummary([
      {
        type: 'tool_start',
        data: {
          name: 'campaign_capability',
          action: 'search_brain_context',
          tool_call_id: 'tool-1',
        },
      },
      {
        type: 'tool_start',
        data: {
          name: 'list_campaigns',
          action: 'list_campaigns',
          tool_call_id: 'tool-2',
        },
      },
    ])

    expect(summary).toMatchObject({
      totalToolCalls: 2,
      brainToolCalls: 1,
      byToolName: { campaign_capability: 1, list_campaigns: 1 },
      byBrainAction: { search_brain_context: 1 },
    })
  })

  it('computes validation pass rate for mixed batch', async () => {
    const agentRunner: UserWorkAgentRunner = {
      async run({ evalCase: inputCase }) {
        return {
          caseId: inputCase.id,
          agentKey: 'vibey',
          finalAnswer: 'Foundry takes six retainers a year on purpose.',
          events: [],
          brainActionCalls: [],
          latencyMs: 900,
        }
      },
    }
    let call = 0
    const judge: UserWorkJudge = {
      async judge() {
        call += 1
        if (call === 1) {
          return { ...judgeResult({}), usage: mockJudgeUsage }
        }
        return {
          ...judgeResult({
            weightedScore: 2,
            scores: {
              taskCompletion: 2,
              contextUsefulness: 2,
              groundedness: 2,
              synthesisQuality: 2,
              irrelevanceControl: 2,
              abstentionQuality: 2,
            },
          }),
          usage: mockJudgeUsage,
        }
      },
    }

    const validationCase: UserWorkEvalCase = {
      ...evalCase,
      id: 'validation-case',
      validationSet: true,
    }
    const exploratoryCase: UserWorkEvalCase = {
      ...evalCase,
      id: 'exploratory-case',
      validationSet: false,
    }

    const result = await new UserWorkEvalRunner(agentRunner, judge).runSuite('mock-user-work', [
      validationCase,
      exploratoryCase,
    ])

    expect(result.validationCaseCount).toBe(1)
    expect(result.validationPassRate).toBe(1)
    expect(result.passRate).toBe(0.5)
  })

  it('retrieval probe failure blocks judge and marks case failed', async () => {
    const judgeSpy = vi.fn(async () => ({ ...judgeResult({}), usage: mockJudgeUsage }))
    const agentRunner: UserWorkAgentRunner = {
      async run({ evalCase: inputCase }) {
        return {
          caseId: inputCase.id,
          agentKey: 'vibey',
          finalAnswer: 'Foundry takes six retainers a year on purpose.',
          events: [],
          brainActionCalls: [],
          latencyMs: 900,
        }
      },
    }
    const probeRunner: UserWorkProbeRunner = {
      async probe(): Promise<UserWorkRetrievalProbeResult> {
        return {
          passed: false,
          preloadTextLength: 100,
          phrases: [
            {
              phrase: 'six retainers a year',
              location: 'in_brain_but_missed',
              inBrainCount: 7,
              inMemories: 5,
              inCortex: 1,
              inPages: 1,
            },
          ],
          preloadFound: [],
          preloadMissing: ['six retainers a year'],
          preloadMissingInBrain: ['six retainers a year'],
          preloadMissingNotInBrain: [],
          forbiddenInPreload: [],
          laneCounts: { user: 0, agent: 0, customer: 0, company: 0, preload: 1 },
          abstentionFailed: false,
          retrievalRecall: 0,
          brainCoverage: 1,
          probeLatencyMs: 200,
          failureReasons: [
            'Required phrase(s) IN BRAIN but not retrieved (recall miss): six retainers a year',
          ],
          probeAvailable: true,
          groundTruthAvailable: true,
        }
      },
    }
    const judge: UserWorkJudge = { judge: judgeSpy }

    const result = await new UserWorkEvalRunner(
      agentRunner,
      judge,
      undefined,
      probeRunner,
    ).runSuite('mock-user-work', [evalCase])

    expect(judgeSpy).not.toHaveBeenCalled()
    expect(result.passRate).toBe(0)
    expect(result.retrievalPassRate).toBe(0)
    expect(result.synthesisPassRate).toBe(0)
    expect(result.synthesisPassRateWhenRetrieved).toBeNull()
    expect(result.failureBreakdown).toEqual({
      retrievalRecall: 1,
      notInBrain: 0,
      synthesis: 0,
      mixed: 0,
      errored: 0,
    })
    expect(result.cases[0]?.diagnostics).toMatchObject({
      retrievalScore: 0,
      retrievalPassed: false,
      retrievalRecall: 0,
      brainCoverage: 1,
      synthesisPassed: false,
      failureType: 'retrieval_recall',
    })
    expect(result.cases[0]?.judge.retrieval?.passed).toBe(false)
    expect(result.cases[0]?.judge.retrieval?.preloadMissing).toContain('six retainers a year')
  })

  it('passes when probe + judge both pass', async () => {
    const agentRunner: UserWorkAgentRunner = {
      async run({ evalCase: inputCase }) {
        return {
          caseId: inputCase.id,
          agentKey: 'vibey',
          finalAnswer: 'Foundry takes six retainers a year on purpose.',
          events: [],
          brainActionCalls: [],
          latencyMs: 900,
        }
      },
    }
    const probeRunner: UserWorkProbeRunner = {
      async probe(): Promise<UserWorkRetrievalProbeResult> {
        return {
          passed: true,
          preloadTextLength: 500,
          phrases: [
            {
              phrase: 'six retainers a year',
              location: 'retrieved',
              family: 'user',
              sourceTitle: 'user-brain seed',
              snippet: '...six retainers a year on purpose...',
            },
          ],
          preloadFound: [
            {
              phrase: 'six retainers a year',
              family: 'user',
              sourceTitle: 'user-brain seed',
              snippet: '...six retainers a year on purpose...',
            },
          ],
          preloadMissing: [],
          preloadMissingInBrain: [],
          preloadMissingNotInBrain: [],
          forbiddenInPreload: [],
          laneCounts: { user: 5, agent: 0, customer: 0, company: 0, preload: 1 },
          abstentionFailed: false,
          retrievalRecall: 1,
          brainCoverage: 1,
          probeLatencyMs: 220,
          failureReasons: [],
          probeAvailable: true,
          groundTruthAvailable: true,
        }
      },
    }
    const judge: UserWorkJudge = {
      async judge({ retrieval }) {
        expect(retrieval?.preloadFound[0]?.family).toBe('user')
        return { ...judgeResult({ retrieval }), usage: mockJudgeUsage }
      },
    }

    const result = await new UserWorkEvalRunner(
      agentRunner,
      judge,
      undefined,
      probeRunner,
    ).runSuite('mock-user-work', [evalCase])

    expect(result.passRate).toBe(1)
    expect(result.cases[0]?.judge.retrieval?.passed).toBe(true)
    expect(result.cases[0]?.diagnostics).toMatchObject({
      retrievalScore: 1,
      retrievalPassed: true,
      synthesisScore: 1,
      synthesisPassed: true,
      failureType: 'none',
    })
  })
})
