export type BrainEvalFamily = 'user' | 'agent' | 'customer' | 'company' | 'shared'

export type BrainEvalLevel = 'tiny_golden_fixture' | 'yc_demo' | 'production_like'

export type BrainEvalCategory =
  | 'factual_recall'
  | 'paraphrase'
  | 'exact_title'
  | 'multi_hop'
  | 'temporal'
  | 'abstention'
  | 'negative_decoy'
  | 'cross_brain'
  | 'cognition'
  | 'shared_access'

export type BrainEvalDifficulty = 'easy' | 'medium' | 'hard'

export type BrainEvalEvidenceType =
  | 'memory'
  | 'snapshot'
  | 'sk_entry'
  | 'narrative_page'
  | 'belief_pattern'
  | 'perspective'
  | 'company_object'
  | 'company_signal'
  | 'evidence_chunk'
  | 'customer_avatar'
  | 'avatar_axis'
  | 'unknown'

export type BrainEvalMetric =
  | 'retrieval_recall'
  | 'retrieval_precision'
  | 'answer_correctness'
  | 'faithfulness'
  | 'context_sufficiency'
  | 'abstention_correctness'
  | 'token_efficiency'
  | 'latency_ms'

export type BrainEvalFailureMode =
  | 'found_at_10'
  | 'found_at_20'
  | 'found_at_50'
  | 'not_found'
  | 'decoy_hit'
  | 'insufficient_context'

export interface BrainEvalPassSummary {
  passAt10: number
  passAt20: number
  passAt50: number
}

export interface BrainEvalLanePassSummary {
  passAt10: number
  passAt20: number
  passAt50: number
  caseCount: number
}

export interface BrainEvalCase {
  id: string
  level: BrainEvalLevel
  family: BrainEvalFamily
  brainId?: string
  userId?: string
  orgId?: string | null
  agentKey?: string
  question: string
  expectedAnswer: string
  expectedEvidenceIds: string[]
  expectedContextSufficient: boolean
  category: BrainEvalCategory
  difficulty: BrainEvalDifficulty
  decoyEvidenceIds?: string[]
  tags: string[]
}

export type BrainEvalStrategy = 'semantic' | 'lexical' | 'graph' | 'rerank' | 'metadata' | 'none'

export interface BrainEvalRetrievedCandidate {
  id: string
  family: BrainEvalFamily
  kind: string
  title: string
  snippet: string
  sourceId?: string | null
  sourceTitle?: string | null
  score: number
  scores?: {
    semantic?: number
    lexical?: number
    graph?: number
    rerank?: number
    final: number
  }
}

export interface BrainEvalStrategyBreakdown {
  totalHits: number
  semantic: number
  lexical: number
  graph: number
  rerank: number
  metadata: number
}

export interface BrainEvalStrategyScores {
  overall: {
    atTop10: BrainEvalStrategyBreakdown
    atTop20: BrainEvalStrategyBreakdown
    atTop50: BrainEvalStrategyBreakdown
  }
  byLane: Record<
    string,
    {
      caseCount: number
      atTop10: BrainEvalStrategyBreakdown
      atTop20: BrainEvalStrategyBreakdown
      atTop50: BrainEvalStrategyBreakdown
    }
  >
}

export interface BrainEvalAnswer {
  text: string
  evidenceIds: string[]
  contextSufficient: boolean
  promptTokens: number
  completionTokens: number
}

export interface BrainEvalAdapter {
  retrieve(input: BrainEvalCase): Promise<BrainEvalRetrievedCandidate[]>
  resolveEvidenceTypes?(input: {
    evalCase: BrainEvalCase
    evidenceIds: string[]
  }): Promise<Record<string, BrainEvalEvidenceType>>
  answer?(input: {
    evalCase: BrainEvalCase
    retrieved: BrainEvalRetrievedCandidate[]
  }): Promise<BrainEvalAnswer>
}

export interface BrainEvalCaseResult {
  caseId: string
  family: BrainEvalFamily
  category: BrainEvalCategory
  difficulty: BrainEvalDifficulty
  scores: Record<BrainEvalMetric, number>
  retrievedEvidenceIds: string[]
  expectedEvidenceIds: string[]
  expectedEvidenceTypes: Record<string, BrainEvalEvidenceType>
  retrievedEvidenceTypes: Record<string, BrainEvalEvidenceType>
  contextSufficient: boolean
  expectedContextSufficient: boolean
  passAt10: boolean
  passAt20: boolean
  passAt50: boolean
  laneHitAt10: Record<string, boolean>
  laneHitAt20: Record<string, boolean>
  laneHitAt50: Record<string, boolean>
  strategyHitAt10: Record<string, BrainEvalStrategy>
  strategyHitAt20: Record<string, BrainEvalStrategy>
  strategyHitAt50: Record<string, BrainEvalStrategy>
  failureMode: BrainEvalFailureMode
}

export interface BrainEvalSuiteResult {
  suiteName: string
  caseCount: number
  scores: Record<BrainEvalMetric, number>
  passAt10: number
  passAt20: number
  passAt50: number
  laneScores: Record<string, BrainEvalLanePassSummary>
  strategyScores: BrainEvalStrategyScores
  missingByObjectType: Record<string, number>
  categoryScores: Record<
    string,
    Record<BrainEvalMetric, number> & BrainEvalPassSummary & { caseCount: number }
  >
  cases: BrainEvalCaseResult[]
}

export interface BrainPublicBenchmarkBaseline {
  name: 'longmemeval_s' | 'sufficient_context' | 'locomo' | 'beam_100k' | 'beam_1m' | 'beam_10m'
  phase: 'first' | 'later' | 'endgame'
  status: 'planned' | 'ready' | 'recorded'
}
