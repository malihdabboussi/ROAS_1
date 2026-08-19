export type RelatedCallCandidate = {
  id: string
  title: string
  callDate: string | null
  callStatus: string | null
  recordingUrl: string | null
  clientCampaign: unknown
  participantEmails: string[]
}

export type RelatedCallMatch = RelatedCallCandidate & { score: number }

export type RelatedCallIdentity = {
  clientId: string | null
  campaignId: string | null
  labelKey: string | null
}

const TITLE_STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'x',
  'with',
  'call',
  'meeting',
  'weekly',
  'strategy',
  'growth',
  'session',
  'review',
  'webinar',
  'client',
  'team',
  'process',
  'launch',
  'content',
  'budget',
  'offer',
  'masterclass',
  'monitoring',
  'response',
  'sync',
  'standup',
  'check',
  'debrief',
  'planning',
  'update',
  'catch',
  'discussion',
  'notes',
  'recap',
  'ad',
  'ads',
])

export function relatedCallIdentity(value: unknown): RelatedCallIdentity {
  if (typeof value === 'string' && value.trim()) {
    return { clientId: null, campaignId: null, labelKey: value.trim().toLowerCase() }
  }
  const row = record(value)
  const clientId = text(row.client_id)?.toLowerCase() ?? null
  const campaignId = text(row.campaign_id)?.toLowerCase() ?? null
  const clientName = text(row.client_name)?.toLowerCase() ?? null
  const campaignName = text(row.campaign_name)?.toLowerCase() ?? null
  const labelKey =
    [clientName, campaignName].filter(Boolean).join(':') || campaignName || clientName || null
  return { clientId, campaignId, labelKey }
}

export function sameRelatedCallClient(
  left: RelatedCallIdentity,
  right: RelatedCallIdentity,
): boolean {
  if (left.clientId && right.clientId) return left.clientId === right.clientId
  if (left.campaignId && right.campaignId) return left.campaignId === right.campaignId
  if (left.labelKey && right.labelKey) return left.labelKey === right.labelKey
  return false
}

export function isMappedRelatedCall(identity: RelatedCallIdentity): boolean {
  return Boolean(identity.clientId || identity.campaignId || identity.labelKey)
}

export function scoreRelatedCall(input: {
  current: RelatedCallCandidate
  candidate: RelatedCallCandidate
}): number {
  if (!isRelatedCall(input.current, input.candidate)) return 0
  let score = 0
  const currentClient = relatedCallIdentity(input.current.clientCampaign)
  const candidateClient = relatedCallIdentity(input.candidate.clientCampaign)
  if (sameRelatedCallClient(currentClient, candidateClient)) {
    score +=
      currentClient.campaignId &&
      candidateClient.campaignId &&
      currentClient.campaignId === candidateClient.campaignId
        ? 100
        : 80
  }

  const overlap = overlappingEmails(
    input.current.participantEmails,
    input.candidate.participantEmails,
  )
  if (overlap >= 2) score += 50
  else if (overlap === 1) score += 25

  if (distinctiveTitleOverlap(input.current.title, input.candidate.title) > 0) score += 20
  if (input.candidate.recordingUrl) score += 15
  if (input.candidate.callStatus === 'completed') score += 10
  return score
}

export function isRelatedCall(current: RelatedCallCandidate, candidate: RelatedCallCandidate) {
  if (current.id === candidate.id) return false
  const currentClient = relatedCallIdentity(current.clientCampaign)
  const candidateClient = relatedCallIdentity(candidate.clientCampaign)
  if (
    isMappedRelatedCall(currentClient) &&
    isMappedRelatedCall(candidateClient) &&
    !sameRelatedCallClient(currentClient, candidateClient)
  ) {
    return false
  }
  if (sameRelatedCallClient(currentClient, candidateClient)) return true
  return (
    overlappingEmails(current.participantEmails, candidate.participantEmails) >= 2 ||
    distinctiveTitleOverlap(current.title, candidate.title) > 0
  )
}

export function rankRelatedCalls(
  current: RelatedCallCandidate,
  candidates: RelatedCallCandidate[],
  limit = 8,
): RelatedCallMatch[] {
  return candidates
    .map((candidate) => ({ ...candidate, score: scoreRelatedCall({ current, candidate }) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return (right.callDate ?? '').localeCompare(left.callDate ?? '')
    })
    .slice(0, limit)
}

export function relatedCallCandidateFromItem(item: Record<string, unknown>): RelatedCallCandidate {
  const custom = record(item.custom_data)
  const emails = Array.isArray(custom.participant_emails)
    ? custom.participant_emails.map((email) => String(email).trim().toLowerCase()).filter(Boolean)
    : []
  return {
    id: String(item.id ?? ''),
    title: String(item.title ?? ''),
    callDate: text(custom.call_date),
    callStatus: text(custom.call_status),
    recordingUrl: text(custom.recording_url) ?? text(custom.fathom_url),
    clientCampaign: custom.client_campaign ?? null,
    participantEmails: emails,
  }
}

function overlappingEmails(left: string[], right: string[]): number {
  const rightSet = new Set(right.map((email) => email.trim().toLowerCase()).filter(Boolean))
  return left.filter((email) => rightSet.has(email.trim().toLowerCase())).length
}

function distinctiveTitleOverlap(leftTitle: string, rightTitle: string): number {
  const right = new Set(distinctiveTitleTokens(rightTitle))
  return distinctiveTitleTokens(leftTitle).filter((token) => right.has(token)).length
}

function distinctiveTitleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !TITLE_STOP.has(token))
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
