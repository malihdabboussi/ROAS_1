import { describe, expect, it } from 'vitest'
import type { ConversationDocument } from '@/lib/artifacts'
import {
  conversationDocumentFileUrl,
  conversationDocumentViewerType,
} from './shell-right-panel-files-target'

function doc(partial: Partial<ConversationDocument>): ConversationDocument {
  return {
    id: 'doc-1',
    conversation_id: 'conversation-1',
    campaign_id: null,
    resource_id: null,
    document_type: 'upload',
    title: 'Untitled',
    content: {},
    created_at: '2026-08-19T00:00:00.000Z',
    updated_at: '2026-08-19T00:00:00.000Z',
    ...partial,
  }
}

describe('conversationDocumentViewerType', () => {
  it('opens inline agent markdown as a doc even when document_type is upload', () => {
    const markdown = JSON.stringify(
      '# Christian Osgood — Free + Shipping Book Funnel: Modular UGC Ad Scripts\n\nHook copy',
    )
    const row = doc({
      id: '946a12f3-21e0-431f-87d9-eec0860e3a23',
      title: 'Christian Osgood — Free + Shipping Book Funnel: Modular UGC Ad Scripts',
      content: markdown as unknown as ConversationDocument['content'],
    })

    expect(conversationDocumentFileUrl(row)).toBeNull()
    expect(conversationDocumentViewerType(row)).toBe('doc')
  })

  it('keeps real storage uploads as files so .docx still previews', () => {
    const row = doc({
      content: { file_url: 'https://cdn.example.com/brief.docx' },
    })

    expect(conversationDocumentFileUrl(row)).toBe('https://cdn.example.com/brief.docx')
    expect(conversationDocumentViewerType(row)).toBe('file')
  })
})
