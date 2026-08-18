export type RelatedCallCandidate = {
  id: string
  title: string
  callDate: string | null
  callStatus: string | null
  recordingUrl: string | null
  clientCampaign: string | null
  participantEmails: string[]
}

export type RelatedCallMatch = RelatedCallCandidate & { score: number }

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
])

export function scoreRelatedCall(input: {
  current: RelatedCallCandidate
  candidate: RelatedCallCandidate
}): number {
  if (input.current.id === input.candidate.id) return 0
  let score = 0
  const currentClient = text(input.current.clientCampaign)
  const candidateClient = text(input.candidate.clientCampaign)
  if (currentClient && candidateClient && currentClient === candidateClient) score += 100

  const overlap = overlappingEmails(
    input.current.participantEmails,
    input.candidate.participantEmails,
  )
  if (overlap >= 2) score += 50
  else if (overlap === 1) score += 25

  if (
    titleTokens(input.current.title).some((token) =>
      titleTokens(input.candidate.title).includes(token),
    )
  ) {
    score += 20
  }

  if (input.candidate.recordingUrl) score += 15
  if (input.candidate.callStatus === 'completed') score += 10
  return score
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
    clientCampaign: text(custom.client_campaign),
    participantEmails: emails,
  }
}

function overlappingEmails(left: string[], right: string[]): number {
  const rightSet = new Set(right.map((email) => email.trim().toLowerCase()).filter(Boolean))
  return left.filter((email) => rightSet.has(email.trim().toLowerCase())).length
}

function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !TITLE_STOP.has(token))
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
