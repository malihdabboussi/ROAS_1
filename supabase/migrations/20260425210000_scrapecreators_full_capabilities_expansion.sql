-- Expand ScrapeCreators from 12 to 55+ actions: search, comments, feeds, posts, Reddit, Threads.
insert into public.integration_capabilities (
  integration_id, action_slug, execution_mode, display_name, description,
  parameters, examples, metadata, domains, route_config, updated_at
)
values
  -- ── TikTok (15 new) ──────────────────────────────────────────────────
  (
    'scrapecreators', 'tiktok_user_audience', 'legacy',
    'TikTok audience demographics (ScrapeCreators)',
    'Retrieve audience country demographics for a TikTok user. Costs 30 credits (expensive upstream). Params: username.',
    '{"username":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/user/audience","query_params":{"username":"username"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_profile_videos', 'legacy',
    'TikTok profile videos (ScrapeCreators)',
    'List all videos from a TikTok profile. Supports pagination via cursor. Params: username (required), limit, cursor.',
    '{"username":{"type":"string","required":true},"limit":{"type":"string"},"cursor":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/profile/videos","query_params":{"username":"username","limit":"limit","cursor":"cursor"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_video_info', 'legacy',
    'TikTok video info (ScrapeCreators)',
    'Get detailed info (stats, description, author) for a specific TikTok video. Params: videoId.',
    '{"videoId":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/video/info","query_params":{"videoId":"videoId"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_live', 'legacy',
    'TikTok live stream info (ScrapeCreators)',
    'Check if a TikTok user is currently live and get stream details. Params: username.',
    '{"username":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/live","query_params":{"username":"username"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_comments', 'legacy',
    'TikTok video comments (ScrapeCreators)',
    'Get comments on a TikTok video. Supports pagination. Params: videoId (required), limit, cursor.',
    '{"videoId":{"type":"string","required":true},"limit":{"type":"string"},"cursor":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/comments","query_params":{"videoId":"videoId","limit":"limit","cursor":"cursor"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_comment_replies', 'legacy',
    'TikTok comment replies (ScrapeCreators)',
    'Get replies to a specific TikTok comment. Params: commentId (required), limit, cursor.',
    '{"commentId":{"type":"string","required":true},"limit":{"type":"string"},"cursor":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/comment/replies","query_params":{"commentId":"commentId","limit":"limit","cursor":"cursor"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_following', 'legacy',
    'TikTok following list (ScrapeCreators)',
    'List accounts a TikTok user follows. Params: username.',
    '{"username":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/following","query_params":{"username":"username"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_followers', 'legacy',
    'TikTok followers list (ScrapeCreators)',
    'List followers of a TikTok user. Params: username.',
    '{"username":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/followers","query_params":{"username":"username"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_search_users', 'legacy',
    'TikTok search users (ScrapeCreators)',
    'Search TikTok for users matching a query. Params: query.',
    '{"query":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/search/users","query_params":{"query":"query"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_search_hashtag', 'legacy',
    'TikTok search by hashtag (ScrapeCreators)',
    'Search TikTok videos by hashtag. Params: hashtag.',
    '{"hashtag":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/search/hashtag","query_params":{"hashtag":"hashtag"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_search_keyword', 'legacy',
    'TikTok search by keyword (ScrapeCreators)',
    'Search TikTok for videos and users by keyword. Params: keyword.',
    '{"keyword":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/search/keyword","query_params":{"keyword":"keyword"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_search_top', 'legacy',
    'TikTok top trending searches (ScrapeCreators)',
    'Get current top trending search queries on TikTok. No params required.',
    '{}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/search/top","query_params":{}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_song_details', 'legacy',
    'TikTok song details (ScrapeCreators)',
    'Get details for a specific TikTok song by ID. Params: songId.',
    '{"songId":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/songs/details","query_params":{"songId":"songId"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_song_videos', 'legacy',
    'TikTok videos using song (ScrapeCreators)',
    'List TikTok videos that use a specific song. Params: songId.',
    '{"songId":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/songs/videos","query_params":{"songId":"songId"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'tiktok_feed_trending', 'legacy',
    'TikTok trending feed (ScrapeCreators)',
    'Get the current TikTok trending video feed. No params required.',
    '{}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/tiktok/feed/trending","query_params":{}}'::jsonb,
    now()
  ),

  -- ── Instagram (9 new) ─────────────────────────────────────────────────
  (
    'scrapecreators', 'instagram_profile_basic', 'legacy',
    'Instagram basic profile (ScrapeCreators)',
    'Get basic Instagram profile info (lighter than full profile). Params: handle (no @).',
    '{"handle":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/instagram/profile/basic","query_params":{"handle":"handle"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'instagram_posts', 'legacy',
    'Instagram user posts (ScrapeCreators)',
    'List posts from an Instagram user profile. Params: handle (no @).',
    '{"handle":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/instagram/posts","query_params":{"handle":"handle"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'instagram_post_info', 'legacy',
    'Instagram post/reel info (ScrapeCreators)',
    'Get detailed info for a specific Instagram post or reel by URL. Params: url.',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/instagram/post/info","query_params":{"url":"url"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'instagram_reels_search', 'legacy',
    'Instagram search reels (ScrapeCreators)',
    'Search Instagram reels by keyword query. Params: query.',
    '{"query":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/instagram/reels/search","query_params":{"query":"query"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'instagram_comments', 'legacy',
    'Instagram post comments (ScrapeCreators)',
    'Get paginated comments for an Instagram post or reel. Params: url (required), cursor.',
    '{"url":{"type":"string","required":true},"cursor":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/instagram/comments","query_params":{"url":"url","cursor":"cursor"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'instagram_reels', 'legacy',
    'Instagram user reels (ScrapeCreators)',
    'List reels from an Instagram user profile. Params: handle (no @).',
    '{"handle":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/instagram/reels","query_params":{"handle":"handle"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'instagram_reels_paginated', 'legacy',
    'Instagram user reels paginated (ScrapeCreators)',
    'List reels with pagination support. Params: handle (required), cursor.',
    '{"handle":{"type":"string","required":true},"cursor":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/instagram/reels/paginated","query_params":{"handle":"handle","cursor":"cursor"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'instagram_highlights', 'legacy',
    'Instagram story highlights (ScrapeCreators)',
    'List story highlights for an Instagram user. Params: handle (no @).',
    '{"handle":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/instagram/highlights","query_params":{"handle":"handle"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'instagram_highlight_details', 'legacy',
    'Instagram highlight details (ScrapeCreators)',
    'Get detailed content of a specific Instagram story highlight. Params: highlightId.',
    '{"highlightId":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/instagram/highlight/details","query_params":{"highlightId":"highlightId"}}'::jsonb,
    now()
  ),

  -- ── YouTube (8 new) ───────────────────────────────────────────────────
  (
    'scrapecreators', 'youtube_channel_videos', 'legacy',
    'YouTube channel videos (ScrapeCreators)',
    'List videos from a YouTube channel. Params: url (channel URL, required), limit.',
    '{"url":{"type":"string","required":true},"limit":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/youtube/channel/videos","query_params":{"url":"url","limit":"limit"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'youtube_channel_shorts', 'legacy',
    'YouTube channel shorts (ScrapeCreators)',
    'List YouTube Shorts from a channel. Params: url (channel URL, required), cursor.',
    '{"url":{"type":"string","required":true},"cursor":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/youtube/channel/shorts","query_params":{"url":"url","cursor":"cursor"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'youtube_video_details', 'legacy',
    'YouTube video/short details (ScrapeCreators)',
    'Get detailed info for a YouTube video or short. Params: url.',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/youtube/video/details","query_params":{"url":"url"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'youtube_search', 'legacy',
    'YouTube search (ScrapeCreators)',
    'Search YouTube for videos by keyword. Params: query (required), limit.',
    '{"query":{"type":"string","required":true},"limit":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/youtube/search","query_params":{"query":"query","limit":"limit"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'youtube_search_hashtag', 'legacy',
    'YouTube search by hashtag (ScrapeCreators)',
    'Search YouTube videos by hashtag. Params: hashtag (required), limit.',
    '{"hashtag":{"type":"string","required":true},"limit":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/youtube/search/hashtag","query_params":{"hashtag":"hashtag","limit":"limit"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'youtube_video_comments', 'legacy',
    'YouTube video comments (ScrapeCreators)',
    'Get comments for a YouTube video. Params: url (required), limit.',
    '{"url":{"type":"string","required":true},"limit":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/youtube/video/comments","query_params":{"url":"url","limit":"limit"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'youtube_shorts_trending', 'legacy',
    'YouTube trending shorts (ScrapeCreators)',
    'Get currently trending YouTube Shorts. No params required.',
    '{}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/youtube/shorts/trending","query_params":{}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'youtube_playlist', 'legacy',
    'YouTube playlist (ScrapeCreators)',
    'Get videos from a YouTube playlist. Params: url (playlist URL).',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/youtube/playlist","query_params":{"url":"url"}}'::jsonb,
    now()
  ),

  -- ── Twitter / X (3 new) ───────────────────────────────────────────────
  (
    'scrapecreators', 'twitter_user_tweets', 'legacy',
    'X (Twitter) user tweets (ScrapeCreators)',
    'List recent tweets from an X/Twitter user. Params: handle (no @).',
    '{"handle":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/twitter/user/tweets","query_params":{"handle":"handle"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'twitter_tweet_details', 'legacy',
    'X (Twitter) tweet details (ScrapeCreators)',
    'Get full details for a specific tweet by URL. Params: url.',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/twitter/tweet/details","query_params":{"url":"url"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'twitter_community_tweets', 'legacy',
    'X (Twitter) community tweets (ScrapeCreators)',
    'Get tweets from an X/Twitter community. Params: communityId (required), limit, cursor.',
    '{"communityId":{"type":"string","required":true},"limit":{"type":"string"},"cursor":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/twitter/community/tweets","query_params":{"communityId":"communityId","limit":"limit","cursor":"cursor"}}'::jsonb,
    now()
  ),

  -- ── Facebook (5 new) ──────────────────────────────────────────────────
  (
    'scrapecreators', 'facebook_profile_posts', 'legacy',
    'Facebook profile posts (ScrapeCreators)',
    'List posts from a Facebook profile. Params: url (profile URL).',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/facebook/profile/posts","query_params":{"url":"url"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'facebook_group_posts', 'legacy',
    'Facebook group posts (ScrapeCreators)',
    'List posts from a Facebook group. Params: url (group URL).',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/facebook/group/posts","query_params":{"url":"url"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'facebook_post', 'legacy',
    'Facebook single post (ScrapeCreators)',
    'Get a specific Facebook post by URL. Params: url.',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/facebook/post","query_params":{"url":"url"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'facebook_video_transcript', 'legacy',
    'Facebook video transcript (ScrapeCreators)',
    'Get transcript for a Facebook video. Use after extract_url_transcript failed. Params: url.',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/facebook/video/transcript","query_params":{"url":"url"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'facebook_comments', 'legacy',
    'Facebook post comments (ScrapeCreators)',
    'Get comments for a Facebook post. Params: url.',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/facebook/comments","query_params":{"url":"url"}}'::jsonb,
    now()
  ),

  -- ── LinkedIn (2 new) ──────────────────────────────────────────────────
  (
    'scrapecreators', 'linkedin_company_posts', 'legacy',
    'LinkedIn company posts (ScrapeCreators)',
    'List recent posts from a LinkedIn company page. Params: url (company page URL).',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/linkedin/company/posts","query_params":{"url":"url"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'linkedin_post', 'legacy',
    'LinkedIn single post (ScrapeCreators)',
    'Get a specific LinkedIn post by URL. Params: url.',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/linkedin/post","query_params":{"url":"url"}}'::jsonb,
    now()
  ),

  -- ── Reddit (6 new) ────────────────────────────────────────────────────
  (
    'scrapecreators', 'reddit_subreddit_posts', 'legacy',
    'Reddit subreddit posts (ScrapeCreators)',
    'List posts from a subreddit. Params: subreddit (name, no r/).',
    '{"subreddit":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/reddit/subreddit/posts","query_params":{"subreddit":"subreddit"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'reddit_post_comments', 'legacy',
    'Reddit post comments (ScrapeCreators)',
    'Get full comment tree for a Reddit post. Params: postId.',
    '{"postId":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/reddit/post/comments","query_params":{"postId":"postId"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'reddit_comments_simple', 'legacy',
    'Reddit simple comments (ScrapeCreators)',
    'Get simplified flat comment list for a Reddit post. Params: postId.',
    '{"postId":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/reddit/comments/simple","query_params":{"postId":"postId"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'reddit_search', 'legacy',
    'Reddit search (ScrapeCreators)',
    'Search Reddit for posts and subreddits by keyword. Params: query.',
    '{"query":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/reddit/search","query_params":{"query":"query"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'reddit_ads_search', 'legacy',
    'Reddit ads search (ScrapeCreators)',
    'Search Reddit ads by keyword. Params: query.',
    '{"query":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/reddit/ads/search","query_params":{"query":"query"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'reddit_ad', 'legacy',
    'Reddit ad details (ScrapeCreators)',
    'Get details for a specific Reddit ad. Params: adId.',
    '{"adId":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/reddit/ad","query_params":{"adId":"adId"}}'::jsonb,
    now()
  ),

  -- ── Threads (5 new) ───────────────────────────────────────────────────
  (
    'scrapecreators', 'threads_profile', 'legacy',
    'Threads profile (ScrapeCreators)',
    'Get a Threads user profile. Params: handle (no @).',
    '{"handle":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/threads/profile","query_params":{"handle":"handle"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'threads_posts', 'legacy',
    'Threads user posts (ScrapeCreators)',
    'List posts from a Threads user. Params: handle (no @).',
    '{"handle":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/threads/posts","query_params":{"handle":"handle"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'threads_post', 'legacy',
    'Threads single post (ScrapeCreators)',
    'Get a specific Threads post by URL. Params: url.',
    '{"url":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/threads/post","query_params":{"url":"url"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'threads_search_keyword', 'legacy',
    'Threads search by keyword (ScrapeCreators)',
    'Search Threads content by keyword. Params: keyword.',
    '{"keyword":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/threads/search/keyword","query_params":{"keyword":"keyword"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators', 'threads_search_users', 'legacy',
    'Threads search users (ScrapeCreators)',
    'Search Threads for users by query. Params: query.',
    '{"query":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{"manual_capability_copy":true}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/threads/search/users","query_params":{"query":"query"}}'::jsonb,
    now()
  )
on conflict (integration_id, action_slug) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  parameters = excluded.parameters,
  metadata = excluded.metadata,
  domains = excluded.domains,
  route_config = excluded.route_config,
  updated_at = excluded.updated_at;
