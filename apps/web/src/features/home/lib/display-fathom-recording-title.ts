const GENERIC_FATHOM_TITLE_RE =
  /^(impromptu(?:\s+zoom)?(?:\s+meeting|\s+call)?|untitled(?:\s+meeting)?|zoom meeting|working session(?:\s*[—-].*)?|call \(naming…\))$/i

export type FathomRecordingTitleInput = {
  canonical_title?: string | null
  title?: string | null
  meeting_title?: string | null
  calendar_invitees?: Array<{ name?: string | null; email?: string | null } | null> | null
  recorded_by?: { name?: string | null } | null
}

export function isGenericFathomRecordingTitle(title: string): boolean {
  const trimmed = title.trim()
  return !trimmed || GENERIC_FATHOM_TITLE_RE.test(trimmed)
}

export function displayFathomRecordingTitle(meeting: FathomRecordingTitleInput): string {
  const canonical = String(meeting.canonical_title ?? '').trim()
  if (canonical) return canonical
  const raw = String(meeting.title || meeting.meeting_title || '').trim()
  if (raw && !isGenericFathomRecordingTitle(raw)) return raw

  const names = collectInviteeFirstNames(meeting)
  if (names.length >= 2) return `${names[0]} + ${names[1]}`
  if (names.length === 1) return `${names[0]} call`
  return raw || 'Untitled recording'
}

function collectInviteeFirstNames(meeting: FathomRecordingTitleInput): string[] {
  const names: string[] = []
  for (const invitee of meeting.calendar_invitees ?? []) {
    const first = firstName(invitee?.name) || firstNameFromEmail(invitee?.email)
    if (first) names.push(first)
  }
  if (names.length === 0) {
    const recordedBy = firstName(meeting.recorded_by?.name)
    if (recordedBy) names.push(recordedBy)
  }
  return [...new Set(names)].slice(0, 3)
}

function firstName(value: string | null | undefined): string | null {
  const token = String(value ?? '')
    .trim()
    .split(/\s+/)[0]
  return token || null
}

function firstNameFromEmail(value: string | null | undefined): string | null {
  const email = String(value ?? '').trim()
  if (!email.includes('@')) return null
  const local = email.split('@')[0] ?? ''
  const token = local.split(/[._-]/)[0]?.trim()
  if (!token) return null
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}
