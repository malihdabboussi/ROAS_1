-- Ads Intelligence (SearchAPI) + Scrape Creators Meta Ad Library agent surface,
-- and correct platform-managed market-research skill contract.
-- Also documents the Fathom legacy-default routing fix shipped in agent-api code.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) SearchAPI / ads_intelligence toolkit + capabilities
-- ---------------------------------------------------------------------------
INSERT INTO public.project_composio_toolkit_config (
  integration_id,
  toolkit_slug,
  auth_config_id,
  auth_mode,
  enabled,
  metadata
)
VALUES (
  'searchapi',
  'searchapi',
  null,
  'managed',
  true,
  jsonb_build_object('execution_mode', 'legacy', 'agent_facing_id', 'ads_intelligence')
)
ON CONFLICT (integration_id) DO UPDATE SET
  toolkit_slug = EXCLUDED.toolkit_slug,
  auth_mode = EXCLUDED.auth_mode,
  enabled = EXCLUDED.enabled,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.integration_capabilities (
  integration_id,
  action_slug,
  execution_mode,
  display_name,
  description,
  parameters,
  examples,
  metadata,
  domains,
  route_config,
  updated_at
)
VALUES
  (
    'searchapi',
    'meta_ads_page_search',
    'legacy',
    'Ads Intelligence Meta page search',
    'Resolve competitor / brand names to Meta Ad Library page IDs. Platform-managed — no user connection required.',
    '{"q":{"type":"string","required":true},"query":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"ads_intelligence"}'::jsonb,
    array['marketing']::text[],
    '{"method":"POST","path":"/api/integrations/searchapi/meta/page-search"}'::jsonb,
    now()
  ),
  (
    'searchapi',
    'meta_ads_search',
    'legacy',
    'Ads Intelligence Meta ads search',
    'Search Meta Ad Library by keyword (q) or page_id. Platform-managed — no user connection required.',
    '{"q":{"type":"string"},"query":{"type":"string"},"page_id":{"type":"string"},"pageId":{"type":"string"},"country":{"type":"string"},"active_status":{"type":"string"},"next_page_token":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"ads_intelligence"}'::jsonb,
    array['marketing']::text[],
    '{"method":"POST","path":"/api/integrations/searchapi/meta/ads-search"}'::jsonb,
    now()
  ),
  (
    'searchapi',
    'meta_ad_details',
    'legacy',
    'Ads Intelligence Meta ad details',
    'Fetch full Meta Ad Library creative details by ad_id or ad_details_token.',
    '{"ad_id":{"type":"string"},"adId":{"type":"string"},"ad_archive_id":{"type":"string"},"ad_details_token":{"type":"string"},"details_token":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"ads_intelligence"}'::jsonb,
    array['marketing']::text[],
    '{"method":"POST","path":"/api/integrations/searchapi/meta/ad-details"}'::jsonb,
    now()
  ),
  (
    'searchapi',
    'tiktok_advertiser_search',
    'legacy',
    'Ads Intelligence TikTok advertiser search',
    'Resolve brand names to TikTok Ads Library advertisers.',
    '{"q":{"type":"string","required":true},"query":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"ads_intelligence"}'::jsonb,
    array['marketing']::text[],
    '{"method":"POST","path":"/api/integrations/searchapi/tiktok/advertiser-search"}'::jsonb,
    now()
  ),
  (
    'searchapi',
    'tiktok_ads_search',
    'legacy',
    'Ads Intelligence TikTok ads search',
    'Search TikTok Ads Library by keyword or advertiser_token.',
    '{"q":{"type":"string"},"query":{"type":"string"},"advertiser_token":{"type":"string"},"advertiserToken":{"type":"string"},"country":{"type":"string"},"sort_by":{"type":"string"},"next_page_token":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"ads_intelligence"}'::jsonb,
    array['marketing']::text[],
    '{"method":"POST","path":"/api/integrations/searchapi/tiktok/ads-search"}'::jsonb,
    now()
  ),
  (
    'searchapi',
    'tiktok_ad_details',
    'legacy',
    'Ads Intelligence TikTok ad details',
    'Fetch TikTok Ads Library ad details by ad_id.',
    '{"ad_id":{"type":"string","required":true},"adId":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"ads_intelligence"}'::jsonb,
    array['marketing']::text[],
    '{"method":"POST","path":"/api/integrations/searchapi/tiktok/ad-details"}'::jsonb,
    now()
  ),
  (
    'searchapi',
    'google_ads_advertiser_search',
    'legacy',
    'Ads Intelligence Google advertiser search',
    'Resolve brand names in Google Ads Transparency Center.',
    '{"q":{"type":"string","required":true},"query":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"ads_intelligence"}'::jsonb,
    array['marketing']::text[],
    '{"method":"POST","path":"/api/integrations/searchapi/google/advertiser-search"}'::jsonb,
    now()
  ),
  (
    'searchapi',
    'google_ads_search',
    'legacy',
    'Ads Intelligence Google ads search',
    'List Google Ads Transparency creatives for an advertiser_id.',
    '{"advertiser_id":{"type":"string","required":true},"advertiserId":{"type":"string"},"region":{"type":"string"},"country":{"type":"string"},"next_page_token":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"ads_intelligence"}'::jsonb,
    array['marketing']::text[],
    '{"method":"POST","path":"/api/integrations/searchapi/google/ads-search"}'::jsonb,
    now()
  ),
  (
    'searchapi',
    'google_ad_details',
    'legacy',
    'Ads Intelligence Google ad details',
    'Fetch Google Ads Transparency creative details (advertiser_id + creative_id).',
    '{"advertiser_id":{"type":"string","required":true},"advertiserId":{"type":"string"},"creative_id":{"type":"string"},"ad_id":{"type":"string"},"adId":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"ads_intelligence"}'::jsonb,
    array['marketing']::text[],
    '{"method":"POST","path":"/api/integrations/searchapi/google/ad-details"}'::jsonb,
    now()
  )
ON CONFLICT (integration_id, action_slug) DO UPDATE SET
  execution_mode = EXCLUDED.execution_mode,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  parameters = EXCLUDED.parameters,
  metadata = EXCLUDED.metadata,
  domains = EXCLUDED.domains,
  route_config = EXCLUDED.route_config,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2) Scrape Creators Meta Ad Library actions on social_analysis
-- ---------------------------------------------------------------------------
INSERT INTO public.integration_capabilities (
  integration_id,
  action_slug,
  execution_mode,
  display_name,
  description,
  parameters,
  examples,
  metadata,
  domains,
  route_config,
  updated_at
)
VALUES
  (
    'scrapecreators',
    'facebook_ad_library_search_companies',
    'legacy',
    'Meta Ad Library search companies',
    'Search Meta Ad Library companies by name and return page IDs. Platform-managed Social Analysis action.',
    '{"query":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"social_analysis"}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/facebook/ad-library/search/companies","query_params":{"query":"query"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators',
    'facebook_ad_library_company_ads',
    'legacy',
    'Meta Ad Library company ads',
    'List ads for a Meta Ad Library page. Pass pageId or companyName.',
    '{"pageId":{"type":"string"},"companyName":{"type":"string"},"country":{"type":"string"},"status":{"type":"string"},"media_type":{"type":"string"},"language":{"type":"string"},"sort_by":{"type":"string"},"start_date":{"type":"string"},"end_date":{"type":"string"},"cursor":{"type":"string"},"trim":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"social_analysis"}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/facebook/ad-library/company/ads","query_params":{"pageId":"pageId","companyName":"companyName","country":"country","status":"status","media_type":"media_type","language":"language","sort_by":"sort_by","start_date":"start_date","end_date":"end_date","cursor":"cursor","trim":"trim"},"query_remainder":true}'::jsonb,
    now()
  ),
  (
    'scrapecreators',
    'facebook_ad_library_search_ads',
    'legacy',
    'Meta Ad Library search ads',
    'Keyword search Meta Ad Library ads with optional status/date filters.',
    '{"query":{"type":"string","required":true},"sort_by":{"type":"string"},"search_type":{"type":"string"},"ad_type":{"type":"string"},"country":{"type":"string"},"status":{"type":"string"},"media_type":{"type":"string"},"start_date":{"type":"string"},"end_date":{"type":"string"},"cursor":{"type":"string"},"trim":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"social_analysis"}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/facebook/ad-library/search/ads","query_params":{"query":"query","sort_by":"sort_by","search_type":"search_type","ad_type":"ad_type","country":"country","status":"status","media_type":"media_type","start_date":"start_date","end_date":"end_date","cursor":"cursor","trim":"trim"},"query_remainder":true}'::jsonb,
    now()
  ),
  (
    'scrapecreators',
    'facebook_ad_library_ad',
    'legacy',
    'Meta Ad Library ad details',
    'Fetch full Meta Ad Library creative details by ad id or URL.',
    '{"id":{"type":"string"},"url":{"type":"string"},"trim":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"social_analysis"}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/facebook/ad-library/ad","query_params":{"id":"id","url":"url","trim":"trim"}}'::jsonb,
    now()
  ),
  (
    'scrapecreators',
    'facebook_ad_library_ad_transcript',
    'legacy',
    'Meta Ad Library ad transcript',
    'Fetch transcript for a Meta Ad Library video ad by id or URL.',
    '{"id":{"type":"string"},"url":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"social_analysis"}'::jsonb,
    array['marketing']::text[],
    '{"method":"GET","path":"/api/integrations/scrapecreators/facebook/ad-library/ad/transcript","query_params":{"id":"id","url":"url"}}'::jsonb,
    now()
  )
ON CONFLICT (integration_id, action_slug) DO UPDATE SET
  execution_mode = EXCLUDED.execution_mode,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  parameters = EXCLUDED.parameters,
  metadata = EXCLUDED.metadata,
  domains = EXCLUDED.domains,
  route_config = EXCLUDED.route_config,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3) Refresh market-research skill contract (no MCP language)
-- ---------------------------------------------------------------------------
UPDATE public.skill_library
SET
  description = $roas_market_research_desc$Pulls REAL competitor ad data for ROAS campaigns through platform-managed Ads Intelligence (SearchAPI) and Social Analysis (Scrape Creators) integrations — Meta, Google, and TikTok ad libraries, ranked by longevity, with video-ad transcripts for winners and an optional organic-content layer. Replaces guesswork web searching with observed ad-library data. Load whenever a campaign needs market/competitor research — "run market research," "ad library research," "pull competitor ads," "what is [competitor] running," "what's working in this niche," "research the market for [client]," "check the ad library," or ANY time roas-ad-kit, roas-ad-copy, or roas-ad-concepts reaches its research step. Load aggressively before writing ads for a new campaign; never write blind. Do NOT load to write concepts, copy, or creative (roas-ad-kit / roas-ad-copy / roas-ad-design) — this skill only produces the research brief they consume.$roas_market_research_desc$,
  markdown_content = $roas_market_research_body$# ROAS Market Research — observed ad-library data, not guesswork

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
$roas_market_research_body$,
  updated_at = now()
WHERE skill_key = 'roas-market-research';

UPDATE public.agent_skills
SET
  description = $roas_market_research_desc$Pulls REAL competitor ad data for ROAS campaigns through platform-managed Ads Intelligence (SearchAPI) and Social Analysis (Scrape Creators) integrations — Meta, Google, and TikTok ad libraries, ranked by longevity, with video-ad transcripts for winners and an optional organic-content layer. Replaces guesswork web searching with observed ad-library data. Load whenever a campaign needs market/competitor research — "run market research," "ad library research," "pull competitor ads," "what is [competitor] running," "what's working in this niche," "research the market for [client]," "check the ad library," or ANY time roas-ad-kit, roas-ad-copy, or roas-ad-concepts reaches its research step. Load aggressively before writing ads for a new campaign; never write blind. Do NOT load to write concepts, copy, or creative (roas-ad-kit / roas-ad-copy / roas-ad-design) — this skill only produces the research brief they consume.$roas_market_research_desc$,
  markdown_content = $roas_market_research_body$# ROAS Market Research — observed ad-library data, not guesswork

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
$roas_market_research_body$,
  updated_at = now()
WHERE skill_key = 'roas-market-research';

COMMIT;
