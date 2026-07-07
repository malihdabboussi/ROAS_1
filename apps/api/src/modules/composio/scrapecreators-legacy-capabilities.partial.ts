/**
 * Seed data for integration_capabilities (Social Analysis legacy proxy).
 * Descriptions are pushy routing hints: try built-in transcript/yt-dlp first, then this (costs credits).
 */
export type ScrapeCreatorsLegacyEntry = {
  action_slug: string
  display_name: string
  description: string
  parameters: Record<string, unknown>
}

export const SCRAPECREATORS_LEGACY_ENTRIES: ScrapeCreatorsLegacyEntry[] = [
  // ── TikTok ──────────────────────────────────────────────────────────
  {
    action_slug: 'tiktok_profile',
    display_name: 'TikTok profile (Social Analysis)',
    description:
      'Use when you need TikTok public profile metadata (bio, stats, links). Do not use for transcripts—use tiktok_video_transcript. Only after native tools failed or user explicitly needs Social Analysis fields. Params: handle (no @).',
    parameters: { handle: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_video_transcript',
    display_name: 'TikTok video transcript (Social Analysis)',
    description:
      'Use when the user needs a TikTok video transcript and extract_url_transcript / yt-dlp already failed, timed out, or rate-limited. Pass the full TikTok video URL as url. Costs credits.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_user_audience',
    display_name: 'TikTok audience demographics (Social Analysis)',
    description:
      'Retrieve audience country demographics for a TikTok user. Costs 30 credits (expensive upstream). Params: username.',
    parameters: { username: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_profile_videos',
    display_name: 'TikTok profile videos (Social Analysis)',
    description:
      'List all videos from a TikTok profile. Supports pagination via cursor. Params: username (required), limit, cursor.',
    parameters: {
      username: { type: 'string', required: true },
      limit: { type: 'string' },
      cursor: { type: 'string' },
    },
  },
  {
    action_slug: 'tiktok_video_info',
    display_name: 'TikTok video info (Social Analysis)',
    description:
      'Get detailed info (stats, description, author) for a specific TikTok video. Params: videoId.',
    parameters: { videoId: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_live',
    display_name: 'TikTok live stream info (Social Analysis)',
    description:
      'Check if a TikTok user is currently live and get stream details. Params: username.',
    parameters: { username: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_comments',
    display_name: 'TikTok video comments (Social Analysis)',
    description:
      'Get comments on a TikTok video. Supports pagination. Params: videoId (required), limit, cursor.',
    parameters: {
      videoId: { type: 'string', required: true },
      limit: { type: 'string' },
      cursor: { type: 'string' },
    },
  },
  {
    action_slug: 'tiktok_comment_replies',
    display_name: 'TikTok comment replies (Social Analysis)',
    description:
      'Get replies to a specific TikTok comment. Params: commentId (required), limit, cursor.',
    parameters: {
      commentId: { type: 'string', required: true },
      limit: { type: 'string' },
      cursor: { type: 'string' },
    },
  },
  {
    action_slug: 'tiktok_following',
    display_name: 'TikTok following list (Social Analysis)',
    description: 'List accounts a TikTok user follows. Params: username.',
    parameters: { username: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_followers',
    display_name: 'TikTok followers list (Social Analysis)',
    description: 'List followers of a TikTok user. Params: username.',
    parameters: { username: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_search_users',
    display_name: 'TikTok search users (Social Analysis)',
    description: 'Search TikTok for users matching a query. Params: query.',
    parameters: { query: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_search_hashtag',
    display_name: 'TikTok search by hashtag (Social Analysis)',
    description: 'Search TikTok videos by hashtag. Params: hashtag.',
    parameters: { hashtag: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_search_keyword',
    display_name: 'TikTok search by keyword (Social Analysis)',
    description: 'Search TikTok for videos and users by keyword. Params: keyword.',
    parameters: { keyword: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_search_top',
    display_name: 'TikTok top trending searches (Social Analysis)',
    description: 'Get current top trending search queries on TikTok. No params required.',
    parameters: {},
  },
  {
    action_slug: 'tiktok_song_details',
    display_name: 'TikTok song details (Social Analysis)',
    description: 'Get details for a specific TikTok song by ID. Params: songId.',
    parameters: { songId: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_song_videos',
    display_name: 'TikTok videos using song (Social Analysis)',
    description: 'List TikTok videos that use a specific song. Params: songId.',
    parameters: { songId: { type: 'string', required: true } },
  },
  {
    action_slug: 'tiktok_feed_trending',
    display_name: 'TikTok trending feed (Social Analysis)',
    description: 'Get the current TikTok trending video feed. No params required.',
    parameters: {},
  },

  // ── Instagram ───────────────────────────────────────────────────────
  {
    action_slug: 'instagram_profile',
    display_name: 'Instagram profile (Social Analysis)',
    description:
      'Use for Instagram public profile data when Caligraph/native paths are insufficient. Params: handle (username, no @). Not for transcripts—use instagram_media_transcript.',
    parameters: { handle: { type: 'string', required: true } },
  },
  {
    action_slug: 'instagram_profile_basic',
    display_name: 'Instagram basic profile (Social Analysis)',
    description:
      'Get basic Instagram profile info (lighter than full profile). Params: handle (no @).',
    parameters: { handle: { type: 'string', required: true } },
  },
  {
    action_slug: 'instagram_media_transcript',
    display_name: 'Instagram reel/post transcript (Social Analysis)',
    description:
      'Use when you need Instagram reel/post transcript and extract_url_transcript / yt-dlp already failed. Pass media or share URL as url. Costs credits.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'instagram_posts',
    display_name: 'Instagram user posts (Social Analysis)',
    description: 'List posts from an Instagram user profile. Params: handle (no @).',
    parameters: { handle: { type: 'string', required: true } },
  },
  {
    action_slug: 'instagram_post_info',
    display_name: 'Instagram post/reel info (Social Analysis)',
    description: 'Get detailed info for a specific Instagram post or reel by URL. Params: url.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'instagram_reels_search',
    display_name: 'Instagram search reels (Social Analysis)',
    description: 'Search Instagram reels by keyword query. Params: query.',
    parameters: { query: { type: 'string', required: true } },
  },
  {
    action_slug: 'instagram_comments',
    display_name: 'Instagram post comments (Social Analysis)',
    description:
      'Get paginated comments for an Instagram post or reel. Params: url (required), cursor.',
    parameters: { url: { type: 'string', required: true }, cursor: { type: 'string' } },
  },
  {
    action_slug: 'instagram_reels',
    display_name: 'Instagram user reels (Social Analysis)',
    description: 'List reels from an Instagram user profile. Params: handle (no @).',
    parameters: { handle: { type: 'string', required: true } },
  },
  {
    action_slug: 'instagram_reels_paginated',
    display_name: 'Instagram user reels paginated (Social Analysis)',
    description: 'List reels with pagination support. Params: handle (required), cursor.',
    parameters: { handle: { type: 'string', required: true }, cursor: { type: 'string' } },
  },
  {
    action_slug: 'instagram_highlights',
    display_name: 'Instagram story highlights (Social Analysis)',
    description: 'List story highlights for an Instagram user. Params: handle (no @).',
    parameters: { handle: { type: 'string', required: true } },
  },
  {
    action_slug: 'instagram_highlight_details',
    display_name: 'Instagram highlight details (Social Analysis)',
    description:
      'Get detailed content of a specific Instagram story highlight. Params: highlightId.',
    parameters: { highlightId: { type: 'string', required: true } },
  },

  // ── YouTube ─────────────────────────────────────────────────────────
  {
    action_slug: 'youtube_video_transcript',
    display_name: 'YouTube video transcript (Social Analysis)',
    description:
      'Use only after YouTube captions + extract_url_transcript / yt-dlp failed for this video. Pass watch or youtu.be URL as url. Costs credits.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'youtube_channel',
    display_name: 'YouTube channel details (Social Analysis)',
    description:
      'Use when you need channel metadata from a channel URL and other methods are insufficient. Pass channel URL as url.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'youtube_channel_videos',
    display_name: 'YouTube channel videos (Social Analysis)',
    description: 'List videos from a YouTube channel. Params: url (channel URL, required), limit.',
    parameters: { url: { type: 'string', required: true }, limit: { type: 'string' } },
  },
  {
    action_slug: 'youtube_channel_shorts',
    display_name: 'YouTube channel shorts (Social Analysis)',
    description: 'List YouTube Shorts from a channel. Params: url (channel URL, required), cursor.',
    parameters: { url: { type: 'string', required: true }, cursor: { type: 'string' } },
  },
  {
    action_slug: 'youtube_video_details',
    display_name: 'YouTube video/short details (Social Analysis)',
    description: 'Get detailed info for a YouTube video or short. Params: url.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'youtube_search',
    display_name: 'YouTube search (Social Analysis)',
    description: 'Search YouTube for videos by keyword. Params: query (required), limit.',
    parameters: { query: { type: 'string', required: true }, limit: { type: 'string' } },
  },
  {
    action_slug: 'youtube_search_hashtag',
    display_name: 'YouTube search by hashtag (Social Analysis)',
    description: 'Search YouTube videos by hashtag. Params: hashtag (required), limit.',
    parameters: { hashtag: { type: 'string', required: true }, limit: { type: 'string' } },
  },
  {
    action_slug: 'youtube_video_comments',
    display_name: 'YouTube video comments (Social Analysis)',
    description: 'Get comments for a YouTube video. Params: url (required), limit.',
    parameters: { url: { type: 'string', required: true }, limit: { type: 'string' } },
  },
  {
    action_slug: 'youtube_shorts_trending',
    display_name: 'YouTube trending shorts (Social Analysis)',
    description: 'Get currently trending YouTube Shorts. No params required.',
    parameters: {},
  },
  {
    action_slug: 'youtube_playlist',
    display_name: 'YouTube playlist (Social Analysis)',
    description: 'Get videos from a YouTube playlist. Params: url (playlist URL).',
    parameters: { url: { type: 'string', required: true } },
  },

  // ── Twitter / X ─────────────────────────────────────────────────────
  {
    action_slug: 'twitter_profile',
    display_name: 'X (Twitter) profile (Social Analysis)',
    description:
      'Use for X/Twitter public profile by handle when needed. Params: handle (no @). For tweet video/audio transcript use twitter_tweet_transcript.',
    parameters: { handle: { type: 'string', required: true } },
  },
  {
    action_slug: 'twitter_tweet_transcript',
    display_name: 'X tweet transcript (Social Analysis)',
    description:
      'Use when you need transcript for an X post/video and extract_url_transcript / yt-dlp failed. Pass tweet URL as url. Costs credits.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'twitter_user_tweets',
    display_name: 'X (Twitter) user tweets (Social Analysis)',
    description: 'List recent tweets from an X/Twitter user. Params: handle (no @).',
    parameters: { handle: { type: 'string', required: true } },
  },
  {
    action_slug: 'twitter_tweet_details',
    display_name: 'X (Twitter) tweet details (Social Analysis)',
    description: 'Get full details for a specific tweet by URL. Params: url.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'twitter_community_tweets',
    display_name: 'X (Twitter) community tweets (Social Analysis)',
    description:
      'Get tweets from an X/Twitter community. Params: communityId (required), limit, cursor.',
    parameters: {
      communityId: { type: 'string', required: true },
      limit: { type: 'string' },
      cursor: { type: 'string' },
    },
  },

  // ── Facebook ────────────────────────────────────────────────────────
  {
    action_slug: 'facebook_profile',
    display_name: 'Facebook profile (Social Analysis)',
    description:
      'Use for Facebook profile metadata when the user gave a profile URL. Pass url. Not for post transcripts.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'facebook_post_transcript',
    display_name: 'Facebook post transcript (Social Analysis)',
    description:
      'Use when you need a Facebook video/post transcript and extract_url_transcript / yt-dlp failed. Pass post URL as url. Costs credits.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'facebook_profile_posts',
    display_name: 'Facebook profile posts (Social Analysis)',
    description: 'List posts from a Facebook profile. Params: url (profile URL).',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'facebook_group_posts',
    display_name: 'Facebook group posts (Social Analysis)',
    description: 'List posts from a Facebook group. Params: url (group URL).',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'facebook_post',
    display_name: 'Facebook single post (Social Analysis)',
    description: 'Get a specific Facebook post by URL. Params: url.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'facebook_video_transcript',
    display_name: 'Facebook video transcript (Social Analysis)',
    description:
      'Get transcript for a Facebook video. Use after extract_url_transcript failed. Params: url.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'facebook_comments',
    display_name: 'Facebook post comments (Social Analysis)',
    description: 'Get comments for a Facebook post. Params: url.',
    parameters: { url: { type: 'string', required: true } },
  },

  // ── LinkedIn ────────────────────────────────────────────────────────
  {
    action_slug: 'linkedin_profile',
    display_name: 'LinkedIn person profile (Social Analysis)',
    description:
      'Use for public LinkedIn person profile data when the user provides a profile URL. Pass url. Respect privacy; costs credits.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'linkedin_company',
    display_name: 'LinkedIn company page (Social Analysis)',
    description:
      'Use for LinkedIn company page data when the user provides a company page URL. Pass url.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'linkedin_company_posts',
    display_name: 'LinkedIn company posts (Social Analysis)',
    description: 'List recent posts from a LinkedIn company page. Params: url (company page URL).',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'linkedin_post',
    display_name: 'LinkedIn single post (Social Analysis)',
    description: 'Get a specific LinkedIn post by URL. Params: url.',
    parameters: { url: { type: 'string', required: true } },
  },

  // ── Reddit ──────────────────────────────────────────────────────────
  {
    action_slug: 'reddit_subreddit_posts',
    display_name: 'Reddit subreddit posts (Social Analysis)',
    description: 'List posts from a subreddit. Params: subreddit (name, no r/).',
    parameters: { subreddit: { type: 'string', required: true } },
  },
  {
    action_slug: 'reddit_post_comments',
    display_name: 'Reddit post comments (Social Analysis)',
    description: 'Get full comment tree for a Reddit post. Params: postId.',
    parameters: { postId: { type: 'string', required: true } },
  },
  {
    action_slug: 'reddit_comments_simple',
    display_name: 'Reddit simple comments (Social Analysis)',
    description: 'Get simplified flat comment list for a Reddit post. Params: postId.',
    parameters: { postId: { type: 'string', required: true } },
  },
  {
    action_slug: 'reddit_search',
    display_name: 'Reddit search (Social Analysis)',
    description: 'Search Reddit for posts and subreddits by keyword. Params: query.',
    parameters: { query: { type: 'string', required: true } },
  },
  {
    action_slug: 'reddit_ads_search',
    display_name: 'Reddit ads search (Social Analysis)',
    description: 'Search Reddit ads by keyword. Params: query.',
    parameters: { query: { type: 'string', required: true } },
  },
  {
    action_slug: 'reddit_ad',
    display_name: 'Reddit ad details (Social Analysis)',
    description: 'Get details for a specific Reddit ad. Params: adId.',
    parameters: { adId: { type: 'string', required: true } },
  },

  // ── Threads ─────────────────────────────────────────────────────────
  {
    action_slug: 'threads_profile',
    display_name: 'Threads profile (Social Analysis)',
    description: 'Get a Threads user profile. Params: handle (no @).',
    parameters: { handle: { type: 'string', required: true } },
  },
  {
    action_slug: 'threads_posts',
    display_name: 'Threads user posts (Social Analysis)',
    description: 'List posts from a Threads user. Params: handle (no @).',
    parameters: { handle: { type: 'string', required: true } },
  },
  {
    action_slug: 'threads_post',
    display_name: 'Threads single post (Social Analysis)',
    description: 'Get a specific Threads post by URL. Params: url.',
    parameters: { url: { type: 'string', required: true } },
  },
  {
    action_slug: 'threads_search_keyword',
    display_name: 'Threads search by keyword (Social Analysis)',
    description: 'Search Threads content by keyword. Params: keyword.',
    parameters: { keyword: { type: 'string', required: true } },
  },
  {
    action_slug: 'threads_search_users',
    display_name: 'Threads search users (Social Analysis)',
    description: 'Search Threads for users by query. Params: query.',
    parameters: { query: { type: 'string', required: true } },
  },
]
