export type NextMoveViewer = {
  userId: string
  emails: string[]
  names: string[]
  teammateEmails: string[]
  teammateNames: string[]
}

const INTERNAL_DOMAINS = new Set(['roas.co', 'dylanvanas.com'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function buildNextMoveViewer(input: {
  userId: string
  email?: string | null
  fullName?: string | null
  aliases?: unknown
  teammates?: Array<{ email?: string | null; fullName?: string | null }>
}): NextMoveViewer {
  const aliases = Array.isArray(input.aliases) ? input.aliases : []
  const emails = uniqueEmails([input.email, ...aliases])
  const names = uniqueNames([
    input.fullName,
    ...aliases.filter((alias) => !String(alias ?? '').includes('@')),
  ])
  const viewerEmails = emailSet(emails)
  const viewerNames = nameSet(names)
  const teammates = input.teammates ?? []
  const teammateEmails = uniqueEmails(teammates.map((row) => row.email)).filter(
    (email) => !viewerEmails.has(email),
  )
  const teammateNames = uniqueNames(teammates.map((row) => row.fullName)).filter(
    (name) => !namesOverlap(name, viewerNames),
  )
  return { userId: input.userId, emails, names, teammateEmails, teammateNames }
}

export function mergeMeetingAudienceData(
  meetingCustom: Record<string, unknown>,
  recordingEmails: string[],
): Record<string, unknown> {
  return {
    ...meetingCustom,
    participant_emails: uniqueEmails([
      ...(Array.isArray(meetingCustom.participant_emails) ? meetingCustom.participant_emails : []),
      ...recordingEmails,
    ]),
  }
}

export function isNextMoveForViewer(
  followUp: Record<string, unknown>,
  meetingCustom: Record<string, unknown>,
  viewer: NextMoveViewer,
): boolean {
  if (isAssignedToViewer(followUp, viewer)) return true
  if (isAssignedToSomeoneElse(followUp, viewer)) return false
  return didViewerAttendMeeting(meetingCustom, viewer)
}

export function isAssignedToViewer(
  followUp: Record<string, unknown>,
  viewer: NextMoveViewer,
): boolean {
  const viewerEmails = emailSet(viewer.emails)
  const viewerNames = nameSet(viewer.names)

  if (humanAssigneeIds(followUp).includes(viewer.userId)) return true
  if (followUpEmails(followUp).some((email) => viewerEmails.has(email))) return true
  if (followUpNames(followUp).some((name) => namesOverlap(name, viewerNames))) return true
  return false
}

export function didViewerAttendMeeting(
  meetingCustom: Record<string, unknown>,
  viewer: NextMoveViewer,
): boolean {
  const people = collectMeetingPeople(meetingCustom)
  const viewerEmails = emailSet(viewer.emails)
  const viewerNames = nameSet(viewer.names)
  if (people.emails.some((email) => viewerEmails.has(email))) return true
  return people.labels.some((label) => namesOverlap(normalizeName(label), viewerNames))
}

function isAssignedToSomeoneElse(
  followUp: Record<string, unknown>,
  viewer: NextMoveViewer,
): boolean {
  const assignedIds = humanAssigneeIds(followUp)
  if (assignedIds.some((id) => id !== viewer.userId) && !assignedIds.includes(viewer.userId)) {
    return true
  }

  const emails = followUpEmails(followUp)
  const viewerEmails = emailSet(viewer.emails)
  const teammateEmails = emailSet(viewer.teammateEmails)
  if (
    emails.some(
      (email) =>
        !viewerEmails.has(email) &&
        (teammateEmails.has(email) || isInternalAssigneeEmail(email, viewer)),
    )
  ) {
    return true
  }

  const names = followUpNames(followUp)
  const viewerNames = nameSet(viewer.names)
  const teammateNames = nameSet(viewer.teammateNames)
  return names.some((name) => namesOverlap(name, teammateNames) && !namesOverlap(name, viewerNames))
}

function humanAssigneeIds(followUp: Record<string, unknown>): string[] {
  const ids = new Set<string>()
  if (String(followUp.assignee_type ?? '') === 'human') {
    const id = String(followUp.assignee_id ?? '').trim()
    if (id) ids.add(id)
  }
  const assignees = Array.isArray(followUp.assignees) ? followUp.assignees : []
  for (const raw of assignees) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const entry = raw as Record<string, unknown>
    if (String(entry.type ?? '') !== 'human') continue
    const id = String(entry.id ?? '').trim()
    if (id) ids.add(id)
  }
  return [...ids]
}

function followUpEmails(followUp: Record<string, unknown>): string[] {
  const custom = asRecord(followUp.custom_data)
  return uniqueEmails([
    followUp.assignee_email,
    custom.suggested_assignee_email,
    custom.assignee_email,
  ])
}

function followUpNames(followUp: Record<string, unknown>): string[] {
  const custom = asRecord(followUp.custom_data)
  return uniqueNames([followUp.assignee_name, custom.suggested_assignee_name, custom.assignee_name])
}

function collectMeetingPeople(custom: Record<string, unknown>): {
  emails: string[]
  labels: string[]
} {
  const emails = new Set<string>()
  const labels = new Set<string>()
  const push = (value: unknown) => {
    for (const email of uniqueEmails([value])) emails.add(email)
    for (const label of labelsFromUnknown(value)) labels.add(label)
  }

  for (const key of ['participant_emails', 'attendees', 'calendar_invitees', 'invitees']) {
    const value = custom[key]
    if (Array.isArray(value)) value.forEach(push)
    else push(value)
  }

  push(custom.recorded_by)
  push(custom.recorded_by_email)
  const external = asRecord(custom.external_automation)
  push(external.recorded_by_email)
  push(external.recorded_by)

  const remaps = asRecord(custom.speaker_remaps)
  for (const value of Object.values(remaps)) push(value)

  return { emails: [...emails], labels: [...labels] }
}

function labelsFromUnknown(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed.includes('@') || UUID_RE.test(trimmed)) return []
    return [decodeAttendeeToken(trimmed)]
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const record = value as Record<string, unknown>
  const label = String(
    record.name ?? record.display_name ?? record.matched_speaker_display_name ?? record.label ?? '',
  ).trim()
  return label && !UUID_RE.test(label) ? [label] : []
}

function decodeAttendeeToken(value: string): string {
  const slug = value.startsWith('att_') ? value.slice(4) : value
  return slug.replace(/_/g, ' ')
}

function isInternalAssigneeEmail(email: string, viewer: NextMoveViewer): boolean {
  const domain = email.split('@')[1] ?? ''
  if (!domain) return false
  if (INTERNAL_DOMAINS.has(domain)) return true
  return viewer.emails.some((viewerEmail) => viewerEmail.split('@')[1] === domain)
}

function namesOverlap(candidate: string, viewerNames: Set<string>): boolean {
  if (!candidate) return false
  if (viewerNames.has(candidate)) return true
  for (const viewerName of viewerNames) {
    if (viewerName.startsWith(`${candidate} `) || candidate.startsWith(`${viewerName} `)) {
      return true
    }
  }
  return false
}

function emailSet(values: string[]): Set<string> {
  return new Set(uniqueEmails(values))
}

function nameSet(values: string[]): Set<string> {
  return new Set(uniqueNames(values))
}

function uniqueEmails(values: unknown[]): string[] {
  const emails = new Set<string>()
  for (const value of values) {
    if (typeof value === 'string') {
      const email = value.trim().toLowerCase()
      if (email.includes('@')) emails.add(email)
      continue
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const record = value as Record<string, unknown>
    const email = String(record.email ?? record.mail ?? record.address ?? '')
      .trim()
      .toLowerCase()
    if (email.includes('@')) emails.add(email)
  }
  return [...emails]
}

function uniqueNames(values: unknown[]): string[] {
  const names = new Set<string>()
  for (const value of values) {
    const name = normalizeName(String(value ?? ''))
    if (name) names.add(name)
  }
  return [...names]
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
