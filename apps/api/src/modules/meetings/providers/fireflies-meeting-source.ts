import type {
  TranscriptSourceAction,
  TranscriptSourceEvent,
  TranscriptTurn,
} from './transcript-source.types'

/**
 * Fireflies GraphQL `transcript` object → provider-agnostic transcript event.
 * Field names follow `apps/api/src/modules/integrations/fireflies/types/fireflies.types.ts`.
 * `date` is epoch milliseconds and `duration` is minutes, per the Fireflies API.
 */
export function normalizeFirefliesMeetingSource(
  raw: Record<string, unknown>,
): TranscriptSourceEvent {
  const externalRecordingId = firstText(raw.id)
  if (!externalRecordingId) throw new Error('Fireflies transcript id is required')

  const recordingStart = epochMsToIso(raw.date)
  const durationMinutes =
    typeof raw.duration === 'number' && Number.isFinite(raw.duration) ? raw.duration : null
  const durationSeconds =
    durationMinutes !== null ? Math.max(0, Math.round(durationMinutes * 60)) : null
  const recordingEnd =
    recordingStart && durationSeconds !== null
      ? new Date(Date.parse(recordingStart) + durationSeconds * 1000).toISOString()
      : null
  const summary = objectRecord(raw.summary)
  const transcript = normalizeSentences(raw.sentences)
  const hostEmail = normalizedEmail(raw.host_email) ?? normalizedEmail(raw.organizer_email)

  return {
    provider: 'fireflies',
    kind: 'meeting',
    externalRecordingId,
    providerMeetingId: externalRecordingId,
    calendarEventId: null,
    title: firstText(raw.title) ?? 'Untitled Meeting',
    recordingUrl: httpUrl(raw.video_url) ?? httpUrl(raw.audio_url),
    sourceUrl: httpUrl(raw.transcript_url),
    mediaUrl: transcript.length === 0 ? (httpUrl(raw.audio_url) ?? httpUrl(raw.video_url)) : null,
    hostEmail,
    scheduledStart: null,
    scheduledEnd: null,
    recordingStart,
    recordingEnd,
    durationSeconds,
    participantEmails: collectParticipantEmails(raw, hostEmail),
    providerSummary: buildSummary(summary),
    actions: normalizeActions(summary.action_items, externalRecordingId),
    transcript,
    raw,
  }
}

function normalizeSentences(value: unknown): TranscriptTurn[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const sentence = objectRecord(entry)
    const text = firstText(sentence.text) ?? firstText(sentence.raw_text)
    if (!text) return []
    return [
      {
        speakerName: firstText(sentence.speaker_name) ?? 'Speaker',
        speakerEmail: null,
        timestamp: secondsToClock(sentence.start_time),
        text,
      },
    ]
  })
}

function buildSummary(summary: Record<string, unknown>): string | null {
  const parts: string[] = []
  const overview = firstText(summary.overview) ?? firstText(summary.short_summary)
  if (overview) parts.push(overview)
  const outline = stringList(summary.outline)
  if (outline.length > 0) parts.push(['Outline:', ...outline.map((line) => `- ${line}`)].join('\n'))
  const bullets = stringList(summary.bullet_gist)
  if (bullets.length > 0)
    parts.push(['Key points:', ...bullets.map((line) => `- ${line}`)].join('\n'))
  const keywords = stringList(summary.keywords)
  if (keywords.length > 0) parts.push(`Keywords: ${keywords.join(', ')}`)
  return parts.length > 0 ? parts.join('\n\n') : null
}

function normalizeActions(value: unknown, externalRecordingId: string): TranscriptSourceAction[] {
  // Fireflies returns action items either as a plain list (one task per entry)
  // or as one formatted block where a bold "**Owner**" line precedes that
  // person's tasks ("- Send the deck (12:34)").
  const lines = Array.isArray(value)
    ? value.map((item) => String(item ?? ''))
    : typeof value === 'string'
      ? value.split('\n')
      : []
  const actions: TranscriptSourceAction[] = []
  let currentAssignee: string | null = null
  for (const rawLine of lines) {
    const owner = rawLine.match(/^\s*\*\*(.+?)\*\*\s*:?\s*$/)
    if (owner) {
      currentAssignee = owner[1]!.trim() || null
      continue
    }
    const sourceText = rawLine
      .replace(/^\s*[-*•]\s+/, '')
      .replace(/\*\*/g, '')
      .replace(/\s*\(\d{1,2}:\d{2}(?::\d{2})?\)\s*$/, '')
      .trim()
    if (sourceText.length < 3) continue
    actions.push({
      sourceKey: `fireflies:${externalRecordingId}:action:${actions.length}`,
      sourceText,
      assigneeName: currentAssignee,
      assigneeEmail: null,
      recordingTimestamp: null,
      recordingPlaybackUrl: null,
      completed: false,
      userGenerated: false,
      raw: { line: rawLine },
    })
  }
  return actions
}

function collectParticipantEmails(
  raw: Record<string, unknown>,
  hostEmail: string | null,
): string[] {
  const emails = new Set<string>()
  if (hostEmail) emails.add(hostEmail)
  const organizer = normalizedEmail(raw.organizer_email)
  if (organizer) emails.add(organizer)
  if (Array.isArray(raw.participants)) {
    for (const value of raw.participants) {
      const email = normalizedEmail(value)
      if (email) emails.add(email)
    }
  }
  if (Array.isArray(raw.meeting_attendees)) {
    for (const value of raw.meeting_attendees) {
      const email = normalizedEmail(objectRecord(value).email)
      if (email) emails.add(email)
    }
  }
  return [...emails]
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split('\n')
      .map((line) => line.replace(/^\s*[-*•]\s+/, '').trim())
      .filter(Boolean)
  }
  return []
}

function epochMsToIso(value: unknown): string | null {
  const ms =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN
  if (!Number.isFinite(ms) || ms <= 0) return null
  return new Date(ms).toISOString()
}

function secondsToClock(value: unknown): string | null {
  const seconds =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(seconds) || seconds < 0) return null
  const whole = Math.floor(seconds)
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const s = whole % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function normalizedEmail(value: unknown): string | null {
  const raw = firstText(value)?.toLowerCase() ?? ''
  return raw.includes('@') ? raw : null
}

function httpUrl(value: unknown): string | null {
  const raw = firstText(value)
  return raw && /^https?:\/\//i.test(raw) ? raw : null
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
