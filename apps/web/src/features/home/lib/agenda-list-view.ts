'use client'

import { dayKeyInTimeZone } from '@/features/home/components/agenda-list-grouping'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

function normalizeAgendaTitle(title: string): string {
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

function titleSimilarity(a: string, b: string): number {
  const left = new Set(
    normalizeAgendaTitle(a)
      .split(' ')
      .filter((t) => t.length > 1),
  )
  const right = new Set(
    normalizeAgendaTitle(b)
      .split(' ')
      .filter((t) => t.length > 1),
  )
  if (left.size === 0 || right.size === 0) return 0
  let inter = 0
  for (const token of left) {
    if (right.has(token)) inter += 1
  }
  return inter / (left.size + right.size - inter)
}

function lookupKeys(ev: CalendarAgendaEvent): string[] {
  const keys: string[] = []
  const ical = String(ev.ical_uid ?? '')
    .trim()
    .toLowerCase()
  if (ical) keys.push(`ical:${ical}`)
  const video = String(ev.video_url ?? '')
    .trim()
    .toLowerCase()
  if (video) keys.push(`video:${startMinuteKey(ev.start)}|${video}`)
  const title = normalizeAgendaTitle(ev.title)
  if (title) keys.push(`title:${ev.start}|${ev.end}|${title}`)
  return keys
}

function richness(ev: CalendarAgendaEvent): number {
  let score = 0
  if (ev.video_url) score += 4
  if (ev.related) score += 3
  if (ev.prep) score += 2
  if (ev.html_link) score += 1
  if (ev.ical_uid) score += 1
  return score
}

/** Collapse duplicate meetings from multi-calendar / multi-account merges. */
export function dedupeAgendaEvents(events: CalendarAgendaEvent[]): CalendarAgendaEvent[] {
  const byId = new Map<string, CalendarAgendaEvent>()
  const keyIndex = new Map<string, string>()

  for (const ev of events) {
    let matchId: string | null = null
    for (const key of lookupKeys(ev)) {
      const hit = keyIndex.get(key)
      if (hit && byId.has(hit)) {
        matchId = hit
        break
      }
    }
    if (!matchId) {
      const startKey = startMinuteKey(ev.start)
      const endKey = startMinuteKey(ev.end)
      for (const existing of byId.values()) {
        if (startMinuteKey(existing.start) !== startKey) continue
        if (startMinuteKey(existing.end) !== endKey) continue
        if (titleSimilarity(existing.title, ev.title) >= 0.5) {
          matchId = existing.id
          break
        }
      }
    }

    if (!matchId) {
      byId.set(ev.id, ev)
      for (const key of lookupKeys(ev)) {
        if (!keyIndex.has(key)) keyIndex.set(key, ev.id)
      }
      continue
    }

    const existing = byId.get(matchId)
    if (!existing) continue
    const preferIncoming =
      richness(ev) > richness(existing) || (existing.source === 'fathom' && ev.source !== 'fathom')
    const kept = preferIncoming ? { ...ev } : { ...existing }
    const other = preferIncoming ? existing : ev
    if (!kept.video_url && other.video_url) {
      kept.video_url = other.video_url
      kept.video_label = other.video_label ?? kept.video_label
    }
    if (!kept.html_link && other.html_link) kept.html_link = other.html_link
    if (!kept.ical_uid && other.ical_uid) kept.ical_uid = other.ical_uid
    if (!kept.prep && other.prep) kept.prep = other.prep
    if (!kept.related && other.related) kept.related = other.related
    if (preferIncoming) {
      byId.delete(existing.id)
      byId.set(kept.id, kept)
      for (const [key, id] of [...keyIndex.entries()]) {
        if (id === existing.id) keyIndex.delete(key)
      }
    } else {
      byId.set(existing.id, kept)
    }
    for (const key of lookupKeys(kept)) {
      if (!keyIndex.has(key)) keyIndex.set(key, kept.id)
    }
  }

  return [...byId.values()]
}

export function pickNextAgendaEvent(
  events: CalendarAgendaEvent[],
  nowTick: number,
): CalendarAgendaEvent | null {
  const upcoming = events
    .filter((ev) => new Date(ev.end).getTime() > nowTick)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  return upcoming[0] ?? null
}

/** Split today's events around "now" so earlier meetings stay scrollable above next. */
export function splitTodayAgendaEvents(
  todayEvents: CalendarAgendaEvent[],
  nowTick: number,
  nextEventKey: string | null,
  keyFn: (ev: CalendarAgendaEvent) => string,
): { earlier: CalendarAgendaEvent[]; later: CalendarAgendaEvent[] } {
  const earlier: CalendarAgendaEvent[] = []
  const later: CalendarAgendaEvent[] = []
  for (const ev of todayEvents) {
    if (nextEventKey && keyFn(ev) === nextEventKey) continue
    if (new Date(ev.end).getTime() <= nowTick) earlier.push(ev)
    else later.push(ev)
  }
  return { earlier, later }
}

export function tomorrowDayKey(nowTick: number, timeZone: string): string {
  const d = new Date(nowTick)
  d.setDate(d.getDate() + 1)
  return dayKeyInTimeZone(d, timeZone)
}
