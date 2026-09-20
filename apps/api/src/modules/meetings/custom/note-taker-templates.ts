import type { NoteTakerDefinitionInput } from './note-taker-definition.schema'

/**
 * Ready-made definitions for payload shapes we know. An admin picks one,
 * changes the name and header if needed, and saves. Field names follow the
 * providers' published schemas (see the matching normalizers in
 * ../providers for Read AI and Fireflies).
 */
export type NoteTakerTemplate = {
  key: 'read_ai_report' | 'fireflies_transcript' | 'generic_turns'
  label: string
  description: string
  definition: Omit<NoteTakerDefinitionInput, 'displayName'> & { displayName?: string }
}

export const NOTE_TAKER_TEMPLATES: NoteTakerTemplate[] = [
  {
    key: 'read_ai_report',
    label: 'Read AI style report',
    description:
      'session_id, title, start_time, end_time, owner, participants, summary, action_items, transcript.speaker_blocks, request_id; signed with X-Read-Signature (hex, base64 key).',
    definition: {
      signature: {
        scheme: 'hmac_sha256',
        header: 'X-Read-Signature',
        encoding: 'hex',
        keyEncoding: 'base64',
      },
      event: {
        eventTypePath: 'trigger',
        acceptValues: ['meeting_end'],
        deliveryIdPath: 'request_id',
      },
      fieldMap: {
        externalId: 'session_id',
        title: 'title',
        startTime: 'start_time',
        endTime: 'end_time',
        hostEmail: 'owner.email',
        sourceUrl: 'report_url',
        summary: 'summary',
        participants: { path: 'participants[]', email: 'email', name: 'name' },
        transcript: {
          path: 'transcript.speaker_blocks[]',
          speaker: 'speaker.name',
          text: 'words',
          timestamp: 'start_time',
        },
        actions: { path: 'action_items[]', text: 'text' },
      },
    },
  },
  {
    key: 'fireflies_transcript',
    label: 'Fireflies style transcript',
    description:
      'id, title, date, host_email, participants (emails), summary.overview, summary.action_items, sentences[{speaker_name, text}], transcript_url; signed with x-hub-signature (hex).',
    definition: {
      signature: {
        scheme: 'hmac_sha256',
        header: 'x-hub-signature',
        encoding: 'hex',
        keyEncoding: 'utf8',
      },
      event: {},
      fieldMap: {
        externalId: 'id',
        title: 'title',
        startTime: 'date',
        hostEmail: 'host_email',
        sourceUrl: 'transcript_url',
        recordingUrl: 'video_url',
        summary: 'summary.overview',
        participants: { path: 'participants[]' },
        transcript: {
          path: 'sentences[]',
          speaker: 'speaker_name',
          text: 'text',
          timestamp: 'start_time',
        },
        actions: { path: 'summary.action_items[]', text: 'text' },
      },
    },
  },
  {
    key: 'generic_turns',
    label: 'Simple: speakers and text',
    description:
      'A flat meeting object: id, title, started_at, ended_at, host_email, participants[{email}], transcript[{speaker, text}], action_items[{text}], summary; signed with X-Signature (hex).',
    definition: {
      signature: {
        scheme: 'hmac_sha256',
        header: 'X-Signature',
        encoding: 'hex',
        keyEncoding: 'utf8',
      },
      event: {
        eventTypePath: 'event',
        acceptValues: ['meeting.completed'],
        deliveryIdPath: 'delivery_id',
      },
      fieldMap: {
        externalId: 'id',
        title: 'title',
        startTime: 'started_at',
        endTime: 'ended_at',
        hostEmail: 'host_email',
        summary: 'summary',
        participants: { path: 'participants[]', email: 'email' },
        transcript: { path: 'transcript[]', speaker: 'speaker', text: 'text' },
        actions: { path: 'action_items[]', text: 'text' },
      },
    },
  },
]
