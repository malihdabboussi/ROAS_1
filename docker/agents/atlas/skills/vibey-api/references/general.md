# General

## describe_action
**Required keys:** `action_name`

**Optional keys:** `action`

**Types:** `action_name`: string, `action`: string

**Use when:** Fetch the exact data contract for one backend action before calling it.

Returns the exact data contract for one backend action. Use before calling an action when the exact payload fields are not already in context.

```json
{"action":"describe_action","label":"Checking action contract","data":{"action_name":"update_presentation"}}
```

Contract example: inspect update_presentation before calling it
```json
{"action":"describe_action","label":"inspect update_presentation before calling it","data":{"action_name":"update_presentation"}}
```

## search_vibey_docs
**Required keys:** `query`

**Optional keys:** `match_count`, `min_similarity`

**Types:** `query`: string, `match_count`: number, `min_similarity`: number

**Use when:** You need product documentation about Vibey features, actions, or policies.

Searches Vibey product and platform documentation. Use before guessing about Vibey features, backend actions, policies, or UI behavior when the answer should be grounded in internal docs. Required: query. Optional: match_count and min_similarity.

```json
{"action":"search_vibey_docs","label":"Searching Vibey docs","data":{"query":"how space automation flows set task status","match_count":5}}
```

Contract example: Find the campaign dashboard doc
```json
{"action":"search_vibey_docs","label":"Find the campaign dashboard doc","data":{"query":"campaign dashboard"}}
```
