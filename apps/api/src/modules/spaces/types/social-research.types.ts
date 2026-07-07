export type SocialResearchPlatform = 'instagram' | 'tiktok' | 'youtube' | 'twitter'
export type SocialResearchPlatformSelector = SocialResearchPlatform | 'both' | 'all'
export type SocialResearchSyncMode = 'use_existing' | 'resync_30d'
export type SocialResearchEnrichment = 'caption' | 'hook' | 'transcript'
export type SocialResearchViewType =
  | 'instagram_research'
  | 'tiktok_research'
  | 'youtube_research'
  | 'twitter_research'

export type SocialMediaType =
  | 'reel'
  | 'image'
  | 'carousel'
  | 'post'
  | 'slideshow'
  | 'youtube_video'
  | 'youtube_short'
  | 'tweet'
  | 'tweet_video'

export interface SocialResearchTrackedAccount {
  handle: string
  user_id_ig?: string | null
  follower_count?: number | null
  last_synced_at?: string | null
  profile_pic_url?: string | null
  profile_pic_source_url?: string | null
  profile_pic_asset_id?: string | null
  profile_pic_storage_path?: string | null
  profile_pic_cached_at?: string | null
  profile_pic_cache_status?: string | null
  profile_pic_cache_error?: string | null
}

export interface SocialContentItem {
  platform: SocialResearchPlatform
  media_id: string
  shortcode: string
  media_type: SocialMediaType
  play_count: number
  like_count: number | null
  comment_count: number | null
  thumbnail_url: string | null
  video_url: string | null
  taken_at: string
  outlier_score: number
  caption: string | null
}

export interface SocialRichPostInfo {
  caption: string | null
  like_count: number | null
  comment_count: number | null
  play_count: number | null
  video_duration: number | null
  owner_username: string | null
  owner_full_name: string | null
  owner_follower_count: number | null
  owner_is_verified: boolean
  owner_profile_pic: string | null
  owner_post_count: number | null
  audio_name: string | null
  audio_artist: string | null
  is_original_audio: boolean
  is_paid_partnership: boolean
  tagged_users: string[]
  has_audio: boolean
  /** X/Twitter tweet details — optional; other platforms omit these fields. */
  retweet_count?: number | null
  quote_count?: number | null
  bookmark_count?: number | null
  post_lang?: string | null
  post_source?: string | null
  hashtag_names?: string[]
  mention_handles?: string[]
  link_urls?: string[]
  /** YouTube video details — optional; other platforms omit these fields. */
  post_description?: string | null
  post_genre?: string | null
  keyword_names?: string[]
  transcript_language?: string | null
}

export interface SocialResearchAutomationItem {
  item_id: string
  platform: SocialResearchPlatform
  view_type: SocialResearchViewType
  handle: string
  media_id: string
  shortcode: string
  media_type: string
  taken_at: string | null
  play_count: number
  like_count: number | null
  comment_count: number | null
  outlier_score: number
  caption: string | null
  transcript: string | null
  hook: string | null
  url: string | null
}

/**
 * Identifies the creator behind a topic-search result so a baseline feed can
 * be fetched for outlier scoring. YouTube prefers channel_id (handles come
 * back in inconsistent formats); IG/TikTok use the username handle.
 */
export interface TopicSearchCreatorRef {
  platform: SocialResearchPlatform
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
  /**
   * Supabase-cached copy of the thumbnail, written when a search is saved as a
   * snapshot. IG/TikTok CDN URLs expire within days, so frozen snapshots need it.
   */
  thumbnail_cached_url?: string | null
}

/** A viewer comment persisted onto a research item (top-level only). */
export interface SocialCommentItem {
  id: string
  text: string
  author_name: string | null
  author_is_creator: boolean
  like_count: number | null
  reply_count: number | null
  published_at: string | null
}

/** One main point of the video, per the script-writing formula. */
export interface VideoBreakdownPoint {
  title: string
  /** The re-hook line/technique that introduces this point, quoted or paraphrased. */
  re_hook: string | null
  /** How the point is delivered. */
  delivery: 'story' | 'framework' | 'explanation' | 'mixed'
  summary: string
}

/**
 * The YouTube analysis formula run in reverse — a deconstruction of why a
 * video works, section by section. Stored frozen on the item's custom_data.
 */
export interface VideoBreakdown {
  winning_topic: string
  topic_angle: string
  packaging: {
    title_analysis: string
    thumbnail_description: string | null
    thumbnail_text: string | null
    title_thumbnail_synergy: string | null
  }
  /** The 3-5 questions the packaging plants in a viewer's mind, in priority order. */
  viewer_questions: string[]
  hook: {
    /** Verbatim opening lines from the transcript, when available. */
    quote: string | null
    technique: string
  }
  setup: {
    roadmap: string[]
    big_claims: string[]
    analysis: string
  }
  main_points: VideoBreakdownPoint[]
  /** 2-4 transferable patterns the user can riff on for their own video. */
  steal_this: string[]
  model: string
  generated_at: string
}

export interface SavedTopicSearchFilters {
  sort_mode?: 'relevance' | 'outlier_score' | 'play_count'
  min_outlier_score?: number
  min_views?: number
}

export interface SavedTopicSearchSummary {
  id: string
  platform: SocialResearchPlatform
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

export interface TopicSearchPage {
  items: TopicSearchResultItem[]
  /** Opaque pagination token (YouTube continuationToken / TikTok cursor). Null = no more pages. */
  next_cursor: string | null
}

export interface TopicCreatorScore {
  key: string
  baseline_median: number | null
  sample_size: number
}

export interface SocialProfileSummary {
  profile_pic_url: string | null
  follower_count: number
  user_id: string | null
  full_name: string | null
}

export interface CachedSocialImageResult {
  cacheKey: string
  ok: boolean
  assetId?: string
  url?: string
  filePath?: string
  cachedAt?: string
  error?: string
}
