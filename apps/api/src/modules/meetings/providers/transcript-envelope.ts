import type { InteractionEnvelopeV1, InteractionParticipant } from '@vibey/api-shared'
import type { TranscriptSourceEvent } from './transcript-source.types'

/**
 * Normalized transcript in, customer-signal interaction envelope out.
 * Pure function, no I/O. Returns null when there is nothing to analyze.
 */
export function buildTranscriptEnvelope(
  source: TranscriptSourceEvent,
): InteractionEnvelopeV1 | null {
  const lines: string[] = []
  for (const turn of source.transcript) {
    const text = turn.text.trim()
    if (!text) continue
    lines.push(`${turn.speakerName.trim() || 'Unknown'}: ${text}`)
  }
  if (lines.length === 0) return null

  const startedAt = source.recordingStart ?? source.scheduledStart ?? new Date().toISOString()
  const endedAt = source.recordingEnd ?? source.scheduledEnd ?? startedAt
  const host = source.hostEmail?.trim().toLowerCase() ?? ''

  const participants: InteractionParticipant[] = source.participantEmails.map((email) => ({
    // The host is the only participant we can classify here; everyone else
    // is 'unknown' on purpose — Atlas judges customer vs vendor vs peer.
    role: host && email === host ? 'team' : 'unknown',
    name: participantName(source, email),
    identifiers: [{ kind: 'email', value: email }],
  }))

  return {
    v: 1,
    channel: source.provider,
    source_id: source.externalRecordingId,
    title: source.title,
    window: { from: startedAt, to: endedAt },
    participants,
    content: { format: 'transcript', text: lines.join('\n'), message_count: lines.length },
  }
}

function participantName(source: TranscriptSourceEvent, email: string): string | null {
  const turn = source.transcript.find((entry) => entry.speakerEmail === email)
  if (turn?.speakerName?.trim()) return turn.speakerName.trim()
  const raw = source.raw
  for (const key of ['calendar_invitees', 'attendees', 'invitees', 'participants', 'shared_with']) {
    const rows = raw[key]
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const person = row as Record<string, unknown>
      const candidate = typeof person.email === 'string' ? person.email.trim().toLowerCase() : ''
      if (candidate !== email) continue
      const name = person.name ?? person.display_name ?? person.matched_speaker_display_name
      if (typeof name === 'string' && name.trim()) return name.trim()
    }
  }
  return null
}
