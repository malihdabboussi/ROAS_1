import type { CalendarConnectionRef } from './integrations-calendar-connections'
import type { CalendarAgendaEvent } from './integrations-calendar.service'

export type AgendaDedupeEvent = CalendarAgendaEvent & { ical_uid?: string | null }

type DedupeOptions = {
  /** Team agenda: combine who has the meeting on their calendar. */
  mergeAccountLabels?: boolean
}

/** Same start within this window can still be one meeting (bot join lag / clock skew). */
export const AGENDA_NEAR_START_MS = 10 * 60 * 1000
/** Fathom can be started before a scheduled invite while the prior discussion is still wrapping. */
export const AGENDA_FATHOM_EARLY_START_MS = 35 * 60 * 1000

export function readGoogleIcalUid(ev: Record<string, unknown>): string | null {
  const v = ev.iCalUID ?? ev.ical_uid
  return typeof v === 'string' ? v : null
}

export function readOutlookIcalUid(ev: Record<string, unknown>): string | null {
  const v = ev.iCalUId ?? ev.uid ?? ev.ical_uid
  return typeof v === 'string' ? v : null
}

const MINE_LABEL = 'mine'
const FATHOM_LABEL = 'fathom'

/** Stable title for near-duplicate invites ("1DS / ROAS…" vs "1DS - ROAS…"). */
export function normalizeAgendaTitle(title: string): string {
  return String(title ?? '')
    .toLowerCase()
    .replace(/[/\\|x×•·–—_-]+/gi, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function startMinuteKey(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return String(iso ?? '')
  const d = new Date(ms)
  d.setUTCSeconds(0, 0)
  return d.toISOString()
}

function titleTokenSet(title: string): Set<string> {
  return new Set(
    normalizeAgendaTitle(title)
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 1),
  )
}

export function agendaTitleSimilarity(a: string, b: string): number {
  const left = titleTokenSet(a)
  const right = titleTokenSet(b)
  if (left.size === 0 || right.size === 0) return 0
  let inter = 0
  for (const token of left) {
    if (right.has(token)) inter += 1
  }
  return inter / (left.size + right.size - inter)
}

/** Prefer iCalUID, then same video at same start, then start|end|normalized title. */
export function agendaDedupeLookupKeys(event: AgendaDedupeEvent): string[] {
  const keys: string[] = []
  const ical = String(event.ical_uid ?? '')
    .trim()
    .toLowerCase()
  if (ical) keys.push(`ical:${ical}`)

  const video = String(event.video_url ?? '')
    .trim()
    .toLowerCase()
  if (video) keys.push(`video:${startMinuteKey(event.start)}|${video}`)

  const title = normalizeAgendaTitle(event.title)
  if (title) keys.push(`title:${event.start}|${event.end}|${title}`)
  return keys
}

/** @deprecated Prefer agendaDedupeLookupKeys — kept for existing team tests. */
export function teamAgendaDedupeKey(event: AgendaDedupeEvent): string {
  return agendaDedupeLookupKeys(event)[0] ?? `evt:${event.id}`
}

/**
 * On Team agenda, shared calls keep Mine first when the caller's personal calendar
 * also has the invite, then teammate calendar names. Fathom stays label-only when
 * there is no calendar row.
 */
export function resolveTeamAgendaAccountLabel(
  labels: Array<string | null | undefined>,
): string | null {
  const parts = [
    ...new Set(
      labels
        .flatMap((label) => splitLabels(label))
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ]
  if (parts.length === 0) return null

  const hasMine = parts.some((part) => part.toLowerCase() === MINE_LABEL)
  const hasFathom = parts.some((part) => part.toLowerCase() === FATHOM_LABEL)
  const teammates = parts
    .filter((part) => {
      const key = part.toLowerCase()
      return key !== MINE_LABEL && key !== FATHOM_LABEL
    })
    .sort((a, b) => a.localeCompare(b))

  if (teammates.length > 0) {
    return hasMine ? ['Mine', ...teammates].join(' · ') : teammates.join(' · ')
  }
  if (hasMine) return 'Mine'
  if (hasFathom) return 'Fathom'
  return parts.sort((a, b) => a.localeCompare(b)).join(' · ')
}

/**
 * Collapse the same meeting that appears across calendars / accounts / Fathom rows.
 * Team mode also merges account labels and attendees.
 */
export function dedupeCalendarAgendaEvents(
  events: CalendarAgendaEvent[],
  options?: DedupeOptions,
): CalendarAgendaEvent[] {
  const mergeLabels = options?.mergeAccountLabels === true
  const byId = new Map<string, AgendaDedupeEvent>()
  const keyIndex = new Map<string, string>()

  for (const raw of events) {
    const event = { ...(raw as AgendaDedupeEvent) }
    const matchId = findExistingMatch(event, byId, keyIndex)
    if (!matchId) {
      byId.set(event.id, event)
      indexEventKeys(event, keyIndex)
      continue
    }

    const existing = byId.get(matchId)
    if (!existing) continue
    const kept = mergeAgendaEvents(existing, event, mergeLabels)
    if (kept.id !== existing.id) {
      byId.delete(existing.id)
      byId.set(kept.id, kept)
      reindexAfterIdChange(existing.id, kept, keyIndex)
    } else {
      byId.set(existing.id, kept)
      indexEventKeys(kept, keyIndex)
    }
  }

  const collapsed = [...byId.values()].sort((a, b) => a.start.localeCompare(b.start))
  return mergeFathomIntoNearStartCalendars(collapsed, mergeLabels)
}

export function dedupeTeamAgendaEvents(events: CalendarAgendaEvent[]): CalendarAgendaEvent[] {
  return dedupeCalendarAgendaEvents(events, { mergeAccountLabels: true })
}

/**
 * Attach leftover Fathom-only rows onto the unique nearby calendar invite
 * (AI titles / missing attendees often prevent earlier related-call scoring).
 */
export function mergeFathomIntoNearStartCalendars(
  events: CalendarAgendaEvent[],
  mergeLabels = false,
  nearMs = AGENDA_NEAR_START_MS,
): CalendarAgendaEvent[] {
  const calendar = events.filter((e) => e.source !== 'fathom')
  const fathom = events.filter((e) => e.source === 'fathom')
  if (fathom.length === 0) return events

  const keptFathom: CalendarAgendaEvent[] = []
  const byId = new Map(calendar.map((e) => [e.id, { ...(e as AgendaDedupeEvent) }]))

  for (const row of fathom) {
    const callMs = Date.parse(row.start)
    if (!Number.isFinite(callMs)) {
      keptFathom.push(row)
      continue
    }
    const near = [...byId.values()].filter((event) => {
      const startMs = Date.parse(event.start)
      if (!Number.isFinite(startMs)) return false
      const calendarAfterCallMs = startMs - callMs
      return (
        calendarAfterCallMs <= AGENDA_FATHOM_EARLY_START_MS && calendarAfterCallMs >= -nearMs
      )
    })
    if (near.length !== 1) {
      keptFathom.push(row)
      continue
    }
    const target = near[0]!
    const competing = fathom.filter((other) => {
      if (other.id === row.id) return false
      const otherMs = Date.parse(other.start)
      const targetMs = Date.parse(target.start)
      return Number.isFinite(otherMs) && Math.abs(otherMs - targetMs) <= nearMs
    })
    if (competing.length > 0) {
      keptFathom.push(row)
      continue
    }

    const merged = mergeAgendaEvents(target, row as AgendaDedupeEvent, mergeLabels)
    byId.set(merged.id, merged)
  }

  return [...byId.values(), ...keptFathom].sort((a, b) => a.start.localeCompare(b.start))
}

function findExistingMatch(
  event: AgendaDedupeEvent,
  byId: Map<string, AgendaDedupeEvent>,
  keyIndex: Map<string, string>,
): string | null {
  for (const key of agendaDedupeLookupKeys(event)) {
    const hit = keyIndex.get(key)
    if (hit && byId.has(hit)) return hit
  }

  const startKey = startMinuteKey(event.start)
  const endKey = startMinuteKey(event.end)
  const eventStartMs = Date.parse(event.start)
  for (const existing of byId.values()) {
    if (startMinuteKey(existing.start) === startKey && startMinuteKey(existing.end) === endKey) {
      if (agendaTitleSimilarity(existing.title, event.title) >= 0.5) return existing.id
    }

    const existingStartMs = Date.parse(existing.start)
    if (!Number.isFinite(eventStartMs) || !Number.isFinite(existingStartMs)) continue
    if (Math.abs(eventStartMs - existingStartMs) > AGENDA_NEAR_START_MS) continue

    // Cross-account copies often differ by a minute and keep the same invite title.
    if (agendaTitleSimilarity(existing.title, event.title) >= 0.5) return existing.id
    if (sharedAttendeeCount(existing, event) >= 2) return existing.id
  }
  return null
}

function sharedAttendeeCount(left: AgendaDedupeEvent, right: AgendaDedupeEvent): number {
  const rightEmails = new Set(
    (right.attendees ?? [])
      .map((a) =>
        String(a.email ?? '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  )
  if (rightEmails.size === 0) return 0
  let hits = 0
  for (const attendee of left.attendees ?? []) {
    const email = String(attendee.email ?? '')
      .trim()
      .toLowerCase()
    if (email && rightEmails.has(email)) hits += 1
  }
  return hits
}

function indexEventKeys(event: AgendaDedupeEvent, keyIndex: Map<string, string>): void {
  for (const key of agendaDedupeLookupKeys(event)) {
    if (!keyIndex.has(key)) keyIndex.set(key, event.id)
  }
}

function reindexAfterIdChange(
  oldId: string,
  kept: AgendaDedupeEvent,
  keyIndex: Map<string, string>,
): void {
  for (const [key, id] of [...keyIndex.entries()]) {
    if (id === oldId) keyIndex.delete(key)
  }
  indexEventKeys(kept, keyIndex)
}

function mergeAgendaEvents(
  left: AgendaDedupeEvent,
  right: AgendaDedupeEvent,
  mergeLabels: boolean,
): AgendaDedupeEvent {
  const preferRight = shouldPreferIncoming(left, right)
  const kept: AgendaDedupeEvent = preferRight ? { ...right } : { ...left }
  const other = preferRight ? left : right

  if (!kept.ical_uid && other.ical_uid) kept.ical_uid = other.ical_uid
  if (!kept.related && other.related) kept.related = other.related
  if (!kept.prep && other.prep) kept.prep = other.prep
  if (!kept.html_link && other.html_link) kept.html_link = other.html_link
  if (!kept.location && other.location) kept.location = other.location
  if (!kept.description && other.description) kept.description = other.description
  if (!kept.color_id && other.color_id) kept.color_id = other.color_id

  // Keep calendar join links; only borrow Fathom recording when the invite has no video.
  if (kept.source !== 'fathom') {
    if (!kept.video_url && other.video_url) {
      kept.video_url = other.video_url
      kept.video_label = other.video_label ?? kept.video_label
    }
  } else if (other.video_url) {
    kept.video_url = other.video_url
    kept.video_label = other.video_label ?? kept.video_label
  }

  kept.attendees = mergeAttendees(kept.attendees ?? [], other.attendees ?? [])

  if (mergeLabels) {
    kept.account_label = resolveTeamAgendaAccountLabel([kept.account_label, other.account_label])
  } else if (!kept.account_label && other.account_label) {
    kept.account_label = other.account_label
  }

  return kept
}

function shouldPreferIncoming(existing: AgendaDedupeEvent, incoming: AgendaDedupeEvent): boolean {
  // Calendar invite is the canonical row; Fathom only contributes related/recording.
  if (existing.source === 'fathom' && incoming.source !== 'fathom') return true
  if (incoming.source === 'fathom' && existing.source !== 'fathom') return false
  const existingScore = eventRichness(existing)
  const incomingScore = eventRichness(incoming)
  if (incomingScore !== existingScore) return incomingScore > existingScore
  return false
}

function eventRichness(event: AgendaDedupeEvent): number {
  let score = 0
  if (event.video_url) score += 4
  if (event.related) score += 3
  if (event.prep) score += 2
  if (event.html_link) score += 1
  if (event.ical_uid) score += 1
  if ((event.attendees?.length ?? 0) > 0) score += 1
  return score
}

function splitLabels(label: string | null | undefined): string[] {
  return String(label ?? '')
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean)
}

function mergeAttendees(
  left: CalendarAgendaEvent['attendees'],
  right: CalendarAgendaEvent['attendees'],
): CalendarAgendaEvent['attendees'] {
  const byEmail = new Map<string, CalendarAgendaEvent['attendees'][number]>()
  for (const attendee of [...left, ...right]) {
    const email = String(attendee.email ?? '')
      .trim()
      .toLowerCase()
    if (!email) continue
    const existing = byEmail.get(email)
    if (!existing) {
      byEmail.set(email, { ...attendee, email })
      continue
    }
    if (!existing.name && attendee.name) existing.name = attendee.name
  }
  return [...byEmail.values()]
}

export type TeamAgendaCoveragePerson = {
  identity_id: string
  email: string
  display_name: string | null
  match_status: string
  event_count: number
  error?: string
}

export type TeamAgendaCoverageSkipped = {
  identity_id: string
  email: string
  display_name: string | null
  match_status: string
  reason: 'rejected' | 'capped'
}

export type TeamAgendaCoverage = {
  included: TeamAgendaCoveragePerson[]
  skipped: TeamAgendaCoverageSkipped[]
  errors: Array<{
    identity_id: string
    email: string
    display_name: string | null
    error: string
  }>
  totals: {
    directory: number
    pulled: number
    rejected: number
    capped: number
    failed: number
  }
}

export type TeamAgendaPayload = {
  success: boolean
  events: CalendarAgendaEvent[]
  connected: { google_calendar: boolean; outlook: boolean }
  accounts: CalendarConnectionRef[]
  team_available: boolean
  team_coverage?: TeamAgendaCoverage
  error?: string
}

/** Label personal rows as Mine and fold them into Team with teammate calendars. */
export function mergeTeamAgendaWithPersonal(
  team: TeamAgendaPayload,
  personal: TeamAgendaPayload,
): TeamAgendaPayload {
  const personalEvents = personal.events.map((event) => ({
    ...event,
    // Keep Fathom-only rows labeled Fathom; calendar rows become Mine until
    // team dedupe prefers teammate labels for shared calls.
    account_label: event.source === 'fathom' ? 'Fathom' : 'Mine',
  }))
  const personalAccounts = personal.accounts.map((account) => ({
    ...account,
    label: 'Mine',
  }))
  const events = dedupeTeamAgendaEvents([...personalEvents, ...team.events])
  return {
    success: team.success || personal.success,
    events,
    connected: {
      google_calendar: team.connected.google_calendar || personal.connected.google_calendar,
      outlook: team.connected.outlook || personal.connected.outlook,
    },
    accounts: [...personalAccounts, ...team.accounts],
    team_available: true,
    ...(team.team_coverage ? { team_coverage: team.team_coverage } : {}),
    ...(team.error ? { error: team.error } : {}),
  }
}
