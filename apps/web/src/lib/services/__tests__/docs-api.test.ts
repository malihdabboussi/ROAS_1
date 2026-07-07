import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendPatch } from '@/lib/api/backend-client'
import { updateConvDoc, updateMissionDeliverable } from '@/lib/services/docs-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendPatch: vi.fn(),
}))

const backendPatchMock = vi.mocked(backendPatch)

describe('docs-api', () => {
  beforeEach(() => {
    backendPatchMock.mockReset()
  })

  it('updates conversation documents through the existing documents route', async () => {
    const response = {
      id: 'document-1',
      conversation_id: 'conversation-1',
      campaign_id: null,
      document_type: 'offer',
      title: 'Updated document',
      content: { html: '<p>Updated</p>' },
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:01:00.000Z',
    }
    const patch = {
      title: 'Updated document',
      content: { html: '<p>Updated</p>' },
      metadata: { _doc_cover_url: 'https://example.com/cover.png' },
    }
    backendPatchMock.mockResolvedValue(response)

    await expect(updateConvDoc('document-1', patch)).resolves.toBe(response)

    expect(backendPatchMock).toHaveBeenCalledWith('/api/documents/document-1', patch)
  })

  it('updates mission deliverables through the existing deliverables route', async () => {
    const response = { id: 'deliverable-1', title: 'Updated deliverable' }
    const patch = {
      title: 'Updated deliverable',
      content: 'Updated content',
      metadata: { status: 'ready' },
    }
    backendPatchMock.mockResolvedValue(response)

    await expect(updateMissionDeliverable('deliverable-1', patch)).resolves.toBe(response)

    expect(backendPatchMock).toHaveBeenCalledWith('/api/missions/deliverables/deliverable-1', patch)
  })
})
