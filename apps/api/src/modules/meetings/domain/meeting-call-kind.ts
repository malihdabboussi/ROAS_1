/**
 * Canonical classification for scheduled and recorded meetings.
 *
 * The stored `private` id remains stable for existing data while the UI label
 * is "Personal", which is the user-facing meaning of the category.
 */

export type MeetingCallKind = 'private' | 'team' | 'executive' | 'client' | 'partner' | 'sales'

export const MEETING_CALL_KIND_OPTIONS: Array<{
  id: MeetingCallKind
  label: string
  color: string
}> = [
  { id: 'private', label: 'Personal', color: 'emerald' },
  { id: 'team', label: 'Internal Team', color: 'violet' },
  { id: 'executive', label: 'Executive', color: 'amber' },
  { id: 'client', label: 'Client', color: 'cyan' },
  { id: 'partner', label: 'Partner', color: 'blue' },
  { id: 'sales', label: 'Sales', color: 'orange' },
]

export type MeetingCallAttendee = {
  email?: string | null
  name?: string | null
  display_name?: string | null
  matched_speaker_display_name?: string | null
}

export type MeetingCallIdentity = {
  emails: string[]
  nameTokens: string[]
  internalDomains: string[]
}

export function isMeetingCallKind(value: unknown): value is MeetingCallKind {
  return MEETING_CALL_KIND_OPTIONS.some((option) => option.id === value)
}

export function shouldReplaceMeetingCallKind(customData: Record<string, unknown>): boolean {
  return !isMeetingCallKind(customData.call_kind) || customData.call_kind_source === 'automatic'
}

export function markManualMeetingCallKind(
  customData: Record<string, unknown>,
): Record<string, unknown> {
  return Object.prototype.hasOwnProperty.call(customData, 'call_kind')
    ? { ...customData, call_kind_source: 'manual' }
    : customData
}

export function buildMeetingCallIdentity(input: {
  email?: string | null
  fathomAliases?: string[] | null
  fullName?: string | null
  internalDomains?: string[] | null
  internalEmails?: string[] | null
}): MeetingCallIdentity {
  const emails = new Set<string>()
  const nameTokens = new Set<string>()
  const internalDomains = new Set<string>(
    ['roas.co', 'dylanvanas.com', ...(input.internalDomains ?? [])].map((domain) =>
      domain.trim().toLowerCase(),
    ),
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
  for (const raw of input.internalEmails ?? []) {
    const email = String(raw ?? '')
      .trim()
      .toLowerCase()
    const domain = email.split('@')[1]
    if (domain && !PUBLIC_EMAIL_DOMAINS.has(domain)) internalDomains.add(domain)
  }

  const fullName = String(input.fullName ?? '')
    .trim()
    .toLowerCase()
  if (fullName && fullName !== 'test' && fullName.length >= 2) {
    nameTokens.add(fullName)
    for (const part of fullName.split(/\s+/)) {
      if (part.length >= 2) nameTokens.add(part)
    }
  }

  if ([...emails].some((email) => email.includes('dylan'))) {
    nameTokens.add('dylan')
    nameTokens.add('dylan vanas')
  }

  return {
    emails: [...emails],
    nameTokens: [...nameTokens],
    internalDomains: [...internalDomains],
  }
}

export function resolveMeetingCallKind(input: {
  identity: MeetingCallIdentity
  recordedByEmail: string
  attendees: MeetingCallAttendee[]
  attendeeLabels: string[]
  titleHint?: string | null
  summary?: string | null
  hasConfirmedClient?: boolean
}): MeetingCallKind {
  const title = String(input.titleHint ?? '')
  const blob = `${title}\n${String(input.summary ?? '')}`
  const { external, known } = countExternalAttendees(input.attendees, input.identity)
  const mostlyExternal = known > 0 && external / known >= 0.5
  const ownerPresent = ownerOnCall(input)

  // A confirmed workspace mapping is stronger evidence than topic words in a
  // title. Existing clients commonly hold calls about sales, pricing, or
  // partnerships without the meeting becoming a prospect/vendor call.
  if (input.hasConfirmedClient) return 'client'

  // The title expresses the meeting's purpose more reliably than transcript
  // discussion. Client reviews routinely discuss sales and partnerships; those
  // words in the summary must not turn a client attendee into a prospect/vendor.
  if (SALES_RE.test(title) && external > 0) return 'sales'
  if (external > 0 && PARTNER_RE.test(title)) return 'partner'
  if (external > 0 && (CLIENT_RE.test(blob) || mostlyExternal)) return 'client'
  if (SALES_RE.test(blob) && external > 0) return 'sales'
  if (external > 0 && PARTNER_RE.test(blob)) return 'partner'
  if (EXECUTIVE_RE.test(blob)) return 'executive'
  // Team titles win over a one-speaker Fathom recording so a weekly team
  // review is not treated as a confidential personal call.
  if (external === 0 && isTeamMeetingTitle(title)) return 'team'
  // Incomplete calendar/Fathom participants must not silently turn a call into
  // Personal. Personal is reserved for an explicit personal/1:1 title.
  if (ownerPresent && isPersonalMeetingTitle(title)) return 'private'
  return 'team'
}

function labelMatchesIdentity(label: string, identity: MeetingCallIdentity): boolean {
  const normalized = label.trim().toLowerCase()
  if (!normalized) return false
  for (const token of identity.nameTokens) {
    if (!token) continue
    if (normalized === token) return true
    if (token.includes(' ') && normalized.includes(token)) return true
    if (!token.includes(' ')) {
      const expression = new RegExp(`(?:^|\\s)${escapeRegExp(token)}(?:\\s|$)`, 'i')
      if (expression.test(normalized)) return true
    }
  }
  return false
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isInternalEmail(email: string, identity: MeetingCallIdentity): boolean {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at < 0) return false
  const domain = normalized.slice(at + 1)
  return identity.internalDomains.some(
    (internalDomain) => domain === internalDomain || domain.endsWith(`.${internalDomain}`),
  )
}

function ownerOnCall(input: {
  identity: MeetingCallIdentity
  recordedByEmail: string
  attendees: MeetingCallAttendee[]
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

  return input.attendeeLabels.some((label) => labelMatchesIdentity(label, input.identity))
}

function countExternalAttendees(
  attendees: MeetingCallAttendee[],
  identity: MeetingCallIdentity,
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

const SALES_RE =
  /\b(sales|demo|discovery|pitch|prospect|pipeline|pricing|proposal|close|quota|ae\b|sdr\b|outbound|inbound lead)\b/i
const EXECUTIVE_RE =
  /\b(executive|board|leadership|offsite|strategy offsite|c[- ]?level|all[- ]?hands|investor|founder sync)\b/i
const PARTNER_RE = /\b(partner|partnership|vendor|agency|affiliate|integration)\b/i
const CLIENT_RE =
  /\b(client|customer|account|campaign|coaching|workshop|fulfillment|review|strategy session)\b/i
const PRIVATE_RE = /\b(private|personal|one[- ]?on[- ]?one|1[: -]?1|check[- ]?in)\b/i
const TEAM_TITLE_RE =
  /\b(weekly team|team weekly|team sync|team standup|team stand-up|team meeting|team call|team review|team huddle|standup|stand-up|launch calendar)\b/i
const TEAM_MEMBER_ONLY_RE = /\bteam members?\b/i

function isTeamMeetingTitle(title: string): boolean {
  if (TEAM_MEMBER_ONLY_RE.test(title) && !TEAM_TITLE_RE.test(title)) return false
  return TEAM_TITLE_RE.test(title) || /^\s*team\b/i.test(title)
}

function isPersonalMeetingTitle(title: string): boolean {
  return PRIVATE_RE.test(title)
}

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'yahoo.com',
])
