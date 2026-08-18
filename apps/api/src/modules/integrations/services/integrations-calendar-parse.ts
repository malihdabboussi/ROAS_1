import { BadRequestException } from '@nestjs/common'
import { readGoogleIcalUid, readOutlookIcalUid } from './integrations-calendar-dedupe'
import type {
  CalendarAgendaEvent,
  CalendarAttendee,
  CalendarProvider,
} from './integrations-calendar.service'

export function parseMutationEvent(
  provider: CalendarProvider,
  raw: unknown,
): CalendarAgendaEvent | null {
  try {
    const payload = unwrapComposioPayload(raw)
    const record = asRecord(payload)
    if (!record) return null
    const parsed =
      provider === 'google_calendar'
        ? parseGoogleEventsListResponse({ items: [record] })
        : parseOutlookListEventsResponse({ value: [record] })
    return parsed[0] ?? null
  } catch {
    return null
  }
}

export function parseGoogleEventsListResponse(raw: unknown): CalendarAgendaEvent[] {
  const unwrapped = unwrapComposioPayload(raw)
  const rec = asRecord(unwrapped)
  if (!rec) return []
  const items = asArray(rec.items) ?? asArray(rec.events)
  if (!items) return []

  const out: CalendarAgendaEvent[] = []
  for (const item of items) {
    const ev = asRecord(item)
    if (!ev || String(ev.status ?? '').toLowerCase() === 'cancelled') continue
    const id = typeof ev.id === 'string' ? ev.id : JSON.stringify(ev.id ?? Math.random())
    const title = typeof ev.summary === 'string' ? ev.summary : '(No title)'
    const colorId = typeof ev.colorId === 'string' ? ev.colorId : null
    const icalUid = readGoogleIcalUid(ev)
    const startObj = asRecord(ev.start)
    const endObj = asRecord(ev.end)
    if (!startObj || !endObj) continue
    const startDate = typeof startObj.date === 'string' ? startObj.date : null
    const endDate = typeof endObj.date === 'string' ? endObj.date : null
    const startDt = typeof startObj.dateTime === 'string' ? startObj.dateTime : null
    const endDt = typeof endObj.dateTime === 'string' ? endObj.dateTime : null

    let startIso: string
    let endIso: string
    let allDay = false
    if (startDate && endDate) {
      allDay = true
      startIso = `${startDate}T00:00:00.000Z`
      endIso = `${endDate}T00:00:00.000Z`
    } else if (startDt && endDt) {
      startIso = startDt
      endIso = endDt
    } else {
      continue
    }

    const hangout = typeof ev.hangoutLink === 'string' ? ev.hangoutLink : null
    const conf = asRecord(ev.conferenceData)
    const confSolution = conf ? asRecord(conf.conferenceSolution) : null
    const entryPoints = conf ? asArray(conf.entryPoints) : null
    let videoUrl = hangout
    let videoLabel: string | null = null
    if (!videoUrl && entryPoints) {
      for (const ep of entryPoints) {
        const epr = asRecord(ep)
        if (epr && typeof epr.uri === 'string' && String(epr.entryPointType ?? '') === 'video') {
          videoUrl = epr.uri
          break
        }
      }
    }
    if (!videoUrl) {
      const loc = typeof ev.location === 'string' ? ev.location : ''
      const desc = typeof ev.description === 'string' ? ev.description : ''
      const urlMatch = (loc + ' ' + desc).match(
        /https?:\/\/[^\s<>"]+(?:zoom\.us|teams\.microsoft\.com|meet\.google\.com)[^\s<>"]+/i,
      )
      if (urlMatch) videoUrl = urlMatch[0]
    }
    if (videoUrl) {
      if (confSolution && typeof confSolution.name === 'string') {
        videoLabel = confSolution.name
      } else if (videoUrl.includes('zoom.us')) {
        videoLabel = 'Zoom'
      } else if (videoUrl.includes('teams.microsoft')) {
        videoLabel = 'Teams'
      } else if (videoUrl.includes('meet.google')) {
        videoLabel = 'Google Meet'
      }
    }
    const htmlLink = typeof ev.htmlLink === 'string' ? ev.htmlLink : null

    const attendees: CalendarAttendee[] = []
    const rawAttendees = asArray(ev.attendees)
    if (rawAttendees) {
      for (const a of rawAttendees) {
        const ar = asRecord(a)
        if (!ar) continue
        const email = typeof ar.email === 'string' ? ar.email : null
        if (!email) continue
        const name = typeof ar.displayName === 'string' ? ar.displayName : null
        const rs = String(ar.responseStatus ?? '').toLowerCase()
        const status: CalendarAttendee['status'] =
          rs === 'accepted'
            ? 'accepted'
            : rs === 'declined'
              ? 'declined'
              : rs === 'tentative'
                ? 'tentative'
                : rs === 'needsaction'
                  ? 'needsAction'
                  : 'unknown'
        attendees.push({ name, email, status })
      }
    }

    const locationRaw = typeof ev.location === 'string' ? ev.location.trim() : ''
    const descriptionRaw = typeof ev.description === 'string' ? ev.description.trim() : ''
    out.push({
      id: `google:${id}`,
      title,
      start: startIso,
      end: endIso,
      all_day: allDay,
      location: locationRaw || null,
      description: descriptionRaw || null,
      video_url: videoUrl,
      video_label: videoLabel,
      html_link: htmlLink,
      color_id: colorId,
      attendees,
      organizer: readGoogleOrganizer(ev, attendees),
      source: 'google_calendar',
      ical_uid: icalUid,
    })
  }
  return out
}

export function parseOutlookListEventsResponse(raw: unknown): CalendarAgendaEvent[] {
  const unwrapped = unwrapComposioPayload(raw)
  const rec = asRecord(unwrapped)
  if (!rec) return []
  const value = asArray(rec.value) ?? (Array.isArray(unwrapped) ? (unwrapped as unknown[]) : null)
  if (!value) return []

  const out: CalendarAgendaEvent[] = []
  for (const item of value) {
    const ev = asRecord(item)
    if (!ev) continue
    if (ev.isCancelled === true) continue
    const id = typeof ev.id === 'string' ? ev.id : JSON.stringify(ev.id ?? Math.random())
    const title = typeof ev.subject === 'string' ? ev.subject : '(No title)'
    const startWrap = asRecord(ev.start)
    const endWrap = asRecord(ev.end)
    const startRaw = startWrap && typeof startWrap.dateTime === 'string' ? startWrap.dateTime : null
    const endRaw = endWrap && typeof endWrap.dateTime === 'string' ? endWrap.dateTime : null
    if (!startRaw || !endRaw) continue
    const allDay = ev.isAllDay === true
    const om = asRecord(ev.onlineMeeting)
    const videoUrl =
      (typeof ev.onlineMeetingUrl === 'string' ? ev.onlineMeetingUrl : null) ??
      (om && typeof om.joinUrl === 'string' ? om.joinUrl : null)
    let videoLabel: string | null = null
    if (videoUrl) {
      const provider = typeof ev.onlineMeetingProvider === 'string' ? ev.onlineMeetingProvider : ''
      if (provider === 'teamsForBusiness' || provider === 'skypeForBusiness') videoLabel = 'Teams'
      else if (videoUrl.includes('zoom.us')) videoLabel = 'Zoom'
      else if (videoUrl.includes('meet.google')) videoLabel = 'Google Meet'
      else if (provider) videoLabel = provider
    }
    const htmlLink = typeof ev.webLink === 'string' ? ev.webLink : null

    const cats = asArray(ev.categories)
    const colorId = cats && cats.length > 0 && typeof cats[0] === 'string' ? cats[0] : null

    const attendees: CalendarAttendee[] = []
    const rawAttendees = asArray(ev.attendees)
    if (rawAttendees) {
      for (const a of rawAttendees) {
        const ar = asRecord(a)
        if (!ar) continue
        const ea = asRecord(ar.emailAddress)
        const email = ea && typeof ea.address === 'string' ? ea.address : null
        if (!email) continue
        const name = ea && typeof ea.name === 'string' ? ea.name : null
        const statusObj = asRecord(ar.status)
        const rs = statusObj ? String(statusObj.response ?? '').toLowerCase() : ''
        const status: CalendarAttendee['status'] =
          rs === 'accepted'
            ? 'accepted'
            : rs === 'declined'
              ? 'declined'
              : rs === 'tentativelyaccepted' || rs === 'tentative'
                ? 'tentative'
                : rs === 'none' || rs === 'notresponded'
                  ? 'needsAction'
                  : 'unknown'
        attendees.push({ name, email, status })
      }
    }

    const locWrap = asRecord(ev.location)
    const locationRaw =
      locWrap && typeof locWrap.displayName === 'string'
        ? locWrap.displayName.trim()
        : typeof ev.location === 'string'
          ? ev.location.trim()
          : ''
    const bodyWrap = asRecord(ev.body)
    const descriptionRaw =
      typeof ev.bodyPreview === 'string'
        ? ev.bodyPreview.trim()
        : bodyWrap && typeof bodyWrap.content === 'string'
          ? bodyWrap.content.trim()
          : ''
    const icalUid = readOutlookIcalUid(ev)
    out.push({
      id: `outlook:${id}`,
      title,
      start: startRaw,
      end: endRaw,
      all_day: allDay,
      location: locationRaw || null,
      description: descriptionRaw || null,
      video_url: videoUrl,
      video_label: videoLabel,
      html_link: htmlLink,
      color_id: colorId,
      attendees,
      organizer: readOutlookOrganizer(ev),
      source: 'outlook',
      ical_uid: icalUid,
    })
  }
  return out
}

function readGoogleOrganizer(
  ev: Record<string, unknown>,
  _attendees: CalendarAttendee[],
): CalendarAgendaEvent['organizer'] {
  const organizer = asRecord(ev.organizer)
  const email = organizer && typeof organizer.email === 'string' ? organizer.email.trim() : ''
  if (email) {
    return {
      email,
      name: organizer && typeof organizer.displayName === 'string' ? organizer.displayName : null,
    }
  }
  const rawAttendees = asArray(ev.attendees) ?? []
  for (const row of rawAttendees) {
    const record = asRecord(row)
    if (!record || record.organizer !== true) continue
    const attendeeEmail = typeof record.email === 'string' ? record.email.trim() : ''
    if (!attendeeEmail) continue
    return {
      email: attendeeEmail,
      name: typeof record.displayName === 'string' ? record.displayName : null,
    }
  }
  return null
}

function readOutlookOrganizer(ev: Record<string, unknown>): CalendarAgendaEvent['organizer'] {
  const organizer = asRecord(ev.organizer)
  const emailAddress = organizer ? asRecord(organizer.emailAddress) : null
  const email =
    emailAddress && typeof emailAddress.address === 'string' ? emailAddress.address.trim() : ''
  if (!email) return null
  return {
    email,
    name: emailAddress && typeof emailAddress.name === 'string' ? emailAddress.name : null,
  }
}

function unwrapComposioPayload(value: unknown): unknown {
  let current: unknown = value
  for (let i = 0; i < 4; i += 1) {
    const record = asRecord(current)
    if (!record) break
    if (typeof record.error === 'string' && record.error.length > 0) {
      throw new BadRequestException(record.error)
    }
    if (record.successful === false) {
      throw new BadRequestException(
        typeof record.error === 'string' ? record.error : 'Composio tool execution failed',
      )
    }
    if ('data' in record && record.data !== undefined && record.data !== null) {
      current = record.data
      continue
    }
    break
  }
  return current
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}
