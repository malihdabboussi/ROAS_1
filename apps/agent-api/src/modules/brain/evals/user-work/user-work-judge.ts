import type {
  UserWorkAdversarialResult,
  UserWorkAgentRun,
  UserWorkClaimResult,
  UserWorkClaimType,
  UserWorkEvalCase,
  UserWorkExpectationResult,
  UserWorkJudge,
  UserWorkJudgeHardFails,
  UserWorkJudgeResult,
  UserWorkJudgeScores,
  UserWorkJudgeUsage,
  UserWorkRetrievalProbeResult,
} from './user-work-eval.types'
import { assembleFinalAnswer } from './user-work-stream.util'
import { parseOpenRouterJudgeUsage } from './user-work-usage.util'

export const USER_WORK_RUBRIC_VERSION = 'user-work-v3'

export const PASS_WEIGHTED_SCORE_THRESHOLD = 3.5

const SCORE_KEYS: Array<keyof UserWorkJudgeScores> = [
  'taskCompletion',
  'contextUsefulness',
  'groundedness',
  'synthesisQuality',
  'irrelevanceControl',
  'abstentionQuality',
]

const HARD_FAIL_KEYS: Array<keyof UserWorkJudgeHardFails> = [
  'unsupportedCriticalClaim',
  'missingRequiredContext',
  'falseSufficiency',
  'taskNotAddressed',
]

const CLAIM_TYPES: UserWorkClaimType[] = ['factual', 'quality', 'process']

type OpenRouterMessage = {
  role: 'system' | 'user'
  content: string
}

type OutcomeEvalCase = Pick<
  UserWorkEvalCase,
  | 'id'
  | 'taskType'
  | 'userPrompt'
  | 'expectedOutcome'
  | 'requiredContext'
  | 'forbiddenClaims'
  | 'expectations'
  | 'expectedContextSufficient'
>

function requireNumber(value: unknown, key: string): number {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0 || num > 5) {
    throw new Error(`${key} must be a number between 0 and 5`)
  }
  return num
}

function requireBoolean(value: unknown, key: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${key} must be boolean`)
  return value
}

function requireString(value: unknown, key: string): string {
  if (typeof value !== 'string') throw new Error(`${key} must be a string`)
  return value
}

function requireStringArray(value: unknown, key: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${key} must be a string array`)
  }
  return value
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    const start = raw.indexOf('{')
    if (start < 0) throw new Error(`Judge response is not JSON: ${raw.slice(0, 300)}`)

    let depth = 0
    let inString = false
    let escaped = false
    for (let i = start; i < raw.length; i += 1) {
      const char = raw[i]
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') {
        inString = !inString
        continue
      }
      if (inString) continue
      if (char === '{') depth += 1
      if (char === '}') {
        depth -= 1
        if (depth === 0) {
          const json = raw.slice(start, i + 1)
          try {
            return JSON.parse(json) as Record<string, unknown>
          } catch {
            return JSON.parse(escapeInvalidJsonEscapes(json)) as Record<string, unknown>
          }
        }
      }
    }

    throw new Error(`Judge response JSON object is incomplete: ${raw.slice(0, 300)}`)
  }
}

function escapeInvalidJsonEscapes(value: string): string {
  return value.replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
}

export function averageScore(scores: UserWorkJudgeScores): number {
  const total = SCORE_KEYS.reduce((sum, key) => sum + scores[key], 0)
  return total / SCORE_KEYS.length
}

export function hasHardFail(hardFails: UserWorkJudgeHardFails): boolean {
  return HARD_FAIL_KEYS.some((key) => hardFails[key])
}

export function allExpectationsPass(expectations: UserWorkExpectationResult[]): boolean {
  return expectations.length === 0 || expectations.every((item) => item.passed)
}

function toOutcomeEvalCase(evalCase: UserWorkEvalCase): OutcomeEvalCase {
  return {
    id: evalCase.id,
    taskType: evalCase.taskType,
    userPrompt: evalCase.userPrompt,
    expectedOutcome: evalCase.expectedOutcome,
    requiredContext: evalCase.requiredContext,
    forbiddenClaims: evalCase.forbiddenClaims,
    expectations: evalCase.expectations,
    expectedContextSufficient: evalCase.expectedContextSufficient,
  }
}

function parseExpectations(value: unknown): UserWorkExpectationResult[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    const record = (item ?? {}) as Record<string, unknown>
    return {
      text: requireString(record.text, `expectations[${index}].text`),
      passed: requireBoolean(record.passed, `expectations[${index}].passed`),
      evidence: requireString(record.evidence, `expectations[${index}].evidence`),
      source: 'llm' as const,
    }
  })
}

function parseClaims(value: unknown): UserWorkClaimResult[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    const record = (item ?? {}) as Record<string, unknown>
    const type = requireString(record.type, `claims[${index}].type`)
    if (!CLAIM_TYPES.includes(type as UserWorkClaimType)) {
      throw new Error(`claims[${index}].type must be factual, quality, or process`)
    }
    return {
      claim: requireString(record.claim, `claims[${index}].claim`),
      type: type as UserWorkClaimType,
      verified: requireBoolean(record.verified, `claims[${index}].verified`),
      evidence: requireString(record.evidence, `claims[${index}].evidence`),
    }
  })
}

function computeExpectationPassRate(expectations: UserWorkExpectationResult[]): number {
  if (expectations.length === 0) return 1
  const passed = expectations.filter((item) => item.passed).length
  return passed / expectations.length
}

export function computeV3Passed(input: {
  retrieval?: UserWorkRetrievalProbeResult
  hardFails: UserWorkJudgeHardFails
  expectations: UserWorkExpectationResult[]
  weightedScore: number
  adversarial?: UserWorkAdversarialResult
}): boolean {
  if (input.retrieval && input.retrieval.probeAvailable && !input.retrieval.passed) return false
  if (hasHardFail(input.hardFails)) return false
  if (!allExpectationsPass(input.expectations)) return false
  if (input.weightedScore < PASS_WEIGHTED_SCORE_THRESHOLD) return false
  if (input.adversarial && !input.adversarial.passed) return false
  return true
}

export function buildProbeFailedJudgeResult(
  retrieval: UserWorkRetrievalProbeResult,
): UserWorkJudgeResult {
  const emptyScores = Object.fromEntries(
    SCORE_KEYS.map((key) => [key, 0]),
  ) as unknown as UserWorkJudgeScores
  return {
    rubricVersion: USER_WORK_RUBRIC_VERSION,
    scores: emptyScores,
    weightedScore: 0,
    passed: false,
    hardFails: {
      unsupportedCriticalClaim: false,
      missingRequiredContext: retrieval.preloadMissing.length > 0,
      falseSufficiency: retrieval.abstentionFailed,
      taskNotAddressed: false,
    },
    retrieval,
    expectations: [],
    expectationPassRate: 0,
    claims: [],
    evidence: [],
    failureReasons: retrieval.failureReasons,
  }
}

export function parseUserWorkJudgePass1Result(
  raw: string,
  retrieval?: UserWorkRetrievalProbeResult,
): UserWorkJudgeResult {
  const parsed = parseJsonObject(raw)
  const scoresRecord = (parsed.scores ?? {}) as Record<string, unknown>
  const hardFailsRecord = (parsed.hardFails ?? {}) as Record<string, unknown>
  const scores = Object.fromEntries(
    SCORE_KEYS.map((key) => [key, requireNumber(scoresRecord[key], `scores.${key}`)]),
  ) as unknown as UserWorkJudgeScores
  const hardFails = Object.fromEntries(
    HARD_FAIL_KEYS.map((key) => [key, requireBoolean(hardFailsRecord[key], `hardFails.${key}`)]),
  ) as unknown as UserWorkJudgeHardFails
  const expectations = parseExpectations(parsed.expectations)
  const claims = parseClaims(parsed.claims)
  const weightedScore = averageScore(scores)
  const expectationPassRate = computeExpectationPassRate(expectations)
  const passed = computeV3Passed({
    retrieval,
    hardFails,
    expectations,
    weightedScore,
  })
  return {
    rubricVersion: String(parsed.rubricVersion || USER_WORK_RUBRIC_VERSION),
    scores,
    weightedScore,
    passed,
    hardFails,
    retrieval,
    expectations,
    expectationPassRate,
    claims,
    evidence: requireStringArray(parsed.evidence, 'evidence'),
    failureReasons: requireStringArray(parsed.failureReasons, 'failureReasons'),
  }
}

/** @deprecated Use parseUserWorkJudgePass1Result */
export function parseUserWorkJudgeResult(raw: string): UserWorkJudgeResult {
  return parseUserWorkJudgePass1Result(raw)
}

export function buildUserWorkJudgePass1Messages(input: {
  evalCase: UserWorkEvalCase
  agentRun: UserWorkAgentRun
}): OpenRouterMessage[] {
  const finalAnswer = assembleFinalAnswer(input.agentRun)
  return [
    {
      role: 'system',
      content: [
        'You are a skeptical product eval judge for Brain-backed user work.',
        'Score ONLY the final answer the user would receive.',
        'Evaluate the answer as if seeing it cold with zero knowledge of how it was produced.',
        'Ignore tool calls, brain routing, and whether search actions ran.',
        'Pre-injected Brain context is valid. An answer can pass with zero tool calls if the response itself is complete and grounded.',
        'Be strict about outcome quality. Passing weak answers creates false confidence.',
        'Grade each expectation pass/fail with evidence. PASS only when evidence reflects genuine substance, not surface keyword compliance.',
        'Extract 3-8 implicit factual or quality claims from the answer and verify each against the case context.',
        'Score each rubric dimension from 0 to 5.',
        'Hard-fail only when the answer itself has unsupported critical claims, misses required context, falsely claims sufficiency, or does not address the task.',
        'For abstain cases (expectedContextSufficient=false), reward honest caveats and refusal to invent facts.',
        'Return only valid JSON with exactly: rubricVersion, expectations, claims, scores, hardFails, evidence, failureReasons.',
        'Do not return weightedScore or passed; the harness computes those.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify(
        {
          rubricVersion: USER_WORK_RUBRIC_VERSION,
          evalCase: toOutcomeEvalCase(input.evalCase),
          finalAnswer,
          expectationGuide:
            'Each expectation is binary pass/fail. Fail if the answer mentions keywords but does not actually satisfy the intent.',
          scoringGuide: {
            taskCompletion: 'Did the answer help the user complete the requested work?',
            contextUsefulness: 'Does the answer include the set of facts/context the user needed?',
            groundedness:
              'Are the useful claims plausibly grounded in Foundry/Brain knowledge rather than invented?',
            synthesisQuality:
              'Did the agent synthesize context into a usable answer instead of dumping unrelated snippets?',
            irrelevanceControl: 'Did irrelevant noise stay out of the final answer?',
            abstentionQuality:
              'If context was insufficient, did the answer abstain or caveat instead of hallucinating?',
          },
          hardFailGuide: {
            unsupportedCriticalClaim:
              'Answer states a critical fact that contradicts or is not supported by the case.',
            missingRequiredContext: 'Answer omits required context the user needed for this task.',
            falseSufficiency:
              'Answer speaks definitively when the case expects insufficient context.',
            taskNotAddressed:
              'Answer does not perform the requested task type (answer/write/decide/plan/abstain).',
          },
          expectedOutputShape: {
            rubricVersion: USER_WORK_RUBRIC_VERSION,
            expectations: [{ text: 'expectation text', passed: true, evidence: 'quote or reason' }],
            claims: [{ claim: '...', type: 'factual', verified: true, evidence: '...' }],
            scores: Object.fromEntries(SCORE_KEYS.map((key) => [key, 0])),
            hardFails: Object.fromEntries(HARD_FAIL_KEYS.map((key) => [key, false])),
            evidence: ['specific evidence from the final answer only'],
            failureReasons: ['specific reason, or empty array on pass'],
          },
        },
        null,
        2,
      ),
    },
  ]
}

/** @deprecated Use buildUserWorkJudgePass1Messages */
export function buildUserWorkJudgeMessages(input: {
  evalCase: UserWorkEvalCase
  agentRun: UserWorkAgentRun
}): OpenRouterMessage[] {
  return buildUserWorkJudgePass1Messages(input)
}

export function buildUserWorkAdversarialMessages(input: {
  evalCase: UserWorkEvalCase
  finalAnswer: string
  passedExpectations: UserWorkExpectationResult[]
}): OpenRouterMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are a hostile reviewer re-checking expectations that were marked pass.',
        'You saw ONLY the final answer with zero background context.',
        'For each listed expectation, decide if a hostile reviewer would agree it genuinely passes — not keyword stuffing or vague hand-waving.',
        'Return only valid JSON with exactly: flippedExpectations, failureReasons.',
        'flippedExpectations must list the full expectation text for any that should fail on re-check.',
        'failureReasons explains each flip. Empty arrays if all hold.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify(
        {
          caseId: input.evalCase.id,
          finalAnswer: input.finalAnswer,
          passedExpectations: input.passedExpectations.map((item) => ({
            text: item.text,
            evidence: item.evidence,
          })),
          expectedOutputShape: {
            flippedExpectations: ['expectation text that should fail on re-check'],
            failureReasons: ['why the hostile reviewer disagrees'],
          },
        },
        null,
        2,
      ),
    },
  ]
}

export function parseUserWorkAdversarialResult(raw: string): UserWorkAdversarialResult {
  const parsed = parseJsonObject(raw)
  const flippedExpectations = requireStringArray(parsed.flippedExpectations, 'flippedExpectations')
  const failureReasons = requireStringArray(parsed.failureReasons, 'failureReasons')
  return {
    passed: flippedExpectations.length === 0,
    flippedExpectations,
    failureReasons,
  }
}

export function mergeJudgeWithAdversarial(
  pass1: UserWorkJudgeResult,
  adversarial: UserWorkAdversarialResult,
): UserWorkJudgeResult {
  const failureReasons = [...pass1.failureReasons]
  if (!adversarial.passed) {
    failureReasons.push(
      ...adversarial.failureReasons,
      ...adversarial.flippedExpectations.map((text) => `Adversarial flip: ${text}`),
    )
  }
  const passed = computeV3Passed({
    retrieval: pass1.retrieval,
    hardFails: pass1.hardFails,
    expectations: pass1.expectations,
    weightedScore: pass1.weightedScore,
    adversarial,
  })
  return {
    ...pass1,
    passed,
    adversarial,
    failureReasons,
  }
}

export function isAdversarialEnabled(): boolean {
  const raw = process.env.BRAIN_USER_WORK_ADVERSARIAL?.trim()
  return raw !== '0' && raw !== 'false'
}

async function callOpenRouterJson(input: {
  model: string
  apiKey: string
  messages: OpenRouterMessage[]
}): Promise<{ content: string; usage: UserWorkJudgeUsage }> {
  const startedAt = performance.now()
  let response: Response | null = null
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: input.model,
          messages: input.messages,
          response_format: { type: 'json_object' },
        }),
      })
      break
    } catch (err) {
      lastError = err
      if (attempt === 3) throw err
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
  if (!response) throw lastError ?? new Error('Judge request failed before response')
  const latencyMs = performance.now() - startedAt
  if (!response.ok) {
    throw new Error(`Judge request failed: ${response.status} ${await response.text()}`)
  }
  const json = (await response.json()) as Record<string, unknown> & {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('Judge response content is empty')
  return {
    content,
    usage: parseOpenRouterJudgeUsage({
      model: input.model,
      latencyMs,
      response: json,
    }),
  }
}

export class OpenRouterUserWorkJudge implements UserWorkJudge {
  constructor(
    private readonly model: string,
    private readonly apiKey: string,
  ) {}

  async judge(input: {
    evalCase: UserWorkEvalCase
    agentRun: UserWorkAgentRun
    retrieval?: UserWorkRetrievalProbeResult
  }): Promise<UserWorkJudgeResult> {
    const { content, usage } = await callOpenRouterJson({
      model: this.model,
      apiKey: this.apiKey,
      messages: buildUserWorkJudgePass1Messages(input),
    })
    const parsed = parseUserWorkJudgePass1Result(content, input.retrieval)
    return { ...parsed, usage }
  }

  async adversarialRecheck(input: {
    evalCase: UserWorkEvalCase
    finalAnswer: string
    passedExpectations: UserWorkExpectationResult[]
  }): Promise<UserWorkAdversarialResult & { usage: UserWorkJudgeUsage }> {
    const { content, usage } = await callOpenRouterJson({
      model: this.model,
      apiKey: this.apiKey,
      messages: buildUserWorkAdversarialMessages(input),
    })
    return { ...parseUserWorkAdversarialResult(content), usage }
  }
}
