/** Eligible calendar events for pre-call prep (shared by job + tests). */

export type PrecallAgendaEventLike = {
  id: string
  title: string
  start: string
  end: string
  all_day: boolean
  video_url: string | null
  attendees: Array<{ email?: string | null; name?: string | null }>
}

const MIN_DURATION_MS = 15 * 60 * 1000

export function isEligiblePrecallEvent(event: PrecallAgendaEventLike): boolean {
  if (event.all_day) return false
  const start = new Date(event.start).getTime()
  const end = new Date(event.end).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false
  if (end - start < MIN_DURATION_MS) return false
  const hasOtherAttendee = event.attendees.some((a) => Boolean(a.email?.trim() || a.name?.trim()))
  const hasVideo = Boolean(event.video_url?.trim())
  return hasOtherAttendee || hasVideo
}

/**
 * Local calendar day bounds for a timezone.
 * Uses the Intl offset at noon on that local day to avoid DST edge ambiguity.
 */
export function localDayBounds(
  now: Date,
  timeZone: string,
): { startIso: string; endIso: string; dayKey: string } {
  const dayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const noonUtcGuess = new Date(`${dayKey}T12:00:00.000Z`)
  const offsetMs = localOffsetMsAt(noonUtcGuess, timeZone)
  const start = new Date(new Date(`${dayKey}T00:00:00.000Z`).getTime() - offsetMs)
  const end = new Date(new Date(`${dayKey}T23:59:59.999Z`).getTime() - offsetMs)
  return { startIso: start.toISOString(), endIso: end.toISOString(), dayKey }
}

function localOffsetMsAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
  if (!match) return 0
  const sign = match[1] === '-' ? -1 : 1
  const hours = Number(match[2] ?? 0)
  const minutes = Number(match[3] ?? 0)
  return sign * (hours * 60 + minutes) * 60_000
}

export function buildPrecallPrompt(input: {
  event: PrecallAgendaEventLike
  relatedContext?: string
}): string {
  const attendees = input.event.attendees
    .map((a) => a.name?.trim() || a.email?.trim() || 'Unknown')
    .join(', ')
  return [
    'You are preparing the human for an upcoming meeting. Write a concise pre-call prep document.',
    'CRITICAL RULE: Always draft replies and emails. Never send Slack messages, emails, or DMs.',
    '',
    `Meeting: ${input.event.title}`,
    `When: ${input.event.start} → ${input.event.end}`,
    `Attendees: ${attendees || 'Unknown'}`,
    input.event.video_url ? `Join link: ${input.event.video_url}` : '',
    '',
    'Document sections (use these headings):',
    '1) Snapshot — who, purpose, timing',
    '2) What we accomplished — prior progress / open loops with these people if known',
    '3) Suggested approach — how to run this call (goals, risks, asks)',
    '4) Talking points — bullets',
    '5) Open questions — what still needs an answer',
    '',
    input.relatedContext?.trim()
      ? `Related context from Meetings space:\n${input.relatedContext.trim()}`
      : 'No prior Meeting notes were attached. Use calendar details and general operating judgment.',
    '',
    'Keep it short and CEO-usable (1–2 screens).',
  ]
    .filter(Boolean)
    .join('\n')
}

export type AgendaPrepLink = {
  status: 'pending' | 'ready' | 'failed'
  space_item_id: string
  space_id: string
  title: string | null
}

export function mapPrepItemToAgendaLink(row: {
  id: string
  space_id: string
  title?: string | null
  custom_data?: Record<string, unknown> | null
}): AgendaPrepLink {
  const custom = row.custom_data ?? {}
  const raw = String(custom.prep_status ?? 'pending')
  const status: AgendaPrepLink['status'] =
    raw === 'ready' || raw === 'failed' || raw === 'pending' ? raw : 'pending'
  return {
    status,
    space_item_id: row.id,
    space_id: row.space_id,
    title: row.title ?? null,
  }
}

export type AgendaRelatedFollowUp = {
  id: string
  title: string
  status: string
}

export type AgendaRelatedCall = {
  space_id: string
  call_item_id: string
  title: string
  recording_url: string | null
  follow_ups: AgendaRelatedFollowUp[]
}

const RELATED_CALL_WINDOW_MS = 36 * 60 * 60 * 1000

/** Score how well a Fathom call row matches a calendar event (higher is better). */
export function scoreRelatedCallMatch(
  event: PrecallAgendaEventLike,
  call: {
    title?: string | null
    call_date?: string | null
    attendees?: unknown
  },
): number {
  const eventEmails = new Set(
    event.attendees
      .map((a) => a.email?.trim().toLowerCase())
      .filter((v): v is string => Boolean(v)),
  )
  const callAttendees = Array.isArray(call.attendees)
    ? call.attendees.map((a) => String(a).toLowerCase())
    : []
  let emailHits = 0
  for (const tag of callAttendees) {
    for (const email of eventEmails) {
      if (tag.includes(email) || email.includes(tag) || tag.includes(email.split('@')[0] ?? '')) {
        emailHits += 1
        break
      }
    }
  }
  if (eventEmails.size > 0 && emailHits === 0) return 0

  let score = emailHits * 10
  const callMs = call.call_date ? new Date(call.call_date).getTime() : NaN
  const eventMs = new Date(event.start).getTime()
  if (Number.isFinite(callMs) && Number.isFinite(eventMs)) {
    const delta = Math.abs(callMs - eventMs)
    if (delta > RELATED_CALL_WINDOW_MS) return 0
    score += Math.max(0, 20 - Math.floor(delta / (60 * 60 * 1000)))
  }

  const eventTitle = event.title.trim().toLowerCase()
  const callTitle = String(call.title ?? '')
    .trim()
    .toLowerCase()
  if (eventTitle && callTitle && (eventTitle.includes(callTitle) || callTitle.includes(eventTitle))) {
    score += 5
  }
  return score
}
