export type UserWorkTaskType =
  | 'answer_query'
  | 'write_with_context'
  | 'make_decision'
  | 'plan_next_steps'
  | 'abstain'

export type UserWorkBrainScope = 'user' | 'agent' | 'customer' | 'company' | 'all'

export type UserWorkBrainAction =
  | 'search_user_brain'
  | 'search_agent_brain'
  | 'search_customer_brain'
  | 'search_company_brain'
  | 'search_brain_context'

export interface UserWorkBrainTarget {
  family: UserWorkBrainScope
  brainId?: string
  agentKey?: string
}

export interface UserWorkEvalCase {
  id: string
  taskType: UserWorkTaskType
  userPrompt: string
  expectedOutcome: string
  requiredContext: string[]
  forbiddenClaims: string[]
  expectations: string[]
  expectedContextSufficient: boolean
  expectedBrainScopes: UserWorkBrainScope[]
  allowedActions: UserWorkBrainAction[]
  disallowedActions: UserWorkBrainAction[]
  brainTargets?: UserWorkBrainTarget[]
  validationSet?: boolean
  tags: string[]
}

export interface UserWorkStreamEvent {
  type: string
  data: Record<string, unknown>
}

export interface UserWorkBrainActionCall {
  action: UserWorkBrainAction
  name: string
  label?: string
  payload: Record<string, unknown>
  status?: 'started' | 'completed' | 'failed'
  resultPreview?: string
}

export interface UserWorkAgentRun {
  caseId: string
  agentKey: string
  model?: string
  conversationId?: string
  finalAnswer: string
  events: UserWorkStreamEvent[]
  brainActionCalls: UserWorkBrainActionCall[]
  latencyMs: number
  usage?: UserWorkAgentUsage
  toolCalls?: UserWorkToolCallSummary
}

export type UserWorkToolCallSummary = {
  totalToolCalls: number
  brainToolCalls: number
  byToolName: Record<string, number>
  byBrainAction: Record<string, number>
}

export type UserWorkAgentUsage = {
  model?: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  brainContextTokens: number
  contextWindowTokens?: number
  durationMs?: number
  latencyMs: number
}

export type UserWorkJudgeUsage = {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  providerCostUsd: number | null
  latencyMs: number
}

export type UserWorkCaseUsage = {
  agent: UserWorkAgentUsage
  judge: UserWorkJudgeUsage
}

export type UserWorkSuiteUsageSummary = {
  avgLatencyMs: number
  avgAgentLatencyMs: number
  avgJudgeLatencyMs: number
  avgInputTokens: number
  avgOutputTokens: number
  avgTotalTokens: number
  avgBrainContextTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  agentProviderCostUsd: number | null
  judgeProviderCostUsd: number | null
  providerCostUsd: number | null
  userCostUsd: number | null
  marginUsd: number | null
  estimatedCredits: number | null
  costUnknownCount: number
  pricingSource: 'token_providers_pricing' | 'openrouter' | 'partial' | 'unknown'
}

export interface UserWorkJudgeScores {
  taskCompletion: number
  contextUsefulness: number
  groundedness: number
  synthesisQuality: number
  irrelevanceControl: number
  abstentionQuality: number
}

export interface UserWorkJudgeHardFails {
  unsupportedCriticalClaim: boolean
  missingRequiredContext: boolean
  falseSufficiency: boolean
  taskNotAddressed: boolean
}

export type UserWorkRetrievalFamily = 'user' | 'agent' | 'customer' | 'company' | 'preload'

export interface UserWorkRetrievalPhraseHit {
  phrase: string
  family: UserWorkRetrievalFamily
  sourceTitle: string | null
  snippet: string
}

export type UserWorkPhraseLocation = 'retrieved' | 'in_brain_but_missed' | 'not_in_brain'

export interface UserWorkPhraseClassification {
  phrase: string
  location: UserWorkPhraseLocation
  family?: UserWorkRetrievalFamily
  sourceTitle?: string | null
  snippet?: string
  inBrainCount?: number
  inMemories?: number
  inCortex?: number
  inPages?: number
}

export interface UserWorkRetrievalProbeResult {
  passed: boolean
  preloadTextLength: number
  phrases: UserWorkPhraseClassification[]
  preloadFound: UserWorkRetrievalPhraseHit[]
  preloadMissing: string[]
  preloadMissingInBrain: string[]
  preloadMissingNotInBrain: string[]
  forbiddenInPreload: UserWorkRetrievalPhraseHit[]
  laneCounts: Record<UserWorkRetrievalFamily, number>
  abstentionFailed: boolean
  retrievalRecall: number
  brainCoverage: number
  probeLatencyMs: number
  failureReasons: string[]
  probeAvailable: boolean
  groundTruthAvailable: boolean
}

export type UserWorkFailureType =
  | 'none'
  | 'retrieval_recall'
  | 'not_in_brain'
  | 'synthesis'
  | 'mixed'
  | 'errored'

export interface UserWorkEvalDiagnostics {
  retrievalScore: number
  retrievalPassed: boolean
  retrievalRecall: number
  brainCoverage: number
  synthesisScore: number
  synthesisPassed: boolean
  failureType: UserWorkFailureType
}

export interface UserWorkFailureBreakdown {
  retrievalRecall: number
  notInBrain: number
  synthesis: number
  mixed: number
  errored: number
}

export type UserWorkExpectationSource = 'llm' | 'adversarial'

export interface UserWorkExpectationResult {
  text: string
  passed: boolean
  evidence: string
  source: UserWorkExpectationSource
}

export type UserWorkClaimType = 'factual' | 'quality' | 'process'

export interface UserWorkClaimResult {
  claim: string
  type: UserWorkClaimType
  verified: boolean
  evidence: string
}

export interface UserWorkAdversarialResult {
  passed: boolean
  flippedExpectations: string[]
  failureReasons: string[]
}

export interface UserWorkJudgeResult {
  rubricVersion: string
  scores: UserWorkJudgeScores
  weightedScore: number
  passed: boolean
  hardFails: UserWorkJudgeHardFails
  retrieval?: UserWorkRetrievalProbeResult
  expectations: UserWorkExpectationResult[]
  expectationPassRate: number
  claims: UserWorkClaimResult[]
  adversarial?: UserWorkAdversarialResult
  evidence: string[]
  failureReasons: string[]
  usage?: UserWorkJudgeUsage
}

export interface UserWorkEvalCaseResult {
  caseId: string
  taskType: UserWorkTaskType
  validationSet?: boolean
  passed: boolean
  weightedScore: number
  diagnostics: UserWorkEvalDiagnostics
  judge: UserWorkJudgeResult
  agentRun: UserWorkAgentRun
  usage?: UserWorkCaseUsage
}

export interface UserWorkEvalSuiteResult {
  suiteName: string
  caseCount: number
  passRate: number
  averageScore: number
  validationPassRate: number | null
  validationCaseCount: number
  validationAverageScore: number | null
  retrievalPassRate: number
  synthesisPassRate: number
  synthesisPassRateWhenRetrieved: number | null
  avgRetrievalRecall: number
  avgBrainCoverage: number
  failureBreakdown: UserWorkFailureBreakdown
  avgAgentLatencyMs: number
  avgJudgeLatencyMs: number
  avgLatencyMs: number
  avgToolCalls: number
  avgBrainToolCalls: number
  totalToolCalls: number
  totalBrainToolCalls: number
  totalUsage?: UserWorkSuiteUsageSummary
  cases: UserWorkEvalCaseResult[]
}

export interface UserWorkAgentRunner {
  run(input: { evalCase: UserWorkEvalCase }): Promise<UserWorkAgentRun>
}

export interface UserWorkProbeRunner {
  probe(input: {
    evalCase: UserWorkEvalCase
    finalAnswer: string
  }): Promise<UserWorkRetrievalProbeResult>
}

export interface UserWorkJudge {
  judge(input: {
    evalCase: UserWorkEvalCase
    agentRun: UserWorkAgentRun
    retrieval?: UserWorkRetrievalProbeResult
  }): Promise<UserWorkJudgeResult>
  adversarialRecheck?(input: {
    evalCase: UserWorkEvalCase
    finalAnswer: string
    passedExpectations: UserWorkExpectationResult[]
  }): Promise<UserWorkAdversarialResult & { usage: UserWorkJudgeUsage }>
}
