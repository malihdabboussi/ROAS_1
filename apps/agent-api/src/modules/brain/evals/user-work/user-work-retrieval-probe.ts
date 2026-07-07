import type {
  UserWorkEvalCase,
  UserWorkPhraseClassification,
  UserWorkRetrievalFamily,
  UserWorkRetrievalPhraseHit,
  UserWorkRetrievalProbeResult,
} from './user-work-eval.types'

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'on',
  'in',
  'at',
  'to',
  'of',
  'for',
  'and',
  'or',
  'per',
])

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
  thirty: '30',
  forty: '40',
  fifty: '50',
  sixty: '60',
  seventy: '70',
  eighty: '80',
  ninety: '90',
  hundred: '100',
}

const FAMILIES: UserWorkRetrievalFamily[] = ['user', 'agent', 'customer', 'company', 'preload']

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeForMatching(value: string): string {
  let normalized = value.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    normalized = normalized.replace(new RegExp(`\\b${escapeRegex(word)}\\b`, 'g'), digit)
  }
  return normalized.replace(/\s+/g, ' ').trim()
}

function significantTokens(phrase: string): string[] {
  return normalizeForMatching(phrase)
    .split(' ')
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

function snippetExcerpt(haystack: string, phrase: string, span = 80): string {
  const normalizedHaystack = haystack.toLowerCase()
  const normalizedPhrase = phrase.toLowerCase()
  const idx = normalizedHaystack.indexOf(normalizedPhrase)
  if (idx >= 0) {
    const start = Math.max(0, idx - span)
    const end = Math.min(haystack.length, idx + normalizedPhrase.length + span)
    return haystack.slice(start, end).replace(/\s+/g, ' ').trim()
  }
  return haystack
    .slice(0, Math.min(haystack.length, span * 2))
    .replace(/\s+/g, ' ')
    .trim()
}

function phraseAppearsInText(haystack: string, phrase: string): boolean {
  if (!haystack) return false
  const normalizedHaystack = normalizeForMatching(haystack)
  const normalizedPhrase = normalizeForMatching(phrase)
  if (!normalizedPhrase) return true
  if (normalizedHaystack.includes(normalizedPhrase)) return true
  const tokens = significantTokens(phrase)
  if (tokens.length === 0) return false
  return tokens.every((token) => new RegExp(`\\b${escapeRegex(token)}\\b`).test(normalizedHaystack))
}

interface ProbeCandidate {
  title: string
  content: string
  snippet: string
  source_title: string | null
}

interface ProbeFamilyResult {
  count: number
  context_sufficient: boolean
  candidates: ProbeCandidate[]
  missing: string[]
}

export interface ProbeGroundTruthCounts {
  in_memories: number
  in_cortex: number
  in_pages: number
  total: number
}

export interface ProbeResponse {
  preloadText: string
  preloadTextLength: number
  perFamily: Record<Exclude<UserWorkRetrievalFamily, 'preload'>, ProbeFamilyResult | null>
  groundTruth?: Record<string, ProbeGroundTruthCounts>
  brainIdsScanned?: string[]
  latencyMs: number
}

export interface ProbeCallerOptions {
  apiBaseUrl: string
  accessToken: string
  orgId?: string
  agentKey: string
  refreshToken?: string
}

export async function fetchEvalProbe(
  options: ProbeCallerOptions,
  query: string,
  phrases: string[] = [],
  limit?: number,
): Promise<ProbeResponse> {
  const url = `${options.apiBaseUrl.replace(/\/$/, '')}/api/internal/brain-eval/probe`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.refreshToken ? { 'x-supabase-refresh-token': options.refreshToken } : {}),
      ...(options.orgId ? { 'x-org-id': options.orgId } : {}),
    },
    body: JSON.stringify({
      query,
      agentKey: options.agentKey,
      ...(phrases.length > 0 ? { phrases } : {}),
      ...(typeof limit === 'number' && limit > 0 ? { limit } : {}),
    }),
  })
  if (!response.ok) {
    throw new Error(`Eval probe failed: ${response.status} ${await response.text()}`)
  }
  return (await response.json()) as ProbeResponse
}

function findPhraseInCandidates(
  phrase: string,
  candidates: ProbeCandidate[],
  family: UserWorkRetrievalFamily,
): UserWorkRetrievalPhraseHit | null {
  for (const candidate of candidates) {
    const haystack = `${candidate.title}\n${candidate.snippet}\n${candidate.content}`
    if (phraseAppearsInText(haystack, phrase)) {
      return {
        phrase,
        family,
        sourceTitle: candidate.source_title ?? candidate.title,
        snippet: snippetExcerpt(haystack, phrase),
      }
    }
  }
  return null
}

function locatePhrase(phrase: string, probe: ProbeResponse): UserWorkRetrievalPhraseHit | null {
  for (const family of ['user', 'agent', 'customer', 'company'] as const) {
    const familyResult = probe.perFamily[family]
    if (!familyResult) continue
    const hit = findPhraseInCandidates(phrase, familyResult.candidates, family)
    if (hit) return hit
  }
  if (probe.preloadText && phraseAppearsInText(probe.preloadText, phrase)) {
    return {
      phrase,
      family: 'preload',
      sourceTitle: null,
      snippet: snippetExcerpt(probe.preloadText, phrase),
    }
  }
  return null
}

const ABSTENTION_PATTERNS = [
  "don't know",
  'do not know',
  'not enough',
  'insufficient',
  "can't confirm",
  'cannot confirm',
  'need more',
  'unclear from',
  'not in the brain',
  'not available in',
  'unable to confirm',
  'cannot determine',
  'do not have enough',
  "don't have enough",
]

function hasAbstentionSignal(answer: string): boolean {
  const normalized = answer.toLowerCase().replace(/\s+/g, ' ').trim()
  return ABSTENTION_PATTERNS.some((pattern) => normalized.includes(pattern))
}

export function buildUnavailableProbeResult(_reason: string): UserWorkRetrievalProbeResult {
  const laneCounts = Object.fromEntries(FAMILIES.map((family) => [family, 0])) as Record<
    UserWorkRetrievalFamily,
    number
  >
  return {
    passed: true,
    preloadTextLength: 0,
    phrases: [],
    preloadFound: [],
    preloadMissing: [],
    preloadMissingInBrain: [],
    preloadMissingNotInBrain: [],
    forbiddenInPreload: [],
    laneCounts,
    abstentionFailed: false,
    retrievalRecall: 1,
    brainCoverage: 1,
    probeLatencyMs: 0,
    failureReasons: [],
    probeAvailable: false,
    groundTruthAvailable: false,
  }
}

export function evaluateProbe(input: {
  evalCase: UserWorkEvalCase
  finalAnswer: string
  probe: ProbeResponse
}): UserWorkRetrievalProbeResult {
  const { evalCase, finalAnswer, probe } = input
  const groundTruthAvailable = !!probe.groundTruth
  const laneCounts = Object.fromEntries(FAMILIES.map((family) => [family, 0])) as Record<
    UserWorkRetrievalFamily,
    number
  >
  for (const family of ['user', 'agent', 'customer', 'company'] as const) {
    const fam = probe.perFamily[family]
    laneCounts[family] = fam?.count ?? 0
  }
  laneCounts.preload = probe.preloadTextLength > 0 ? 1 : 0

  const phrases: UserWorkPhraseClassification[] = []
  const preloadFound: UserWorkRetrievalPhraseHit[] = []
  const preloadMissing: string[] = []
  const preloadMissingInBrain: string[] = []
  const preloadMissingNotInBrain: string[] = []

  for (const phrase of evalCase.requiredContext) {
    const hit = locatePhrase(phrase, probe)
    if (hit) {
      preloadFound.push(hit)
      phrases.push({
        phrase,
        location: 'retrieved',
        family: hit.family,
        sourceTitle: hit.sourceTitle,
        snippet: hit.snippet,
      })
      continue
    }
    preloadMissing.push(phrase)
    const gt = probe.groundTruth?.[phrase]
    if (groundTruthAvailable && gt && gt.total > 0) {
      preloadMissingInBrain.push(phrase)
      phrases.push({
        phrase,
        location: 'in_brain_but_missed',
        inBrainCount: gt.total,
        inMemories: gt.in_memories,
        inCortex: gt.in_cortex,
        inPages: gt.in_pages,
      })
    } else {
      preloadMissingNotInBrain.push(phrase)
      phrases.push({
        phrase,
        location: 'not_in_brain',
        inBrainCount: 0,
        inMemories: gt?.in_memories ?? 0,
        inCortex: gt?.in_cortex ?? 0,
        inPages: gt?.in_pages ?? 0,
      })
    }
  }

  const forbiddenInPreload: UserWorkRetrievalPhraseHit[] = []
  for (const phrase of evalCase.forbiddenClaims) {
    const hit = locatePhrase(phrase, probe)
    if (hit) forbiddenInPreload.push(hit)
  }

  const abstentionFailed = !evalCase.expectedContextSufficient && !hasAbstentionSignal(finalAnswer)

  const totalRequired = evalCase.requiredContext.length
  const retrievedCount = preloadFound.length
  const inBrainCount = retrievedCount + preloadMissingInBrain.length

  const retrievalRecall =
    totalRequired === 0
      ? 1
      : groundTruthAvailable && inBrainCount > 0
        ? retrievedCount / inBrainCount
        : retrievedCount / totalRequired
  const brainCoverage =
    totalRequired === 0
      ? 1
      : groundTruthAvailable
        ? inBrainCount / totalRequired
        : retrievedCount / totalRequired

  const failureReasons: string[] = []
  if (preloadMissingInBrain.length > 0) {
    failureReasons.push(
      `Required phrase(s) IN BRAIN but not retrieved (recall miss): ${preloadMissingInBrain.join(', ')}`,
    )
  }
  if (preloadMissingNotInBrain.length > 0) {
    failureReasons.push(
      `Required phrase(s) NOT IN BRAIN (seed/fixture issue): ${preloadMissingNotInBrain.join(', ')}`,
    )
  }

  return {
    passed: preloadMissing.length === 0,
    preloadTextLength: probe.preloadTextLength,
    phrases,
    preloadFound,
    preloadMissing,
    preloadMissingInBrain,
    preloadMissingNotInBrain,
    forbiddenInPreload,
    laneCounts,
    abstentionFailed,
    retrievalRecall,
    brainCoverage,
    probeLatencyMs: probe.latencyMs,
    failureReasons,
    probeAvailable: true,
    groundTruthAvailable,
  }
}
