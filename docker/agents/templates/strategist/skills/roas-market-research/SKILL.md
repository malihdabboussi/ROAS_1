---
name: roas-market-research
description: Pulls observed competitor ads through platform-managed Ads Intelligence and Social Analysis, then builds or updates the campaign Theme from verified website, logo, social, and media evidence. Use for market research, competitor or ad-library research, campaign brand setup, or before writing ads for a new campaign. Produces WEB#4 research plus the active Theme consumed by ads, funnels, decks, and image generation. Do not use it to write creative.
---

# ROAS Market Research — observed ad-library data, not guesswork

This skill produces the research brief that feeds the ad skills (roas-ad-kit Section 1, roas-ad-copy's research step, roas-ad-concepts grounding). It pulls live ads through two connected MCPs, ranks them by longevity (the single best proxy for what's working), pulls transcripts of winning video ads, and outputs a tight brief in the exact shape the downstream skills expect.

**Prime directive: never write blind, and never fake the data.** Every reference in the brief is either observed through a tool or clearly labeled as web-search-inferred / user-provided. If a longevity number wasn't observed, don't invent one.

---

## THE TOOLS (load before calling)

All MCP tools are deferred — call `tool_search` first (e.g. `tool_search(query="facebook ad library")`) to load exact parameter schemas. Never guess parameters.

**SearchAPI "Ads Intelligence" = DISCOVERY layer** (broad sweeps, advertiser resolution):
- `SearchAPI:meta_ads_page_search` — resolve competitor names → Meta page IDs
- `SearchAPI:meta_ads_search` — Meta ads by keyword or page ID
- `SearchAPI:google_ads_advertiser_search` / `SearchAPI:google_ads_search` — Google Ads Transparency
- `SearchAPI:tiktok_advertiser_search` / `SearchAPI:tiktok_ads_search` — TikTok Ad Library
- `SearchAPI:linkedin_ads_search` — LinkedIn Ad Library

**Scrape Creators = DEPTH layer** (single-ad detail, transcripts, organic):
- `Scrape Creators:v1_facebook_adLibrary_search_companies` — alt page resolution
- `Scrape Creators:v1_facebook_adLibrary_company_ads` — all ads for a page (cursor pagination)
- `Scrape Creators:v1_facebook_adLibrary_search_ads` — keyword search with status/date filters
- `Scrape Creators:v1_facebook_adLibrary_ad` — full detail on one ad by ID
- `Scrape Creators:v1_facebook_adLibrary_ad_transcript` — **transcript of a video ad** (the crown jewel: gives the actual script of a proven winner)
- Google/TikTok/LinkedIn equivalents: `v1_google_company_ads`, `v1_google_ad`, `v1_tiktok_ad_library_search`, `v1_tiktok_ad_library_ad`, `v1_linkedin_ads_search`, `v1_linkedin_ad`
- Organic layer: `v2_instagram_user_posts`, `v1_instagram_user_reels`, `v3_tiktok_profile_videos`, `v1_youtube_channel_videos`, transcript endpoints

Either MCP covers ~80% of the Meta ground alone — if one errors, swap to the other before falling back.

---

## INPUTS — gather before pulling

Pull from the conversation/brief first; only ask if genuinely missing.

1. **Client + offer + niche** — what we're selling and to whom.
2. **3-5 niche keywords** — the phrases a competitor's ad or offer would contain (e.g. "speaking masterclass," "land paid talks," "webinar training"). Derive from the offer if not given.
3. **Named competitors** — names, page URLs, or page IDs the client/user already knows. Zero is fine; the keyword sweep will surface them.
4. **Geo** — default US.
5. **Platform scope** — Meta always. Add Google/TikTok/LinkedIn only if the ICP warrants (B2B/corporate → LinkedIn; younger consumer → TikTok; search-intent offer → Google) or the user asks.
6. **Depth** — default: standard brief (3-5 references). "Deep" on request: 8-10 references + organic layer.

---

## THE WORKFLOW

### Step 0 — Complete the campaign Theme
Do this in the same research run so design never starts from an empty brand shell.

1. Call `list_campaign_media` and inspect available logo files, product imagery, team headshots, and design references. Read the client website and known social profiles from campaign and Brain context.
2. Call `list_themes`. If a campaign Theme is active, preserve verified user-entered values. If none is active, prepare one named for the client.
3. When a website URL is available, call `extract_website_theme` with `url`. Treat extraction as evidence, not permission to overwrite stronger uploaded or user-confirmed values.
4. Map evidence into the flat Theme fields: `colors`, `font_heading`, `font_body`, `logo_asset_id`, `brand_voice`, `brand_values`, `social_links`, `design_settings`, `headshot_images`, `product_images`, and `image_style_prompt`.
5. Call `update_theme` for the active Theme or `create_theme` with `campaign_id` when none exists. The campaign must finish this step with one active Theme.
6. Add a Brand Evidence Ledger to the research Doc. For every Theme field, record its source and exactly one status: `confirmed`, `inferred`, or `not found`. Never silently skip a field, invent an asset ID, or replace confirmed data with inference.

### Step 1 — Resolve advertisers
Turn every named competitor into platform IDs: `meta_ads_page_search` (or `v1_facebook_adLibrary_search_companies`) for Meta; advertiser-search tools for Google/TikTok if in scope. Disambiguate by category/verification when multiple pages match — pick the one that's obviously the business, and note the choice.

### Step 2 — Sweep
- Per resolved competitor: pull their ads (`meta_ads_search` by page ID, or `v1_facebook_adLibrary_company_ads`).
- Per keyword: category sweep (`meta_ads_search` / `v1_facebook_adLibrary_search_ads`, active ads, target geo). This surfaces competitors nobody named.
- Other platforms in scope: same pattern with their tools.
- Keep pulls bounded: first page or two per query is plenty. This is research, not archiving.

### Step 3 — Rank by longevity
Sort everything on `total_active_time` (and start_date age) + active status.
- **90+ days active = proven winner.** 30-90 days = promising. Under 30 days = unproven, note only if the angle is novel.
- An advertiser running many near-identical variants of one angle is itself a signal: they've found something and are scaling it.
- Ignore `impressions_index` when it's -1 (it usually is for non-political ads). Longevity IS the performance signal.

### Step 4 — Deep-dive the top 5-10
For each winner: `v1_facebook_adLibrary_ad` for full creative/copy/CTA/landing destination. **For every VIDEO winner, pull `v1_facebook_adLibrary_ad_transcript`** and break the script down: hook (first ~3 seconds), story/mechanism structure, proof moments, close/CTA. These script breakdowns feed roas-video-ads directly.

### Step 5 — Organic layer (deep mode or on request)
For the 1-2 strongest competitors, pull recent organic (IG reels/posts, TikTok, YouTube) via Scrape Creators, rank by engagement, and flag hooks that performed organically — those are pre-validated angles they proved before (or without) paying.

### Step 6 — Fallback chain (never write blind)
1. Primary tool errors → try the other MCP's equivalent.
2. Both fail on a platform → web-search the competitor + offer category; label those references **[inferred — web]**, no longevity claims.
3. Still thin → ask the user for screenshots/links (they often have them). Label **[user-provided]**.

### Step 7 — Synthesize per reference
For each of the 3-5 (or 8-10 deep) references that make the brief, capture the standard six:
- **Hook** — first line of primary text / first 3s of video. What type (callout, question, micro-story, bold claim, pattern interrupt)?
- **Identity angle** — who it calls out, and how specifically. Raw material for Validate Messaging.
- **Creative format** — text-on-image, stamp style, highlighted phrase, video vs static, UGC vs produced.
- **CTA + destination** — button and what it drives to (registration, VSL, application).
- **Longevity signal** — observed days active / variant count. The proof it's working.
- **Borrow vs counter** — one line: model the structure, or position against it.

Plus one **saturation note** across the set: which hook/angle everyone is running (proven, but blend-in risk) and where the open lane is.

---

## OUTPUT FORMAT

```
# [Client] — Market Research ([date], Round [N])

**Scope:** [platforms searched, keywords, competitors resolved, geo]
**Data sources:** [which tools returned data; anything inferred/user-provided flagged]

## References ([3-5 / 8-10])
### [Advertiser] — [ad name/one-liner]  [observed | inferred — web | user-provided]
- Hook: ...
- Identity angle: ...
- Format: ...
- CTA → destination: ...
- Longevity: [X days active / N variants running]
- Borrow / counter: ...

## Video script breakdowns  (only if transcripts pulled)
### [Advertiser] — [ad]
Hook (0-3s): ... / Structure: ... / Proof: ... / Close: ...

## Organic signals  (deep mode only)
[top organic hooks + engagement, per competitor]

## Saturation map
[what everyone runs; the open lane]

## HANDOFF
[the 2-3 references to model first and why; angles to feed Validate Messaging; anything to counter-position]

## BRAND EVIDENCE LEDGER
[active Theme name/ID; every Theme field with source + confirmed / inferred / not found]
```

Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above — do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai / no native artifacts (fallback), save to `/mnt/user-data/outputs/` and present. Attach raw JSON pulls as `[client]-research-raw.json` (appendix; don't paste raw JSON into the brief). When roas-ad-kit / roas-ad-copy called this skill mid-run, the References section drops directly into their research section — same six fields, no reshaping.

---

## HARD RULES

- **Never write blind.** Work the full fallback chain before shipping a thin brief, and say plainly what's observed vs inferred.
- **Never fabricate longevity, impressions, or reach.** No number enters the brief that a tool didn't return.
- **Longevity over vibes.** A boring ad running 120 days beats a clever ad running 6.
- **Model, don't copy.** The brief exists to inform structure and angles; downstream copy is written fresh in the client's voice. Never lift competitor lines verbatim into deliverables.
- **Bounded pulls.** A handful of tool calls per platform. If the user wants ongoing monitoring at scale, that's an app/automation build, not this skill.
- **Tight brief.** A few lines per reference. The raw JSON appendix carries the bulk.

## COMMON PITFALLS

- **Guessing tool parameters.** Always `tool_search` first; the schemas are not what you'd assume (e.g. TikTok needs advertiser_token or id+name together).
- **Wrong page resolved.** "Andy Elliott" returns fan pages and imitators; verify by category/verification/follower scale before pulling ads.
- **Treating every active ad as a winner.** Rank by longevity; most active ads are unproven tests.
- **Skipping transcripts on video winners.** The transcript is the highest-value artifact this skill produces; pull it whenever a winner is video.
- **Pasting raw JSON into the brief.** Synthesize; append the raw file separately.
