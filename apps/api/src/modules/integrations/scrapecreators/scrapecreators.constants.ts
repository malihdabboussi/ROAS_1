/**
 * Vibey credits charged per ScrapeCreators action.
 * Upstream cost is ~1 credit per request unless noted.
 * We apply a 2× margin (upstream × 2).
 *   - tiktok_user_audience: 26 upstream → 52 Vibey
 *   - instagram_post_info_download: 11 upstream (1 base + 10 media) → 22 Vibey
 */
export const SCRAPECREATORS_ACTION_CREDITS: Record<string, number> = {
  // TikTok
  tiktok_profile: 2,
  tiktok_video_transcript: 2,
  tiktok_user_audience: 52,
  tiktok_profile_videos: 2,
  tiktok_video_info: 2,
  tiktok_live: 2,
  tiktok_comments: 2,
  tiktok_comment_replies: 2,
  tiktok_following: 2,
  tiktok_followers: 2,
  tiktok_search_users: 2,
  tiktok_search_hashtag: 2,
  tiktok_search_keyword: 2,
  tiktok_search_top: 2,
  tiktok_song_details: 2,
  tiktok_song_videos: 2,
  tiktok_feed_trending: 2,

  // Instagram
  instagram_profile: 2,
  instagram_profile_basic: 2,
  instagram_media_transcript: 2,
  instagram_posts: 2,
  instagram_post_info: 2,
  instagram_post_info_download: 22,
  instagram_reels_search: 2,
  instagram_comments: 2,
  instagram_reels: 2,
  instagram_reels_paginated: 2,
  instagram_highlights: 2,
  instagram_highlight_details: 2,

  // YouTube
  youtube_video_transcript: 2,
  youtube_channel: 2,
  youtube_channel_videos: 2,
  youtube_channel_shorts: 2,
  youtube_video_details: 2,
  youtube_search: 2,
  youtube_search_hashtag: 2,
  youtube_video_comments: 2,
  youtube_shorts_trending: 2,
  youtube_playlist: 2,

  // Twitter / X
  twitter_profile: 2,
  twitter_tweet_transcript: 2,
  twitter_user_tweets: 2,
  twitter_tweet_details: 2,
  twitter_community_tweets: 2,

  // Facebook
  facebook_profile: 2,
  facebook_post_transcript: 2,
  facebook_profile_posts: 2,
  facebook_group_posts: 2,
  facebook_post: 2,
  facebook_video_transcript: 2,
  facebook_comments: 2,

  // LinkedIn
  linkedin_profile: 2,
  linkedin_company: 2,
  linkedin_company_posts: 2,
  linkedin_post: 2,

  // Reddit
  reddit_subreddit_posts: 2,
  reddit_post_comments: 2,
  reddit_comments_simple: 2,
  reddit_search: 2,
  reddit_ads_search: 2,
  reddit_ad: 2,

  // Threads
  threads_profile: 2,
  threads_posts: 2,
  threads_post: 2,
  threads_search_keyword: 2,
  threads_search_users: 2,
}

export function scrapecreatorsCreditsForAction(actionSlug: string): number {
  return SCRAPECREATORS_ACTION_CREDITS[actionSlug] ?? 2
}
