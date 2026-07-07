import { backendGet, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type {
  Ad,
  Avatar,
  BlogPost,
  ConversationDocument,
  EmailArtifact,
  Offer,
  Presentation,
  PresentationBundle,
  Sequence,
  SocialPost,
} from './artifact-types'
export { fetchFunnelWithPages } from './funnel-preview-api'
export { fetchAdSet } from './paid-ads-api'

export async function fetchBlogPostById(blogPostId: string): Promise<BlogPost> {
  return backendGet<BlogPost>(`/api/blog-posts/${blogPostId}`)
}

export async function fetchAd(adId: string): Promise<Ad> {
  return backendGet<Ad>(`/api/ads/${adId}`)
}

export async function fetchOffer(offerId: string): Promise<Offer> {
  return backendGet<Offer>(`/api/offers/${offerId}`)
}

export async function fetchEmailArtifact(emailId: string): Promise<EmailArtifact> {
  return backendGet<EmailArtifact>(`/api/emails/${emailId}`)
}

export async function sendCampaignEmailArtifact(data: {
  email_id: string
  provider: string
  list_id?: string
  segment_id?: string
  from_email: string
  from_name: string
  schedule_date?: string
}): Promise<{ success: boolean; send_type: 'broadcast'; provider: string }> {
  return backendPost<{ success: boolean; send_type: 'broadcast'; provider: string }>(
    '/api/email-campaigns/send',
    {
      send_type: 'broadcast',
      ...data,
    },
  )
}

export async function fetchSequence(sequenceId: string): Promise<Sequence> {
  return backendGet<Sequence>(`/api/sequences/${sequenceId}`)
}

export async function fetchPresentation(presentationId: string): Promise<Presentation> {
  const presentation = await backendGet<Presentation>(`/api/presentations/${presentationId}`)
  const metadata = presentation.metadata ?? {}
  return {
    ...presentation,
    source_mode:
      typeof metadata.source_mode === 'string' ? metadata.source_mode : presentation.source_mode,
    entry_file:
      typeof metadata.entry_file === 'string' ? metadata.entry_file : presentation.entry_file,
  }
}

export async function fetchPresentationCached(presentationId: string): Promise<Presentation> {
  return cachedFetch(`presentation:${presentationId}`, () => fetchPresentation(presentationId), {
    ttlMs: 60_000,
  })
}

export function invalidatePresentationPreviewCache(presentationId: string) {
  invalidateCachedFetch(`presentation:${presentationId}`)
  invalidateCachedFetch(`presentation-bundle:${presentationId}`)
}

export async function fetchPresentationBundle(presentationId: string): Promise<PresentationBundle> {
  return backendGet<PresentationBundle>(`/api/presentations/${presentationId}/bundle`)
}

export async function fetchPresentationBundleCached(
  presentationId: string,
): Promise<PresentationBundle> {
  return cachedFetch(
    `presentation-bundle:${presentationId}`,
    () => fetchPresentationBundle(presentationId),
    { ttlMs: 60_000 },
  )
}

export async function fetchAvatar(avatarId: string): Promise<Avatar> {
  return backendGet<Avatar>(`/api/avatars/${avatarId}`)
}

export async function fetchDocument(documentId: string): Promise<ConversationDocument> {
  return backendGet<ConversationDocument>(`/api/documents/${documentId}`)
}

export async function fetchConversationDocuments(
  conversationId: string,
): Promise<ConversationDocument[]> {
  return backendGet<ConversationDocument[]>(`/api/conversations/${conversationId}/documents`)
}

export async function fetchAgentDocuments(agentKey: string): Promise<ConversationDocument[]> {
  return backendGet<ConversationDocument[]>(`/api/agents/${encodeURIComponent(agentKey)}/documents`)
}

export async function fetchSocialPost(id: string): Promise<SocialPost> {
  return backendGet<SocialPost>(`/api/social-posts/${id}`)
}

export async function fetchMetaAdImages(
  adAccountId: string,
): Promise<Array<{ id: string; hash: string; url?: string; name?: string }>> {
  const res = await backendGet<{
    data: Array<{ id: string; hash: string; url?: string; name?: string }>
  }>(`/api/integrations/meta/ad-accounts/${encodeURIComponent(adAccountId)}/adimages`)
  return res.data ?? []
}
