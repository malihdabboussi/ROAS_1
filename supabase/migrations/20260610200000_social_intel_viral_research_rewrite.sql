-- Social-intel skill rewrite — viral content research with outlier scoring
-- Replaces the generic 1.2KB stub with a full playbook: keyword search via the
-- social_analysis integration (instagram_reels_search, youtube_search, ...),
-- outlier scoring against creator baselines, enrichment, and routing guidance
-- (social_analysis over web_search for platform research).
--
-- 1) Backfill hired-agent copies that still match the old library body (verified
--    unedited; user-edited copies are left alone — none exist today).
-- 2) Rewrite the skill_library entry (future hires of copywriter, media_producer,
--    brand_manager, designer, analyst, performance_analyst templates get it).
-- 3) Attach references/platform-actions.md (library + hired agents).
-- 4) Add the skill to Vibey as a system skill + resource.

-- 1) Backfill unedited hired-agent copies BEFORE the library body changes
UPDATE agent_skills s
SET name = $meta$Social Research & Viral Content Intelligence$meta$,
    description = $meta$Find viral and outlier content on Instagram, YouTube, TikTok, Threads, X, Reddit, Facebook, and LinkedIn by topic or keyword, with outlier scoring against each creator's baseline. Use for content ideation, viral video research, competitor creative analysis, hook mining, trend analysis, comment mining, or any 'what is working on social' question — e.g. 'find viral reels about sales objections' or 'top YouTube videos on 5 sales tips'. Use this instead of web search whenever the research target is a social platform.$meta$,
    markdown_content = $skillbody$# Social Research — Viral Content Intelligence

Turn a topic into a ranked list of proven viral content, scored against each creator's baseline — then extract the hooks, formats, and angles behind the winners.

## Why social_analysis, not web search

Web search returns articles about a topic. Social research returns the actual posts with engagement data (views, likes, comments), which is what lets you rank by real performance. When a request names a social platform or asks for viral, trending, or outlier content, the answer lives in the `social_analysis` integration. Reach for web search only when the target is off-platform (news, articles, documentation).

`social_analysis` is platform-managed — always available, no OAuth or connection step. Call any action like this:

```
use_integration → {
  "service": "social_analysis",
  "integration_action": "instagram_reels_search",
  "params": { "query": "sales objections" }
}
```

The full catalog (~66 actions across 9 platforms — profiles, comments, transcripts, trending feeds) lives in `references/platform-actions.md`. Read it when you need anything beyond the core research actions below.

## Step 1 — Search by keyword

| Platform | Action | Params |
|---|---|---|
| Instagram Reels | `instagram_reels_search` | `query` |
| YouTube | `youtube_search` | `query`, `limit` |
| YouTube hashtag | `youtube_search_hashtag` | `hashtag`, `limit` |
| TikTok | `tiktok_search_keyword` | `keyword` |
| TikTok hashtag | `tiktok_search_hashtag` | `hashtag` |
| Threads | `threads_search_keyword` | `keyword` |
| Reddit | `reddit_search` | `query` |

No-keyword discovery: `tiktok_feed_trending`, `tiktok_search_top`, `youtube_shorts_trending` (no params).

Run 2-3 query variations — the literal topic, a broader phrase, and a pain-point phrasing ("sales objections", "handling objections", "prospect says no"). Track the date range and sample size of what came back; they go in the report.

## Step 2 — Score outliers (never rank by raw views)

A video with 150K views from a creator who averages 10K is a 15x outlier — the format did the work. 150K from a creator who averages 150K is just a big channel. Raw view counts reward audience size; outlier ratio reveals repeatable formats worth modeling.

For each promising result:

1. Pull the creator's recent posts:
   - YouTube → `youtube_channel_videos` (`url`, `limit`) or `youtube_channel_shorts` (`url`)
   - Instagram → `instagram_reels` (`handle`)
   - TikTok → `tiktok_profile_videos` (`username`, `limit`)
2. Baseline = **median** views of the creator's last 10-20 posts. Median, not mean — one earlier viral hit would skew the average and hide the very pattern you're measuring.
3. Outlier score = candidate views ÷ baseline.
4. Rank: 10x+ exceptional · 5-10x strong · 3-5x notable · below 3x skip.

Baseline lookups cost one call per creator — score the 10-15 strongest candidates, not the whole result set.

## Step 3 — Enrich only the winners

For the top 5-10 by outlier score:

- **Hook and script** — transcripts via the video-analyzer chain: try `extract_url_transcript` / yt-dlp first; fall back to `instagram_media_transcript`, `youtube_video_transcript`, or `tiktok_video_transcript` (`url`) — these cost credits.
- **Packaging** — `youtube_video_details` (`url`) for title, thumbnail, duration; `instagram_post_info` (`url`); `tiktok_video_info` (`videoId`).
- **Audience reaction** — `youtube_video_comments` (`url`, `limit`), `instagram_comments` (`url`), `tiktok_comments` (`videoId`). Mine for objections, desires, and the audience's own language.

## Deliverable

A ranked table: # · Hook/Title · Creator · Views · Creator baseline · Outlier score · Why it worked · Link. Follow with the 2-3 patterns shared by the winners (hook style, format, length, angle) and 3-5 prioritized recommendations the user can act on.

## Examples

**"Find viral reels about sales objections"**

1. `instagram_reels_search` with query variations → 30-60 candidates
2. Strongest candidates by views → `instagram_reels` per handle → median plays → outlier scores
3. Enrich top 8 with transcripts and comments → ranked table + shared patterns

**"What's working on YouTube for 5 sales tips"**

1. `youtube_search` query="5 sales tips" → collect videos + channel URLs
2. `youtube_channel_videos` per channel → median views → outlier ratios
3. `youtube_video_details` on winners → title and thumbnail patterns + ranked table

## Evidence discipline

- A "trend" claim needs data from at least two sources (two creators, two platforms, or search results plus comments).
- Report the date range and sample size behind every recommendation.
- Include links to the raw posts so the team can verify in one click.
- If the data is thin, say so explicitly and propose a wider sample.

## If you're blocked

Social Analysis is available to marketing-domain agents and Vibey. If a call comes back blocked, hand the request to a marketing teammate with `ask_agent` instead of falling back to web search — web results can't be ranked by performance.$skillbody$,
    updated_at = now()
FROM skill_library l
WHERE s.skill_key = 'social-intel'
  AND l.skill_key = 'social-intel'
  AND s.markdown_content = l.markdown_content;

-- 2) Rewrite the library entry
UPDATE skill_library
SET name = $meta$Social Research & Viral Content Intelligence$meta$,
    description = $meta$Find viral and outlier content on Instagram, YouTube, TikTok, Threads, X, Reddit, Facebook, and LinkedIn by topic or keyword, with outlier scoring against each creator's baseline. Use for content ideation, viral video research, competitor creative analysis, hook mining, trend analysis, comment mining, or any 'what is working on social' question — e.g. 'find viral reels about sales objections' or 'top YouTube videos on 5 sales tips'. Use this instead of web search whenever the research target is a social platform.$meta$,
    markdown_content = $skillbody$# Social Research — Viral Content Intelligence

Turn a topic into a ranked list of proven viral content, scored against each creator's baseline — then extract the hooks, formats, and angles behind the winners.

## Why social_analysis, not web search

Web search returns articles about a topic. Social research returns the actual posts with engagement data (views, likes, comments), which is what lets you rank by real performance. When a request names a social platform or asks for viral, trending, or outlier content, the answer lives in the `social_analysis` integration. Reach for web search only when the target is off-platform (news, articles, documentation).

`social_analysis` is platform-managed — always available, no OAuth or connection step. Call any action like this:

```
use_integration → {
  "service": "social_analysis",
  "integration_action": "instagram_reels_search",
  "params": { "query": "sales objections" }
}
```

The full catalog (~66 actions across 9 platforms — profiles, comments, transcripts, trending feeds) lives in `references/platform-actions.md`. Read it when you need anything beyond the core research actions below.

## Step 1 — Search by keyword

| Platform | Action | Params |
|---|---|---|
| Instagram Reels | `instagram_reels_search` | `query` |
| YouTube | `youtube_search` | `query`, `limit` |
| YouTube hashtag | `youtube_search_hashtag` | `hashtag`, `limit` |
| TikTok | `tiktok_search_keyword` | `keyword` |
| TikTok hashtag | `tiktok_search_hashtag` | `hashtag` |
| Threads | `threads_search_keyword` | `keyword` |
| Reddit | `reddit_search` | `query` |

No-keyword discovery: `tiktok_feed_trending`, `tiktok_search_top`, `youtube_shorts_trending` (no params).

Run 2-3 query variations — the literal topic, a broader phrase, and a pain-point phrasing ("sales objections", "handling objections", "prospect says no"). Track the date range and sample size of what came back; they go in the report.

## Step 2 — Score outliers (never rank by raw views)

A video with 150K views from a creator who averages 10K is a 15x outlier — the format did the work. 150K from a creator who averages 150K is just a big channel. Raw view counts reward audience size; outlier ratio reveals repeatable formats worth modeling.

For each promising result:

1. Pull the creator's recent posts:
   - YouTube → `youtube_channel_videos` (`url`, `limit`) or `youtube_channel_shorts` (`url`)
   - Instagram → `instagram_reels` (`handle`)
   - TikTok → `tiktok_profile_videos` (`username`, `limit`)
2. Baseline = **median** views of the creator's last 10-20 posts. Median, not mean — one earlier viral hit would skew the average and hide the very pattern you're measuring.
3. Outlier score = candidate views ÷ baseline.
4. Rank: 10x+ exceptional · 5-10x strong · 3-5x notable · below 3x skip.

Baseline lookups cost one call per creator — score the 10-15 strongest candidates, not the whole result set.

## Step 3 — Enrich only the winners

For the top 5-10 by outlier score:

- **Hook and script** — transcripts via the video-analyzer chain: try `extract_url_transcript` / yt-dlp first; fall back to `instagram_media_transcript`, `youtube_video_transcript`, or `tiktok_video_transcript` (`url`) — these cost credits.
- **Packaging** — `youtube_video_details` (`url`) for title, thumbnail, duration; `instagram_post_info` (`url`); `tiktok_video_info` (`videoId`).
- **Audience reaction** — `youtube_video_comments` (`url`, `limit`), `instagram_comments` (`url`), `tiktok_comments` (`videoId`). Mine for objections, desires, and the audience's own language.

## Deliverable

A ranked table: # · Hook/Title · Creator · Views · Creator baseline · Outlier score · Why it worked · Link. Follow with the 2-3 patterns shared by the winners (hook style, format, length, angle) and 3-5 prioritized recommendations the user can act on.

## Examples

**"Find viral reels about sales objections"**

1. `instagram_reels_search` with query variations → 30-60 candidates
2. Strongest candidates by views → `instagram_reels` per handle → median plays → outlier scores
3. Enrich top 8 with transcripts and comments → ranked table + shared patterns

**"What's working on YouTube for 5 sales tips"**

1. `youtube_search` query="5 sales tips" → collect videos + channel URLs
2. `youtube_channel_videos` per channel → median views → outlier ratios
3. `youtube_video_details` on winners → title and thumbnail patterns + ranked table

## Evidence discipline

- A "trend" claim needs data from at least two sources (two creators, two platforms, or search results plus comments).
- Report the date range and sample size behind every recommendation.
- Include links to the raw posts so the team can verify in one click.
- If the data is thin, say so explicitly and propose a wider sample.

## If you're blocked

Social Analysis is available to marketing-domain agents and Vibey. If a call comes back blocked, hand the request to a marketing teammate with `ask_agent` instead of falling back to web search — web results can't be ranked by performance.$skillbody$,
    updated_at = now()
WHERE skill_key = 'social-intel';

-- 3a) Library resource
DELETE FROM skill_library_resources
WHERE skill_key = 'social-intel' AND file_path = 'references/platform-actions.md';

INSERT INTO skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('social-intel', 'references/platform-actions.md', $refbody$# Social Analysis — Full Action Catalog

Every action runs through `use_integration` with `service: "social_analysis"`. Params marked (opt) are optional. Handles are passed without `@`, subreddits without `r/`. Actions noted "costs credits" hit paid upstream endpoints — use them on shortlisted winners, not whole result sets.

## Search & trending

| Action | Params | Returns |
|---|---|---|
| `instagram_reels_search` | `query` | Reels matching a keyword |
| `youtube_search` | `query`, `limit` (opt) | Videos matching a keyword |
| `youtube_search_hashtag` | `hashtag`, `limit` (opt) | Videos for a hashtag |
| `youtube_shorts_trending` | — | Currently trending Shorts |
| `tiktok_search_keyword` | `keyword` | Videos and users for a keyword |
| `tiktok_search_hashtag` | `hashtag` | Videos for a hashtag |
| `tiktok_search_users` | `query` | Users matching a query |
| `tiktok_search_top` | — | Top trending search queries |
| `tiktok_feed_trending` | — | Trending video feed |
| `threads_search_keyword` | `keyword` | Threads posts for a keyword |
| `threads_search_users` | `query` | Threads users |
| `reddit_search` | `query` | Posts and subreddits for a keyword |
| `reddit_ads_search` | `query` | Reddit ads for a keyword |

## Instagram

| Action | Params | Notes |
|---|---|---|
| `instagram_profile` | `handle` | Full public profile |
| `instagram_profile_basic` | `handle` | Lighter profile lookup |
| `instagram_posts` | `handle` | Recent posts |
| `instagram_reels` | `handle` | Recent reels (baseline source) |
| `instagram_reels_paginated` | `handle`, `cursor` (opt) | Reels with pagination |
| `instagram_post_info` | `url` | Detailed post/reel info |
| `instagram_comments` | `url`, `cursor` (opt) | Paginated comments |
| `instagram_highlights` | `handle` | Story highlights |
| `instagram_highlight_details` | `highlightId` | Highlight content |
| `instagram_media_transcript` | `url` | Transcript fallback — costs credits |

## YouTube

| Action | Params | Notes |
|---|---|---|
| `youtube_channel` | `url` | Channel metadata |
| `youtube_channel_videos` | `url`, `limit` (opt) | Channel uploads (baseline source) |
| `youtube_channel_shorts` | `url`, `cursor` (opt) | Channel Shorts |
| `youtube_video_details` | `url` | Title, thumbnail, stats, duration |
| `youtube_video_comments` | `url`, `limit` (opt) | Comments |
| `youtube_playlist` | `url` | Playlist videos |
| `youtube_video_transcript` | `url` | Only after captions / yt-dlp failed — costs credits |

## TikTok

| Action | Params | Notes |
|---|---|---|
| `tiktok_profile` | `handle` | Profile metadata (bio, stats, links) |
| `tiktok_profile_videos` | `username`, `limit` (opt), `cursor` (opt) | Profile videos (baseline source) |
| `tiktok_video_info` | `videoId` | Stats, description, author |
| `tiktok_comments` | `videoId`, `limit` (opt), `cursor` (opt) | Comments |
| `tiktok_comment_replies` | `commentId`, `limit` (opt), `cursor` (opt) | Replies to a comment |
| `tiktok_followers` | `username` | Followers |
| `tiktok_following` | `username` | Accounts followed |
| `tiktok_live` | `username` | Live status and stream details |
| `tiktok_song_details` | `songId` | Song details |
| `tiktok_song_videos` | `songId` | Videos using a song |
| `tiktok_user_audience` | `username` | Audience demographics — costs 30 credits |
| `tiktok_video_transcript` | `url` | Transcript fallback — costs credits |

## X (Twitter)

| Action | Params | Notes |
|---|---|---|
| `twitter_profile` | `handle` | Public profile |
| `twitter_user_tweets` | `handle` | Recent tweets |
| `twitter_tweet_details` | `url` | Full tweet details |
| `twitter_community_tweets` | `communityId`, `limit` (opt), `cursor` (opt) | Community tweets |
| `twitter_tweet_transcript` | `url` | Transcript fallback — costs credits |

## Threads

| Action | Params |
|---|---|
| `threads_profile` | `handle` |
| `threads_posts` | `handle` |
| `threads_post` | `url` |

## Reddit

| Action | Params |
|---|---|
| `reddit_subreddit_posts` | `subreddit` |
| `reddit_post_comments` | `postId` |
| `reddit_comments_simple` | `postId` |
| `reddit_ad` | `adId` |

## Facebook

| Action | Params | Notes |
|---|---|---|
| `facebook_profile` | `url` | Profile metadata |
| `facebook_profile_posts` | `url` | Profile posts |
| `facebook_group_posts` | `url` | Group posts |
| `facebook_post` | `url` | Single post |
| `facebook_comments` | `url` | Post comments |
| `facebook_video_transcript` | `url` | Transcript fallback — costs credits |
| `facebook_post_transcript` | `url` | Transcript fallback — costs credits |

## LinkedIn

| Action | Params | Notes |
|---|---|---|
| `linkedin_profile` | `url` | Person profile — costs credits; respect privacy |
| `linkedin_company` | `url` | Company page |
| `linkedin_company_posts` | `url` | Company posts |
| `linkedin_post` | `url` | Single post |$refbody$, 'text/markdown');

-- 3b) Resource for every hired agent that holds the skill
INSERT INTO agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT s.user_id, s.org_id, s.agent_key, 'social-intel', 'references/platform-actions.md',
       l.content, 'text/markdown'
FROM agent_skills s
CROSS JOIN (
  SELECT content FROM skill_library_resources
  WHERE skill_key = 'social-intel' AND file_path = 'references/platform-actions.md'
) l
WHERE s.skill_key = 'social-intel'
  AND NOT (s.user_id IS NULL AND s.org_id IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM agent_skill_resources r
    WHERE r.agent_key = s.agent_key
      AND r.skill_key = 'social-intel'
      AND r.file_path = 'references/platform-actions.md'
      AND r.user_id IS NOT DISTINCT FROM s.user_id
      AND r.org_id IS NOT DISTINCT FROM s.org_id
  );

-- 4) Vibey system skill + resource (content copied from the library rows above)
INSERT INTO agent_skills (user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source)
SELECT NULL, NULL, 'vibey', 'social-intel', l.name, l.description, l.markdown_content, true, 'system'
FROM skill_library l
WHERE l.skill_key = 'social-intel'
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              markdown_content = EXCLUDED.markdown_content,
              is_enabled = true,
              updated_at = now();

INSERT INTO agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)
SELECT NULL, NULL, 'vibey', 'social-intel', 'references/platform-actions.md', r.content, 'text/markdown'
FROM skill_library_resources r
WHERE r.skill_key = 'social-intel' AND r.file_path = 'references/platform-actions.md'
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET content = EXCLUDED.content;
