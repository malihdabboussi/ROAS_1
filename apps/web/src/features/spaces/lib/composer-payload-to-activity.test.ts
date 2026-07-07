import { describe, expect, it } from 'vitest'
import { mapComposerAttachments, mapComposerMentions } from './composer-payload-to-activity'

describe('composer payload to activity', () => {
  it('maps composer mentions to activity mentions without changing fields', () => {
    expect(
      mapComposerMentions([
        { type: 'user', user_id: 'user-1', label: 'Ada' },
        { type: 'doc', entity_id: 'doc-1', label: 'Plan' },
      ]),
    ).toEqual([
      { type: 'user', user_id: 'user-1', agent_key: undefined, entity_id: undefined, label: 'Ada' },
      { type: 'doc', user_id: undefined, agent_key: undefined, entity_id: 'doc-1', label: 'Plan' },
    ])
  })

  it('derives filenames and common mime types from attachment URLs', () => {
    expect(
      mapComposerAttachments([
        'https://cdn.example.com/folder/Launch%20Plan.pdf?download=1',
        'not a url',
      ]),
    ).toEqual([
      {
        filename: 'Launch Plan.pdf',
        mimeType: 'application/pdf',
        fileUrl: 'https://cdn.example.com/folder/Launch%20Plan.pdf?download=1',
      },
      {
        filename: 'attachment',
        mimeType: 'application/octet-stream',
        fileUrl: 'not a url',
      },
    ])
  })
})
