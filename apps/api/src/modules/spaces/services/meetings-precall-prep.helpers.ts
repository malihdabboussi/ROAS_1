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

/** Inclusive local-day window centered on an event start (±padDays). */
export function localDayWindowAround(
  instant: Date,
  timeZone: string,
  padDays = 1,
): { startIso: string; endIso: string } {
  const center = localDayBounds(instant, timeZone)
  const start = new Date(new Date(center.startIso).getTime() - padDays * 86_400_000)
  const end = new Date(new Date(center.endIso).getTime() + padDays * 86_400_000)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

export type PrecallEventSnapshot = {
  title: string
  start: string
  end: string
  all_day: boolean
  video_url?: string | null
  location?: string | null
  attendees?: Array<{ email?: string | null; name?: string | null }>
}

export function eventFromPrecallSnapshot(
  calendarEventId: string,
  snapshot: PrecallEventSnapshot,
): PrecallAgendaEventLike {
  return {
    id: calendarEventId,
    title: snapshot.title.trim() || 'Untitled meeting',
    start: snapshot.start,
    end: snapshot.end,
    all_day: Boolean(snapshot.all_day),
    video_url: snapshot.video_url?.trim() || null,
    attendees: (snapshot.attendees ?? []).map((a) => ({
      email: a.email ?? null,
      name: a.name ?? null,
    })),
  }
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

export {
  buildPrecallPrompt,
  mapPrepItemToAgendaLink,
  matchUniqueClientByEventTitle,
  parsePrepDocToAgendaSections,
  type AgendaPrepLink,
} from './meetings-precall-agenda-sections'

export type AgendaRelatedFollowUp = {
  id: string
  title: string
  status: string
  assignee_id: string | null
  assignee_type: string | null
}

export type AgendaRelatedCall = {
  space_id: string
  call_item_id: string
  title: string
  /** Short meeting summary for the agenda detail modal (not a full transcript). */
  summary: string | null
  /** True when a full transcript can be loaded from the call item. */
  has_transcript: boolean
  recording_url: string | null
  follow_ups: AgendaRelatedFollowUp[]
}

const MAX_AGENDA_SUMMARY_CHARS = 600

/** Prefer recording_url, then fathom_url from call custom_data. */
export function resolveAgendaRecordingUrl(
  custom: Record<string, unknown> | null | undefined,
): string | null {
  for (const key of ['recording_url', 'fathom_url'] as const) {
    const raw = custom?.[key]
    if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) return raw.trim()
  }
  return null
}

/**
 * Prefer a short purpose summary. Avoid dumping full transcripts into the agenda modal.
 */
export function resolveAgendaCallSummary(input: {
  description?: string | null
  custom?: Record<string, unknown> | null
}): string | null {
  const customSummary = input.custom?.summary
  if (typeof customSummary === 'string' && customSummary.trim()) {
    return customSummary.trim().slice(0, MAX_AGENDA_SUMMARY_CHARS)
  }
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  if (!description) return null
  // Transcript dumps are long / multi-speaker; keep those out of the summary slot.
  if (description.length > 1800 || /\n\s*[A-Z][a-z]+:\s/.test(description.slice(0, 400))) {
    return null
  }
  return description.slice(0, MAX_AGENDA_SUMMARY_CHARS)
}

/** Detect whether the call item has a full transcript available for on-demand load. */
export function resolveAgendaHasTranscript(input: {
  description?: string | null
  custom?: Record<string, unknown> | null
}): boolean {
  const custom = input.custom ?? {}
  if (typeof custom.transcript_text === 'string' && custom.transcript_text.trim().length > 0) {
    return true
  }
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  if (!description) return false
  // Legacy rows stored the transcript in description when no summary existed.
  return description.length > 1800 || /\n\s*[A-Z][a-z]+:\s/.test(description.slice(0, 400))
}

/** Extract full transcript text from a loaded call space item (lazy modal load). */
export function extractCallTranscriptText(input: {
  description?: string | null
  custom_data?: Record<string, unknown> | null
}): string | null {
  const custom = input.custom_data ?? {}
  if (typeof custom.transcript_text === 'string' && custom.transcript_text.trim()) {
    return custom.transcript_text.trim()
  }
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  if (!description) return null
  if (description.length > 1800 || /\n\s*[A-Z][a-z]+:\s/.test(description.slice(0, 400))) {
    return description
  }
  return null
}

export function toAgendaFollowUp(row: {
  id: string
  title?: string | null
  status?: string | null
  assignee_id?: string | null
  assignee_type?: string | null
}): AgendaRelatedFollowUp {
  return {
    id: row.id,
    title: String(row.title ?? 'Untitled').slice(0, 200),
    status: String(row.status ?? ''),
    assignee_id: typeof row.assignee_id === 'string' ? row.assignee_id : null,
    assignee_type: typeof row.assignee_type === 'string' ? row.assignee_type : null,
  }
}

export function toAgendaRelatedCall(input: {
  call: {
    id: string
    space_id: string
    title?: string | null
    description?: string | null
    custom_data?: Record<string, unknown> | null
  }
  followUps: AgendaRelatedFollowUp[]
}): AgendaRelatedCall {
  const custom = input.call.custom_data ?? {}
  return {
    space_id: String(input.call.space_id),
    call_item_id: input.call.id,
    title: String(input.call.title ?? 'Call').slice(0, 200),
    summary: resolveAgendaCallSummary({ description: input.call.description, custom }),
    has_transcript: resolveAgendaHasTranscript({
      description: input.call.description,
      custom,
    }),
    recording_url: resolveAgendaRecordingUrl(custom),
    follow_ups: input.followUps,
  }
}

/** Pad around the calendar event when deciding whether a Fathom call_date overlaps. */
export const RELATED_CALL_TIME_PAD_MS = 45 * 60 * 1000
/** Maximum same-day shift accepted only when attendee and title signals agree. */
export const RELATED_CALL_RESCHEDULE_PAD_MS = 4 * 60 * 60 * 1000
/**
 * When title/attendee signals are weak (AI Fathom titles, missing emails), attach a call
 * only if exactly one calendar event starts within this window of call_date.
 */
export const RELATED_CALL_NEAR_START_MS = 10 * 60 * 1000
/** Minimum Jaccard title similarity when attendee overlap alone is weak. */
export const RELATED_CALL_TITLE_MIN = 0.4
/** Minimum score after hard gates (exclusive assigner also enforces this). */
export const MIN_RELATED_CALL_MATCH_SCORE = 20
export const FATHOM_AGENDA_SOURCE = 'fathom' as const
export const FATHOM_AGENDA_DURATION_MS = 30 * 60 * 1000

export function callDateInAgendaWindow(
  callDate: string | null | undefined,
  startIso: string,
  endIso: string,
): boolean {
  if (!callDate) return false
  const t = new Date(callDate).getTime()
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (!Number.isFinite(t) || !Number.isFinite(start) || !Number.isFinite(end)) return false
  return t >= start && t <= end
}

/** True when call_date falls inside the event window (± pad). */
export function callOverlapsEventWindow(
  callDate: string | null | undefined,
  eventStartIso: string,
  eventEndIso: string,
  padMs: number = RELATED_CALL_TIME_PAD_MS,
): boolean {
  if (!callDate) return false
  const t = new Date(callDate).getTime()
  const start = new Date(eventStartIso).getTime()
  const end = new Date(eventEndIso).getTime()
  if (!Number.isFinite(t) || !Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return false
  }
  return t >= start - padMs && t <= end + padMs
}

function normalizeAgendaTitleTokens(title: string): Set<string> {
  return new Set(
    String(title ?? '')
      .toLowerCase()
      .replace(/[/\\|x×•·–—_-]+/gi, ' ')
      .replace(/[^a-z0-9\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter((t) => t.length > 1),
  )
}

export function relatedCallTitleSimilarity(a: string, b: string): number {
  const left = normalizeAgendaTitleTokens(a)
  const right = normalizeAgendaTitleTokens(b)
  if (left.size === 0 || right.size === 0) return 0
  let inter = 0
  for (const token of left) {
    if (right.has(token)) inter += 1
  }
  return inter / (left.size + right.size - inter)
}

/** Fathom sometimes stores `att_dylan_dylanvanas_com` instead of a real email. */
export function emailFromAttendeeSlug(tag: string): string | null {
  const raw = String(tag ?? '')
    .trim()
    .toLowerCase()
  if (!raw.startsWith('att_')) return null
  const body = raw.slice(4)
  if (!body || body.startsWith('speaker_') || !body.includes('_')) return null
  const parts = body.split('_').filter(Boolean)
  if (parts.length < 2) return null
  const tld = parts[parts.length - 1]
  const domain = parts[parts.length - 2]
  const local = parts.slice(0, -2).join('.')
  if (!local || !domain || !tld || tld.length < 2) return null
  return `${local}@${domain}.${tld}`
}

function extractEmailsFromAttendeeTags(attendees: unknown): Set<string> {
  const emails = new Set<string>()
  if (!Array.isArray(attendees)) return emails
  for (const raw of attendees) {
    const tag = String(raw ?? '')
      .trim()
      .toLowerCase()
    if (!tag) continue
    const angled = tag.match(/<([^>]+@[^>]+)>/)
    if (angled?.[1]) {
      emails.add(angled[1].trim().toLowerCase())
      continue
    }
    const bare = tag.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
    if (bare?.[0]) {
      emails.add(bare[0].toLowerCase())
      continue
    }
    const fromSlug = emailFromAttendeeSlug(tag)
    if (fromSlug) emails.add(fromSlug)
  }
  return emails
}

function eventAttendeeEmails(event: PrecallAgendaEventLike): Set<string> {
  const emails = new Set<string>()
  for (const a of event.attendees) {
    const email = a.email?.trim().toLowerCase()
    if (email) emails.add(email)
  }
  return emails
}

/** Synthetic Agenda row for a Fathom call that did not match a calendar event. */
export function buildMeetingAgendaEvent(input: {
  spaceId: string
  callItemId: string
  title: string
  callDate: string
  source?: 'fathom' | 'manual'
  recordingUrl: string | null
  summary?: string | null
  hasTranscript?: boolean
  followUps?: AgendaRelatedCall['follow_ups']
}): {
  id: string
  title: string
  start: string
  end: string
  all_day: false
  location: null
  video_url: string | null
  video_label: string | null
  html_link: null
  color_id: null
  attendees: []
  source: typeof FATHOM_AGENDA_SOURCE | 'manual'
  account_label: 'Fathom' | 'Meetings'
  prep: null
  related: AgendaRelatedCall
} {
  const title = input.title.trim().slice(0, 200) || 'Call'
  const startMs = new Date(input.callDate).getTime()
  const end = Number.isFinite(startMs)
    ? new Date(startMs + FATHOM_AGENDA_DURATION_MS).toISOString()
    : input.callDate
  const source = input.source ?? FATHOM_AGENDA_SOURCE
  return {
    id: `${source === 'manual' ? 'meeting' : 'fathom'}:${input.callItemId}`,
    title,
    start: input.callDate,
    end,
    all_day: false,
    location: null,
    video_url: input.recordingUrl,
    video_label: input.recordingUrl && source === FATHOM_AGENDA_SOURCE ? 'Fathom' : null,
    html_link: null,
    color_id: null,
    attendees: [],
    source,
    account_label: source === 'manual' ? 'Meetings' : 'Fathom',
    prep: null,
    related: {
      space_id: input.spaceId,
      call_item_id: input.callItemId,
      title,
      summary: input.summary?.trim()
        ? input.summary.trim().slice(0, MAX_AGENDA_SUMMARY_CHARS)
        : null,
      has_transcript: Boolean(input.hasTranscript),
      recording_url: input.recordingUrl,
      follow_ups: input.followUps ?? [],
    },
  }
}

/**
 * Score how well a Fathom call row matches a calendar event (higher is better).
 * Hard gates: time overlap required; a single shared attendee alone is never enough
 * when the event lists 2+ emails; wrong titles do not match without strong attendees.
 */
export function scoreRelatedCallMatch(
  event: PrecallAgendaEventLike,
  call: {
    title?: string | null
    call_date?: string | null
    attendees?: unknown
  },
): number {
  const eventEmails = eventAttendeeEmails(event)
  const callEmails = extractEmailsFromAttendeeTags(call.attendees)
  let emailHits = 0
  for (const email of eventEmails) {
    if (callEmails.has(email)) emailHits += 1
  }

  const titleSim = relatedCallTitleSimilarity(event.title, String(call.title ?? ''))
  const overlapsScheduledWindow = callOverlapsEventWindow(call.call_date, event.start, event.end)
  const overlapsRescheduleWindow = callOverlapsEventWindow(
    call.call_date,
    event.start,
    event.end,
    RELATED_CALL_RESCHEDULE_PAD_MS,
  )
  const stronglyIdentifiedReschedule =
    overlapsRescheduleWindow &&
    ((emailHits >= 2 && titleSim >= 0.2) || (emailHits >= 1 && titleSim >= 0.55))
  if (!overlapsScheduledWindow && !stronglyIdentifiedReschedule) return 0

  // Shared organizer alone must not glue unrelated meetings together.
  if (eventEmails.size >= 2 && emailHits < 2 && titleSim < RELATED_CALL_TITLE_MIN) return 0
  if (eventEmails.size === 1 && emailHits === 0 && titleSim < 0.55) return 0
  if (eventEmails.size === 0 && titleSim < 0.55) return 0
  if (eventEmails.size > 0 && emailHits === 0 && titleSim < 0.55) return 0

  const callMs = call.call_date ? new Date(call.call_date).getTime() : NaN
  const eventStartMs = new Date(event.start).getTime()
  const eventEndMs = new Date(event.end).getTime()
  const eventMid =
    Number.isFinite(eventStartMs) && Number.isFinite(eventEndMs)
      ? (eventStartMs + eventEndMs) / 2
      : eventStartMs
  let timeBonus = 0
  if (Number.isFinite(callMs) && Number.isFinite(eventMid)) {
    const deltaMin = Math.abs(callMs - eventMid) / 60_000
    timeBonus = Math.max(0, 10 - Math.floor(deltaMin / 5))
  }

  return emailHits * 15 + Math.round(titleSim * 20) + timeBonus
}

export type RelatedCallMatchCandidate = {
  eventId: string
  callId: string
  score: number
}

/**
 * Greedy exclusive assignment: each calendar event and each Fathom call match at most once.
 * Highest scores win; pairs below MIN_RELATED_CALL_MATCH_SCORE are ignored.
 */
export function assignRelatedCallsExclusive(
  candidates: RelatedCallMatchCandidate[],
): Map<string, string> {
  const byScore = [...candidates]
    .filter((c) => c.score >= MIN_RELATED_CALL_MATCH_SCORE)
    .sort((a, b) => b.score - a.score || a.eventId.localeCompare(b.eventId))
  const assigned = new Map<string, string>()
  const usedCalls = new Set<string>()
  for (const row of byScore) {
    if (assigned.has(row.eventId) || usedCalls.has(row.callId)) continue
    assigned.set(row.eventId, row.callId)
    usedCalls.add(row.callId)
  }
  return assigned
}

/**
 * When title/email scoring fails (AI titles, slug attendees), attach a Fathom call to the
 * unique calendar invite that starts within RELATED_CALL_NEAR_START_MS — and only when no
 * other unmatched call competes for that same invite.
 */
export function assignSoleNearStartRelatedCalls(input: {
  events: Array<{ id: string; start: string }>
  calls: Array<{ id: string; call_date: string | null | undefined }>
  alreadyAssigned: Map<string, string>
  nearMs?: number
}): Map<string, string> {
  const nearMs = input.nearMs ?? RELATED_CALL_NEAR_START_MS
  const assigned = new Map(input.alreadyAssigned)
  const usedCalls = new Set(assigned.values())
  const freeEvents = input.events.filter((e) => !assigned.has(e.id))
  const freeCalls = input.calls.filter((c) => !usedCalls.has(c.id) && Boolean(c.call_date))

  for (const call of freeCalls) {
    if (usedCalls.has(call.id)) continue
    const callMs = new Date(String(call.call_date)).getTime()
    if (!Number.isFinite(callMs)) continue

    const nearEvents = freeEvents.filter((event) => {
      if (assigned.has(event.id)) return false
      const startMs = new Date(event.start).getTime()
      return Number.isFinite(startMs) && Math.abs(startMs - callMs) <= nearMs
    })
    if (nearEvents.length !== 1) continue
    const event = nearEvents[0]!

    const competingCalls = freeCalls.filter((other) => {
      if (other.id === call.id || usedCalls.has(other.id)) return false
      const otherMs = new Date(String(other.call_date)).getTime()
      const eventMs = new Date(event.start).getTime()
      return Number.isFinite(otherMs) && Math.abs(otherMs - eventMs) <= nearMs
    })
    if (competingCalls.length > 0) continue

    assigned.set(event.id, call.id)
    usedCalls.add(call.id)
  }

  return assigned
}

export function pickMeetingsSpaceId(spaces: Array<Record<string, unknown>>): string | null {
  let bestId: string | null = null
  let bestRank = -1
  for (const space of spaces) {
    const schema = space.schema as {
      icon?: string
      personal_dashboard?: boolean
      fields?: Array<{ id?: string }>
    } | null
    if (!schema?.fields?.some((f) => f.id === 'entry_type')) continue
    const title = String(space.title ?? '').toLowerCase()
    const isDashboard =
      space.space_kind === 'personal_dashboard' ||
      schema?.personal_dashboard === true ||
      title === 'personal dashboard'
    const isMeetingsSurface = schema?.icon === 'video' || title === 'meetings'
    if (!isDashboard && !isMeetingsSurface) continue
    let rank = 0
    if (title === 'meetings') rank += 100
    if (schema?.icon === 'video') rank += 40
    if (isDashboard) rank += 10
    if (rank > bestRank && space.id) {
      bestRank = rank
      bestId = String(space.id)
    }
  }
  return bestId
}

export async function resolvePreferredMeetingsSpaceId(input: {
  orgId?: string | null
  loadSpaces: (orgId: string | null) => Promise<Array<Record<string, unknown>>>
}): Promise<string | null> {
  if (input.orgId) {
    const orgMeetings = pickMeetingsSpaceId(await input.loadSpaces(input.orgId))
    if (orgMeetings) return orgMeetings
  }
  return pickMeetingsSpaceId(await input.loadSpaces(null))
}
