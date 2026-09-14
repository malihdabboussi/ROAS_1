import type {
  TranscriptSourceAction,
  TranscriptSourceEvent,
  TranscriptTurn,
} from './transcript-source.types'

/**
 * Read.ai `meeting_end` webhook payload → provider-agnostic transcript event.
 * Field names follow support.read.ai "Getting Started with Webhooks":
 * session_id, title, start_time, end_time, participants[], owner, summary,
 * action_items[{text}], key_questions[{text}], topics[{text}], report_url,
 * chapter_summaries[{title,description,topics}], transcript{speaker_blocks[]},
 * platform_meeting_id, platform, request_id.
 */
export function normalizeReadAiMeetingSource(raw: Record<string, unknown>): TranscriptSourceEvent {
  const externalRecordingId = firstText(raw.session_id)
  if (!externalRecordingId) throw new Error('Read.ai session_id is required')

  const recordingStart = normalizedIso(raw.start_time)
  const recordingEnd = normalizedIso(raw.end_time)
  const owner = objectRecord(raw.owner)
  const hostEmail = normalizedEmail(owner.email)
  const transcript = normalizeSpeakerBlocks(raw.transcript, recordingStart)

  return {
    provider: 'read_ai',
    kind: 'meeting',
    externalRecordingId,
    providerMeetingId: firstText(raw.platform_meeting_id),
    calendarEventId: null,
    title: firstText(raw.title) ?? 'Untitled Meeting',
    recordingUrl: null,
    sourceUrl: httpUrl(raw.report_url),
    mediaUrl: null,
    hostEmail,
    scheduledStart: null,
    scheduledEnd: null,
    recordingStart,
    recordingEnd,
    durationSeconds: durationSeconds(recordingStart, recordingEnd),
    participantEmails: collectParticipantEmails(raw.participants, hostEmail),
    providerSummary: buildSummary(raw),
    actions: normalizeActions(raw.action_items, externalRecordingId),
    transcript,
    raw,
  }
}

function normalizeSpeakerBlocks(value: unknown, recordingStart: string | null): TranscriptTurn[] {
  const blocks = objectRecord(value).speaker_blocks
  if (!Array.isArray(blocks)) return []
  const startMs = recordingStart ? Date.parse(recordingStart) : NaN
  return blocks.flatMap((entry) => {
    const block = objectRecord(entry)
    const text = firstText(block.words)
    if (!text) return []
    return [
      {
        speakerName: firstText(objectRecord(block.speaker).name) ?? 'Speaker',
        speakerEmail: null,
        timestamp: blockTimestamp(block.start_time, startMs),
        text,
      },
    ]
  })
}

function blockTimestamp(value: unknown, startMs: number): string | null {
  const ms = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(ms)) return null
  if (!Number.isFinite(startMs)) return new Date(ms).toISOString()
  const seconds = Math.max(0, Math.floor((ms - startMs) / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function buildSummary(raw: Record<string, unknown>): string | null {
  const parts: string[] = []
  const summary = firstText(raw.summary)
  if (summary) parts.push(summary)
  const chapters = listOfRecords(raw.chapter_summaries)
    .map((chapter) => {
      const title = firstText(chapter.title)
      const description = firstText(chapter.description)
      if (!title && !description) return null
      return `- ${[title, description].filter(Boolean).join(': ')}`
    })
    .filter((line): line is string => Boolean(line))
  if (chapters.length > 0) parts.push(['Chapters:', ...chapters].join('\n'))
  const questions = textList(raw.key_questions)
  if (questions.length > 0)
    parts.push(['Key questions:', ...questions.map((q) => `- ${q}`)].join('\n'))
  const topics = textList(raw.topics)
  if (topics.length > 0) parts.push(`Topics: ${topics.join(', ')}`)
  return parts.length > 0 ? parts.join('\n\n') : null
}

function normalizeActions(value: unknown, externalRecordingId: string): TranscriptSourceAction[] {
  return textList(value).map((sourceText, index) => ({
    sourceKey: `read_ai:${externalRecordingId}:action:${index}`,
    sourceText,
    assigneeName: null,
    assigneeEmail: null,
    recordingTimestamp: null,
    recordingPlaybackUrl: null,
    completed: false,
    userGenerated: false,
    raw: { text: sourceText },
  }))
}

function collectParticipantEmails(value: unknown, hostEmail: string | null): string[] {
  const emails = new Set<string>()
  if (hostEmail) emails.add(hostEmail)
  for (const participant of listOfRecords(value)) {
    const email = normalizedEmail(participant.email)
    if (email) emails.add(email)
  }
  return [...emails]
}

/** `[{ text }]` lists (action items, key questions, topics) → trimmed strings. */
function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) =>
      typeof entry === 'string' ? entry.trim() : (firstText(objectRecord(entry).text) ?? ''),
    )
    .filter(Boolean)
}

function listOfRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(objectRecord) : []
}

function durationSeconds(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const ms = Date.parse(end) - Date.parse(start)
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms / 1000) : null
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
