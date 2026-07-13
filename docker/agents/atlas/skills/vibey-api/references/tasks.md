# Tasks

## add_task_comment
**Required keys:** `space_id`, `task_id`, `message`

**Optional keys:** `mentions`, `attachments`, `scope_override`

**Types:** `space_id`: string, `task_id`: string, `message`: string, `scope_override`: boolean

Adds a comment to a task activity feed. Required: space_id, task_id, message. Optional mentions and attachments are persisted in the activity payload. Mentioning an agent may invoke that agent through the task-agent path in the main API.

```json
{"action":"add_task_comment","label":"Adding task comment","data":{"space_id":"UUID","task_id":"UUID","message":"Please focus on the customer success angle."}}
```

```json
{"action":"add_task_comment","label":"Mentioning agent","data":{"space_id":"UUID","task_id":"UUID","message":"@ivy can you review this?","mentions":[{"type":"agent","agent_key":"copywriter","label":"Ivy"}]}}
```

## delete_task
**Required keys:** `space_id`, `task_id`

**Optional keys:** `scope_override`

**Types:** `space_id`: string, `task_id`: string, `scope_override`: boolean

Requests deletion of a task. Returns a confirmation card the user must approve before the task is removed.

```json
{"action":"delete_task","label":"Removing task","data":{"space_id":"UUID","task_id":"UUID"}}
```

## get_space
**Required keys:** `space_id`

**Optional keys:** `scope_override`

**Types:** `space_id`: string, `scope_override`: boolean

Fetches one space with full schema.fields and schema.views. ALWAYS call this before create_task or update_task: status, priority, tags, and custom fields are user-customizable per space. For contacts, missions, IG research, or other workspace surfaces, use their dedicated action family — those are different objects.

```json
{"action":"get_space","label":"Reading space schema","data":{"space_id":"UUID"}}
```

## list_spaces
**Optional keys:** `campaign_id`, `general`, `limit`, `scope_override`

**Types:** `campaign_id`: string, `general`: boolean, `limit`: number, `scope_override`: boolean

Lists spaces visible in the current user/org context. Use before task actions when the user names a workspace but does not provide a space_id. Optional general=true lists general spaces outside a campaign. Optional limit controls result count.

```json
{"action":"list_spaces","label":"Finding your spaces","data":{"limit":20}}
```

```json
{"action":"list_spaces","label":"Finding general spaces","data":{"general":true,"limit":20}}
```
