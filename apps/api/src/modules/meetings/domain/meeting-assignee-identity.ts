import type { FathomSourceAction } from '../providers/fathom-meeting-source'

export type MeetingAssigneeCandidate = {
  type: 'user' | 'contact'
  id: string
  name: string
  email: string | null
}

export type CanonicalMeetingAssignee = MeetingAssigneeCandidate | null

export function resolveMeetingActionAssignees(
  actions: FathomSourceAction[],
  candidates: MeetingAssigneeCandidate[],
): Map<string, CanonicalMeetingAssignee> {
  const result = new Map<string, CanonicalMeetingAssignee>()
  for (const action of actions) {
    result.set(action.sourceKey, resolveOne(action, candidates))
  }
  return result
}

function resolveOne(
  action: FathomSourceAction,
  candidates: MeetingAssigneeCandidate[],
): CanonicalMeetingAssignee {
  const email = normalizeEmail(action.assigneeEmail)
  if (email) {
    const emailMatches = candidates.filter((candidate) => normalizeEmail(candidate.email) === email)
    if (emailMatches.length === 1) return emailMatches[0]!
  }

  const sourceName = normalizeName(action.assigneeName)
  if (!sourceName) return null
  const nameMatches = candidates.filter((candidate) => {
    const candidateName = normalizeName(candidate.name)
    if (!candidateName) return false
    if (candidateName === sourceName) return true
    const sourceTokens = sourceName.split(' ')
    const candidateTokens = candidateName.split(' ')
    return (
      sourceTokens.length === 1 &&
      candidateTokens.length > 1 &&
      sourceTokens[0] === candidateTokens[0]
    )
  })
  return nameMatches.length === 1 ? nameMatches[0]! : null
}

function normalizeEmail(value: string | null): string {
  return value?.trim().toLowerCase() ?? ''
}

function normalizeName(value: string | null): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim() ?? ''
  )
}
