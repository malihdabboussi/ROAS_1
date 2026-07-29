/**
 * Classify Fathom calls for CEO Meetings:
 * private | team | executive | client | partner | sales
 */

import type { FathomAttendeeLike } from './fathom-meeting-item-enrichment'

export type CeoCallKind = 'private' | 'team' | 'executive' | 'client' | 'partner' | 'sales'

export const CEO_CALL_KIND_OPTIONS: Array<{ id: CeoCallKind; label: string; color: string }> = [
  { id: 'private', label: 'Private', color: 'emerald' },
  { id: 'team', label: 'Team', color: 'violet' },
  { id: 'executive', label: 'Executive', color: 'amber' },
  { id: 'client', label: 'Client', color: 'cyan' },
  { id: 'partner', label: 'Partner', color: 'blue' },
  { id: 'sales', label: 'Sales', color: 'orange' },
]

export type CeoCallIdentity = {
  emails: string[]
  /** Lowercased name tokens / phrases, e.g. "dylan", "dylan vanas" */
  nameTokens: string[]
  /** Org / internal email domains used to detect external attendees. */
  internalDomains: string[]
}

export function buildCeoCallIdentity(input: {
  email?: string | null
  fathomAliases?: string[] | null
  fullName?: string | null
  internalDomains?: string[] | null
}): CeoCallIdentity {
  const emails = new Set<string>()
  const nameTokens = new Set<string>()
  const internalDomains = new Set<string>(
    (input.internalDomains ?? ['roas.co', 'dylanvanas.com']).map((d) => d.trim().toLowerCase()),
  )

  const pushEmail = (raw: string | null | undefined) => {
    const email = String(raw ?? '')
      .trim()
      .toLowerCase()
    if (!email || !email.includes('@')) return
    emails.add(email)
    const domain = email.split('@')[1]
    if (domain && !PUBLIC_EMAIL_DOMAINS.has(domain)) internalDomains.add(domain)
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

  return {
    emails: [...emails],
    nameTokens: [...nameTokens],
    internalDomains: [...internalDomains],
  }
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

function isInternalEmail(email: string, identity: CeoCallIdentity): boolean {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at < 0) return false
  const domain = normalized.slice(at + 1)
  return identity.internalDomains.some((d) => domain === d || domain.endsWith(`.${d}`))
}

function ownerOnCall(input: {
  identity: CeoCallIdentity
  recordedByEmail: string
  attendees: FathomAttendeeLike[]
  attendeeLabels: string[]
}): boolean {
  const recorded = String(input.recordedByEmail ?? '')
    .trim()
    .toLowerCase()
  if (recorded && input.identity.emails.includes(recorded)) return true

  for (const person of input.attendees) {
    const email = String(person.email ?? '')
      .trim()
      .toLowerCase()
    if (email && input.identity.emails.includes(email)) return true
    const label = String(
      person.name ?? person.display_name ?? person.matched_speaker_display_name ?? '',
    ).trim()
    if (label && labelMatchesIdentity(label, input.identity)) return true
  }

  for (const label of input.attendeeLabels) {
    if (labelMatchesIdentity(label, input.identity)) return true
  }

  return false
}

const SALES_RE =
  /\b(sales|demo|discovery|pitch|prospect|pipeline|pricing|proposal|close|quota|ae\b|sdr\b|outbound|inbound lead)\b/i
const EXECUTIVE_RE =
  /\b(executive|board|leadership|offsite|strategy offsite|c[- ]?level|all[- ]?hands|investor|founder sync)\b/i
const PARTNER_RE = /\b(partner|partnership|vendor|agency|affiliate|integration)\b/i
const CLIENT_RE =
  /\b(client|customer|account|campaign|coaching|workshop|fulfillment|review|strategy session)\b/i
const PRIVATE_RE = /\b(private|personal|one[- ]?on[- ]?one|1[: -]?1|check[- ]?in)\b/i
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'yahoo.com',
])

function countExternalAttendees(
  attendees: FathomAttendeeLike[],
  identity: CeoCallIdentity,
): { external: number; known: number } {
  let external = 0
  let known = 0
  for (const person of attendees) {
    const email = String(person.email ?? '')
      .trim()
      .toLowerCase()
    if (!email || !email.includes('@')) continue
    known += 1
    if (!isInternalEmail(email, identity)) external += 1
  }
  return { external, known }
}

export function resolveCeoCallKind(input: {
  identity: CeoCallIdentity
  recordedByEmail: string
  attendees: FathomAttendeeLike[]
  attendeeLabels: string[]
  titleHint?: string | null
  summary?: string | null
}): CeoCallKind {
  const blob = `${String(input.titleHint ?? '')}\n${String(input.summary ?? '')}`
  const { external, known } = countExternalAttendees(input.attendees, input.identity)
  const mostlyExternal = known > 0 && external / known >= 0.5
  const salesSignal = SALES_RE.test(blob)
  const executiveSignal = EXECUTIVE_RE.test(blob)
  const ownerPresent = ownerOnCall(input)
  const participantCount = Math.max(known, input.attendees.length, input.attendeeLabels.length)

  if (salesSignal && external > 0) return 'sales'
  if (external > 0 && PARTNER_RE.test(blob)) return 'partner'
  if (external > 0 && (CLIENT_RE.test(blob) || mostlyExternal)) return 'client'
  if (executiveSignal) return 'executive'
  if (ownerPresent && (participantCount <= 1 || PRIVATE_RE.test(blob))) return 'private'
  return 'team'
}
