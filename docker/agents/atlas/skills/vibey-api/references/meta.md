# Meta

## check_meta_connection
Checks Meta integration status.

```json
{"action":"check_meta_connection","label":"Checking Meta connection","data":{}}
```

## create_meta_custom_audience
**Required keys:** `name`

**Optional keys:** `name`, `description`, `ad_account_id`

**Types:** `name`: string, `description`: string, `ad_account_id`: string

Creates a custom audience on Meta (e.g. engagement: page fans, engagers). User sees: audience available in list_meta_audiences for targeting in ad sets. Pass name and optional rule (event_sources) and retention_days.

```json
{"action":"create_meta_custom_audience","label":"Creating audience","data":{"ad_account_id":"act_...","name":"Page followers","rule":{"included":["page_engaged"],"event_sources":[{"type":"page","id":"PAGE_ID"}]},"retention_days":14}}
```

## create_meta_lookalike_audience
**Required keys:** `source_audience_id`

**Optional keys:** `source_audience_id`, `name`, `country`

**Types:** `source_audience_id`: string, `name`: string, `country`: string

Creates a lookalike audience from a seed custom audience. User sees: lookalike available in list_meta_audiences for targeting. Requires an existing custom_audience as seed.

```json
{"action":"create_meta_lookalike_audience","label":"Creating lookalike","data":{"ad_account_id":"act_...","name":"LLA 1% US","origin_audience_id":"META_AUDIENCE_ID","country":"US","ratio":0.01}}
```

## create_meta_pixel_event
**Required keys:** `event_name`

**Optional keys:** `event_name`, `pixel_id`, `payload`

**Types:** `event_name`: string, `pixel_id`: string, `payload`: object

Creates a custom conversion (pixel event) for a pixel. User sees: event in list_meta_pixel_events, usable for ad optimization and tracking.

```json
{"action":"create_meta_pixel_event","label":"Creating pixel event","data":{"ad_account_id":"act_...","name":"Lead","event_source_id":"PIXEL_ID","custom_event_type":"LEAD","rule":"url_contains:\u0027thank-you\u0027"}}
```

## get_delivery_estimate
**Optional keys:** `ad_account_id`, `targeting`, `optimization_goal`

**Types:** `ad_account_id`: string, `targeting`: object, `optimization_goal`: string

Gets delivery estimates for an ad set.

```json
{"action":"get_delivery_estimate","label":"Estimating your reach","data":{"ad_set_id":"UUID"}}
```

## get_meta_ad_status
**Required keys:** `meta_ad_id`

**Optional keys:** `meta_ad_id`

**Types:** `meta_ad_id`: string

Fetches status for a published Meta ad.

```json
{"action":"get_meta_ad_status","label":"Checking ad delivery status","data":{"meta_ad_id":"..."}}
```

## get_meta_ads_insights
**Optional keys:** `ad_account_id`, `since`, `until`, `level`

**Types:** `ad_account_id`: string, `level`: string, `since`: iso_date, `until`: iso_date

Relevant skill: read `skills/ad-builder/SKILL.md`. Ad work needs creative strategy, platform fit, and artifact update-vs-create guidance. Read before creating, editing, or publishing ads.

Reads performance insights from Meta.

```json
{"action":"get_meta_ads_insights","label":"Pulling campaign insights","data":{"campaign_id":"UUID"}}
```

## list_meta_ad_accounts
Lists available Meta ad accounts.

```json
{"action":"list_meta_ad_accounts","label":"Loading ad accounts","data":{}}
```

## list_meta_audiences
**Optional keys:** `ad_account_id`

**Types:** `ad_account_id`: string

Lists custom audiences for a Meta ad account.

```json
{"action":"list_meta_audiences","label":"Loading audiences","data":{"ad_account_id":"act_..."}}
```

## list_meta_pages
Lists available Meta pages.

```json
{"action":"list_meta_pages","label":"Loading your pages","data":{}}
```

## list_meta_pixel_events
**Optional keys:** `pixel_id`

**Types:** `pixel_id`: string

Lists custom conversions (pixel events) for a Meta ad account.

```json
{"action":"list_meta_pixel_events","label":"Loading pixel events","data":{"ad_account_id":"act_..."}}
```

## publish_ad_to_meta
**Required keys:** `ad_id`

**Optional keys:** `ad_id`, `ad_account_id`, `page_id`

**Types:** `ad_id`: string, `ad_account_id`: string, `page_id`: string

Relevant skill: read `skills/ad-builder/SKILL.md`. Ad work needs creative strategy, platform fit, and artifact update-vs-create guidance. Read before creating, editing, or publishing ads.

Publishes an ad artifact to Meta. User sees: ad status changes to Published in Studio > Ads; ad goes live on Meta. Requires: create_ad first, Meta connected (check_meta_connection), defaults saved (save_meta_defaults). targeting may include custom_audiences and excluded_custom_audiences (arrays of { id: string }).

```json
{"action":"publish_ad_to_meta","label":"Publishing your ad","data":{"ad_id":"UUID","ad_account_id":"act_...","page_id":"...","targeting":{"geo_locations":{"countries":["US"]},"custom_audiences":[{"id":"META_AUDIENCE_ID"}]}}
```

## save_meta_defaults
**Optional keys:** `ad_account_id`, `page_id`, `pixel_id`

**Types:** `ad_account_id`: string, `page_id`: string, `pixel_id`: string

Saves ad account, page, Instagram, and pixel defaults to a campaign without publishing. Call this immediately after the user selects their Meta settings so the campaign Settings tab stays in sync.

```json
{"action":"save_meta_defaults","label":"Saving your Meta settings","data":{"campaign_id":"UUID","ad_account_id":"act_...","page_id":"...","instagram_user_id":"...","pixel_id":"..."}}
```

## update_ad_campaign
**Required keys:** `ad_campaign_id,adCampaignId`

**Optional keys:** `ad_campaign_id`, `adCampaignId`, `name`, `objective`, `status`

**Types:** `ad_campaign_id`: string, `adCampaignId`: string, `name`: string, `objective`: string, `status`: string

Updates an existing ad campaign on Meta. Only works for campaigns already published to Meta. Cannot change objective (immutable).

```json
{"action":"update_ad_campaign","label":"Updating campaign on Meta","data":{"ad_campaign_id":"UUID","name":"Updated Campaign","daily_budget":5000,"status":"ACTIVE"}}
```

## update_ad_set
**Required keys:** `ad_set_id,adSetId`

**Optional keys:** `ad_set_id`, `adSetId`, `name`, `status`, `budget`, `targeting`

**Types:** `ad_set_id`: string, `adSetId`: string, `name`: string, `status`: string, `budget`: number, `targeting`: object

Updates an existing ad set on Meta. Only works for ad sets already published to Meta. Can update targeting, budget, schedule, and optimization settings.

```json
{"action":"update_ad_set","label":"Updating ad set on Meta","data":{"ad_set_id":"UUID","name":"Updated Ad Set","daily_budget":2000,"targeting":{"geo_locations":{"countries":["US"]},"age_min":25,"age_max":45}}}
```
