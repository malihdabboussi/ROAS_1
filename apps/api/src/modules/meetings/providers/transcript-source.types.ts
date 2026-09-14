/**
 * Provider-agnostic transcript contract.
 *
 * Every note taker (Fathom, Fireflies, Read.ai, future tools) normalizes its raw
 * payload into `TranscriptSourceEvent`. Everything downstream (brain import,
 * customer-brain envelope, Meetings space) consumes only this shape.
 */

export const MEETING_PROVIDER_IDS = ['fathom', 'fireflies', 'read_ai'] as const

export type MeetingProviderId = (typeof MEETING_PROVIDER_IDS)[number]

export function isMeetingProviderId(value: unknown): value is MeetingProviderId {
  return typeof value === 'string' && (MEETING_PROVIDER_IDS as readonly string[]).includes(value)
}

/** Meetings are the first kind; the shape leaves room for calls, recordings and uploads. */
export type TranscriptSourceKind = 'meeting' | 'call' | 'recording' | 'upload'

export type TranscriptTurn = {
  speakerName: string
  speakerEmail: string | null
  timestamp: string | null
  text: string
}

export type TranscriptSourceAction = {
  sourceKey: string
  sourceText: string
  assigneeName: string | null
  assigneeEmail: string | null
  recordingTimestamp: string | null
  recordingPlaybackUrl: string | null
  completed: boolean
  userGenerated: boolean
  raw: Record<string, unknown>
  evidence?: {
    sourceKind: 'meeting_transcript' | 'meeting_summary'
    excerpt: string
    speakerName: string | null
    timestamp: string | null
    transcriptTurnIndex: number | null
  }
  /** Present when the LLM judgment pass rewrote or annotated this action. */
  refinement?: { original_text: string; why?: string }
}

export type TranscriptSourceEvent = {
  provider: MeetingProviderId
  kind: TranscriptSourceKind
  externalRecordingId: string
  providerMeetingId: string | null
  calendarEventId: string | null
  title: string
  /** Playable recording (video/audio) when the provider exposes one. */
  recordingUrl: string | null
  /** The provider's own page for this meeting (report, transcript view). */
  sourceUrl: string | null
  /** Raw media to transcribe when a provider delivers audio/video without text. */
  mediaUrl: string | null
  /** Email of the person who recorded or owns the meeting, when known. */
  hostEmail: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  recordingStart: string | null
  recordingEnd: string | null
  durationSeconds: number | null
  participantEmails: string[]
  providerSummary: string | null
  actions: TranscriptSourceAction[]
  transcript: TranscriptTurn[]
  raw: Record<string, unknown>
}
