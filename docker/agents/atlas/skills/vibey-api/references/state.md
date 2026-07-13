# State

## patch_state
**Optional keys:** `scope`, `path`, `value`, `patches`

**Types:** `scope`: string, `path`: string, `patches`: object_array

Patches persisted agent/campaign working state (structured delta).

```json
{"action":"patch_state","label":"Updating working state","data":{"patches":[]}}
```
