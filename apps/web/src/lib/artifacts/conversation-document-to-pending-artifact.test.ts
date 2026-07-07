import { describe, expect, it } from 'vitest'
import type { ConversationDocument } from './artifact-types'
import {
  conversationDocumentToPendingArtifact,
  getFunnelIdFromConversationDocument,
  getOfferIdFromConversationDocument,
} from './conversation-document-to-pending-artifact'

function documentFixture(overrides: Partial<ConversationDocument>): ConversationDocument {
  return {
    id: 'doc-1',
    conversation_id: 'conversation-1',
    campaign_id: 'campaign-1',
    resource_id: null,
    document_type: 'offer',
    title: 'Artifact title',
    content: {},
    metadata: {},
    created_at: '2026-06-22T10:00:00.000Z',
    updated_at: '2026-06-22T10:00:00.000Z',
    ...overrides,
  }
}

describe('conversation document artifact helpers', () => {
  it('resolves offer and funnel ids from resource id before content fallbacks', () => {
    expect(
      getOfferIdFromConversationDocument(
        documentFixture({
          document_type: 'offer',
          resource_id: 'offer-resource',
          content: { offer_id: 'offer-content' },
        }),
      ),
    ).toBe('offer-resource')

    expect(
      getFunnelIdFromConversationDocument(
        documentFixture({
          document_type: 'funnel',
          resource_id: null,
          content: { funnel_id: 'funnel-content' },
        }),
      ),
    ).toBe('funnel-content')
  })

  it('maps funnel documents with page ids to page pending artifacts', () => {
    expect(
      conversationDocumentToPendingArtifact(
        documentFixture({
          document_type: 'funnel',
          resource_id: 'funnel-1',
          title: 'Launch Funnel',
          content: { page_id: 'page-1' },
        }),
      ),
    ).toEqual({
      kind: 'page',
      funnelId: 'funnel-1',
      pageId: 'page-1',
      name: 'Launch Funnel',
    })
  })

  it('requires both sequence and email ids for email pending artifacts', () => {
    expect(
      conversationDocumentToPendingArtifact(
        documentFixture({
          document_type: 'email',
          resource_id: 'email-1',
          content: { sequence_id: 'sequence-1' },
        }),
      ),
    ).toEqual({
      kind: 'sequence-email',
      sequenceId: 'sequence-1',
      emailId: 'email-1',
      name: 'Artifact title',
    })

    expect(
      conversationDocumentToPendingArtifact(
        documentFixture({
          document_type: 'email',
          resource_id: 'email-1',
          content: {},
        }),
      ),
    ).toBeNull()
  })
})
