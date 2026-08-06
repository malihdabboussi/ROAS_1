import { createHash } from 'node:crypto'
import { channelLabel, firstNameFromDisplay } from './slack-team-signal-message'

export type PersonalMomentEventType =
  | 'birthday'
  | 'work_anniversary'
  | 'promotion'
  | 'personal_milestone'
  | 'team_recognition'
  | 'cultural_moment'

export type PersonalMomentEvidenceMessage = {
  channel_id: string
  channel_name: string
  ts: string
  user: string
  text: string
}

export type PersonalMomentSignalLike = {
  kind: string
  target_slack_user_id: string | null
  target_channel_id: string
  source_message_ts: string
  proposed_content: string
  rationale: string
  confidence: number
  moment_event_type?: string | null
  evidence_message_tss?: string[] | null
}

export type PersonalMomentValidationResult =
  | {
      ok: true
      eventType: PersonalMomentEventType
      subjectSlackUserId: string
      evidence: PersonalMomentEvidenceMessage[]
      confidence: number
      ambiguous: false
    }
  | {
      ok: false
      reason: string
      ambiguous?: boolean
    }

const EVENT_TYPES: PersonalMomentEventType[] = [
  'birthday',
  'work_anniversary',
  'promotion',
  'personal_milestone',
  'team_recognition',
  'cultural_moment',
]

const EVENT_PATTERNS: Record<PersonalMomentEventType, RegExp> = {
  birthday: /\b(happy\s+birthday|hbd\b|birthday\s+wishes|born\s+day)\b/i,
  work_anniversary:
    /\b(work\s+anniversary|years?\s+at\s+(the\s+)?(company|team)|anniversary\s+at)\b/i,
  promotion:
    /\b(congrats|congratulations).{0,40}\b(promo(tion)?|promoted|new\s+role|new\s+title)\b/i,
  personal_milestone:
    /\b(congrats|congratulations|huge\s+news|just\s+(got|had)|welcomed|married|graduated)\b/i,
  team_recognition:
    /\b(shout\s*out|kudos|props\s+to|huge\s+win\s+for|recogniz(e|ing)|thank\s+you\s+to)\b/i,
  cultural_moment:
    /\b(team\s+tradition|culture|all\s+hands\s+moment|this\s+is\s+why\s+i\s+love)\b/i,
}

const VAGUE_ONLY = /\b(have\s+a\s+great\s+day|hope\s+you('re|\s+are)\s+well|good\s+vibes)\b/i
const UNAMBIGUOUS_BIRTHDAY = /\bhappy\s+birthday\b/i

export const PERSONAL_MOMENT_COOLING_MINUTES = 8

export function isPersonalMomentEventType(value: unknown): value is PersonalMomentEventType {
  return typeof value === 'string' && (EVENT_TYPES as string[]).includes(value)
}

export function personalMomentDateKey(now = new Date(), timeZone = 'America/Los_Angeles'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function personalMomentDedupeKey(input: {
  orgId: string
  subjectSlackUserId: string
  eventType: PersonalMomentEventType
  dateKey: string
}): string {
  return createHash('sha256')
    .update(
      [
        input.orgId,
        'personal_moment',
        input.eventType,
        input.subjectSlackUserId,
        input.dateKey,
      ].join(':'),
    )
    .digest('hex')
}

function detectEventTypes(text: string): PersonalMomentEventType[] {
  return EVENT_TYPES.filter((type) => EVENT_PATTERNS[type].test(text))
}

function messageMentionsSubject(
  text: string,
  subjectSlackUserId: string,
  subjectNames: string[],
): boolean {
  if (text.includes(`<@${subjectSlackUserId}>`)) return true
  const lower = text.toLowerCase()
  return subjectNames.some((name) => name.length >= 2 && lower.includes(name.toLowerCase()))
}

function isIndependentEvidence(message: PersonalMomentEvidenceMessage): boolean {
  return Boolean(message.user) && message.user !== 'PIXEL_BOT' && message.text.trim().length > 0
}

/**
 * Deterministic gate for personal_moment signals.
 * Requires multiple independent public messages OR one unambiguous explicit source.
 * Suppresses vague well-wishes and conflicting subject/event evidence.
 */
export function validatePersonalMomentEvidence(input: {
  signal: PersonalMomentSignalLike
  messages: PersonalMomentEvidenceMessage[]
  subjectNames: string[]
  peopleBySlackId: Map<string, { display_name: string; relationship_kind: string }>
}): PersonalMomentValidationResult {
  if (input.signal.kind !== 'personal_moment') {
    return { ok: false, reason: 'not_personal_moment' }
  }
  const subjectSlackUserId = input.signal.target_slack_user_id?.trim()
  if (!subjectSlackUserId) {
    return { ok: false, reason: 'missing_subject', ambiguous: true }
  }
  const subject = input.peopleBySlackId.get(subjectSlackUserId)
  if (!subject || subject.relationship_kind !== 'internal') {
    return { ok: false, reason: 'subject_not_internal' }
  }

  const declaredType = isPersonalMomentEventType(input.signal.moment_event_type)
    ? input.signal.moment_event_type
    : null

  const candidateTs = new Set<string>([
    input.signal.source_message_ts,
    ...(Array.isArray(input.signal.evidence_message_tss)
      ? input.signal.evidence_message_tss.filter((ts): ts is string => typeof ts === 'string')
      : []),
  ])

  const channelMessages = input.messages.filter(
    (message) =>
      isIndependentEvidence(message) &&
      (message.channel_id === input.signal.target_channel_id || candidateTs.has(message.ts)),
  )

  const matching = channelMessages.filter((message) => {
    const types = detectEventTypes(message.text)
    if (types.length === 0) return false
    if (!messageMentionsSubject(message.text, subjectSlackUserId, input.subjectNames)) return false
    if (VAGUE_ONLY.test(message.text) && !types.some((type) => type !== 'personal_milestone')) {
      return UNAMBIGUOUS_BIRTHDAY.test(message.text)
    }
    return true
  })

  if (matching.length === 0) {
    return { ok: false, reason: 'no_explicit_evidence', ambiguous: true }
  }

  const typeVotes = new Map<PersonalMomentEventType, number>()
  const subjectVotes = new Map<string, number>()
  for (const message of matching) {
    for (const type of detectEventTypes(message.text)) {
      typeVotes.set(type, (typeVotes.get(type) ?? 0) + 1)
    }
    subjectVotes.set(subjectSlackUserId, (subjectVotes.get(subjectSlackUserId) ?? 0) + 1)
  }

  // Conflicting event types with comparable support → suppress.
  const rankedTypes = [...typeVotes.entries()].sort((left, right) => right[1] - left[1])
  if (
    rankedTypes.length >= 2 &&
    rankedTypes[0]![1] === rankedTypes[1]![1] &&
    rankedTypes[0]![0] !== rankedTypes[1]![0]
  ) {
    return { ok: false, reason: 'conflicting_event_types', ambiguous: true }
  }

  const eventType = declaredType && typeVotes.has(declaredType) ? declaredType : rankedTypes[0]![0]

  const uniqueSenders = new Set(matching.map((message) => message.user))
  const hasUnambiguousSingleton =
    matching.length === 1 &&
    (eventType === 'birthday'
      ? UNAMBIGUOUS_BIRTHDAY.test(matching[0]!.text)
      : detectEventTypes(matching[0]!.text).includes(eventType))

  if (uniqueSenders.size < 2 && !hasUnambiguousSingleton) {
    return { ok: false, reason: 'insufficient_independent_evidence', ambiguous: true }
  }

  // Prefer model-listed evidence order, then all matching.
  const orderedEvidence = [
    ...matching.filter((message) => candidateTs.has(message.ts)),
    ...matching.filter((message) => !candidateTs.has(message.ts)),
  ].filter(
    (message, index, all) => all.findIndex((candidate) => candidate.ts === message.ts) === index,
  )

  const confidence = Math.min(
    1,
    Math.max(
      input.signal.confidence,
      uniqueSenders.size >= 3 ? 0.95 : uniqueSenders.size >= 2 ? 0.9 : 0.85,
    ),
  )

  return {
    ok: true,
    eventType,
    subjectSlackUserId,
    evidence: orderedEvidence,
    confidence,
    ambiguous: false,
  }
}

export type PersonalMomentHistoryCandidate = {
  text: string
  score: number
  channelName?: string
  source?: 'recent_slack' | 'archive' | 'brain'
}

/**
 * Pick at most one historical connection that clearly improves the moment.
 * Never force a clever callback from weak or unrelated evidence.
 */
export function pickPersonalMomentHistoricalConnection(
  candidates: PersonalMomentHistoryCandidate[],
  options: { minScore?: number } = {},
): PersonalMomentHistoryCandidate | null {
  const minScore = options.minScore ?? 0.72
  const publicSafe = candidates.filter(
    (candidate) =>
      candidate.source !== 'brain' &&
      candidate.score >= minScore &&
      candidate.text.trim().length >= 24,
  )
  if (publicSafe.length === 0) return null
  publicSafe.sort((left, right) => right.score - left.score)
  const best = publicSafe[0]!
  const second = publicSafe[1]
  if (second && best.score - second.score < 0.08 && best.score < 0.9) {
    return null
  }
  return best
}

export function composePersonalMomentMessage(input: {
  recipientName?: string
  eventType: PersonalMomentEventType
  channelName: string
  finding: string
  historicalConnection?: string | null
}): string {
  const first = firstNameFromDisplay(input.recipientName || 'there')
  const channel = channelLabel(input.channelName)
  const finding = input.finding
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.?!]+/, '')
  const opener =
    input.eventType === 'birthday'
      ? `Happy birthday, ${first} 🎉`
      : input.eventType === 'work_anniversary'
        ? `Happy anniversary, ${first} 🎉`
        : input.eventType === 'promotion'
          ? `Congrats, ${first} 🎉`
          : `Hey ${first} 🎉`

  const bodyParts: string[] = []
  if (finding) {
    const startsWithName = new RegExp(`^${first}\\b`, 'i').test(finding)
    bodyParts.push(startsWithName ? finding : finding)
  } else {
    bodyParts.push(`The ${channel} thread is a pretty good reflection of the team around you.`)
  }
  if (input.historicalConnection?.trim()) {
    bodyParts.push(input.historicalConnection.trim())
  }

  const close =
    input.eventType === 'birthday' || input.eventType === 'work_anniversary'
      ? 'Enjoy the day. If anything needs picking up so you can actually log off, say the word.'
      : 'If it helps to draft a thank-you or capture this for the team, say the word.'

  return [opener, bodyParts.join(' '), close].join('\n\n')
}

export function scorePersonalMomentHistoryCandidate(input: {
  text: string
  subjectNames: string[]
  eventType: PersonalMomentEventType
  excludeTexts?: string[]
}): number {
  const text = input.text.trim()
  if (!text) return 0
  const lower = text.toLowerCase()
  if (
    (input.excludeTexts ?? []).some(
      (exclude) => exclude && lower.includes(exclude.toLowerCase().slice(0, 40)),
    )
  ) {
    return 0
  }
  let score = 0
  if (input.subjectNames.some((name) => name.length >= 2 && lower.includes(name.toLowerCase()))) {
    score += 0.35
  }
  if (EVENT_PATTERNS[input.eventType].test(text)) score += 0.15
  if (/https?:\/\/|ad|creative|campaign|launch|webinar|deck/i.test(text)) score += 0.25
  if (/remember|still holds|resurfaced|throwback|old\s+/i.test(text)) score += 0.25
  if (text.length > 280) score -= 0.1
  return Math.max(0, Math.min(1, score))
}

export function filterBrainDetailsFromSlackCopy(text: string): string {
  // Defensive: strip common private-memory phrasings if a model ever leaks them.
  return text
    .replace(/\b(private|confidential|off[- ]the[- ]record|1:1 notes?)\b[^.?!]*[.?!]?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
