---
name: roas-market-research
description: Pulls REAL competitor ad data for ROAS campaigns through platform-managed Ads Intelligence (SearchAPI) and Social Analysis (Scrape Creators) integrations — Meta, Google, and TikTok ad libraries, ranked by longevity, with video-ad transcripts for winners and an optional organic-content layer. Replaces guesswork web searching with observed ad-library data. Load whenever a campaign needs market/competitor research — "run market research," "ad library research," "pull competitor ads," "what is [competitor] running," "what's working in this niche," "research the market for [client]," "check the ad library," or ANY time roas-ad-kit, roas-ad-copy, or roas-ad-concepts reaches its research step. Load aggressively before writing ads for a new campaign; never write blind. Do NOT load to write concepts, copy, or creative (roas-ad-kit / roas-ad-copy / roas-ad-design) — this skill only produces the research brief they consume.
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
6. **Depth** — default: standard brief (3-5 references). "Deep" on request: 8-10 references + organic layer.

---

## THE WORKFLOW

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

---

## OUTPUT

Write a durable research document the ad skills can consume. Title it clearly (e.g. "Market Research — [Client]"). Include:
1. Scope + data sources (name the exact `service` + `integration_action` calls used)
2. Client snapshot (from campaign/brain context)
3. Ranked references with the six fields above
4. Saturation / open-lane note
5. Explicit "gaps / inferred" section for anything not tool-observed
