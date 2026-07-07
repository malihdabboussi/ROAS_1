import type {
  BrainEvalAdapter,
  BrainEvalCase,
  BrainEvalCaseResult,
  BrainEvalCategory,
  BrainEvalEvidenceType,
  BrainEvalFailureMode,
  BrainEvalLanePassSummary,
  BrainEvalMetric,
  BrainEvalPassSummary,
  BrainEvalRetrievedCandidate,
  BrainEvalStrategy,
  BrainEvalStrategyBreakdown,
  BrainEvalStrategyScores,
  BrainEvalSuiteResult,
  BrainPublicBenchmarkBaseline,
} from './brain-eval.types'

const METRICS: BrainEvalMetric[] = [
  'retrieval_recall',
  'retrieval_precision',
  'answer_correctness',
  'faithfulness',
  'context_sufficiency',
  'abstention_correctness',
  'token_efficiency',
  'latency_ms',
]

export const BRAIN_PUBLIC_BENCHMARK_BASELINES: BrainPublicBenchmarkBaseline[] = [
  { name: 'longmemeval_s', phase: 'first', status: 'planned' },
  { name: 'sufficient_context', phase: 'first', status: 'planned' },
  { name: 'locomo', phase: 'later', status: 'planned' },
  { name: 'beam_100k', phase: 'later', status: 'planned' },
  { name: 'beam_1m', phase: 'endgame', status: 'planned' },
  { name: 'beam_10m', phase: 'endgame', status: 'planned' },
]

export class BrainEvalRunner {
  constructor(private readonly adapter: BrainEvalAdapter) {}

  async runSuite(
    suiteName: string,
    cases: BrainEvalCase[],
    options: { concurrency?: number } = {},
  ): Promise<BrainEvalSuiteResult> {
    const results = await this.runCases(cases, this.normalizeConcurrency(options.concurrency))

    return {
      suiteName,
      caseCount: results.length,
      scores: this.averageScores(results),
      ...this.averagePassSummary(results),
      laneScores: this.averageLaneScores(results),
      strategyScores: this.aggregateStrategyScores(results),
      missingByObjectType: this.missingByObjectType(results),
      categoryScores: this.averageCategoryScores(results),
      cases: results,
    }
  }

  private async runCases(
    cases: BrainEvalCase[],
    concurrency: number,
  ): Promise<BrainEvalCaseResult[]> {
    const results = new Array<BrainEvalCaseResult>(cases.length)
    let nextIndex = 0

    const workers = Array.from({ length: Math.min(concurrency, cases.length) }, async () => {
      while (nextIndex < cases.length) {
        const index = nextIndex
        nextIndex += 1
        results[index] = await this.runCase(cases[index]!)
      }
    })

    await Promise.all(workers)
    return results
  }

  private normalizeConcurrency(concurrency: number | undefined): number {
    if (!Number.isFinite(concurrency) || !concurrency || concurrency < 1) return 1
    return Math.floor(concurrency)
  }

  private async runCase(evalCase: BrainEvalCase): Promise<BrainEvalCaseResult> {
    const startedAt = performance.now()
    const retrieved = await this.adapter.retrieve(evalCase)
    const latencyMs = performance.now() - startedAt
    const answerRetrieved = retrieved.slice(0, 10)
    const answer = this.adapter.answer
      ? await this.adapter.answer({ evalCase, retrieved: answerRetrieved })
      : {
          text: '',
          evidenceIds: answerRetrieved.map((candidate) => candidate.id),
          contextSufficient: answerRetrieved.length > 0,
          promptTokens: 0,
          completionTokens: 0,
        }
    const retrievedEvidenceIds = retrieved.map((candidate) => candidate.id)
    const top10EvidenceIds = retrievedEvidenceIds.slice(0, 10)
    const expected = new Set(evalCase.expectedEvidenceIds)
    const retrievedExpectedCount = top10EvidenceIds.filter((id) => expected.has(id)).length
    const decoy = new Set(evalCase.decoyEvidenceIds ?? [])
    const retrievedDecoyCount = retrievedEvidenceIds.filter((id) => decoy.has(id)).length
    const answerEvidence = new Set(answer.evidenceIds)
    const answerUsesExpectedEvidence = evalCase.expectedEvidenceIds.every((id) =>
      answerEvidence.has(id),
    )
    const retrievalPrecision =
      top10EvidenceIds.length === 0
        ? expected.size === 0
          ? 1
          : 0
        : retrievedExpectedCount / top10EvidenceIds.length
    const passAt10 = this.passesAt(evalCase.expectedEvidenceIds, retrievedEvidenceIds, 10)
    const passAt20 = this.passesAt(evalCase.expectedEvidenceIds, retrievedEvidenceIds, 20)
    const passAt50 = this.passesAt(evalCase.expectedEvidenceIds, retrievedEvidenceIds, 50)
    const evidenceIdsForTyping = [
      ...new Set([...evalCase.expectedEvidenceIds, ...retrievedEvidenceIds]),
    ]
    const resolvedTypes =
      this.adapter.resolveEvidenceTypes && evidenceIdsForTyping.length > 0
        ? await this.adapter.resolveEvidenceTypes({ evalCase, evidenceIds: evidenceIdsForTyping })
        : {}
    const expectedEvidenceTypes = Object.fromEntries(
      evalCase.expectedEvidenceIds.map((id) => [id, resolvedTypes[id] ?? 'unknown']),
    ) as Record<string, BrainEvalEvidenceType>
    const retrievedEvidenceTypes = Object.fromEntries(
      retrieved.map((candidate) => [
        candidate.id,
        resolvedTypes[candidate.id] ?? this.normalizeEvidenceType(candidate.kind),
      ]),
    ) as Record<string, BrainEvalEvidenceType>

    return {
      caseId: evalCase.id,
      family: evalCase.family,
      category: evalCase.category,
      difficulty: evalCase.difficulty,
      scores: {
        retrieval_recall: expected.size === 0 ? 1 : retrievedExpectedCount / expected.size,
        retrieval_precision: retrievedDecoyCount > 0 ? 0 : retrievalPrecision,
        answer_correctness: answer.text.includes(evalCase.expectedAnswer) ? 1 : 0,
        faithfulness: answerUsesExpectedEvidence && retrievedDecoyCount === 0 ? 1 : 0,
        context_sufficiency:
          answer.contextSufficient === evalCase.expectedContextSufficient ? 1 : 0,
        abstention_correctness:
          evalCase.expectedContextSufficient || !answer.contextSufficient ? 1 : 0,
        token_efficiency: this.scoreTokenEfficiency(answer.promptTokens + answer.completionTokens),
        latency_ms: latencyMs,
      },
      retrievedEvidenceIds,
      expectedEvidenceIds: evalCase.expectedEvidenceIds,
      expectedEvidenceTypes,
      retrievedEvidenceTypes,
      contextSufficient: answer.contextSufficient,
      expectedContextSufficient: evalCase.expectedContextSufficient,
      passAt10,
      passAt20,
      passAt50,
      laneHitAt10: this.laneHitsAt(expectedEvidenceTypes, retrievedEvidenceIds, 10),
      laneHitAt20: this.laneHitsAt(expectedEvidenceTypes, retrievedEvidenceIds, 20),
      laneHitAt50: this.laneHitsAt(expectedEvidenceTypes, retrievedEvidenceIds, 50),
      strategyHitAt10: this.strategyHitsAt(evalCase.expectedEvidenceIds, retrieved, 10),
      strategyHitAt20: this.strategyHitsAt(evalCase.expectedEvidenceIds, retrieved, 20),
      strategyHitAt50: this.strategyHitsAt(evalCase.expectedEvidenceIds, retrieved, 50),
      failureMode: this.failureMode({
        passAt10,
        passAt20,
        passAt50,
        expectedContextSufficient: evalCase.expectedContextSufficient,
        contextSufficient: answer.contextSufficient,
        retrievedDecoyCount,
      }),
    }
  }

  private averageScores(results: BrainEvalCaseResult[]): Record<BrainEvalMetric, number> {
    const scores = Object.fromEntries(METRICS.map((metric) => [metric, 0])) as Record<
      BrainEvalMetric,
      number
    >
    if (results.length === 0) return scores

    for (const result of results) {
      for (const metric of METRICS) {
        scores[metric] += result.scores[metric]
      }
    }

    for (const metric of METRICS) {
      scores[metric] = scores[metric] / results.length
    }

    return scores
  }

  private averageCategoryScores(
    results: BrainEvalCaseResult[],
  ): Record<
    string,
    Record<BrainEvalMetric, number> & BrainEvalPassSummary & { caseCount: number }
  > {
    const grouped = new Map<BrainEvalCategory, BrainEvalCaseResult[]>()
    for (const result of results) {
      grouped.set(result.category, [...(grouped.get(result.category) ?? []), result])
    }

    const categoryScores: Record<
      string,
      Record<BrainEvalMetric, number> & BrainEvalPassSummary & { caseCount: number }
    > = {}
    for (const [category, categoryResults] of grouped.entries()) {
      categoryScores[category] = {
        caseCount: categoryResults.length,
        ...this.averageScores(categoryResults),
        ...this.averagePassSummary(categoryResults),
      }
    }
    return categoryScores
  }

  private averagePassSummary(results: BrainEvalCaseResult[]): BrainEvalPassSummary {
    if (results.length === 0) {
      return { passAt10: 0, passAt20: 0, passAt50: 0 }
    }
    return {
      passAt10: results.filter((result) => result.passAt10).length / results.length,
      passAt20: results.filter((result) => result.passAt20).length / results.length,
      passAt50: results.filter((result) => result.passAt50).length / results.length,
    }
  }

  private averageLaneScores(
    results: BrainEvalCaseResult[],
  ): Record<string, BrainEvalLanePassSummary> {
    const grouped = new Map<string, BrainEvalCaseResult[]>()
    for (const result of results) {
      for (const type of new Set(Object.values(result.expectedEvidenceTypes))) {
        grouped.set(type, [...(grouped.get(type) ?? []), result])
      }
    }

    const scores: Record<string, BrainEvalLanePassSummary> = {}
    for (const [type, typeResults] of grouped.entries()) {
      scores[type] = {
        caseCount: typeResults.length,
        passAt10:
          typeResults.filter((result) => result.laneHitAt10[type]).length / typeResults.length,
        passAt20:
          typeResults.filter((result) => result.laneHitAt20[type]).length / typeResults.length,
        passAt50:
          typeResults.filter((result) => result.laneHitAt50[type]).length / typeResults.length,
      }
    }
    return scores
  }

  private missingByObjectType(results: BrainEvalCaseResult[]): Record<string, number> {
    const missing: Record<string, number> = {}
    for (const result of results) {
      const retrieved = new Set(result.retrievedEvidenceIds.slice(0, 50))
      for (const [id, type] of Object.entries(result.expectedEvidenceTypes)) {
        if (retrieved.has(id)) continue
        missing[type] = (missing[type] ?? 0) + 1
      }
    }
    return missing
  }

  private passesAt(
    expectedEvidenceIds: string[],
    retrievedEvidenceIds: string[],
    depth: number,
  ): boolean {
    if (expectedEvidenceIds.length === 0) return true
    const retrievedAtDepth = new Set(retrievedEvidenceIds.slice(0, depth))
    return expectedEvidenceIds.every((id) => retrievedAtDepth.has(id))
  }

  private laneHitsAt(
    expectedEvidenceTypes: Record<string, BrainEvalEvidenceType>,
    retrievedEvidenceIds: string[],
    depth: number,
  ): Record<string, boolean> {
    const retrievedAtDepth = new Set(retrievedEvidenceIds.slice(0, depth))
    const idsByType = new Map<BrainEvalEvidenceType, string[]>()
    for (const [id, type] of Object.entries(expectedEvidenceTypes)) {
      idsByType.set(type, [...(idsByType.get(type) ?? []), id])
    }
    return Object.fromEntries(
      [...idsByType.entries()].map(([type, ids]) => [
        type,
        ids.every((id) => retrievedAtDepth.has(id)),
      ]),
    )
  }

  private strategyHitsAt(
    expectedEvidenceIds: string[],
    retrieved: BrainEvalRetrievedCandidate[],
    depth: number,
  ): Record<string, BrainEvalStrategy> {
    const retrievedAtDepth = retrieved.slice(0, depth)
    const byId = new Map(retrievedAtDepth.map((candidate) => [candidate.id, candidate]))
    const hits: Record<string, BrainEvalStrategy> = {}
    for (const id of expectedEvidenceIds) {
      const candidate = byId.get(id)
      hits[id] = candidate ? this.detectWinningStrategy(candidate) : 'none'
    }
    return hits
  }

  private detectWinningStrategy(candidate: BrainEvalRetrievedCandidate): BrainEvalStrategy {
    const scores: { semantic?: number; lexical?: number; graph?: number; rerank?: number } =
      candidate.scores ?? {}
    const semantic = scores.semantic ?? 0
    const lexical = scores.lexical ?? 0
    const graph = scores.graph ?? 0
    const rerank = scores.rerank ?? 0
    const generators: Array<[BrainEvalStrategy, number]> = [
      ['semantic', semantic],
      ['lexical', lexical],
      ['graph', graph],
    ]
    const generatorWinner = generators.reduce(
      (best, current) => (current[1] > best[1] ? current : best),
      ['metadata' as BrainEvalStrategy, 0],
    )
    if (generatorWinner[1] > 0) return generatorWinner[0]
    if (rerank > 0) return 'rerank'
    return 'metadata'
  }

  private emptyStrategyBreakdown(): BrainEvalStrategyBreakdown {
    return { totalHits: 0, semantic: 0, lexical: 0, graph: 0, rerank: 0, metadata: 0 }
  }

  private aggregateStrategyScores(results: BrainEvalCaseResult[]): BrainEvalStrategyScores {
    const overall = {
      atTop10: this.emptyStrategyBreakdown(),
      atTop20: this.emptyStrategyBreakdown(),
      atTop50: this.emptyStrategyBreakdown(),
    }
    const byLane = new Map<
      string,
      {
        caseCount: Set<string>
        atTop10: BrainEvalStrategyBreakdown
        atTop20: BrainEvalStrategyBreakdown
        atTop50: BrainEvalStrategyBreakdown
      }
    >()

    for (const result of results) {
      for (const [id, type] of Object.entries(result.expectedEvidenceTypes)) {
        if (!byLane.has(type)) {
          byLane.set(type, {
            caseCount: new Set(),
            atTop10: this.emptyStrategyBreakdown(),
            atTop20: this.emptyStrategyBreakdown(),
            atTop50: this.emptyStrategyBreakdown(),
          })
        }
        byLane.get(type)!.caseCount.add(result.caseId)
        this.recordStrategy(result.strategyHitAt10[id], overall.atTop10)
        this.recordStrategy(result.strategyHitAt20[id], overall.atTop20)
        this.recordStrategy(result.strategyHitAt50[id], overall.atTop50)
        this.recordStrategy(result.strategyHitAt10[id], byLane.get(type)!.atTop10)
        this.recordStrategy(result.strategyHitAt20[id], byLane.get(type)!.atTop20)
        this.recordStrategy(result.strategyHitAt50[id], byLane.get(type)!.atTop50)
      }
    }

    const byLaneOutput: BrainEvalStrategyScores['byLane'] = {}
    for (const [type, value] of byLane.entries()) {
      byLaneOutput[type] = {
        caseCount: value.caseCount.size,
        atTop10: value.atTop10,
        atTop20: value.atTop20,
        atTop50: value.atTop50,
      }
    }
    return { overall, byLane: byLaneOutput }
  }

  private recordStrategy(
    strategy: BrainEvalStrategy | undefined,
    counter: BrainEvalStrategyBreakdown,
  ): void {
    if (!strategy || strategy === 'none') return
    counter.totalHits += 1
    counter[strategy] += 1
  }

  private normalizeEvidenceType(kind: string): BrainEvalEvidenceType {
    if (
      kind === 'memory' ||
      kind === 'snapshot' ||
      kind === 'sk_entry' ||
      kind === 'narrative_page' ||
      kind === 'belief_pattern' ||
      kind === 'perspective' ||
      kind === 'company_object' ||
      kind === 'evidence_chunk' ||
      kind === 'company_signal' ||
      kind === 'customer_avatar' ||
      kind === 'avatar_axis'
    ) {
      return kind
    }
    return 'unknown'
  }

  private failureMode(input: {
    passAt10: boolean
    passAt20: boolean
    passAt50: boolean
    expectedContextSufficient: boolean
    contextSufficient: boolean
    retrievedDecoyCount: number
  }): BrainEvalFailureMode {
    if (input.retrievedDecoyCount > 0) return 'decoy_hit'
    if (input.expectedContextSufficient && !input.contextSufficient && input.passAt50) {
      return 'insufficient_context'
    }
    if (input.passAt10) return 'found_at_10'
    if (input.passAt20) return 'found_at_20'
    if (input.passAt50) return 'found_at_50'
    return 'not_found'
  }

  private scoreTokenEfficiency(tokens: number): number {
    if (tokens <= 0) return 1
    if (tokens <= 1_000) return 1
    if (tokens >= 8_000) return 0
    return 1 - (tokens - 1_000) / 7_000
  }
}
