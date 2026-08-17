function stripHtml(source: string): string {
  if (!/<[a-z][\s\S]*>/i.test(source) && !/&(?:nbsp|lt|gt|amp);/i.test(source)) return source
  if (typeof document === 'undefined') {
    return source
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()
  }
  const node = document.createElement('div')
  node.innerHTML = source.replace(/<br\s*\/?\s*>/gi, '\n')
  return (node.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

export function meetingAgendaText(value: string | null | undefined): string {
  const source = value?.trim()
  if (!source) return 'No agenda has been added yet.'
  return stripHtml(source)
}

export interface ParsedMeetingPrep {
  /** Human prep/agenda content with videoconference boilerplate removed. */
  notes: string
  meetingId: string | null
  passcode: string | null
  /** True when boilerplate was stripped, so the caller can offer the original. */
  strippedBoilerplate: boolean
}

const INVITE_NOISE = [
  /is inviting you to a scheduled .*meeting\.?$/i,
  /^join (?:zoom|google meet|microsoft teams|teams|webex)?\s*meeting$/i,
  /^meeting chat link:?$/i,
  /^join by (?:phone|sip|h\.323)/i,
  /^one tap mobile/i,
  /^dial by your location/i,
  /^find your local number/i,
  /^tap to join/i,
]

const URL_ONLY = /^https?:\/\/\S+$/i
const SEPARATOR = /^[\s─—–_-]{3,}$/
const PHONE_LINE = /^\+?\d[\d\s().-]{7,}(?:#|\d)\s*(?:us.*)?$/i

/**
 * Split a calendar description into real prep notes vs videoconference
 * boilerplate (join links, meeting id, passcode, dial-in blocks).
 */
export function parseMeetingPrep(value: string | null | undefined): ParsedMeetingPrep {
  const source = value?.trim()
  if (!source) return { notes: '', meetingId: null, passcode: null, strippedBoilerplate: false }

  const text = stripHtml(source)
  let meetingId: string | null = null
  let passcode: string | null = null
  let stripped = false

  const kept: string[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      kept.push('')
      continue
    }
    const idMatch = line.match(/^meeting id:?\s*(.+)$/i)
    if (idMatch?.[1]) {
      meetingId = idMatch[1].trim()
      stripped = true
      continue
    }
    const passMatch = line.match(/^pass(?:code|word):?\s*(.+)$/i)
    if (passMatch?.[1]) {
      passcode = passMatch[1].trim()
      stripped = true
      continue
    }
    if (
      INVITE_NOISE.some((re) => re.test(line)) ||
      URL_ONLY.test(line) ||
      SEPARATOR.test(line) ||
      PHONE_LINE.test(line)
    ) {
      stripped = true
      continue
    }
    kept.push(line)
  }

  const notes = kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { notes, meetingId, passcode, strippedBoilerplate: stripped }
}

export function formatMeetingWhen(start?: string | null, end?: string | null): string {
  const startMs = start ? new Date(start).getTime() : NaN
  if (!Number.isFinite(startMs)) return ''
  const startDate = new Date(startMs)
  const day = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const endMs = end ? new Date(end).getTime() : NaN
  const endTime = Number.isFinite(endMs)
    ? new Date(endMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null
  const range = endTime ? `${time} – ${endTime}` : time
  const minutesOut = Math.round((startMs - Date.now()) / 60_000)
  let countdown = ''
  if (minutesOut > 0 && minutesOut < 60 * 24) {
    countdown =
      minutesOut >= 60
        ? ` · in ${Math.floor(minutesOut / 60)}h ${minutesOut % 60}m`
        : ` · in ${minutesOut}m`
  }
  return `${day} · ${range}${countdown}`
}

export function formatAttendeeSummary(
  attendees: Array<{ name?: string | null; email?: string | null }> | undefined,
): string {
  if (!attendees?.length) return ''
  const names = attendees.map((a) => (a.name?.trim() || a.email?.trim()) ?? '').filter(Boolean)
  if (names.length === 0) return ''
  const shown = names.slice(0, 4)
  const rest = names.length - shown.length
  return rest > 0 ? `${shown.join(', ')} +${rest} more` : shown.join(', ')
}
