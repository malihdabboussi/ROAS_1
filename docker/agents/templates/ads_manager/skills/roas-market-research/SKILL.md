---
name: roas-market-research
description: Pulls observed competitor ads through platform-managed Ads Intelligence and Social Analysis, then builds or updates the campaign Theme from verified website, logo, social, and media evidence. Use for market research, competitor or ad-library research, campaign brand setup, or before writing ads for a new campaign. Produces WEB#4 research plus the active Theme consumed by ads, funnels, decks, and image generation. Do not use it to write creative.
---

# ROAS Market Research — observed ad-library data, not guesswork

This skill produces the research brief that feeds the ad skills (roas-ad-kit Section 1, roas-ad-copy's research step, roas-ad-concepts grounding). It pulls live ads through two **platform-managed** integrations, ranks them by longevity (the single best proxy for what's working), pulls transcripts of winning video ads, and outputs a tight brief in the exact shape the downstream skills expect.

**Prime directive: never write blind, and never fake the data.** Every reference in the brief is either observed through a tool or clearly labeled as web-search-inferred / user-provided. If a longevity number wasn't observed, don't invent one.

---

## THE TOOLS (platform-managed — always available)

These are **not MCPs** and do **not** require Settings > Integrations reconnect. Discover exact params with `get_integration`, then execute with `use_integration`.

**Ads Intelligence (`service: "ads_intelligence"`) = DISCOVERY layer** (broad sweeps, advertiser resolution via SearchAPI):

```json
{"action":"get_integration","label":"Loading Ads Intelligence","data":{"service":"ads_intelligence"}}
```

- `meta_ads_page_search` — resolve competitor names → Meta page IDs (`params.q`)
- `meta_ads_search` — Meta ads by keyword (`params.q`) or page (`params.page_id`)
- `meta_ad_details` — full Meta ad detail (`params.ad_id` or `params.ad_details_token`)
- `tiktok_advertiser_search` / `tiktok_ads_search` / `tiktok_ad_details`
- `google_ads_advertiser_search` / `google_ads_search` / `google_ad_details`

**Social Analysis (`service: "social_analysis"`) = DEPTH layer** (Meta Ad Library detail + transcripts via Scrape Creators):

```json
{"action":"get_integration","label":"Loading Social Analysis","data":{"service":"social_analysis"}}
```

- `facebook_ad_library_search_companies` — alt page resolution (`params.query`)
- `facebook_ad_library_company_ads` — all ads for a page (`params.pageId` or `params.companyName`)
- `facebook_ad_library_search_ads` — keyword search (`params.query`)
- `facebook_ad_library_ad` — full detail on one ad (`params.id` or `params.url`)
- `facebook_ad_library_ad_transcript` — **transcript of a video ad** (`params.id` or `params.url`)

Either surface covers most Meta ground alone — if one errors, swap to the other before falling back to web search.

Example discovery call:

```json
{"action":"use_integration","label":"Resolving Meta pages","data":{"service":"ads_intelligence","integration_action":"meta_ads_page_search","params":{"q":"Impact Elite Coaching"}}}
```

Example depth call:

```json
{"action":"use_integration","label":"Pulling video ad transcript","data":{"service":"social_analysis","integration_action":"facebook_ad_library_ad_transcript","params":{"id":"1755312555404167"}}}
```

---

## INPUTS — gather before pulling

Pull from the conversation/brief first; only ask if genuinely missing.

1. **Client + offer + niche** — what we're selling and to whom.
2. **3-5 niche keywords** — the phrases a competitor's ad or offer would contain.
3. **Named competitors** — names, page URLs, or page IDs. Zero is fine; the keyword sweep will surface them.
4. **Geo** — default US.
5. **Platform scope** — Meta always. Add Google/TikTok only if the ICP warrants it or the user asks.
6. **Depth** — default outside a mission: standard brief (3-5 references). "Deep" on request: 8-10 references + organic layer. An Ads Research mission overrides this with at least 12 visual references across at least 3 saved searches or advertisers.

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
Turn every named competitor into platform IDs via `ads_intelligence.meta_ads_page_search` (or `social_analysis.facebook_ad_library_search_companies`). Disambiguate by category/verification when multiple pages match.

### Step 2 — Sweep
- Per resolved competitor: `meta_ads_search` with `page_id`, or `facebook_ad_library_company_ads` with `pageId`.
- Per keyword: `meta_ads_search` / `facebook_ad_library_search_ads` (active ads, target geo).
- Other platforms in scope: TikTok/Google Ads Intelligence actions.
- Keep pulls bounded: first page or two per query is plenty.

### Step 3 — Rank by longevity
Sort on observed active time / start date + active status.
- **90+ days active = proven winner.** 30-90 days = promising. Under 30 days = unproven.
- Ignore impression indexes when missing (-1). Longevity IS the performance signal.

### Step 4 — Deep-dive the top 5-10
For each winner: `facebook_ad_library_ad` or `meta_ad_details`. **For every VIDEO winner, pull `facebook_ad_library_ad_transcript`** and break the script: hook (first ~3s), story/mechanism, proof, close/CTA.

### Step 5 — Organic layer (deep mode or on request)
For the 1-2 strongest competitors, pull recent organic via existing `social_analysis` Instagram/TikTok/YouTube actions, rank by engagement, and flag hooks that performed organically.

### Step 6 — Fallback chain (never write blind)
1. Primary surface errors → try the other surface's equivalent.
2. Both fail on a platform → web-search the competitor + offer category; label **[inferred — web]**, no longevity claims.
3. Still thin → ask the user for screenshots/links. Label **[user-provided]**.
4. Never tell the user Ads Intelligence / Scrape Creators are "not connected" — they are platform-managed. If a call fails, report the actual error and switch approach.

### Step 7 — Synthesize per reference
For each of the 3-5 (or 8-10 deep) references:
- **Hook** — first line / first 3s. Type?
- **Identity angle** — who it calls out.
- **Creative format** — static vs video, UGC vs produced.
- **CTA + destination**
- **Longevity signal** — observed days active / variant count.
- **Borrow vs counter** — one line.

Plus one **saturation note** across the set.

### Ads Research mission completion contract

When the active mission uses `playbook_id: ads-research`:

1. Run at least 3 distinct topic or advertiser searches with `run_ads_research_search`.
2. Save at least 12 usable visual references total and confirm every response reports `saved_search_created: true`.
3. Keep every saved search linked to the current mission. Preserve the thumbnail or creative snapshot, advertiser, format, angle, source URL, relevance, and extracted pattern for every reference.
4. Do not complete the market-research subtask with only a document. If the quota cannot be saved, block with the exact provider or data limitation.

---

## OUTPUT

Write a durable research document the ad skills can consume. Title it exactly `WEB#4 — Market Research` (legacy titles like "Market Research — [Client]" still match). Include:
1. Scope + data sources (name the exact `service` + `integration_action` calls used)
2. Client snapshot (from campaign/brain context)
3. Ranked references with the six fields above
4. Saturation / open-lane note
5. Explicit "gaps / inferred" section for anything not tool-observed
6. Brand Evidence Ledger covering every Theme field and the active Theme name/ID
