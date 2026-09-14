import type {
  TranscriptSourceAction,
  TranscriptSourceEvent,
  TranscriptTurn,
} from '../providers/transcript-source.types'
import { readList, readText, readValue } from './json-path-lite'
import type { NoteTakerDefinition, NoteTakerFieldMap } from './note-taker-definition.schema'

type Definition = Pick<NoteTakerDefinition, 'slug' | 'displayName' | 'fieldMap'>

/**
 * Any note taker's JSON → the provider-agnostic transcript event, driven by
 * the field map an admin saved with the definition. No provider code.
 */
export function normalizeMappedMeetingSource(
  raw: Record<string, unknown>,
  definition: Definition,
): TranscriptSourceEvent {
  const map = definition.fieldMap
  const externalRecordingId = readText(raw, map.externalId)
  if (!externalRecordingId) {
    throw new Error(`${definition.displayName}: no meeting id at "${map.externalId}"`)
  }
  const recordingStart = normalizedIso(readText(raw, map.startTime))
  const recordingEnd = normalizedIso(readText(raw, map.endTime))
  const hostEmail = normalizedEmail(readText(raw, map.hostEmail))

  return {
    provider: definition.slug,
    providerDisplayName: definition.displayName,
    kind: 'meeting',
    externalRecordingId,
    providerMeetingId: null,
    calendarEventId: null,
    title: readText(raw, map.title) ?? 'Untitled Meeting',
    recordingUrl: httpUrl(readText(raw, map.recordingUrl)),
    sourceUrl: httpUrl(readText(raw, map.sourceUrl)),
    mediaUrl: null,
    hostEmail,
    scheduledStart: null,
    scheduledEnd: null,
    recordingStart,
    recordingEnd,
    durationSeconds: durationSeconds(recordingStart, recordingEnd),
    participantEmails: collectParticipantEmails(raw, map, hostEmail),
    providerSummary: readText(raw, map.summary),
    actions: normalizeActions(raw, map, definition.slug, externalRecordingId),
    transcript: normalizeTranscript(raw, map),
    raw,
  }
}

function normalizeTranscript(
  raw: Record<string, unknown>,
  map: NoteTakerFieldMap,
): TranscriptTurn[] {
  const { transcript } = map
  return readList(raw, transcript.path).flatMap((entry) => {
    const text = readText(entry, transcript.text)
    if (!text) return []
    return [
      {
        speakerName: readText(entry, transcript.speaker) ?? 'Speaker',
        speakerEmail: null,
        timestamp: readText(entry, transcript.timestamp),
        text,
      },
    ]
  })
}

function normalizeActions(
  raw: Record<string, unknown>,
  map: NoteTakerFieldMap,
  slug: string,
  externalRecordingId: string,
): TranscriptSourceAction[] {
  if (!map.actions) return []
  const { actions } = map
  return readList(raw, actions.path).flatMap((entry, index) => {
    // A list of plain strings maps `text` onto the entry itself.
    const sourceText =
      typeof entry === 'string' ? entry.trim() : (readText(entry, actions.text) ?? '')
    if (!sourceText) return []
    return [
      {
        sourceKey: `${slug}:${externalRecordingId}:action:${index}`,
        sourceText,
        assigneeName: readText(entry, actions.assigneeName),
        assigneeEmail: normalizedEmail(readText(entry, actions.assigneeEmail)),
        recordingTimestamp: null,
        recordingPlaybackUrl: null,
        completed: false,
        userGenerated: false,
        raw:
          typeof entry === 'object' && entry
            ? (entry as Record<string, unknown>)
            : { text: sourceText },
      },
    ]
  })
}

function collectParticipantEmails(
  raw: Record<string, unknown>,
  map: NoteTakerFieldMap,
  hostEmail: string | null,
): string[] {
  const emails = new Set<string>()
  if (hostEmail) emails.add(hostEmail)
  if (map.participants) {
    const { participants } = map
    for (const entry of readList(raw, participants.path)) {
      const candidate =
        typeof entry === 'string' ? entry : readText(entry, participants.email ?? 'email')
      const email = normalizedEmail(candidate)
      if (email) emails.add(email)
    }
  }
  return [...emails]
}

function durationSeconds(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const ms = Date.parse(end) - Date.parse(start)
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms / 1000) : null
}

function normalizedIso(value: string | null): string | null {
  if (!value) return null
  // Epoch seconds or milliseconds arrive as digit strings.
  const numeric = /^\d+$/.test(value) ? Number(value) : NaN
  const parsed = Number.isFinite(numeric)
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function normalizedEmail(value: string | null): string | null {
  const raw = value?.toLowerCase() ?? ''
  return raw.includes('@') ? raw : null
}

function httpUrl(value: string | null): string | null {
  return value && /^https?:\/\//i.test(value) ? value : null
}

/** Exposed for the preview endpoint: a compact look at what a payload maps to. */
export function summarizeMappedSource(source: TranscriptSourceEvent) {
  return {
    externalId: source.externalRecordingId,
    title: source.title,
    recordingStart: source.recordingStart,
    recordingEnd: source.recordingEnd,
    hostEmail: source.hostEmail,
    participantEmails: source.participantEmails,
    transcriptTurns: source.transcript.length,
    firstTurn: source.transcript[0] ?? null,
    actions: source.actions.map((action) => action.sourceText),
    summaryPreview: source.providerSummary?.slice(0, 200) ?? null,
    sourceUrl: source.sourceUrl,
  }
}

export function readEventType(
  raw: Record<string, unknown>,
  path: string | undefined,
): string | null {
  if (!path) return null
  const value = readValue(raw, path)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
