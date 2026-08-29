import { describe, expect, it } from 'vitest'
import type { Message } from '@/lib/conversations'
import {
  extractConversationFileRows,
  extractConversationMissionRows,
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
  it('extracts live progress and completed agent work from persisted tool activity', () => {
    const rows = extractConversationTaskRows([
      message({
        metadata: {
          content_blocks_ordered: [
            { type: 'tool', id: 'done-1', label: 'Created proposal', state: 'complete' },
            {
              type: 'tool',
              id: 'active-1',
              label: 'Still researching',
              state: 'active',
              progress: [{ detail: 'Reading Client Brain', at: 1784937600000 }],
            },
          ],
        },
      }),
    ])

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'done-1', title: 'Created proposal', state: 'complete' }),
        expect.objectContaining({
          id: 'active-1',
          title: 'Still researching',
          state: 'active',
          detail: 'Reading Client Brain',
        }),
      ]),
    )
  })

  it('extracts a linked Canvas as a durable conversation output', () => {
    const rows = extractConversationFileRows([
      message({
        metadata: {
          content_blocks_ordered: [
            {
              type: 'artifact_preview',
              id: 'artifact-canvas-board-1',
              artifactType: 'canvas',
              artifactId: 'board-1',
              campaignId: 'campaign-1',
              internalUrl: '/campaigns/campaign-1?view=canvas',
              name: 'Client webinar Canvas',
              subtitle: 'Campaign blueprint updated',
              status: 'updated',
            },
          ],
        },
      }),
    ])

    expect(rows).toEqual([
      expect.objectContaining({
        entityId: 'board-1',
        entityType: 'canvas',
        campaignId: 'campaign-1',
        internalUrl: '/campaigns/campaign-1?view=canvas',
        status: 'updated',
      }),
    ])
  })

  it('keeps the newest receipt when chat updates the same durable output', () => {
    const output = (messageId: string, createdAt: string, subtitle: string) =>
      message({
        id: messageId,
        created_at: createdAt,
        metadata: {
          content_blocks_ordered: [
            {
              type: 'artifact_preview',
              artifactType: 'canvas',
              artifactId: 'board-1',
              name: 'Campaign Canvas',
              subtitle,
            },
          ],
        },
      })

    expect(
      extractConversationFileRows([
        output('older', '2026-08-28T19:00:00.000Z', 'Canvas created'),
        output('newer', '2026-08-28T20:00:00.000Z', 'Canvas updated'),
      ]),
    ).toEqual([
      expect.objectContaining({
        messageId: 'newer',
        subtitle: 'Canvas updated',
      }),
    ])
  })

  it('extracts document, project, widget, and browser outputs from persisted chat blocks', () => {
    const rows = extractConversationFileRows([
      message({
        metadata: {
          content_blocks_ordered: [
            {
              type: 'document_card',
              id: 'document-doc-1',
              documentId: 'doc-1',
              spaceItemId: 'space-doc-1',
              spaceId: 'space-1',
              title: 'Strategy brief',
              snippet: 'One-page strategy',
            },
            {
              type: 'project_preview',
              id: 'project-project-1',
              project_id: 'project-1',
              name: 'Client app',
              entry_point: 'src/main.tsx',
              files: ['src/main.tsx'],
            },
            {
              type: 'widget_preview',
              id: 'widget-1',
              name: 'Revenue widget',
              widget_definition: { type: 'metric' },
              data_dependencies: [],
            },
            {
              type: 'browser_screenshot',
              id: 'screenshot-1',
              imageUrl: '/api/chat/browser-media/screenshot.png',
              pageUrl: 'https://example.com/pricing',
            },
          ],
        },
      }),
    ])

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Strategy brief',
          entityType: 'document',
          entityId: 'space-doc-1',
          documentId: 'doc-1',
          spaceItemId: 'space-doc-1',
          spaceId: 'space-1',
        }),
        expect.objectContaining({
          title: 'Client app',
          entityType: 'project',
          entityId: 'project-1',
          internalUrl: '/projects/project-1',
        }),
        expect.objectContaining({
          title: 'Revenue widget',
          entityType: 'widget',
          entityId: 'widget-1',
        }),
        expect.objectContaining({
          title: 'Screenshot — example.com',
          kind: 'image',
          fileUrl: '/api/chat/browser-media/screenshot.png',
        }),
      ]),
    )
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

  it('renders brain retrieval receipts including zero-hit searches', () => {
    expect(
      extractConversationSourceRows([
        message({
          metadata: {
            retrieval_receipts: [
              {
                brain_id: 'brain-1',
                brain_name: 'Multifamily Strategy',
                scope: 'campaign',
                query: 'Christian story',
                results_count: 12,
              },
              {
                brain_id: 'brain-1',
                brain_name: 'Multifamily Strategy',
                scope: 'campaign',
                query: 'Christian story',
                results_count: 0,
              },
            ],
          },
        }),
      ]).map((row) => row.title),
    ).toEqual([
      'CAMPAIGN BRAIN — Multifamily Strategy · 12 memories',
      "CAMPAIGN BRAIN — Multifamily Strategy · 0 results — searched 'Christian story'",
    ])
  })

  it('renders fetched web-research URLs next to brain receipts', () => {
    expect(
      extractConversationSourceRows([
        message({
          metadata: {
            web_research_urls: [{ url: 'https://example.com/report', title: 'Market report' }],
          },
        }),
      ]),
    ).toEqual([
      expect.objectContaining({
        title: 'Market report',
        kind: 'link',
        href: 'https://example.com/report',
      }),
    ])
  })

  it('extracts missions this conversation started from their receipts', () => {
    const rows = extractConversationMissionRows([
      message({
        id: 'mission-a',
        created_at: '2026-07-17T20:00:00.000Z',
        metadata: {
          quick_mission_receipt: true,
          mission_id: 'mission-a',
          content_blocks_ordered: [
            {
              type: 'artifact_preview',
              id: 'card-a',
              artifactType: 'mission',
              artifactId: 'mission-a',
              name: 'Webinar Fulfillment',
            },
          ],
        },
      }),
      message({
        id: 'mission-b',
        created_at: '2026-07-18T20:00:00.000Z',
        metadata: {
          mission_id: 'mission-b',
          content_blocks_ordered: [
            {
              type: 'artifact_preview',
              id: 'card-b',
              artifactType: 'mission',
              artifactId: 'mission-b',
              name: 'Meta Ads Launch',
            },
          ],
        },
      }),
    ])

    // Newest first, matching the other extractors in this file.
    expect(rows.map((row) => row.title)).toEqual(['Meta Ads Launch', 'Webinar Fulfillment'])
  })

  it('ignores non-mission artifact previews and user messages', () => {
    const rows = extractConversationMissionRows([
      message({
        metadata: {
          content_blocks_ordered: [
            { type: 'artifact_preview', id: 'doc', artifactType: 'document', artifactId: 'doc-1' },
          ],
        },
      }),
      message({
        role: 'user',
        metadata: { mission_id: 'mission-from-user' },
      }),
    ])

    expect(rows).toEqual([])
  })

  it('lists a mission once even when the thread references it repeatedly', () => {
    const receipt = {
      content_blocks_ordered: [
        {
          type: 'artifact_preview',
          id: 'card',
          artifactType: 'mission',
          artifactId: 'mission-a',
          name: 'Webinar Fulfillment',
        },
      ],
    }
    const rows = extractConversationMissionRows([
      message({ id: 'm1', metadata: receipt }),
      message({ id: 'm2', metadata: receipt }),
    ])

    expect(rows).toHaveLength(1)
  })
})
