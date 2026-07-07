import type {
  UserWorkAgentRunner,
  UserWorkCaseUsage,
  UserWorkEvalCase,
  UserWorkEvalCaseResult,
  UserWorkEvalDiagnostics,
  UserWorkEvalSuiteResult,
  UserWorkFailureBreakdown,
  UserWorkJudge,
  UserWorkJudgeUsage,
  UserWorkProbeRunner,
  UserWorkRetrievalProbeResult,
  UserWorkSuiteUsageSummary,
} from './user-work-eval.types'
import {
  allExpectationsPass,
  buildProbeFailedJudgeResult,
  computeV3Passed,
  hasHardFail,
  isAdversarialEnabled,
  mergeJudgeWithAdversarial,
  PASS_WEIGHTED_SCORE_THRESHOLD,
} from './user-work-judge'
import { aggregateToolCallSummaries } from './user-work-tool-calls.util'
import { aggregateCaseUsage, aggregateJudgeUsage } from './user-work-usage.util'

function resolveConcurrency(caseCount: number): number {
  const raw = process.env.BRAIN_USER_WORK_CONCURRENCY?.trim()
  if (!raw || raw === 'all') return caseCount
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return caseCount
  return Math.min(Math.floor(parsed), caseCount)
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []
  if (concurrency >= items.length) {
    return Promise.all(items.map((item, index) => worker(item, index)))
  }

  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(items[index]!, index)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runWorker()))
  return results
}

function pass1EligibleForAdversarial(judge: UserWorkEvalCaseResult['judge']): boolean {
  const probeOk = !judge.retrieval || !judge.retrieval.probeAvailable || judge.retrieval.passed
  return (
    probeOk &&
    allExpectationsPass(judge.expectations) &&
    !hasHardFail(judge.hardFails) &&
    judge.weightedScore >= PASS_WEIGHTED_SCORE_THRESHOLD
  )
}

function computeRetrievalScore(retrieval: UserWorkRetrievalProbeResult | undefined): number {
  if (!retrieval || !retrieval.probeAvailable) return 1
  const total = retrieval.preloadFound.length + retrieval.preloadMissing.length
  if (total === 0) return retrieval.passed ? 1 : 0
  return retrieval.preloadFound.length / total
}

function computeDiagnostics(judge: UserWorkEvalCaseResult['judge']): UserWorkEvalDiagnostics {
  const retrieval = judge.retrieval
  const retrievalScore = computeRetrievalScore(retrieval)
  const retrievalPassed = !retrieval || !retrieval.probeAvailable || retrieval.passed
  const retrievalRecall = retrieval?.retrievalRecall ?? 1
  const brainCoverage = retrieval?.brainCoverage ?? 1
  const abstentionFailed = retrieval?.abstentionFailed ?? false
  const recallMissCount = retrieval?.preloadMissingInBrain.length ?? 0
  const notInBrainCount = retrieval?.preloadMissingNotInBrain.length ?? 0

  const adversarialPassed = !judge.adversarial || judge.adversarial.passed
  const synthesisPassed =
    retrievalPassed &&
    allExpectationsPass(judge.expectations) &&
    !hasHardFail(judge.hardFails) &&
    judge.weightedScore >= PASS_WEIGHTED_SCORE_THRESHOLD &&
    adversarialPassed &&
    !abstentionFailed
  const synthesisScore = judge.expectationPassRate

  let failureType: UserWorkEvalDiagnostics['failureType'] = 'none'
  if (!retrievalPassed && recallMissCount > 0 && notInBrainCount > 0) {
    failureType = 'mixed'
  } else if (!retrievalPassed && recallMissCount > 0) {
    failureType = 'retrieval_recall'
  } else if (!retrievalPassed && notInBrainCount > 0) {
    failureType = 'not_in_brain'
  } else if (!synthesisPassed) {
    failureType = 'synthesis'
  }

  return {
    retrievalScore,
    retrievalPassed,
    retrievalRecall,
    brainCoverage,
    synthesisScore,
    synthesisPassed,
    failureType,
  }
}

export class UserWorkEvalRunner {
  constructor(
    private readonly agentRunner: UserWorkAgentRunner,
    private readonly judge: UserWorkJudge,
    private readonly summarizeUsage?: (
      caseUsages: UserWorkCaseUsage[],
    ) => Promise<UserWorkSuiteUsageSummary>,
    private readonly probeRunner?: UserWorkProbeRunner,
  ) {}

  async runSuite(suiteName: string, cases: UserWorkEvalCase[]): Promise<UserWorkEvalSuiteResult> {
    const concurrency = resolveConcurrency(cases.length)
    const results = await runWithConcurrency(cases, concurrency, async (evalCase) => {
      try {
        return await this.runCase(evalCase)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`[user-work] case ${evalCase.id} failed: ${message}`)
        return this.buildErroredCaseResult(evalCase, message)
      }
    })
    return this.aggregate(suiteName, results)
  }

  private buildErroredCaseResult(
    evalCase: UserWorkEvalCase,
    errorMessage: string,
  ): UserWorkEvalCaseResult {
    const judge: UserWorkEvalCaseResult['judge'] = {
      rubricVersion: 'user-work-v3',
      scores: {
        taskCompletion: 0,
        contextUsefulness: 0,
        groundedness: 0,
        synthesisQuality: 0,
        irrelevanceControl: 0,
        abstentionQuality: 0,
      },
      weightedScore: 0,
      passed: false,
      hardFails: {
        unsupportedCriticalClaim: false,
        missingRequiredContext: false,
        falseSufficiency: false,
        taskNotAddressed: true,
      },
      expectations: [],
      expectationPassRate: 0,
      claims: [],
      evidence: [],
      failureReasons: [`Case errored before completion: ${errorMessage}`],
    }
    return {
      caseId: evalCase.id,
      taskType: evalCase.taskType,
      validationSet: evalCase.validationSet,
      passed: false,
      weightedScore: 0,
      diagnostics: {
        retrievalScore: 0,
        retrievalPassed: false,
        retrievalRecall: 0,
        brainCoverage: 0,
        synthesisScore: 0,
        synthesisPassed: false,
        failureType: 'errored',
      },
      judge,
      agentRun: {
        caseId: evalCase.id,
        agentKey: 'unknown',
        finalAnswer: '',
        events: [],
        brainActionCalls: [],
        latencyMs: 0,
      },
    }
  }

  private async runCase(evalCase: UserWorkEvalCase): Promise<UserWorkEvalCaseResult> {
    const agentRun = await this.agentRunner.run({ evalCase })

    let retrieval: UserWorkRetrievalProbeResult | undefined
    if (this.probeRunner) {
      try {
        retrieval = await this.probeRunner.probe({
          evalCase,
          finalAnswer: agentRun.finalAnswer,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`[user-work] retrieval probe failed for ${evalCase.id}: ${message}`)
      }
    }

    if (retrieval && retrieval.probeAvailable && !retrieval.passed) {
      const judge = buildProbeFailedJudgeResult(retrieval)
      const diagnostics = computeDiagnostics(judge)
      return {
        caseId: evalCase.id,
        taskType: evalCase.taskType,
        validationSet: evalCase.validationSet,
        passed: false,
        weightedScore: judge.weightedScore,
        diagnostics,
        judge,
        agentRun,
      }
    }

    const pass1 = await this.judge.judge({ evalCase, agentRun, retrieval })
    let judge = pass1
    let judgeUsage = pass1.usage

    const shouldRunAdversarial =
      isAdversarialEnabled() &&
      pass1EligibleForAdversarial(pass1) &&
      typeof this.judge.adversarialRecheck === 'function'

    if (shouldRunAdversarial && this.judge.adversarialRecheck) {
      const passedExpectations = pass1.expectations.filter((item) => item.passed)
      const adversarial = await this.judge.adversarialRecheck({
        evalCase,
        finalAnswer: agentRun.finalAnswer,
        passedExpectations,
      })
      judge = mergeJudgeWithAdversarial(pass1, adversarial)
      judgeUsage =
        pass1.usage && adversarial.usage
          ? aggregateJudgeUsage(pass1.usage, adversarial.usage)
          : pass1.usage
    } else {
      judge = {
        ...pass1,
        passed: computeV3Passed({
          retrieval: pass1.retrieval,
          hardFails: pass1.hardFails,
          expectations: pass1.expectations,
          weightedScore: pass1.weightedScore,
        }),
      }
    }

    const usage =
      agentRun.usage && judgeUsage
        ? aggregateCaseUsage({ agent: agentRun.usage, judge: judgeUsage })
        : undefined

    const finalJudge = { ...judge, usage: judgeUsage }
    const diagnostics = computeDiagnostics(finalJudge)

    return {
      caseId: evalCase.id,
      taskType: evalCase.taskType,
      validationSet: evalCase.validationSet,
      passed: judge.passed,
      weightedScore: judge.weightedScore,
      diagnostics,
      judge: finalJudge,
      agentRun,
      usage,
    }
  }

  private async aggregate(
    suiteName: string,
    cases: UserWorkEvalCaseResult[],
  ): Promise<UserWorkEvalSuiteResult> {
    if (cases.length === 0) {
      return {
        suiteName,
        caseCount: 0,
        passRate: 0,
        averageScore: 0,
        validationPassRate: null,
        validationCaseCount: 0,
        validationAverageScore: null,
        retrievalPassRate: 0,
        synthesisPassRate: 0,
        synthesisPassRateWhenRetrieved: null,
        avgRetrievalRecall: 0,
        avgBrainCoverage: 0,
        failureBreakdown: {
          retrievalRecall: 0,
          notInBrain: 0,
          synthesis: 0,
          mixed: 0,
          errored: 0,
        },
        avgAgentLatencyMs: 0,
        avgJudgeLatencyMs: 0,
        avgLatencyMs: 0,
        avgToolCalls: 0,
        avgBrainToolCalls: 0,
        totalToolCalls: 0,
        totalBrainToolCalls: 0,
        cases,
      }
    }

    const toolSummary = aggregateToolCallSummaries(
      cases.flatMap((evalCase) =>
        evalCase.agentRun.toolCalls ? [evalCase.agentRun.toolCalls] : [],
      ),
    )

    const avgAgentLatencyMs =
      cases.reduce((sum, evalCase) => sum + evalCase.agentRun.latencyMs, 0) / cases.length
    const avgJudgeLatencyMs =
      cases.reduce(
        (sum, evalCase) =>
          sum + (evalCase.judge.usage?.latencyMs ?? evalCase.usage?.judge.latencyMs ?? 0),
        0,
      ) / cases.length

    const validationCases = cases.filter((evalCase) => evalCase.validationSet === true)
    const validationPassRate =
      validationCases.length > 0
        ? validationCases.filter((evalCase) => evalCase.passed).length / validationCases.length
        : null
    const validationAverageScore =
      validationCases.length > 0
        ? validationCases.reduce((sum, evalCase) => sum + evalCase.weightedScore, 0) /
          validationCases.length
        : null
    const retrievalPassRate =
      cases.filter((evalCase) => evalCase.diagnostics.retrievalPassed).length / cases.length
    const synthesisPassRate =
      cases.filter((evalCase) => evalCase.diagnostics.synthesisPassed).length / cases.length
    const retrievedCases = cases.filter((evalCase) => evalCase.diagnostics.retrievalPassed)
    const synthesisPassRateWhenRetrieved =
      retrievedCases.length > 0
        ? retrievedCases.filter((evalCase) => evalCase.diagnostics.synthesisPassed).length /
          retrievedCases.length
        : null
    const avgRetrievalRecall =
      cases.reduce((sum, evalCase) => sum + evalCase.diagnostics.retrievalRecall, 0) / cases.length
    const avgBrainCoverage =
      cases.reduce((sum, evalCase) => sum + evalCase.diagnostics.brainCoverage, 0) / cases.length
    const failureBreakdown = cases.reduce<UserWorkFailureBreakdown>(
      (acc, evalCase) => {
        if (evalCase.diagnostics.failureType === 'retrieval_recall') acc.retrievalRecall += 1
        if (evalCase.diagnostics.failureType === 'not_in_brain') acc.notInBrain += 1
        if (evalCase.diagnostics.failureType === 'synthesis') acc.synthesis += 1
        if (evalCase.diagnostics.failureType === 'mixed') acc.mixed += 1
        if (evalCase.diagnostics.failureType === 'errored') acc.errored += 1
        return acc
      },
      { retrievalRecall: 0, notInBrain: 0, synthesis: 0, mixed: 0, errored: 0 },
    )

    const caseUsages = cases.flatMap((evalCase) => (evalCase.usage ? [evalCase.usage] : []))
    const totalUsage =
      this.summarizeUsage && caseUsages.length > 0
        ? await this.summarizeUsage(caseUsages)
        : undefined

    return {
      suiteName,
      caseCount: cases.length,
      passRate: cases.filter((evalCase) => evalCase.passed).length / cases.length,
      averageScore: cases.reduce((sum, evalCase) => sum + evalCase.weightedScore, 0) / cases.length,
      validationPassRate,
      validationCaseCount: validationCases.length,
      validationAverageScore,
      retrievalPassRate,
      synthesisPassRate,
      synthesisPassRateWhenRetrieved,
      avgRetrievalRecall,
      avgBrainCoverage,
      failureBreakdown,
      avgAgentLatencyMs,
      avgJudgeLatencyMs,
      avgLatencyMs: totalUsage?.avgLatencyMs ?? avgAgentLatencyMs + avgJudgeLatencyMs,
      avgToolCalls: toolSummary.avgToolCalls,
      avgBrainToolCalls: toolSummary.avgBrainToolCalls,
      totalToolCalls: toolSummary.totalToolCalls,
      totalBrainToolCalls: toolSummary.brainToolCalls,
      totalUsage,
      cases,
    }
  }
}
