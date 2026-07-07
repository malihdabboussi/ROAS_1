import type { InteractionEnvelopeV1, InteractionParticipant } from '@vibey/api-shared'

// Fathom channel adapter for the customer signal loop: raw webhook event in,
// normalized interaction envelope out. All Fathom-specific parsing (transcript
// shape, calendar invitees, title/started_at fallbacks) lives HERE — the
// brain-ops worker only ever sees the envelope. Pure function, no I/O.

interface FathomTranscriptEntry {
  speaker?: { display_name?: string; name?: string }
  text?: string
}

interface FathomInvitee {
  email?: string
  name?: string
  display_name?: string
  matched_speaker_display_name?: string
}

function extractTranscript(event: Record<string, unknown>): {
  text: string
  messageCount: number
} | null {
  const raw = (event as { transcript?: unknown }).transcript
  if (!Array.isArray(raw) || raw.length === 0) return null
  const lines: string[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as FathomTranscriptEntry
    const speaker = (item.speaker?.display_name ?? item.speaker?.name ?? 'Unknown').trim()
    const text = (item.text ?? '').trim()
    if (!text) continue
    lines.push(`${speaker}: ${text}`)
  }
  if (lines.length === 0) return null
  return { text: lines.join('\n'), messageCount: lines.length }
}

function extractTitle(event: Record<string, unknown>): string {
  const candidate = event as { title?: string; meeting_title?: string }
  return (candidate.title || candidate.meeting_title || 'Untitled Meeting').toString()
}

function extractStartedAt(event: Record<string, unknown>): string | null {
  const candidate = event as {
    started_at?: string
    recorded_at?: string
    meeting_start?: string
    recording_start_time?: string
    scheduled_start_time?: string
    created_at?: string
  }
  return (
    candidate.started_at ||
    candidate.recorded_at ||
    candidate.meeting_start ||
    candidate.recording_start_time ||
    candidate.scheduled_start_time ||
    candidate.created_at ||
    null
  )
}

function extractEndedAt(event: Record<string, unknown>): string | null {
  const candidate = event as {
    ended_at?: string
    meeting_end?: string
    recording_end_time?: string
    scheduled_end_time?: string
  }
  return (
    candidate.ended_at ||
    candidate.meeting_end ||
    candidate.recording_end_time ||
    candidate.scheduled_end_time ||
    null
  )
}

function extractParticipants(event: Record<string, unknown>): InteractionParticipant[] {
  const raw =
    (event as { calendar_invitees?: unknown }).calendar_invitees ??
    (event as { attendees?: unknown }).attendees ??
    (event as { invitees?: unknown }).invitees
  if (!Array.isArray(raw)) return []

  const recordedByEmail = ((event as { recorded_by?: { email?: string } }).recorded_by?.email ?? '')
    .trim()
    .toLowerCase()

  const participants: InteractionParticipant[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const invitee = entry as FathomInvitee
    const email = (invitee.email ?? '').trim().toLowerCase()
    if (!email) continue
    const name =
      (invitee.name ?? invitee.display_name ?? invitee.matched_speaker_display_name ?? null)
        ?.toString()
        .trim() || null
    participants.push({
      // The host is the only participant we can classify here; everyone else
      // is 'unknown' on purpose — Atlas judges customer vs vendor vs peer.
      role: recordedByEmail && email === recordedByEmail ? 'team' : 'unknown',
      name,
      identifiers: [{ kind: 'email', value: email }],
    })
  }
  return participants
}

export function buildFathomEnvelope(
  event: Record<string, unknown>,
  meetingId: string,
): InteractionEnvelopeV1 | null {
  const transcript = extractTranscript(event)
  if (!transcript) return null

  const startedAt = extractStartedAt(event) ?? new Date().toISOString()
  const endedAt = extractEndedAt(event) ?? startedAt

  return {
    v: 1,
    channel: 'fathom',
    source_id: meetingId,
    title: extractTitle(event),
    window: { from: startedAt, to: endedAt },
    participants: extractParticipants(event),
    content: {
      format: 'transcript',
      text: transcript.text,
      message_count: transcript.messageCount,
    },
  }
}
