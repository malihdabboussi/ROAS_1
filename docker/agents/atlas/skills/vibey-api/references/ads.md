# Ads

## generate_ad_set
**Required keys:** `ad_set_id`

**Optional keys:** `ad_set_id`, `prompt`, `count`

**Types:** `ad_set_id`: string, `prompt`: string, `count`: number

Fans out image generations across selected ad strategies and creates ads in an ad set. Uses the shared 10-strategy library (visual_contrast, founder_authority, etc.). Each strategy × variations_per_strategy becomes one ad with image_url + metadata.creative_strategy.

```json
{"action":"generate_ad_set","label":"Generating ad set","data":{"ad_set_id":"UUID","strategies":["visual_contrast","bold_offer"],"variations_per_strategy":2,"model":"gemini-3.1-flash-image-preview"}}
```

## list_canvas_nodes
**Required keys:** `canvas_id,ad_set_id`

**Optional keys:** `canvas_id`, `ad_set_id`

**Types:** `canvas_id`: string, `ad_set_id`: string

Read-only list of nodes on an Ad Creative Canvas. Use in Canvas Operator mode to see sibling creatives before generating the next node. Provide canvas_id or ad_set_id.

```json
{"action":"list_canvas_nodes","label":"Reading canvas","data":{"ad_set_id":"UUID"}}
```
