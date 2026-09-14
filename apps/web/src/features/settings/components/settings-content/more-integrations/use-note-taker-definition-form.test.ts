import { describe, expect, it } from 'vitest'
import {
  buildDefinitionInput,
  EMPTY_NOTE_TAKER_FORM,
  parseSamplePayload,
  type NoteTakerFormState,
} from './use-note-taker-definition-form'

const filled: NoteTakerFormState = {
  ...EMPTY_NOTE_TAKER_FORM,
  displayName: ' Otter ',
  description: 'Otter into ROAS',
  logoUrl: 'https://cdn.example.com/otter.png',
  signatureHeader: 'X-Otter-Signature',
  signaturePrefix: 'sha256=',
  eventTypePath: 'event',
  acceptValues: 'meeting.completed, meeting.summarized',
  deliveryIdPath: 'request_id',
  externalIdPath: 'meeting.id',
  titlePath: 'meeting.title',
  participantsPath: 'participants[]',
  participantEmailPath: 'email',
  transcriptPath: 'transcript.blocks[]',
  transcriptSpeakerPath: 'speaker.name',
  transcriptTextPath: 'words',
  actionsPath: 'action_items[]',
  actionTextPath: 'text',
}

describe('buildDefinitionInput', () => {
  it('builds the exact API body, trimming and dropping empty optionals', () => {
    const built = buildDefinitionInput(filled)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.input).toEqual({
      displayName: 'Otter',
      description: 'Otter into ROAS',
      logoUrl: 'https://cdn.example.com/otter.png',
      signature: {
        scheme: 'hmac_sha256',
        header: 'X-Otter-Signature',
        encoding: 'hex',
        prefix: 'sha256=',
        keyEncoding: 'utf8',
      },
      event: {
        eventTypePath: 'event',
        acceptValues: ['meeting.completed', 'meeting.summarized'],
        deliveryIdPath: 'request_id',
      },
      fieldMap: {
        externalId: 'meeting.id',
        title: 'meeting.title',
        participants: { path: 'participants[]', email: 'email' },
        transcript: { path: 'transcript.blocks[]', text: 'words', speaker: 'speaker.name' },
        actions: { path: 'action_items[]', text: 'text' },
      },
    })
  })

  it('omits the header block and event filter for an unsigned tool with no filter', () => {
    const built = buildDefinitionInput({
      ...EMPTY_NOTE_TAKER_FORM,
      displayName: 'Plain',
      signatureScheme: 'none',
      externalIdPath: 'id',
      transcriptPath: 'turns[]',
      transcriptTextPath: 'text',
    })
    expect(built).toEqual({
      ok: true,
      input: {
        displayName: 'Plain',
        signature: { scheme: 'none' },
        event: {},
        fieldMap: { externalId: 'id', transcript: { path: 'turns[]', text: 'text' } },
      },
    })
  })

  it('reports every field problem at once', () => {
    const built = buildDefinitionInput({
      ...EMPTY_NOTE_TAKER_FORM,
      displayName: 'O',
      logoUrl: 'ftp://nope',
      signatureHeader: 'not a header',
      titlePath: 'a..b',
      actionsPath: 'items[]',
    })
    expect(built.ok).toBe(false)
    if (built.ok) return
    expect(Object.keys(built.errors).sort()).toEqual([
      'actionTextPath',
      'displayName',
      'externalIdPath',
      'logoUrl',
      'signatureHeader',
      'titlePath',
      'transcriptPath',
      'transcriptTextPath',
    ])
  })
})

describe('parseSamplePayload', () => {
  it('accepts one JSON object and nothing else', () => {
    expect(parseSamplePayload('{"a":1}')).toEqual({ a: 1 })
    expect(parseSamplePayload('[1]')).toBeNull()
    expect(parseSamplePayload('nope')).toBeNull()
    expect(parseSamplePayload('')).toBeNull()
  })
})
