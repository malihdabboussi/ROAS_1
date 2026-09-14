import type { TranscriptSourceEvent } from './transcript-source.types'

export const EMBEDDED_SOURCE_KEY = 'transcript_source'

/**
 * Bridge a normalized transcript into the recording-event shape the Meetings
 * space route (`processFathomRecordingEvent`) already reads. Fathom events pass
 * through untouched so nothing changes for Fathom; other providers get the
 * same field names built from the normalized source. The normalized source
 * rides along under `transcript_source` so downstream ingestion keeps the real
 * provider instead of re-normalizing as Fathom.
 */
export function toRecordingEvent(source: TranscriptSourceEvent): Record<string, unknown> {
  if (source.provider === 'fathom') {
    return { ...source.raw, provider: 'fathom', [EMBEDDED_SOURCE_KEY]: source }
  }
  return {
    provider: source.provider,
    id: source.externalRecordingId,
    recording_id: source.externalRecordingId,
    ...(source.providerMeetingId ? { meeting_id: source.providerMeetingId } : {}),
    ...(source.calendarEventId ? { calendar_event_id: source.calendarEventId } : {}),
    title: source.title,
    ...((source.recordingUrl ?? source.sourceUrl)
      ? {
          url: source.recordingUrl ?? source.sourceUrl,
          share_url: source.sourceUrl ?? source.recordingUrl,
        }
      : {}),
    ...(source.scheduledStart ? { scheduled_start_time: source.scheduledStart } : {}),
    ...(source.scheduledEnd ? { scheduled_end_time: source.scheduledEnd } : {}),
    ...(source.recordingStart ? { recording_start_time: source.recordingStart } : {}),
    ...(source.recordingEnd ? { recording_end_time: source.recordingEnd } : {}),
    ...(source.hostEmail ? { recorded_by: { email: source.hostEmail } } : {}),
    calendar_invitees: source.participantEmails.map((email) => ({
      email,
      name: speakerNameFor(source, email),
    })),
    transcript: source.transcript.map((turn) => ({
      speaker: {
        display_name: turn.speakerName,
        ...(turn.speakerEmail ? { email: turn.speakerEmail } : {}),
      },
      text: turn.text,
      ...(turn.timestamp ? { timestamp: turn.timestamp } : {}),
    })),
    ...(source.providerSummary
      ? {
          default_summary: {
            template_name: 'provider',
            markdown_formatted: source.providerSummary,
          },
        }
      : {}),
    action_items: source.actions.map((action) => ({
      description: action.sourceText,
      completed: action.completed,
      user_generated: action.userGenerated,
      ...(action.assigneeName || action.assigneeEmail
        ? { assignee: { name: action.assigneeName ?? '', email: action.assigneeEmail ?? '' } }
        : {}),
    })),
    [EMBEDDED_SOURCE_KEY]: source,
  }
}

/** Read the normalized source a bridged event carries, if any. */
export function readEmbeddedSource(
  event: Record<string, unknown> | null | undefined,
): TranscriptSourceEvent | null {
  const candidate = event?.[EMBEDDED_SOURCE_KEY]
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null
  const source = candidate as Partial<TranscriptSourceEvent>
  if (
    typeof source.provider !== 'string' ||
    typeof source.externalRecordingId !== 'string' ||
    !Array.isArray(source.transcript) ||
    !Array.isArray(source.actions)
  ) {
    return null
  }
  return source as TranscriptSourceEvent
}

function speakerNameFor(source: TranscriptSourceEvent, email: string): string | undefined {
  const turn = source.transcript.find((entry) => entry.speakerEmail === email)
  return turn?.speakerName
}
