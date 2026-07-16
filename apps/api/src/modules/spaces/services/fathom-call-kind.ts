/**
 * Classify Fathom calls as personal vs team for CEO Meetings.
 * Personal = space owner was on the call (host, invitee, or speaker label).
 */

import type { FathomAttendeeLike } from './fathom-meeting-item-enrichment'

export type CeoCallKind = 'personal' | 'team'

export type CeoCallIdentity = {
  emails: string[]
  /** Lowercased name tokens / phrases, e.g. "dylan", "dylan vanas" */
  nameTokens: string[]
}

export function buildCeoCallIdentity(input: {
  email?: string | null
  fathomAliases?: string[] | null
  fullName?: string | null
}): CeoCallIdentity {
  const emails = new Set<string>()
  const nameTokens = new Set<string>()

  const pushEmail = (raw: string | null | undefined) => {
    const email = String(raw ?? '')
      .trim()
      .toLowerCase()
    if (!email || !email.includes('@')) return
    emails.add(email)
    const local = email.split('@')[0]?.replace(/[._+]/g, ' ').trim()
    if (
      local &&
      local.length >= 2 &&
      !/^(test|admin|info|hello|contact|support|user)$/i.test(local)
    ) {
      nameTokens.add(local)
    }
  }

  pushEmail(input.email)
  for (const alias of input.fathomAliases ?? []) pushEmail(alias)

  const fullName = String(input.fullName ?? '')
    .trim()
    .toLowerCase()
  if (fullName && fullName !== 'test' && fullName.length >= 2) {
    nameTokens.add(fullName)
    for (const part of fullName.split(/\s+/)) {
      if (part.length >= 2) nameTokens.add(part)
    }
  }

  // Stable CEO OS markers when profile name is a placeholder.
  if ([...emails].some((e) => e.includes('dylan'))) {
    nameTokens.add('dylan')
    nameTokens.add('dylan vanas')
  }

  return { emails: [...emails], nameTokens: [...nameTokens] }
}

function labelMatchesIdentity(label: string, identity: CeoCallIdentity): boolean {
  const normalized = label.trim().toLowerCase()
  if (!normalized) return false
  for (const token of identity.nameTokens) {
    if (!token) continue
    if (normalized === token) return true
    if (token.includes(' ') && normalized.includes(token)) return true
    // Single-token first-name match only when it's a distinct word.
    if (!token.includes(' ')) {
      const re = new RegExp(`(?:^|\\s)${escapeRegExp(token)}(?:\\s|$)`, 'i')
      if (re.test(normalized)) return true
    }
  }
  return false
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function resolveCeoCallKind(input: {
  identity: CeoCallIdentity
  recordedByEmail: string
  attendees: FathomAttendeeLike[]
  attendeeLabels: string[]
}): CeoCallKind {
  const recorded = String(input.recordedByEmail ?? '')
    .trim()
    .toLowerCase()
  if (recorded && input.identity.emails.includes(recorded)) return 'personal'

  for (const person of input.attendees) {
    const email = String(person.email ?? '')
      .trim()
      .toLowerCase()
    if (email && input.identity.emails.includes(email)) return 'personal'
    const label = String(
      person.name ?? person.display_name ?? person.matched_speaker_display_name ?? '',
    ).trim()
    if (label && labelMatchesIdentity(label, input.identity)) return 'personal'
  }

  for (const label of input.attendeeLabels) {
    if (labelMatchesIdentity(label, input.identity)) return 'personal'
  }

  return 'team'
}
