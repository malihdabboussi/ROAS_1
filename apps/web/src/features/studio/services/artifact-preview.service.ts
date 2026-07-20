/**
 * Artifact Preview Service
 *
 * Fetches campaign artifacts from:
 * - The backend API (funnels + pages from DB)
 * - Supabase Storage (legacy files, presentations, emails)
 */

import { createBrowserClient } from '@supabase/ssr'
import {
  backendDelete,
  backendGet,
  backendPatch,
  backendPost,
  backendPut,
} from '@/lib/api/backend-client'
import { invalidatePresentationPreviewCache } from '@/lib/artifacts/artifact-preview-api'
import type {
  BlogPost,
  ConversationDocument,
  Funnel,
  FunnelFile,
  FunnelPage,
} from '@/lib/artifacts/artifact-types'
import { invalidateFunnelPreviewCache } from '@/lib/artifacts/funnel-preview-api'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type {
  Ad,
  Avatar,
  EmailArtifact,
  Offer,
  Presentation,
  PresentationAsset,
  PresentationComment,
  PresentationElementTrace,
  PresentationFile,
  Sequence,
  SocialPost,
} from '../types'

export type {
  BlogPost,
  ConversationDocument,
  Funnel,
  FunnelFile,
  FunnelPage,
  FunnelPageBundle,
} from '@/lib/artifacts/artifact-types'
export {
  fetchAvatar,
  fetchBlogPostById,
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
} from '@/lib/artifacts/artifact-preview-api'
export {
  createAdCampaign,
  createAdsBulk,
  createAdSet,
  deleteAdCampaign,
  deleteAdSet,
  deleteUngroupedAds,
  duplicateAdCampaign,
  duplicateAdSet,
  fetchAdCampaign,
  fetchAdSet,
  fetchCampaignAdCampaigns,
  fetchCampaignAds,
  getAdSetDeliveryEstimate,
  refreshAdCampaignMetaStatus,
  refreshAdSetMetaStatus,
  setAdCampaignMetaStatus,
  setAdSetMetaStatus,
  updateAdCampaign,
  updateAdSet,
} from '@/lib/artifacts/paid-ads-api'
export {
  fetchCampaignFunnels,
  fetchFunnelPage,
  fetchFunnelPageBundle,
  fetchFunnelPageBundleCached,
  fetchFunnelPageCached,
  fetchFunnelWithPages,
  fetchFunnelWithPagesCached,
  invalidateFunnelPreviewCache,
  updateFunnel,
} from '@/lib/artifacts/funnel-preview-api'
export {
  createForm,
  deleteForm,
  fetchCampaignFormAggregates,
  fetchCampaignForms,
  fetchForm,
  fetchFormResponses,
  fetchSpaceFormAggregates,
  fetchSpaceForms,
  publishForm,
  unpublishForm,
  updateForm,
} from '@/lib/forms/forms-api'
export type {
  Form,
  FormAggregate,
  FormQuestion,
  FormQuestionOption,
  FormQuestionType,
  FormResponse,
  FormSchema,
  FormSettings,
} from '@/lib/forms/forms-api'

const BUCKET = 'campaigns'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export interface ArtifactFile {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  updatedAt?: string
}

export interface ArtifactFolder {
  name: string
  path: string
  children: ArtifactFile[]
}

export type PresentationBundleFileInput = {
  path: string
  content: string
  role?: string
}

/**
 * List all files in a campaign workspace from Supabase Storage.
 * Path structure: {userId}/{campaignId}/...
 */
export async function listCampaignFiles(
  userId: string,
  campaignId: string,
  subfolder?: string,
): Promise<ArtifactFile[]> {
  const supabase = getSupabase()
  const basePath = subfolder ? `${userId}/${campaignId}/${subfolder}` : `${userId}/${campaignId}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(basePath, { limit: 500, sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    console.error('Storage list error:', error.message)
    return []
  }

  return (data ?? []).map((item) => ({
    name: item.name,
    path: `${basePath}/${item.name}`,
    type: item.id ? 'file' : 'folder',
    size: item.metadata?.size as number | undefined,
    updatedAt: item.updated_at ?? undefined,
  }))
}

/**
 * List campaign workspace structure grouped by artifact type.
 * Returns: funnel/, presentation/, emails/ folders with their contents.
 */
export async function listCampaignArtifacts(
  userId: string,
  campaignId: string,
): Promise<{
  funnels: ArtifactFile[]
  presentations: ArtifactFile[]
  emails: ArtifactFile[]
  other: ArtifactFile[]
}> {
  const topLevel = await listCampaignFiles(userId, campaignId)

  const result = {
    funnels: [] as ArtifactFile[],
    presentations: [] as ArtifactFile[],
    emails: [] as ArtifactFile[],
    other: [] as ArtifactFile[],
  }

  for (const item of topLevel) {
    if (item.name === 'funnel' && item.type === 'folder') {
      const pages = await listCampaignFiles(userId, campaignId, 'funnel/pages')
      result.funnels = pages
    } else if (item.name === 'presentation' && item.type === 'folder') {
      const pages = await listCampaignFiles(userId, campaignId, 'presentation/pages')
      result.presentations = pages
    } else if (item.name === 'emails' && item.type === 'folder') {
      result.emails = await listCampaignFiles(userId, campaignId, 'emails')
    } else if (item.type === 'file') {
      result.other.push(item)
    }
  }

  return result
}

/**
 * Get a signed URL for an artifact file (time-limited access).
 * Used for iframe preview src.
 */
export async function getArtifactSignedUrl(
  filePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds)

  if (error) {
    console.error('Signed URL error:', error.message)
    return null
  }

  return data.signedUrl
}

/**
 * Download an artifact file content as text.
 * Useful for inline preview of code/text files.
 */
export async function downloadArtifactText(filePath: string): Promise<string | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase.storage.from(BUCKET).download(filePath)

  if (error) {
    console.error('Download error:', error.message)
    return null
  }

  return data.text()
}

// ============================================================================
// Backend API — Funnels & Pages (from DB)
// ============================================================================

export async function createFunnel(
  campaignId: string,
  data: { name: string; funnel_type: string; space_id?: string | null },
): Promise<Funnel> {
  return backendPost<Funnel>('/api/funnels', {
    name: data.name,
    funnel_type: data.funnel_type,
    campaign_id: campaignId,
    ...(data.space_id !== undefined ? { space_id: data.space_id } : {}),
  })
}

export async function createOffer(
  campaignId: string,
  name?: string,
  spaceId?: string | null,
): Promise<Offer> {
  return backendPost<Offer>(`/api/campaigns/${campaignId}/offers`, {
    name: name ?? 'Untitled Offer',
    ...(spaceId !== undefined ? { space_id: spaceId } : {}),
  })
}

export async function createSequence(
  campaignId: string,
  name?: string,
  spaceId?: string | null,
): Promise<Sequence> {
  return backendPost<Sequence>(`/api/campaigns/${campaignId}/sequences`, {
    name: name ?? 'Untitled Sequence',
    ...(spaceId !== undefined ? { space_id: spaceId } : {}),
  })
}

export async function createPresentation(
  campaignId: string,
  name?: string,
  spaceId?: string | null,
  bundle?: {
    files?: PresentationBundleFileInput[]
    entry_file?: string
  },
): Promise<Presentation> {
  return backendPost<Presentation>(`/api/campaigns/${campaignId}/presentations`, {
    name: name ?? 'Untitled Presentation',
    ...(spaceId !== undefined ? { space_id: spaceId } : {}),
    ...(bundle?.files ? { files: bundle.files } : {}),
    ...(bundle?.entry_file ? { entry_file: bundle.entry_file } : {}),
  })
}

export async function createAvatar(
  campaignId: string,
  name?: string,
  spaceId?: string | null,
): Promise<Avatar> {
  return backendPost<Avatar>(`/api/campaigns/${campaignId}/avatars`, {
    name: name ?? 'Untitled Avatar',
    ...(spaceId !== undefined ? { space_id: spaceId } : {}),
  })
}

/**
 * Create or replace one funnel bundle source file. Page-scoped when
 * funnelPageId is provided, funnel-shared otherwise.
 */
export async function saveFunnelFile(
  funnelId: string,
  path: string,
  content: string,
  options?: { funnelPageId?: string | null; role?: string },
): Promise<FunnelFile> {
  const file = await backendPut<FunnelFile>(`/api/funnels/${funnelId}/files`, {
    path,
    content,
    ...(options?.funnelPageId ? { funnel_page_id: options.funnelPageId } : {}),
    ...(options?.role ? { role: options.role } : {}),
  })
  invalidateFunnelPreviewCache(funnelId)
  return file
}

export async function fetchBlogPosts(
  funnelId: string,
  status?: 'draft' | 'published' | 'archived',
): Promise<BlogPost[]> {
  const query = status ? `?status=${status}` : ''
  const url = `/api/funnels/${funnelId}/blog-posts${query}`
  // Dedupe-only: websites list + all-artifacts fetch the same URL concurrently.
  return cachedFetch(`artifact-list:${url}`, () => backendGet<BlogPost[]>(url))
}

export async function fetchBlogPost(funnelId: string, blogPostId: string): Promise<BlogPost> {
  return backendGet<BlogPost>(`/api/funnels/${funnelId}/blog-posts/${blogPostId}`)
}

export async function updateBlogPost(
  blogPostId: string,
  data: {
    title?: string
    slug?: string
    content?: unknown
    excerpt?: string | null
    cover_image?: string | null
    author?: string | null
    tags?: string[]
    seo?: Record<string, unknown>
    status?: 'draft' | 'published' | 'archived'
    published_at?: string | null
    metadata?: Record<string, unknown>
  },
): Promise<BlogPost> {
  return backendPatch<BlogPost>(`/api/blog-posts/${blogPostId}`, data)
}

export async function updateFunnelPage(
  funnelId: string,
  pageId: string,
  data: { name?: string },
): Promise<FunnelPage> {
  const page = await backendPatch<FunnelPage>(`/api/funnels/${funnelId}/pages/${pageId}`, data)
  invalidateFunnelPreviewCache(funnelId)
  return page
}

export async function deleteFunnelPage(funnelId: string, pageId: string): Promise<void> {
  await backendDelete(`/api/funnels/${funnelId}/pages/${pageId}`)
  invalidateFunnelPreviewCache(funnelId)
}

export async function reorderFunnelPages(funnelId: string, pageIds: string[]): Promise<Funnel> {
  const funnel = await backendPatch<Funnel>(`/api/funnels/${funnelId}/pages/reorder`, { pageIds })
  invalidateFunnelPreviewCache(funnelId)
  return funnel
}

export async function reorderSequenceEmails(
  sequenceId: string,
  emailIds: string[],
): Promise<Sequence> {
  return backendPatch<Sequence>(`/api/sequences/${sequenceId}/emails/reorder`, { emailIds })
}

export async function movePageToFunnel(targetFunnelId: string, pageId: string): Promise<Funnel> {
  const funnel = await backendPatch<Funnel>(
    `/api/funnels/${targetFunnelId}/pages/${pageId}/move`,
    {},
  )
  // Source funnel is unknown here — drop all funnel preview caches.
  invalidateFunnelPreviewCache()
  return funnel
}

export async function moveSequenceEmailToSequence(
  targetSequenceId: string,
  emailId: string,
): Promise<Sequence> {
  return backendPatch<Sequence>(`/api/sequences/${targetSequenceId}/emails/${emailId}/move`, {})
}

export async function deleteFunnel(funnelId: string): Promise<void> {
  await backendDelete(`/api/funnels/${funnelId}`)
  invalidateFunnelPreviewCache(funnelId)
}

// ============================================================================
// Backend API — Offers
// ============================================================================

export async function fetchAd(adId: string): Promise<Ad> {
  return backendGet<Ad>(`/api/ads/${adId}`)
}

export async function updateAd(
  adId: string,
  data: {
    headline?: string
    primary_text?: string
    description?: string | null
    cta_type?: string | null
    cta_text?: string | null
    destination_url?: string
    display_link?: string | null
    placement?: string
    generated_tsx?: string | null
    image_url?: string | null
    image_asset_id?: string | null
    placement_images?: Record<string, { image_url: string; image_asset_id?: string | null }>
    placement_tsx?: Record<string, string>
    ad_format?: string
    video_url?: string | null
    carousel_cards?: Array<{
      image_url: string
      headline?: string
      description?: string
      link?: string
      image_asset_id?: string | null
    }> | null
    metadata?: Record<string, unknown>
    ad_set_id?: string | null
  },
): Promise<Ad> {
  return backendPatch<Ad>(`/api/ads/${adId}`, data)
}

export async function deleteAd(adId: string): Promise<void> {
  return backendDelete(`/api/ads/${adId}`)
}

export async function duplicateAd(adId: string): Promise<Ad> {
  return backendPost<Ad>(`/api/ads/${adId}/duplicate`, {})
}

export async function cloneAdToAdSet(adId: string, targetAdSetId: string): Promise<Ad> {
  return backendPost<Ad>(`/api/ads/${adId}/clone`, { target_ad_set_id: targetAdSetId })
}

export async function refreshAdMetaStatus(adId: string): Promise<Record<string, unknown>> {
  return backendPost<Record<string, unknown>>(`/api/ads/${adId}/refresh-meta-status`, {})
}

export async function setAdMetaStatus(
  adId: string,
  status: 'ACTIVE' | 'PAUSED',
): Promise<Record<string, unknown>> {
  return backendPost<Record<string, unknown>>(`/api/ads/${adId}/set-meta-status`, { status })
}

export async function publishAdToMeta(
  adId: string,
  adAccountId: string,
  pageId: string,
  instagramUserId: string,
  pixelId?: string | null,
  customEventType?: string | null,
): Promise<Record<string, unknown>> {
  return backendPost<Record<string, unknown>>('/api/integrations/meta/publish-ad', {
    ad_id: adId,
    ad_account_id: adAccountId,
    page_id: pageId,
    instagram_user_id: instagramUserId,
    ...(pixelId ? { pixel_id: pixelId } : {}),
    ...(customEventType ? { custom_event_type: customEventType } : {}),
  })
}

export async function publishCampaignToMeta(input: {
  campaignId: string
  adAccountId: string
  pageId: string
  instagramUserId: string
  campaignName?: string
  campaignObjective?: string
  budgetType?: 'ABO' | 'CBO'
  scheduleType?: 'continuous' | 'one_time'
  dailyBudget?: number | null
  lifetimeBudget?: number | null
  bidStrategy?: string
  targeting?: Record<string, unknown>
  startTime?: string | null
  endTime?: string | null
  pixelId?: string | null
  customEventType?: string | null
}): Promise<Record<string, unknown>> {
  return backendPost<Record<string, unknown>>('/api/integrations/meta/publish-campaign', {
    campaign_id: input.campaignId,
    ad_account_id: input.adAccountId,
    page_id: input.pageId,
    instagram_user_id: input.instagramUserId,
    ...(input.campaignName ? { campaign_name: input.campaignName } : {}),
    ...(input.campaignObjective ? { campaign_objective: input.campaignObjective } : {}),
    ...(input.budgetType ? { budget_type: input.budgetType } : {}),
    ...(input.scheduleType ? { schedule_type: input.scheduleType } : {}),
    ...(typeof input.dailyBudget === 'number' ? { daily_budget: input.dailyBudget } : {}),
    ...(typeof input.lifetimeBudget === 'number' ? { lifetime_budget: input.lifetimeBudget } : {}),
    ...(input.bidStrategy ? { bid_strategy: input.bidStrategy } : {}),
    ...(input.targeting ? { targeting: input.targeting } : {}),
    ...(input.startTime ? { start_time: input.startTime } : {}),
    ...(input.endTime ? { end_time: input.endTime } : {}),
    ...(input.pixelId ? { pixel_id: input.pixelId } : {}),
    ...(input.customEventType ? { custom_event_type: input.customEventType } : {}),
  })
}

export async function getMetaConnectionStatus(): Promise<{
  connected: boolean
  adAccounts: Array<{ id: string; name: string }> | null
  pages: Array<{ id: string; name: string }> | null
}> {
  return backendGet<{
    connected: boolean
    adAccounts: Array<{ id: string; name: string }> | null
    pages: Array<{ id: string; name: string }> | null
  }>('/api/integrations/meta/status')
}

export async function fetchMetaAdAccounts(): Promise<
  Array<{ id: string; name: string; currency: string }>
> {
  const res = await backendGet<{ data: Array<{ id: string; name: string; currency: string }> }>(
    '/api/integrations/meta/ad-accounts',
  )
  return res.data ?? []
}

export async function searchMetaCountries(
  query: string,
): Promise<Array<{ key: string; name: string }>> {
  const res = await backendGet<{ data: Array<{ key: string; name: string }> }>(
    `/api/integrations/meta/search-countries?q=${encodeURIComponent(query)}`,
  )
  return res.data ?? []
}

export async function searchMetaLocations(query: string): Promise<
  Array<{
    key: string
    name: string
    type: string
    country_code?: string
    country_name?: string
    region?: string
    region_id?: number
  }>
> {
  const res = await backendGet<{
    data: Array<{
      key: string
      name: string
      type: string
      country_code?: string
      country_name?: string
      region?: string
      region_id?: number
    }>
  }>(`/api/integrations/meta/search-locations?q=${encodeURIComponent(query)}`)
  return res.data ?? []
}

export async function searchMetaInterests(query: string): Promise<
  Array<{
    id: string
    name: string
    audience_size_lower_bound?: number
    audience_size_upper_bound?: number
    path?: string[]
    topic?: string
  }>
> {
  const res = await backendGet<{
    data: Array<{
      id: string
      name: string
      audience_size_lower_bound?: number
      audience_size_upper_bound?: number
      path?: string[]
      topic?: string
    }>
  }>(`/api/integrations/meta/search-interests?q=${encodeURIComponent(query)}`)
  return res.data ?? []
}

export async function fetchMetaPages(): Promise<Array<{ id: string; name: string }>> {
  const res = await backendGet<{ data: Array<{ id: string; name: string }> }>(
    '/api/integrations/meta/pages',
  )
  return res.data ?? []
}

export async function fetchMetaPage(
  pageId: string,
): Promise<{ id: string; name: string; picture_url: string | null } | null> {
  const res = await backendGet<{ data: { id: string; name: string; picture_url: string | null } }>(
    `/api/integrations/meta/pages/${encodeURIComponent(pageId)}`,
  )
  return res.data ?? null
}

export async function fetchMetaPixels(
  adAccountId: string,
): Promise<Array<{ id: string; name: string }>> {
  const res = await backendGet<{ data: Array<{ id: string; name: string }> }>(
    `/api/integrations/meta/ad-accounts/${encodeURIComponent(adAccountId)}/pixels`,
  )
  return res.data ?? []
}

export async function createMetaPixel(
  adAccountId: string,
  input: { name: string; description?: string; data_use_setting?: string },
): Promise<{ id: string; name?: string }> {
  const res = await backendPost<{ data: { id: string; name?: string } }>(
    `/api/integrations/meta/ad-accounts/${encodeURIComponent(adAccountId)}/pixels`,
    input,
  )
  return res.data
}

export async function fetchMetaCustomAudiences(
  adAccountId: string,
): Promise<Array<{ id: string; name: string; subtype?: string; approximate_count?: number }>> {
  const res = await backendGet<{
    data: Array<{ id: string; name: string; subtype?: string; approximate_count?: number }>
  }>(`/api/integrations/meta/ad-accounts/${encodeURIComponent(adAccountId)}/customaudiences`)
  return res.data ?? []
}

export async function fetchMetaInstagramAccountsForPage(
  pageId: string,
): Promise<Array<{ id: string; username?: string; profile_pic?: string }>> {
  const res = await backendGet<{
    data: Array<{ id: string; username?: string; profile_pic?: string }>
  }>(`/api/integrations/meta/pages/${encodeURIComponent(pageId)}/instagram-accounts`)
  return res.data ?? []
}

// ============================================================================
// Backend API — Ad generation
// ============================================================================

export async function generateAdVariations(
  adSetId: string,
  payload: {
    baseImageUrl: string
    baseImageAssetId?: string
    variationCount: number
  },
): Promise<{ variations: Array<{ id: string; imageUrl: string; strategy: string }> }> {
  return backendPost(`/api/ad-sets/${adSetId}/ads/generate-variations`, payload)
}

export async function regenerateAdVariation(
  adSetId: string,
  payload: {
    baseImageUrl: string
    prompt?: string
    presetName?: string
  },
): Promise<{
  variation: { id: string; imageUrl: string; strategy: string; assetId: string | null }
}> {
  return backendPost(`/api/ad-sets/${adSetId}/ads/regenerate-variation`, payload)
}

export async function generateAdCopy(
  adSetId: string,
  payload: {
    imageUrl?: string
    context?: string
    count?: number
  },
): Promise<{
  variations: Array<{ headline: string; primaryText: string; description: string }>
}> {
  return backendPost(`/api/ad-sets/${adSetId}/ads/generate-copy`, payload)
}

export async function fetchCampaignOffers(campaignId: string, spaceId?: string): Promise<Offer[]> {
  const search = new URLSearchParams()
  if (spaceId) search.set('space_id', spaceId)
  const query = search.toString()
  const url = `/api/campaigns/${campaignId}/offers${query ? `?${query}` : ''}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<Offer[]>(url))
}

export async function updateOffer(offerId: string, name?: string): Promise<Offer> {
  const offer = await backendPatch<Offer>(`/api/offers/${offerId}`, { name })
  invalidateCachedFetch('offer-names:')
  return offer
}

export async function deleteOffer(offerId: string): Promise<void> {
  await backendDelete(`/api/offers/${offerId}`)
  invalidateCachedFetch('offer-names:')
}

// ============================================================================
// Backend API — Sequences
// ============================================================================

/**
 * `opts.summary` returns email metadata without bodies — list views only show
 * counts/subjects. Sequence editors must use {@link fetchSequence}.
 */
export async function fetchCampaignSequences(
  campaignId: string,
  spaceId?: string,
  opts?: { summary?: boolean },
): Promise<Sequence[]> {
  const search = new URLSearchParams()
  if (spaceId) search.set('space_id', spaceId)
  if (opts?.summary) search.set('fields', 'summary')
  const query = search.toString()
  const url = `/api/campaigns/${campaignId}/sequences${query ? `?${query}` : ''}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<Sequence[]>(url))
}

export async function fetchCampaignEmails(campaignId: string): Promise<EmailArtifact[]> {
  const url = `/api/campaigns/${campaignId}/emails`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<EmailArtifact[]>(url))
}

export async function fetchSpaceEmails(
  campaignId: string,
  spaceId: string,
): Promise<EmailArtifact[]> {
  const search = new URLSearchParams({ space_id: spaceId })
  const url = `/api/campaigns/${campaignId}/emails?${search.toString()}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<EmailArtifact[]>(url))
}

export async function createEmailArtifact(data: {
  subject: string
  body: string
  space_id: string
  source_item_id: string
  campaign_id?: string
}): Promise<EmailArtifact> {
  return backendPost<EmailArtifact>('/api/emails', data)
}

export async function createCampaignEmail(
  campaignId: string,
  spaceId: string,
  subject?: string,
): Promise<EmailArtifact> {
  return backendPost<EmailArtifact>(`/api/campaigns/${campaignId}/emails`, {
    space_id: spaceId,
    ...(subject ? { subject } : {}),
  })
}

export async function updateEmailArtifact(
  emailId: string,
  data: {
    subject?: string
    body?: string
    status?: 'draft' | 'ready' | 'sent'
  },
): Promise<EmailArtifact> {
  return backendPatch<EmailArtifact>(`/api/emails/${emailId}`, data)
}

export async function deleteEmailArtifact(emailId: string): Promise<void> {
  return backendDelete(`/api/emails/${emailId}`)
}

export async function updateSequence(sequenceId: string, name?: string): Promise<Sequence> {
  return backendPatch<Sequence>(`/api/sequences/${sequenceId}`, { name })
}

export async function deleteSequence(
  sequenceId: string,
  deleteMode: 'keep_unsent' | 'remove_unsent',
): Promise<void> {
  return backendDelete(`/api/sequences/${sequenceId}?delete_mode=${deleteMode}`)
}

export async function updateSequenceEmail(
  sequenceId: string,
  emailId: string,
  data: {
    subject?: string
    body?: string
    delay_hours?: number
    status?: 'draft' | 'ready' | 'sent'
  },
): Promise<Record<string, unknown>> {
  return backendPatch<Record<string, unknown>>(
    `/api/sequences/${sequenceId}/emails/${emailId}`,
    data,
  )
}

export async function createSequenceEmail(
  sequenceId: string,
): Promise<{ id: string; sequence_id: string; order_index: number }> {
  return backendPost<{ id: string; sequence_id: string; order_index: number }>(
    `/api/sequences/${sequenceId}/emails`,
    {},
  )
}

export async function syncSequenceUnsentEmails(
  sequenceId: string,
): Promise<{ success: true; updated: number }> {
  return backendPost<{ success: true; updated: number }>(
    `/api/sequences/${sequenceId}/sync-unsent`,
    {},
  )
}

// ============================================================================
// Backend API — Presentations
// ============================================================================

/**
 * `opts.summary` strips generated_html + slides (a `slides_count` field is
 * returned instead) — card heroes fetch their own bundle/detail.
 */
export async function fetchCampaignPresentations(
  campaignId: string,
  spaceId?: string,
  opts?: { summary?: boolean },
): Promise<Presentation[]> {
  const search = new URLSearchParams()
  if (spaceId) search.set('space_id', spaceId)
  if (opts?.summary) search.set('fields', 'summary')
  const query = search.toString()
  const url = `/api/campaigns/${campaignId}/presentations${query ? `?${query}` : ''}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<Presentation[]>(url))
}

export function invalidatePresentationCommentsCache(presentationId: string) {
  invalidateCachedFetch(`presentation-comments:${presentationId}`)
}

export async function listPresentationFiles(presentationId: string): Promise<PresentationFile[]> {
  return backendGet<PresentationFile[]>(`/api/presentations/${presentationId}/files`)
}

export async function fetchPresentationFile(
  presentationId: string,
  path: string,
): Promise<PresentationFile> {
  const search = new URLSearchParams({ path })
  return backendGet<PresentationFile>(`/api/presentations/${presentationId}/files?${search}`)
}

export async function savePresentationFile(
  presentationId: string,
  path: string,
  content: string,
  role?: string,
): Promise<PresentationFile> {
  const file = await backendPut<PresentationFile>(`/api/presentations/${presentationId}/files`, {
    path,
    content,
    ...(role ? { role } : {}),
  })
  invalidatePresentationPreviewCache(presentationId)
  return file
}

export async function deletePresentationFile(presentationId: string, path: string): Promise<void> {
  const search = new URLSearchParams({ path })
  await backendDelete(`/api/presentations/${presentationId}/files?${search}`)
  invalidatePresentationPreviewCache(presentationId)
}

export async function listPresentationComments(
  presentationId: string,
): Promise<PresentationComment[]> {
  return cachedFetch(
    `presentation-comments:${presentationId}`,
    () => backendGet<PresentationComment[]>(`/api/presentations/${presentationId}/comments`),
    { ttlMs: 30_000 },
  )
}

export async function savePresentationComment(
  presentationId: string,
  comment: {
    id: string
    body: string
    slide_index?: number | null
    element_trace?: PresentationElementTrace | null
  },
): Promise<PresentationComment> {
  const saved = await backendPut<PresentationComment>(
    `/api/presentations/${presentationId}/comments/${comment.id}`,
    {
      body: comment.body,
      slide_index: comment.slide_index ?? null,
      element_trace: comment.element_trace ?? null,
    },
    { resilient: true },
  )
  invalidatePresentationCommentsCache(presentationId)
  return saved
}

export async function updatePresentationComment(
  presentationId: string,
  commentId: string,
  patch: { body?: string; resolved?: boolean },
): Promise<PresentationComment> {
  const updated = await backendPatch<PresentationComment>(
    `/api/presentations/${presentationId}/comments/${commentId}`,
    patch,
  )
  invalidatePresentationCommentsCache(presentationId)
  return updated
}

export async function deletePresentationComment(
  presentationId: string,
  commentId: string,
): Promise<void> {
  await backendDelete(`/api/presentations/${presentationId}/comments/${commentId}`)
  invalidatePresentationCommentsCache(presentationId)
}

export async function listPresentationAssets(presentationId: string): Promise<PresentationAsset[]> {
  return backendGet<PresentationAsset[]>(`/api/presentations/${presentationId}/assets`)
}

export async function attachPresentationAsset(
  presentationId: string,
  path: string,
  mediaAssetId: string,
  role?: string,
): Promise<PresentationAsset> {
  const asset = await backendPost<PresentationAsset>(
    `/api/presentations/${presentationId}/assets`,
    {
      path,
      media_asset_id: mediaAssetId,
      ...(role ? { role } : {}),
    },
  )
  invalidatePresentationPreviewCache(presentationId)
  return asset
}

export async function deletePresentationAsset(presentationId: string, path: string): Promise<void> {
  const search = new URLSearchParams({ path })
  await backendDelete(`/api/presentations/${presentationId}/assets?${search}`)
  invalidatePresentationPreviewCache(presentationId)
}

export async function updatePresentation(
  presentationId: string,
  data: { name?: string; hide_branding?: boolean; metadata?: Record<string, unknown> },
): Promise<Presentation> {
  const presentation = await backendPatch<Presentation>(
    `/api/presentations/${presentationId}`,
    data,
  )
  invalidatePresentationPreviewCache(presentationId)
  return presentation
}

export async function deletePresentation(presentationId: string): Promise<void> {
  await backendDelete(`/api/presentations/${presentationId}`)
  invalidatePresentationPreviewCache(presentationId)
}

// ============================================================================
// Backend API — Avatars
// ============================================================================

export async function fetchCampaignAvatars(
  campaignId: string,
  spaceId?: string,
): Promise<Avatar[]> {
  const search = new URLSearchParams()
  if (spaceId) search.set('space_id', spaceId)
  const query = search.toString()
  const url = `/api/campaigns/${campaignId}/avatars${query ? `?${query}` : ''}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<Avatar[]>(url))
}

export async function updateAvatar(
  avatarId: string,
  patch: { name?: string; persona_data?: Record<string, unknown> },
): Promise<Avatar> {
  return backendPatch<Avatar>(`/api/avatars/${avatarId}`, patch)
}

export async function deleteAvatar(avatarId: string): Promise<void> {
  return backendDelete(`/api/avatars/${avatarId}`)
}

// ============================================================================
// Campaign Deliverables (mission_deliverables by campaign)
// ============================================================================

export interface CampaignDeliverable {
  id: string
  mission_id: string
  campaign_id: string | null
  user_id: string
  agent_key: string
  type: string
  title: string
  content: string | null
  file_url: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  source: 'mission' | 'chat' | null
  metadata: Record<string, unknown>
  created_at: string
}

export async function fetchCampaignDeliverables(
  campaignId: string,
): Promise<CampaignDeliverable[]> {
  const supabase = getSupabase()
  // eslint-disable-next-line no-restricted-syntax -- direct deliverables query for campaign preview
  const { data, error } = await supabase
    .from('mission_deliverables')
    .select(
      'id, mission_id, campaign_id, user_id, agent_key, type, title, content, file_url, file_name, file_size, mime_type, source, metadata, created_at',
    )
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data ?? []) as CampaignDeliverable[]
}

// ============================================================================
// Backend API — Documents
// ============================================================================

export async function fetchCampaignDocuments(campaignId: string): Promise<ConversationDocument[]> {
  return backendGet<ConversationDocument[]>(`/api/campaigns/${campaignId}/documents`)
}

export async function fetchConversationDocuments(
  conversationId: string,
): Promise<ConversationDocument[]> {
  return backendGet<ConversationDocument[]>(`/api/conversations/${conversationId}/documents`)
}

export async function fetchAgentDocuments(agentKey: string): Promise<ConversationDocument[]> {
  return backendGet<ConversationDocument[]>(`/api/agents/${encodeURIComponent(agentKey)}/documents`)
}

export async function updateDocument(
  documentId: string,
  title: string,
): Promise<ConversationDocument> {
  return backendPatch<ConversationDocument>(`/api/documents/${documentId}`, { title })
}

export async function deleteDocument(documentId: string): Promise<void> {
  await backendDelete(`/api/documents/${documentId}`)
}

// ============================================================================
// Backend API — Social Posts
// ============================================================================

export async function fetchCampaignSocialPosts(
  campaignId: string,
  spaceId?: string,
): Promise<SocialPost[]> {
  const search = new URLSearchParams()
  if (spaceId) search.set('space_id', spaceId)
  const query = search.toString()
  const url = `/api/campaigns/${campaignId}/social-posts${query ? `?${query}` : ''}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<SocialPost[]>(url))
}

export async function createSocialPost(
  campaignId: string,
  platform: SocialPost['platform'] = 'instagram',
  spaceId?: string | null,
): Promise<SocialPost> {
  return backendPost<SocialPost>(`/api/campaigns/${campaignId}/social-posts`, {
    platform,
    post_type: 'single_image',
    caption: '',
    status: 'draft',
    ...(spaceId !== undefined ? { space_id: spaceId } : {}),
  })
}

export interface ScheduledSocialPost extends SocialPost {
  schedule_id: string | null
  schedule_status: 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled' | null
  schedule_job_id: string | null
  schedule_error_message: string | null
  schedule_attempts: number | null
  schedule_published_at: string | null
}

export async function fetchCampaignSchedule(campaignId: string): Promise<ScheduledSocialPost[]> {
  return backendGet<ScheduledSocialPost[]>(`/api/campaigns/${campaignId}/schedule`)
}

export async function scheduleSocialPost(id: string, scheduled_at: string): Promise<SocialPost> {
  return backendPost<SocialPost>(`/api/social-posts/${id}/schedule`, { scheduled_at })
}

export async function unscheduleSocialPost(id: string): Promise<SocialPost> {
  return backendPost<SocialPost>(`/api/social-posts/${id}/unschedule`, {})
}

export async function updateSocialPost(
  id: string,
  data: {
    caption?: string
    headline?: string
    generated_tsx?: string | null
    image_url?: string | null
    image_asset_id?: string | null
    video_url?: string | null
    video_asset_id?: string | null
    carousel_slides?: unknown
    hashtags?: string[]
    cta_url?: string | null
    post_type?: string
    status?: string
    metadata?: Record<string, unknown>
  },
): Promise<SocialPost> {
  return backendPatch<SocialPost>(`/api/social-posts/${id}`, data)
}

export async function deleteSocialPost(id: string): Promise<void> {
  return backendDelete(`/api/social-posts/${id}`)
}

export async function fetchIntegrationStatus(
  integrationId: string,
): Promise<{ connected: boolean }> {
  const result = await backendGet<{ success: boolean; connected: boolean }>(
    `/api/integrations/status/${encodeURIComponent(integrationId)}`,
  )
  return { connected: result?.connected === true }
}

export interface LinkedInProfileData {
  localizedFirstName?: string
  localizedLastName?: string
  headline?: string
  profilePicture?: { displayImage?: string }
  company?: string
  location?: string
  followersCount?: number
  connectionsCount?: number
}

export async function fetchLinkedInProfile(): Promise<LinkedInProfileData | null> {
  const res = await backendGet<LinkedInProfileData | null>('/api/integrations/linkedin/profile')
  return res ?? null
}

export interface InstagramProfileData {
  id?: string
  username?: string
  name?: string
  profile_picture_url?: string
  biography?: string
  followers_count?: number
  following_count?: number
  follows_count?: number
  media_count?: number
}

export interface InstagramMediaItem {
  id: string
  permalink?: string
  comments_count?: number
  caption?: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  timestamp?: string
}

export async function fetchInstagramProfile(): Promise<InstagramProfileData | null> {
  const res = await backendGet<InstagramProfileData | null>('/api/integrations/instagram/profile')
  return res ?? null
}

export async function fetchInstagramMedia(limit?: number): Promise<InstagramMediaItem[]> {
  const q = limit != null ? `?limit=${limit}` : ''
  const res = await backendGet<{ data?: InstagramMediaItem[] }>(
    `/api/integrations/instagram/media${q}`,
  )
  return res?.data ?? []
}

// ============================================================================
// Meta Browse & Sync — Fetch existing entities from Meta
// ============================================================================

export type MetaFetchedCampaign = {
  id: string
  name: string
  objective?: string
  status?: string
  effective_status?: string
  daily_budget?: string
  lifetime_budget?: string
  created_time?: string
  start_time?: string
  stop_time?: string
  buying_type?: string
}

export type MetaFetchedAdSet = {
  id: string
  name: string
  status?: string
  effective_status?: string
  daily_budget?: string
  lifetime_budget?: string
  targeting?: Record<string, unknown>
  optimization_goal?: string
  billing_event?: string
  start_time?: string
  end_time?: string
}

export type MetaFetchedAd = {
  id: string
  name: string
  status?: string
  effective_status?: string
  created_time?: string
  creative?: {
    id: string
    name?: string
    title?: string
    body?: string
    image_url?: string
    thumbnail_url?: string
    call_to_action_type?: string
  }
}

export type MetaFetchedHierarchy = {
  campaigns: Array<
    MetaFetchedCampaign & {
      ad_sets: Array<MetaFetchedAdSet & { ads: MetaFetchedAd[] }>
    }
  >
  total_campaigns: number
  total_ad_sets: number
  total_ads: number
}

export type MetaSyncResult = {
  campaigns_created: number
  campaigns_updated: number
  ad_sets_created: number
  ad_sets_updated: number
  ads_created: number
  ads_updated: number
  total_campaigns: number
  total_ad_sets: number
  total_ads: number
}

export async function fetchMetaCampaigns(adAccountId: string): Promise<MetaFetchedCampaign[]> {
  const res = await backendGet<{ data: MetaFetchedCampaign[] }>(
    `/api/integrations/meta/ad-accounts/${encodeURIComponent(adAccountId)}/campaigns`,
  )
  return res.data ?? []
}

export async function fetchMetaAdSets(metaCampaignId: string): Promise<MetaFetchedAdSet[]> {
  const res = await backendGet<{ data: MetaFetchedAdSet[] }>(
    `/api/integrations/meta/meta-campaigns/${encodeURIComponent(metaCampaignId)}/adsets`,
  )
  return res.data ?? []
}

export async function fetchMetaAds(metaAdSetId: string): Promise<MetaFetchedAd[]> {
  const res = await backendGet<{ data: MetaFetchedAd[] }>(
    `/api/integrations/meta/meta-adsets/${encodeURIComponent(metaAdSetId)}/ads`,
  )
  return res.data ?? []
}

export async function fetchMetaFullHierarchy(adAccountId: string): Promise<MetaFetchedHierarchy> {
  const res = await backendGet<{ data: MetaFetchedHierarchy }>(
    `/api/integrations/meta/ad-accounts/${encodeURIComponent(adAccountId)}/hierarchy`,
  )
  return res.data
}

export async function syncMetaAdAccount(
  adAccountId: string,
  campaignId: string,
): Promise<MetaSyncResult> {
  const res = await backendPost<{ data: MetaSyncResult }>(
    `/api/integrations/meta/ad-accounts/${encodeURIComponent(adAccountId)}/sync`,
    { campaignId },
  )
  return res.data
}
