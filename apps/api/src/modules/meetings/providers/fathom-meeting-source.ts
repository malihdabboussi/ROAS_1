export type FathomTranscriptTurn = {
  speakerName: string
  speakerEmail: string | null
  timestamp: string | null
  text: string
}

export type FathomSourceAction = {
  sourceKey: string
  sourceText: string
  assigneeName: string | null
  assigneeEmail: string | null
  recordingTimestamp: string | null
  recordingPlaybackUrl: string | null
  completed: boolean
  userGenerated: boolean
  raw: Record<string, unknown>
  /** Present when the LLM judgment pass rewrote or annotated this action. */
  refinement?: { original_text: string; why?: string }
}

export type FathomMeetingSource = {
  provider: 'fathom'
  externalRecordingId: string
  providerMeetingId: string | null
  calendarEventId: string | null
  title: string
  recordingUrl: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  recordingStart: string | null
  recordingEnd: string | null
  durationSeconds: number | null
  participantEmails: string[]
  providerSummary: string | null
  actions: FathomSourceAction[]
  transcript: FathomTranscriptTurn[]
  raw: Record<string, unknown>
}

export function normalizeFathomMeetingSource(event: Record<string, unknown>): FathomMeetingSource {
  // Fathom / Composio payloads often send ids as numbers; meeting_id is the
  // stable recording key when recording_id is absent on webhook events.
  const externalRecordingId = firstText(
    event.recording_id,
    event.id,
    event.call_id,
    event.meeting_id,
  )
  if (!externalRecordingId) throw new Error('Fathom recording id is required')

  const scheduledStart = normalizedIso(event.scheduled_start_time)
  const scheduledEnd = normalizedIso(event.scheduled_end_time)
  const recordingStart = normalizedIso(
    event.recording_start_time ?? event.started_at ?? event.recorded_at,
  )
  const recordingEnd = normalizedIso(event.recording_end_time ?? event.ended_at)
  const participantEmails = collectParticipantEmails(event)
  const defaultSummary = objectRecord(event.default_summary)
  const actionItems = Array.isArray(event.action_items) ? event.action_items : []
  const transcript = normalizeTranscript(event.transcript)

  return {
    provider: 'fathom',
    externalRecordingId,
    providerMeetingId: firstText(event.meeting_id, event.call_id),
    calendarEventId: firstText(
      event.calendar_event_id,
      objectRecord(event.calendar_event).id,
      objectRecord(event.calendar_invite).id,
    ),
    title: firstText(event.title, event.meeting_title) ?? 'Untitled Meeting',
    recordingUrl: httpUrl(event.url) ?? httpUrl(event.share_url),
    scheduledStart,
    scheduledEnd,
    recordingStart,
    recordingEnd,
    durationSeconds: durationSeconds(recordingStart, recordingEnd),
    participantEmails,
    providerSummary:
      firstText(defaultSummary.markdown_formatted, event.summary, event.summary_text) ?? null,
    actions: actionItems.flatMap((raw, index) => {
      const action = objectRecord(raw)
      const sourceText = firstText(action.description, action.title, action.text)
      if (!sourceText) return []
      const assignee = objectRecord(action.assignee)
      return [
        {
          sourceKey: `fathom:${externalRecordingId}:action:${index}`,
          sourceText,
          assigneeName: firstText(assignee.name),
          assigneeEmail: normalizedEmail(assignee.email),
          recordingTimestamp: firstText(action.recording_timestamp),
          recordingPlaybackUrl: httpUrl(action.recording_playback_url),
          completed: action.completed === true,
          userGenerated: action.user_generated === true,
          raw: action,
        },
      ]
    }),
    transcript,
    raw: event,
  }
}

export function renderFathomTranscriptDocument(source: FathomMeetingSource): string {
  const metadata = [
    `<p><strong>Provider:</strong> Fathom</p>`,
    source.recordingStart
      ? `<p><strong>Recorded:</strong> ${escapeHtml(source.recordingStart)}</p>`
      : '',
    source.recordingUrl
      ? `<p><strong>Recording:</strong> <a href="${escapeHtml(source.recordingUrl)}">${escapeHtml(source.recordingUrl)}</a></p>`
      : '',
  ]
    .filter(Boolean)
    .join('')
  const turns = source.transcript
    .map((turn) => {
      const timestamp = turn.timestamp
        ? ` <time datetime="${escapeHtml(turn.timestamp)}">${escapeHtml(turn.timestamp)}</time>`
        : ''
      const speakerEmail = turn.speakerEmail
        ? ` <span>&lt;${escapeHtml(turn.speakerEmail)}&gt;</span>`
        : ''
      return [
        '<section>',
        `<p><strong>${escapeHtml(turn.speakerName)}</strong>${speakerEmail}${timestamp}</p>`,
        `<p>${escapeHtml(turn.text).replace(/\n/g, '<br>')}</p>`,
        '</section>',
      ].join('')
    })
    .join('')

  return [
    `<h1>TRANSCRIPT — ${escapeHtml(source.title)}</h1>`,
    metadata,
    '<hr>',
    turns || '<p>No transcript was supplied by Fathom.</p>',
  ].join('')
}

function normalizeTranscript(value: unknown): FathomTranscriptTurn[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw) => {
    const turn = objectRecord(raw)
    const text = firstText(turn.text)
    if (!text) return []
    const speaker = objectRecord(turn.speaker)
    return [
      {
        speakerName: firstText(speaker.display_name, speaker.name) ?? 'Speaker',
        speakerEmail: normalizedEmail(speaker.matched_calendar_invitee_email ?? speaker.email),
        timestamp: firstText(turn.timestamp),
        text,
      },
    ]
  })
}

function collectParticipantEmails(event: Record<string, unknown>): string[] {
  const emails = new Set<string>()
  const add = (value: unknown) => {
    const email = normalizedEmail(value)
    if (email) emails.add(email)
  }
  add(objectRecord(event.recorded_by).email)
  for (const key of ['calendar_invitees', 'attendees', 'invitees', 'shared_with'] as const) {
    const rows = event[key]
    if (!Array.isArray(rows)) continue
    for (const row of rows) add(objectRecord(row).email)
  }
  if (Array.isArray(event.transcript)) {
    for (const row of event.transcript) {
      const speaker = objectRecord(objectRecord(row).speaker)
      add(speaker.matched_calendar_invitee_email ?? speaker.email)
    }
  }
  return [...emails]
}

function durationSeconds(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null
  return Math.floor((endMs - startMs) / 1000)
}

function normalizedIso(value: unknown): string | null {
  const raw = firstText(value)
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
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
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) return trimmed
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
