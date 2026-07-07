/**
 * Topic search client: keyword search across platforms, creator outlier
 * scoring, saved-search snapshots (space_topic_searches), and the ephemeral
 * preview-item helpers used before a result is persisted.
 */
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { SpaceItem } from '../types'
import type { SocialPlatform } from '../types/space-schema'
import {
  SOCIAL_VIEW_TYPE_BY_PLATFORM,
  socialApiPath,
  type SocialContentItem,
} from './social-research.shared'

export interface TopicSearchCreatorRef {
  platform: SocialPlatform
  handle: string
  channel_id?: string | null
}

export interface TopicSearchResultItem extends Omit<SocialContentItem, 'outlier_score'> {
  post_url: string
  creator: TopicSearchCreatorRef
  creator_title: string | null
  creator_thumbnail: string | null
  creator_follower_count: number | null
  /** Null until the creator's baseline has been fetched and scored. */
  outlier_score: number | null
  baseline_median: number | null
  /** Durable Supabase-cached thumbnail, present on frozen saved-search snapshots. */
  thumbnail_cached_url?: string | null
}

export interface TopicCreatorScore {
  key: string
  baseline_median: number | null
  sample_size: number
}

/** Mirrors topicCreatorKey on the API — used to match score responses to cards. */
export function topicCreatorKey(creator: TopicSearchCreatorRef): string {
  const ref = creator.channel_id || creator.handle
  return `${creator.platform}:${ref.toLowerCase()}`
}

export interface SavedTopicSearchFilters {
  sort_mode?: 'relevance' | 'outlier_score' | 'play_count'
  min_outlier_score?: number
  min_views?: number
}

export interface SavedTopicSearchSummary {
  id: string
  platform: SocialPlatform
  title: string
  query: string
  filters: SavedTopicSearchFilters
  result_count: number
  created_at: string
  last_run_at: string
}

export interface SavedTopicSearch extends SavedTopicSearchSummary {
  results: TopicSearchResultItem[]
  next_cursor: string | null
}

function topicSearchesPath(spaceId: string, suffix = ''): string {
  return `/api/spaces/${spaceId}/social-research/topic-searches${suffix}`
}

function savedSearchesCacheKey(spaceId: string): string {
  return `topic-searches:${spaceId}`
}

export async function listSavedTopicSearches(spaceId: string): Promise<SavedTopicSearchSummary[]> {
  const res = await cachedFetch(
    savedSearchesCacheKey(spaceId),
    () =>
      backendGet<{ success: boolean; searches: SavedTopicSearchSummary[] }>(
        topicSearchesPath(spaceId),
      ),
    { ttlMs: 60_000 },
  )
  return res.searches
}

export async function getSavedTopicSearch(
  spaceId: string,
  searchId: string,
): Promise<SavedTopicSearch> {
  const res = await backendGet<{ success: boolean; search: SavedTopicSearch }>(
    topicSearchesPath(spaceId, `/${searchId}`),
  )
  return res.search
}

export async function createSavedTopicSearch(
  spaceId: string,
  payload: {
    platform: SocialPlatform
    title: string
    query: string
    filters?: SavedTopicSearchFilters
    items: TopicSearchResultItem[]
    next_cursor?: string | null
  },
): Promise<SavedTopicSearch> {
  const res = await backendPost<{ success: boolean; search: SavedTopicSearch }>(
    topicSearchesPath(spaceId),
    payload,
  )
  invalidateCachedFetch(savedSearchesCacheKey(spaceId))
  return res.search
}

export async function refreshSavedTopicSearch(
  spaceId: string,
  searchId: string,
): Promise<SavedTopicSearch> {
  const res = await backendPost<{ success: boolean; search: SavedTopicSearch }>(
    topicSearchesPath(spaceId, `/${searchId}/refresh`),
    {},
  )
  invalidateCachedFetch(savedSearchesCacheKey(spaceId))
  return res.search
}

export async function loadMoreSavedTopicSearch(
  spaceId: string,
  searchId: string,
): Promise<SavedTopicSearch> {
  const res = await backendPost<{ success: boolean; search: SavedTopicSearch }>(
    topicSearchesPath(spaceId, `/${searchId}/load-more`),
    {},
  )
  invalidateCachedFetch(savedSearchesCacheKey(spaceId))
  return res.search
}

export async function updateSavedTopicSearch(
  spaceId: string,
  searchId: string,
  patch: {
    title?: string
    filters?: SavedTopicSearchFilters
    /** Replaces the frozen snapshot — used by background outlier persistence. */
    results?: TopicSearchResultItem[]
    next_cursor?: string | null
  },
): Promise<void> {
  await backendPatch<{ success: boolean }>(topicSearchesPath(spaceId, `/${searchId}`), patch)
  invalidateCachedFetch(savedSearchesCacheKey(spaceId))
}

export async function deleteSavedTopicSearch(spaceId: string, searchId: string): Promise<void> {
  await backendDelete<{ success: boolean }>(topicSearchesPath(spaceId, `/${searchId}`))
  invalidateCachedFetch(savedSearchesCacheKey(spaceId))
}

export const TOPIC_PREVIEW_ITEM_ID_PREFIX = 'topic-preview:'

/** Ephemeral SpaceItem for topic-search preview before save. */
export function topicResultToPreviewItem(
  result: TopicSearchResultItem,
  spaceId: string,
): SpaceItem {
  const platform = result.platform
  const handle = result.creator.handle || result.creator.channel_id || 'unknown'
  const now = new Date().toISOString()
  const customData: Record<string, unknown> = {
    _view_type: SOCIAL_VIEW_TYPE_BY_PLATFORM[platform],
    _platform: platform,
    _handle: handle,
    _source: 'topic_search',
    media_id: result.media_id,
    shortcode: result.shortcode,
    media_type: result.media_type,
    post_url: result.post_url,
    play_count: result.play_count,
    like_count: result.like_count,
    comment_count: result.comment_count,
    thumbnail_url: result.thumbnail_url,
    ...(result.thumbnail_cached_url ? { thumbnail_cached_url: result.thumbnail_cached_url } : {}),
    video_url: result.video_url,
    taken_at: result.taken_at,
    outlier_score: result.outlier_score ?? 0,
    baseline_median: result.baseline_median,
    caption: result.caption,
    owner_username: handle,
    owner_full_name: result.creator_title,
    owner_follower_count: result.creator_follower_count,
    yt_channel_id: result.creator.channel_id ?? undefined,
  }
  if (platform === 'instagram') customData.ig_media_id = result.media_id
  if (platform === 'youtube') customData.video_id = result.media_id
  if (platform === 'tiktok') customData.aweme_id = result.media_id
  if (platform === 'twitter') customData.tweet_id = result.media_id

  return {
    id: `${TOPIC_PREVIEW_ITEM_ID_PREFIX}${result.media_id}`,
    space_id: spaceId,
    org_id: '',
    user_id: '',
    title: result.caption?.slice(0, 120) || result.shortcode || result.media_id,
    status: 'todo',
    priority: null,
    assignee_type: 'unassigned',
    assignee_id: null,
    assignees: [],
    start_date: null,
    due_date: null,
    recurrence: null,
    parent_item_id: null,
    recurrence_parent_id: null,
    description: null,
    notes: null,
    doc_body: null,
    source: 'manual',
    linked_mission_id: null,
    form_id: null,
    task_execution_status: null,
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    sort_order: 0,
    custom_data: customData,
    created_at: now,
    updated_at: now,
  }
}

export function isTopicPreviewItemId(itemId: string): boolean {
  return itemId.startsWith(TOPIC_PREVIEW_ITEM_ID_PREFIX)
}

export function topicPreviewMediaId(itemId: string): string | null {
  return isTopicPreviewItemId(itemId) ? itemId.slice(TOPIC_PREVIEW_ITEM_ID_PREFIX.length) : null
}

const TOPIC_LIST_SAVED_RESEARCH_KEYS = [
  'transcript',
  'hook',
  'analyzed_at',
  'video_breakdown',
  'like_count',
  'comment_count',
  'play_count',
  'caption',
  'owner_username',
  'owner_full_name',
  'owner_follower_count',
  'video_duration',
] as const

/** Merge analyze/enrichment fields from a persisted research item into a topic list row. */
export function mergeTopicListItemWithSavedResearch(
  preview: SpaceItem,
  saved: SpaceItem,
): SpaceItem {
  const savedCd = (saved.custom_data ?? {}) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  for (const key of TOPIC_LIST_SAVED_RESEARCH_KEYS) {
    const val = savedCd[key]
    if (val !== undefined && val !== null && val !== '') patch[key] = val
  }
  if (Object.keys(patch).length === 0) return preview
  return {
    ...preview,
    id: saved.id,
    custom_data: {
      ...((preview.custom_data ?? {}) as Record<string, unknown>),
      ...patch,
    },
  }
}

export async function searchSocialTopic(
  platform: SocialPlatform,
  spaceId: string,
  query: string,
  cursor?: string | null,
): Promise<{ items: TopicSearchResultItem[]; nextCursor: string | null }> {
  const res = await backendPost<{
    success: boolean
    items: TopicSearchResultItem[]
    next_cursor: string | null
  }>(socialApiPath(spaceId, platform, '/topic-search'), { query, cursor: cursor ?? null }, {
    resilient: true,
  })
  return { items: res.items, nextCursor: res.next_cursor }
}

export async function scoreTopicCreators(
  platform: SocialPlatform,
  spaceId: string,
  creators: TopicSearchCreatorRef[],
): Promise<TopicCreatorScore[]> {
  const res = await backendPost<{ success: boolean; scores: TopicCreatorScore[] }>(
    socialApiPath(spaceId, platform, '/topic-search/score'),
    { creators },
  )
  return res.scores
}

export async function saveTopicResults(
  platform: SocialPlatform,
  spaceId: string,
  query: string,
  items: TopicSearchResultItem[],
): Promise<{ createdCount: number; skippedCount: number; itemIds: string[] }> {
  const res = await backendPost<{
    success: boolean
    created_count: number
    skipped_count: number
    item_ids: string[]
  }>(socialApiPath(spaceId, platform, '/topic-search/save'), { query, items })
  return { createdCount: res.created_count, skippedCount: res.skipped_count, itemIds: res.item_ids }
}
