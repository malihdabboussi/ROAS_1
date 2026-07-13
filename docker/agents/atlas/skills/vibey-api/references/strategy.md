# Strategy

## create_strategy_node
**Optional keys:** `title`, `content`, `node_type`, `campaign_id`, `campaignId`, `space_id`, `scope_override`

**Types:** `title`: string, `content`: string, `node_type`: string, `campaign_id`: string, `campaignId`: string, `space_id`: string, `scope_override`: string

Creates a strategy note on the campaign workflow canvas. Used for visual planning and brainstorming. node_type: sticky_note, text_block, group_box, or milestone. color: yellow, blue, green, purple, pink, or orange. artifact_hint: optional hint for what artifact type this note might become (e.g. funnel, sequence, offer).

```json
{"action":"create_strategy_node","label":"Adding strategy note","data":{"node_type":"sticky_note","text":"Presentation: Free PDF guide on 5 email mistakes","color":"yellow","artifact_hint":"presentation","position_x":200,"position_y":300}}
```

## list_strategy_nodes
**Optional keys:** `campaign_id`, `campaignId`, `space_id`, `scope_override`, `node_type`

**Types:** `campaign_id`: string, `campaignId`: string, `space_id`: string, `scope_override`: string, `node_type`: string

Lists all strategy notes on the campaign workflow canvas.

```json
{"action":"list_strategy_nodes","label":"Checking strategy notes","data":{}}
```
