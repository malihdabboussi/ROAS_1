/** Eligible calendar events for pre-call prep (shared by job + tests). */

export type PrecallAgendaEventLike = {
  id: string
  title: string
  start: string
  end: string
  all_day: boolean
  video_url: string | null
  operator_notes?: string | null
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
  operator_notes?: string | null
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
    operator_notes: snapshot.operator_notes?.trim() || null,
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
  buildGoogleDocTabLink,
  buildPrecallPrompt,
  mapPrepItemToAgendaLink,
  matchUniqueClientByEventTitle,
  parsePrepDocToAgendaSections,
  validateMeetingReadyAgendaSections,
  type AgendaPrepLink,
} from './meetings-precall-agenda-sections'

export {
  assignRelatedCallsExclusive,
  assignSoleNearStartRelatedCalls,
  buildMeetingAgendaEvent,
  buildRelatedCallCandidates,
  callDateInAgendaWindow,
  callOverlapsEventWindow,
  emailFromAttendeeSlug,
  extractCallTranscriptText,
  FATHOM_AGENDA_DURATION_MS,
  FATHOM_AGENDA_SOURCE,
  MIN_RELATED_CALL_MATCH_SCORE,
  RELATED_CALL_NEAR_START_MS,
  RELATED_CALL_RECORDING_BONUS,
  RELATED_CALL_RESCHEDULE_PAD_MS,
  RELATED_CALL_TIME_PAD_MS,
  RELATED_CALL_TITLE_MIN,
  relatedCallTitleSimilarity,
  resolveAgendaCallSummary,
  resolveAgendaExternalRecordingId,
  resolveAgendaHasTranscript,
  resolveAgendaRecordingUrl,
  scoreRelatedCallMatch,
  toAgendaFollowUp,
  toAgendaRelatedCall,
  type AgendaRelatedCall,
  type AgendaRelatedFollowUp,
  type RelatedCallMatchCandidate,
} from './meetings-precall-related-calls'

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
