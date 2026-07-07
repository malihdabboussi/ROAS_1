import { describe, expect, it } from 'vitest'
import type { MessageContentBlock } from '@/lib/chat/message-content-blocks'
import { missionDeliverableFromContentBlock } from './mission-deliverable-from-block'

const source = {
  messageId: 'message-1',
  createdAt: '2026-06-24T00:00:00.000Z',
  agentKey: 'atlas',
}

describe('missionDeliverableFromContentBlock', () => {
  it('maps pdf blocks to chat-sourced pdf deliverables', () => {
    const block = {
      type: 'pdf_file',
      id: 'pdf-1',
      label: 'Plan.pdf',
      url: 'https://cdn.vibey.ai/plan.pdf',
    } satisfies Extract<MessageContentBlock, { type: 'pdf_file' }>

    expect(missionDeliverableFromContentBlock(block, source)).toMatchObject({
      id: 'message-1-pdf-pdf-1',
      agent_key: 'atlas',
      type: 'pdf',
      title: 'Plan.pdf',
      file_url: 'https://cdn.vibey.ai/plan.pdf',
      file_name: 'Plan.pdf',
      entity_id: null,
      entity_table: null,
      source: 'chat',
      created_at: source.createdAt,
    })
  })

  it('maps docx file blocks to file deliverables with docx metadata', () => {
    const block = {
      type: 'docx_file',
      id: 'docx-1',
      label: 'Plan.docx',
      url: 'https://cdn.vibey.ai/plan.docx',
    } satisfies Extract<MessageContentBlock, { type: 'docx_file' }>

    expect(missionDeliverableFromContentBlock(block, source)).toMatchObject({
      id: 'message-1-docx-docx-1',
      type: 'file',
      title: 'Plan.docx',
      file_url: 'https://cdn.vibey.ai/plan.docx',
      file_name: 'Plan.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      entity_id: null,
      entity_table: null,
    })
  })

  it('maps artifact previews to entity deliverables and prefers email subject titles', () => {
    const block = {
      type: 'artifact_preview',
      id: 'artifact-block-1',
      artifactType: 'email',
      artifactId: 'email-1',
      name: 'Fallback name',
      emailSubject: '  Launch note  ',
    } satisfies Extract<MessageContentBlock, { type: 'artifact_preview' }>

    expect(missionDeliverableFromContentBlock(block, source)).toMatchObject({
      id: 'message-1-artifact-email-1',
      type: 'email',
      title: 'Launch note',
      file_url: null,
      entity_id: 'email-1',
      entity_table: 'emails',
    })
  })

  it('uses image or video media URLs as media deliverables when present on artifacts', () => {
    const block = {
      type: 'artifact_preview',
      id: 'artifact-block-2',
      artifactType: 'offer',
      artifactId: 'offer-1',
      name: 'Offer visual',
      imageUrl: ' https://cdn.vibey.ai/offer.png ',
      videoUrl: 'https://cdn.vibey.ai/offer.mp4',
    } satisfies Extract<MessageContentBlock, { type: 'artifact_preview' }>

    expect(missionDeliverableFromContentBlock(block, source)).toMatchObject({
      type: 'image',
      file_url: 'https://cdn.vibey.ai/offer.png',
      entity_id: 'offer-1',
      entity_table: 'offers',
    })
  })

  it('maps media asset blocks to media asset deliverables', () => {
    const block = {
      type: 'media_asset',
      id: 'media-block-1',
      mediaAssetId: 'media-1',
      url: 'https://cdn.vibey.ai/audio.mp3',
      title: 'Voiceover',
      kind: 'audio',
      mimeType: 'audio/mpeg',
      fileName: 'voiceover.mp3',
      prompt: 'Warm narration',
    } satisfies Extract<MessageContentBlock, { type: 'media_asset' }>

    expect(missionDeliverableFromContentBlock(block, source)).toMatchObject({
      id: 'message-1-media-media-1',
      type: 'audio',
      title: 'Voiceover',
      file_url: 'https://cdn.vibey.ai/audio.mp3',
      file_name: 'voiceover.mp3',
      mime_type: 'audio/mpeg',
      entity_id: 'media-1',
      entity_table: 'media_assets',
      metadata: { source: 'chat', prompt: 'Warm narration' },
    })
  })

  it('maps generic artifact previews to their entity deliverable types', () => {
    const block = {
      type: 'artifact_preview',
      id: 'form-block-1',
      artifactType: 'form',
      artifactId: 'form-1',
      name: 'Lead Capture',
    } satisfies Extract<MessageContentBlock, { type: 'artifact_preview' }>

    expect(missionDeliverableFromContentBlock(block, source)).toMatchObject({
      id: 'message-1-artifact-form-1',
      type: 'form',
      title: 'Lead Capture',
      file_url: null,
      entity_id: 'form-1',
      entity_table: 'forms',
    })
  })

  it('maps document and project cards to previewable deliverables', () => {
    const documentBlock = {
      type: 'document_card',
      id: 'doc-block-1',
      title: 'Launch brief',
      documentId: 'doc-1',
      snippet: 'Summary',
    } satisfies Extract<MessageContentBlock, { type: 'document_card' }>
    const projectBlock = {
      type: 'project_preview',
      id: 'project-block-1',
      project_id: 'project-1',
      name: 'Project files',
    } satisfies Extract<MessageContentBlock, { type: 'project_preview' }>

    expect(missionDeliverableFromContentBlock(documentBlock, source)).toMatchObject({
      id: 'message-1-doc-doc-1',
      type: 'doc',
      title: 'Launch brief',
      entity_id: 'doc-1',
      entity_table: 'conversation_documents',
    })
    expect(missionDeliverableFromContentBlock(projectBlock, source)).toMatchObject({
      id: 'message-1-project-project-1',
      type: 'file',
      title: 'Project files',
      entity_id: 'project-1',
      entity_table: null,
    })
  })

  it('maps Space document cards to space item deliverables', () => {
    const block = {
      type: 'document_card',
      id: 'doc-block-2',
      title: 'Task output',
      spaceId: 'space-1',
      spaceItemId: 'space-doc-1',
      snippet: '  Space doc body  ',
    } satisfies Extract<MessageContentBlock, { type: 'document_card' }>

    expect(missionDeliverableFromContentBlock(block, source)).toMatchObject({
      id: 'message-1-doc-space-doc-1',
      type: 'doc',
      title: 'Task output',
      content: 'Space doc body',
      entity_id: 'space-doc-1',
      entity_table: 'space_items',
      metadata: {
        source: 'chat',
        spaceId: 'space-1',
        spaceItemId: 'space-doc-1',
        internalUrl: '/spaces/space-1/space-doc-1',
      },
    })
  })

  it('prefers Space document identity when a document card has both ids', () => {
    const block = {
      type: 'document_card',
      id: 'doc-block-3',
      title: 'Linked task output',
      documentId: 'conversation-doc-1',
      spaceId: 'space-1',
      spaceItemId: 'space-doc-1',
      snippet: 'Linked copy',
    } satisfies Extract<MessageContentBlock, { type: 'document_card' }>

    expect(missionDeliverableFromContentBlock(block, source)).toMatchObject({
      id: 'message-1-doc-space-doc-1',
      entity_id: 'space-doc-1',
      entity_table: 'space_items',
      metadata: {
        documentId: 'conversation-doc-1',
        spaceId: 'space-1',
        spaceItemId: 'space-doc-1',
      },
    })
  })

  it('skips document cards without any persistent entity id', () => {
    const block = {
      type: 'document_card',
      id: 'doc-block-4',
      title: 'Missing ids',
      snippet: 'No entity id',
    } satisfies Extract<MessageContentBlock, { type: 'document_card' }>

    expect(missionDeliverableFromContentBlock(block, source)).toBeNull()
  })

  it('maps browser screenshots only when an image URL is present', () => {
    const screenshotBlock = {
      type: 'browser_screenshot',
      id: 'shot-1',
      imageUrl: 'https://cdn.vibey.ai/shot.png',
      pageUrl: 'https://example.com/path',
    } satisfies Extract<MessageContentBlock, { type: 'browser_screenshot' }>
    const emptyScreenshotBlock = {
      type: 'browser_screenshot',
      id: 'shot-2',
      imageUrl: ' ',
    } satisfies Extract<MessageContentBlock, { type: 'browser_screenshot' }>

    expect(missionDeliverableFromContentBlock(screenshotBlock, source)).toMatchObject({
      id: 'message-1-screenshot-shot-1',
      type: 'image',
      title: 'Screenshot — example.com',
      file_url: 'https://cdn.vibey.ai/shot.png',
    })
    expect(missionDeliverableFromContentBlock(emptyScreenshotBlock, source)).toBeNull()
  })

  it('returns null for unsupported content blocks and preserves unknown agent fallback', () => {
    const block = {
      type: 'text',
      id: 'text-1',
      content: 'Nothing previewable',
    } satisfies Extract<MessageContentBlock, { type: 'text' }>
    const widgetBlock = {
      type: 'widget_preview',
      id: 'widget-1',
      name: 'Widget',
      widget_definition: {},
      data_dependencies: [],
    } satisfies Extract<MessageContentBlock, { type: 'widget_preview' }>

    expect(missionDeliverableFromContentBlock(block, source)).toBeNull()
    expect(
      missionDeliverableFromContentBlock(widgetBlock, {
        ...source,
        agentKey: null,
      }),
    ).toMatchObject({ agent_key: 'unknown' })
  })
})
