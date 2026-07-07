import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  fetchAd,
  fetchAdSet,
  fetchAvatar,
  fetchAgentDocuments,
  fetchBlogPostById,
  fetchConversationDocuments,
  fetchDocument,
  fetchEmailArtifact,
  fetchMetaAdImages,
  fetchOffer,
  fetchPresentation,
  fetchPresentationBundle,
  fetchPresentationBundleCached,
  fetchPresentationCached,
  fetchSequence,
  fetchSocialPost,
  invalidatePresentationPreviewCache,
  sendCampaignEmailArtifact,
} from './artifact-preview-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPost: vi.fn(),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
  invalidateCachedFetch: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPostMock = vi.mocked(backendPost)
const cachedFetchMock = vi.mocked(cachedFetch)
const invalidateCachedFetchMock = vi.mocked(invalidateCachedFetch)

describe('artifact preview API', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPostMock.mockReset()
    cachedFetchMock.mockReset()
    cachedFetchMock.mockImplementation((_key: string, fetcher: () => Promise<unknown>) =>
      fetcher(),
    )
    invalidateCachedFetchMock.mockReset()
  })

  it('fetches preview entities through the existing backend routes', async () => {
    backendGetMock
      .mockResolvedValueOnce({ id: 'blog-1' })
      .mockResolvedValueOnce({ id: 'ad-1' })
      .mockResolvedValueOnce({ id: 'ad-set-1' })
      .mockResolvedValueOnce({ id: 'offer-1' })
      .mockResolvedValueOnce({ id: 'email-1' })
      .mockResolvedValueOnce({ id: 'sequence-1' })
      .mockResolvedValueOnce({
        id: 'presentation-1',
        source_mode: 'legacy_tsx',
        entry_file: null,
        metadata: { source_mode: 'html_bundle', entry_file: 'src/index.tsx' },
      })
      .mockResolvedValueOnce({ id: 'avatar-1' })
      .mockResolvedValueOnce({ id: 'document-1' })
      .mockResolvedValueOnce([{ id: 'conversation-doc-1' }])
      .mockResolvedValueOnce([{ id: 'agent-doc-1' }])
      .mockResolvedValueOnce({ id: 'social-post-1' })
      .mockResolvedValueOnce({ data: [{ id: 'meta-image-1', hash: 'hash-1' }] })

    await expect(fetchBlogPostById('blog-1')).resolves.toEqual({ id: 'blog-1' })
    await expect(fetchAd('ad-1')).resolves.toEqual({ id: 'ad-1' })
    await expect(fetchAdSet('ad-set-1')).resolves.toEqual({ id: 'ad-set-1' })
    await expect(fetchOffer('offer-1')).resolves.toEqual({ id: 'offer-1' })
    await expect(fetchEmailArtifact('email-1')).resolves.toEqual({ id: 'email-1' })
    await expect(fetchSequence('sequence-1')).resolves.toEqual({ id: 'sequence-1' })
    await expect(fetchPresentation('presentation-1')).resolves.toEqual({
      id: 'presentation-1',
      source_mode: 'html_bundle',
      entry_file: 'src/index.tsx',
      metadata: { source_mode: 'html_bundle', entry_file: 'src/index.tsx' },
    })
    await expect(fetchAvatar('avatar-1')).resolves.toEqual({ id: 'avatar-1' })
    await expect(fetchDocument('document-1')).resolves.toEqual({ id: 'document-1' })
    await expect(fetchConversationDocuments('conversation-1')).resolves.toEqual([
      { id: 'conversation-doc-1' },
    ])
    await expect(fetchAgentDocuments('agent/key 1')).resolves.toEqual([{ id: 'agent-doc-1' }])
    await expect(fetchSocialPost('social-post-1')).resolves.toEqual({ id: 'social-post-1' })
    await expect(fetchMetaAdImages('act 1')).resolves.toEqual([
      { id: 'meta-image-1', hash: 'hash-1' },
    ])

    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/blog-posts/blog-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(2, '/api/ads/ad-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(3, '/api/ad-sets/ad-set-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(4, '/api/offers/offer-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(5, '/api/emails/email-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(6, '/api/sequences/sequence-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(7, '/api/presentations/presentation-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(8, '/api/avatars/avatar-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(
      9,
      '/api/documents/document-1',
    )
    expect(backendGetMock).toHaveBeenNthCalledWith(
      10,
      '/api/conversations/conversation-1/documents',
    )
    expect(backendGetMock).toHaveBeenNthCalledWith(11, '/api/agents/agent%2Fkey%201/documents')
    expect(backendGetMock).toHaveBeenNthCalledWith(12, '/api/social-posts/social-post-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(
      13,
      '/api/integrations/meta/ad-accounts/act%201/adimages',
    )
  })

  it('caches and invalidates presentation preview payloads through shared keys', async () => {
    backendGetMock
      .mockResolvedValueOnce({ id: 'presentation-1', metadata: null })
      .mockResolvedValueOnce({ presentation: { id: 'presentation-1' }, has_entry: true })
      .mockResolvedValueOnce({ presentation: { id: 'presentation-1' }, has_entry: true })

    await expect(fetchPresentationCached('presentation-1')).resolves.toEqual({
      id: 'presentation-1',
      metadata: null,
    })
    await expect(fetchPresentationBundle('presentation-1')).resolves.toEqual({
      presentation: { id: 'presentation-1' },
      has_entry: true,
    })
    await expect(fetchPresentationBundleCached('presentation-1')).resolves.toEqual({
      presentation: { id: 'presentation-1' },
      has_entry: true,
    })

    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      1,
      'presentation:presentation-1',
      expect.any(Function),
      { ttlMs: 60_000 },
    )
    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      2,
      'presentation-bundle:presentation-1',
      expect.any(Function),
      { ttlMs: 60_000 },
    )
    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/presentations/presentation-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(
      2,
      '/api/presentations/presentation-1/bundle',
    )
    expect(backendGetMock).toHaveBeenNthCalledWith(
      3,
      '/api/presentations/presentation-1/bundle',
    )

    invalidatePresentationPreviewCache('presentation-1')

    expect(invalidateCachedFetchMock).toHaveBeenNthCalledWith(1, 'presentation:presentation-1')
    expect(invalidateCachedFetchMock).toHaveBeenNthCalledWith(
      2,
      'presentation-bundle:presentation-1',
    )
  })

  it('sends campaign email artifacts through the broadcast backend route', async () => {
    backendPostMock.mockResolvedValue({
      success: true,
      send_type: 'broadcast',
      provider: 'mailchimp',
    })

    await expect(
      sendCampaignEmailArtifact({
        email_id: 'email-1',
        provider: 'mailchimp',
        list_id: 'list-1',
        from_email: 'marketing@example.com',
        from_name: 'Marketing',
        schedule_date: '2026-06-29T09:00:00.000Z',
      }),
    ).resolves.toEqual({
      success: true,
      send_type: 'broadcast',
      provider: 'mailchimp',
    })

    expect(backendPostMock).toHaveBeenCalledWith('/api/email-campaigns/send', {
      send_type: 'broadcast',
      email_id: 'email-1',
      provider: 'mailchimp',
      list_id: 'list-1',
      from_email: 'marketing@example.com',
      from_name: 'Marketing',
      schedule_date: '2026-06-29T09:00:00.000Z',
    })
  })
})
