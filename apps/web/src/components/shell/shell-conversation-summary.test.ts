import { describe, expect, it } from 'vitest'
import type { Message } from '@/lib/conversations'
import {
  extractConversationFileRows,
  extractConversationSourceRows,
  extractConversationTaskRows,
} from './shell-conversation-summary'

function message(overrides: Partial<Message>): Message {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: null,
    content_blocks: null,
    metadata: {},
    created_at: '2026-07-17T20:00:00.000Z',
    ...overrides,
  }
}

describe('shell conversation summary', () => {
  it('extracts completed agent work from persisted tool activity', () => {
    const rows = extractConversationTaskRows([
      message({
        metadata: {
          content_blocks_ordered: [
            { type: 'tool', id: 'done-1', label: 'Created proposal', state: 'complete' },
            { type: 'tool', id: 'active-1', label: 'Still researching', state: 'active' },
          ],
        },
      }),
    ])

    expect(rows).toEqual([
      expect.objectContaining({ id: 'done-1', title: 'Created proposal', state: 'complete' }),
    ])
  })

  it('extracts attached files, artifacts, generated media, references, and links', () => {
    const rows = [
      message({
        content: 'Research: [Market report](https://example.com/report)',
        metadata: {
          documents: [
            {
              filename: 'brief.pdf',
              type: 'text',
              fileUrl: 'https://cdn.example.com/brief.pdf',
              mimeType: 'application/pdf',
            },
          ],
          highlighted_artifacts: [{ id: 'offer-1', type: 'offer', label: 'Core offer' }],
          message_references: [{ id: 'mission-1', kind: 'mission', label: 'Proposal mission' }],
          content_blocks_ordered: [
            {
              type: 'artifact_preview',
              id: 'mission-card-1',
              artifactType: 'mission',
              artifactId: 'mission-1',
              name: 'Client Strategy',
              subtitle: 'General / Meetings · Started from this chat',
            },
            {
              type: 'media_asset',
              id: 'image-1',
              title: 'Proposal cover',
              kind: 'image',
              url: 'https://cdn.example.com/cover.png',
            },
          ],
        },
      }),
    ]

    expect(extractConversationFileRows(rows).map((row) => row.title)).toEqual([
      'brief.pdf',
      'Core offer',
      'Client Strategy',
      'Proposal cover',
    ])
    expect(extractConversationFileRows(rows)[2]).toMatchObject({
      messageId: 'message-1',
      subtitle: 'General / Meetings · Started from this chat',
    })
    expect(extractConversationSourceRows(rows).map((row) => row.title)).toEqual([
      'Proposal mission',
      'Market report',
    ])
  })
})
