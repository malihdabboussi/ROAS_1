import type { NoteTakerEventConfig, NoteTakerFieldMap } from './note-taker-definition.schema'

/**
 * Guess a note-taker field map from one sample delivery, by key names and by
 * the shape of the values. Deterministic and cheap; the admin confirms the
 * result with the mapping test before saving.
 */

export type FieldMapSuggestion = {
  fieldMap: Partial<NoteTakerFieldMap> & { transcript?: NoteTakerFieldMap['transcript'] }
  event: NoteTakerEventConfig
  /** Human-readable list of what was found, for the dialog. */
  detected: string[]
  /** Required fields the detector could not find. */
  missing: Array<'externalId' | 'transcript'>
}

type Node = { path: string; value: unknown; key: string }

const ID_KEYS = ['session_id', 'meeting_id', 'recording_id', 'transcript_id', 'id', 'uuid']
const TITLE_KEYS = ['title', 'name', 'subject', 'meeting_title']
const START_KEYS = ['start_time', 'started_at', 'start', 'date', 'scheduled_start', 'start_date']
const END_KEYS = ['end_time', 'ended_at', 'end', 'scheduled_end', 'end_date']
const URL_KEYS = ['report_url', 'transcript_url', 'share_url', 'url', 'link', 'meeting_url']
const RECORDING_URL_KEYS = ['recording_url', 'video_url', 'audio_url']
const SUMMARY_KEYS = ['summary', 'overview', 'short_summary', 'notes', 'abstract']
const HOST_KEYS = ['owner', 'host', 'organizer', 'recorded_by', 'creator']
const HOST_EMAIL_KEYS = ['host_email', 'organizer_email', 'owner_email']
const PARTICIPANT_KEYS = ['participants', 'attendees', 'invitees', 'calendar_invitees', 'members']
const TRANSCRIPT_LIST_KEYS = [
  'speaker_blocks',
  'sentences',
  'segments',
  'turns',
  'utterances',
  'transcript',
  'entries',
  'lines',
]
const TEXT_KEYS = ['text', 'words', 'content', 'sentence', 'transcript', 'raw_text']
const SPEAKER_KEYS = ['speaker_name', 'speaker', 'name', 'display_name', 'author']
const TIMESTAMP_KEYS = ['timestamp', 'start_time', 'start', 'time', 'offset']
const ACTION_KEYS = ['action_items', 'actions', 'todos', 'tasks', 'follow_ups', 'next_steps']
const EVENT_KEYS = ['trigger', 'event', 'event_type', 'type', 'eventType']
const DELIVERY_KEYS = ['request_id', 'delivery_id', 'event_id', 'webhook_id', 'idempotency_key']

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HTTP = /^https?:\/\//i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}/

export function suggestFieldMap(sample: Record<string, unknown>): FieldMapSuggestion {
  const nodes = walk(sample)
  const fieldMap: FieldMapSuggestion['fieldMap'] = {}
  const event: NoteTakerEventConfig = {}
  const detected: string[] = []

  const externalId = pickScalar(nodes, ID_KEYS, (v) => isText(v) || typeof v === 'number', 1)
  if (externalId) {
    fieldMap.externalId = externalId.path
    detected.push(`meeting id at ${externalId.path}`)
  }
  const title = pickScalar(nodes, TITLE_KEYS, isText, 1)
  if (title) {
    fieldMap.title = title.path
    detected.push(`title at ${title.path}`)
  }
  const start = pickScalar(nodes, START_KEYS, isDateLike, 1)
  if (start) fieldMap.startTime = start.path
  const end = pickScalar(nodes, END_KEYS, isDateLike, 1)
  if (end) fieldMap.endTime = end.path
  if (start || end) detected.push('start and end times')

  const hostEmail =
    pickScalar(nodes, HOST_EMAIL_KEYS, isEmail, 1) ??
    nodes.find((n) => isEmail(n.value) && HOST_KEYS.some((k) => n.path.startsWith(`${k}.`)))
  if (hostEmail) {
    fieldMap.hostEmail = hostEmail.path
    detected.push(`host email at ${hostEmail.path}`)
  }

  const sourceUrl = pickScalar(nodes, URL_KEYS, (v) => isText(v) && HTTP.test(v), 1)
  if (sourceUrl) fieldMap.sourceUrl = sourceUrl.path
  const recordingUrl = pickScalar(nodes, RECORDING_URL_KEYS, (v) => isText(v) && HTTP.test(v), 2)
  if (recordingUrl) fieldMap.recordingUrl = recordingUrl.path
  const summary = pickScalar(nodes, SUMMARY_KEYS, (v) => isText(v) && v.length >= 20, 2)
  if (summary) {
    fieldMap.summary = summary.path
    detected.push(`summary at ${summary.path}`)
  }

  const transcript = findTranscript(nodes)
  if (transcript) {
    fieldMap.transcript = transcript
    detected.push(`transcript turns at ${transcript.path}`)
  }

  const participants = findParticipants(nodes)
  if (participants) {
    fieldMap.participants = participants
    detected.push(`attendees at ${participants.path}`)
  }

  const actions = findActions(nodes)
  if (actions) {
    fieldMap.actions = actions
    detected.push(`action items at ${actions.path}`)
  }

  const eventType = pickScalar(nodes, EVENT_KEYS, isText, 0)
  if (eventType && isText(eventType.value)) {
    event.eventTypePath = eventType.path
    event.acceptValues = [eventType.value]
    detected.push(`event type "${eventType.value}" at ${eventType.path}`)
  }
  const deliveryId = pickScalar(nodes, DELIVERY_KEYS, (v) => isText(v) || typeof v === 'number', 0)
  if (deliveryId) {
    event.deliveryIdPath = deliveryId.path
    detected.push(`delivery id at ${deliveryId.path}`)
  }

  const missing: FieldMapSuggestion['missing'] = []
  if (!fieldMap.externalId) missing.push('externalId')
  if (!fieldMap.transcript) missing.push('transcript')
  return { fieldMap, event, detected, missing }
}

/** Flatten scalars and containers to dot paths, at most three levels deep, no arrays expanded. */
function walk(value: unknown, prefix = '', depth = 0): Node[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const out: Node[] = []
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    out.push({ path, value: child, key })
    if (depth < 2 && child && typeof child === 'object' && !Array.isArray(child)) {
      out.push(...walk(child, path, depth + 1))
    }
  }
  return out
}

const depthOf = (path: string) => path.split('.').length - 1

function pickScalar(
  nodes: Node[],
  keys: string[],
  accept: (value: unknown) => boolean,
  maxDepth: number,
): Node | undefined {
  for (const key of keys) {
    const hit = nodes
      .filter((n) => n.key.toLowerCase() === key && depthOf(n.path) <= maxDepth && accept(n.value))
      .sort((a, b) => depthOf(a.path) - depthOf(b.path))[0]
    if (hit) return hit
  }
  return undefined
}

function findTranscript(nodes: Node[]): NoteTakerFieldMap['transcript'] | undefined {
  const candidates = nodes
    .filter((n) => Array.isArray(n.value) && (n.value as unknown[]).length > 0)
    .map((n) => ({ node: n, first: (n.value as unknown[])[0] }))
    .filter(({ first }) => first && typeof first === 'object' && !Array.isArray(first))
    .map(({ node, first }) => {
      const record = first as Record<string, unknown>
      const textKey = TEXT_KEYS.find((k) => isText(record[k]))
      if (!textKey) return null
      const named = TRANSCRIPT_LIST_KEYS.includes(node.key.toLowerCase())
      const speakerPath = findSpeakerPath(record)
      const score = (named ? 2 : 0) + (speakerPath ? 1 : 0)
      const timestampKey = TIMESTAMP_KEYS.find((k) => record[k] !== undefined && record[k] !== null)
      return { node, textKey, speakerPath, timestampKey, score }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.score - a.score)
  const best = candidates[0]
  if (!best || best.score === 0) return undefined
  return {
    path: `${best.node.path}[]`,
    text: best.textKey,
    ...(best.speakerPath ? { speaker: best.speakerPath } : {}),
    ...(best.timestampKey ? { timestamp: best.timestampKey } : {}),
  }
}

function findSpeakerPath(record: Record<string, unknown>): string | undefined {
  for (const key of SPEAKER_KEYS) {
    const value = record[key]
    if (isText(value)) return key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const inner = value as Record<string, unknown>
      const innerKey = ['name', 'display_name', 'label'].find((k) => isText(inner[k]))
      if (innerKey) return `${key}.${innerKey}`
    }
  }
  return undefined
}

function findParticipants(nodes: Node[]): NoteTakerFieldMap['participants'] | undefined {
  for (const key of PARTICIPANT_KEYS) {
    const node = nodes.find((n) => n.key.toLowerCase() === key && Array.isArray(n.value))
    if (!node) continue
    const list = node.value as unknown[]
    if (list.length === 0) return { path: `${node.path}[]` }
    const first = list[0]
    if (isText(first)) return { path: `${node.path}[]` }
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const record = first as Record<string, unknown>
      const emailKey = Object.keys(record).find((k) => isEmail(record[k])) ?? 'email'
      const nameKey = ['name', 'display_name', 'full_name'].find((k) => isText(record[k]))
      return { path: `${node.path}[]`, email: emailKey, ...(nameKey ? { name: nameKey } : {}) }
    }
  }
  return undefined
}

function findActions(nodes: Node[]): NoteTakerFieldMap['actions'] | undefined {
  for (const key of ACTION_KEYS) {
    const node = nodes.find((n) => n.key.toLowerCase() === key && Array.isArray(n.value))
    if (!node) continue
    const first = (node.value as unknown[])[0]
    if (first === undefined || isText(first)) return { path: `${node.path}[]`, text: 'text' }
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const record = first as Record<string, unknown>
      const textKey =
        ['text', 'description', 'title', 'content', 'item'].find((k) => isText(record[k])) ?? 'text'
      const assignee = record.assignee
      const assigneeRecord =
        assignee && typeof assignee === 'object' && !Array.isArray(assignee)
          ? (assignee as Record<string, unknown>)
          : null
      return {
        path: `${node.path}[]`,
        text: textKey,
        ...(assigneeRecord && isText(assigneeRecord.name) ? { assigneeName: 'assignee.name' } : {}),
        ...(assigneeRecord && isEmail(assigneeRecord.email)
          ? { assigneeEmail: 'assignee.email' }
          : {}),
      }
    }
  }
  return undefined
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isEmail(value: unknown): boolean {
  return isText(value) && EMAIL.test(value.trim())
}

function isDateLike(value: unknown): boolean {
  if (typeof value === 'number') return value > 1_000_000_000
  return isText(value) && (ISO_DATE.test(value) || /^\d{10,13}$/.test(value))
}
