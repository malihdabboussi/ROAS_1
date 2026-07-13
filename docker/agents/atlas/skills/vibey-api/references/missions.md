# Missions

## add_mission_comment
**Required keys:** `mission_id`, `message`

Adds a user comment to the mission log. Triggers a directive phase — the assigned agent will see and respond to the comment.

```json
{"action":"add_mission_comment","label":"Adding mission note","data":{"mission_id":"UUID","message":"Please focus on the peptide research angle"}}
```

## create_mission
**Required keys:** `title`

**Optional keys:** `brief`, `description`, `priority`, `assigned_agent_key`, `input`, `idempotency_key`, `parent_mission_id`, `campaign_id`, `space_id`, `source_space_item_id`

**Types:** `title`: string, `brief`: string, `description`: string, `priority`: string, `assigned_agent_key`: string, `idempotency_key`: string, `parent_mission_id`: string, `campaign_id`: string, `space_id`: string, `source_space_item_id`: string

**Use when:** Create a mission for Vibey to execute or track.

Creates a mission. User sees: mission card in Mission Control. When: delegating work to team agents or tracking a multi-step objective. Fields: title (required), brief, description, priority (low/medium/high/urgent), campaign_id, assigned_agent_key, input (arbitrary context object), idempotency_key, parent_mission_id.

```json
{"action":"create_mission","label":"Creating mission brief","data":{"title":"InbarMD Blog — Viral Peptides Article","brief":"1,500-word blog post on viral peptide topics","priority":"medium","campaign_id":"UUID"}}
```

```json
{"action":"create_mission","label":"Creating mission","data":{"title":"Mission title"}}
```

Contract example: create a campaign mission
```json
{"action":"create_mission","label":"create a campaign mission","data":{"title":"Draft the launch brief"}}
```

## get_mission
**Required keys:** `mission_id`

Fetches one mission with full context including subtasks and activity logs inline.

```json
{"action":"get_mission","label":"Loading mission details","data":{"mission_id":"UUID"}}
```

## get_mission_deliverables
**Required keys:** `mission_id`

Fetches deliverables (work products) for a mission. Use after get_mission to retrieve actual outputs like documents, images, PDFs, or files produced during the mission.

```json
{"action":"get_mission_deliverables","label":"Loading mission deliverables","data":{"mission_id":"UUID"}}
```

## get_mission_logs
**Required keys:** `mission_id`

Fetches the activity log for a mission independently. Includes status changes, comments, agent actions, and system events.

```json
{"action":"get_mission_logs","label":"Checking mission activity","data":{"mission_id":"UUID"}}
```

## get_mission_plan
**Required keys:** `mission_id`

Fetches the execution plan for a mission. The plan includes title, summary, approach, and planned subtasks with intent packets.

```json
{"action":"get_mission_plan","label":"Viewing mission plan","data":{"mission_id":"UUID"}}
```

## list_mission_subtasks
**Required keys:** `mission_id`

Lists subtasks for a mission. Each subtask has id, title, status, assigned_agent_key, sort_order, and feedback.

```json
{"action":"list_mission_subtasks","label":"Checking subtasks","data":{"mission_id":"UUID"}}
```

## list_missions
**Optional keys:** `status`, `campaign_id`, `limit`

**Types:** `status`: string, `campaign_id`: string, `limit`: number

**Use when:** List missions visible to the authenticated user.

Lists missions visible to you. Results are auto-scoped: employees see missions they are assigned to or worked on; domain managers see their team's missions; cross-domain managers and c-level see all missions. Optional filters: status, campaign_id, limit (default 30).

```json
{"action":"list_missions","label":"Reviewing my missions","data":{}}
```

```json
{"action":"list_missions","label":"Checking in-progress missions","data":{"status":"in_progress","campaign_id":"UUID","limit":10}}
```

Contract example: list open missions
```json
{"action":"list_missions","label":"list open missions","data":{"status":"inbox","limit":10}}
```

## retry_mission
**Required keys:** `mission_id`

Retries a mission that is in error or failed status. Resets the mission to inbox and re-triggers planning. Only works when status is error or failed.

```json
{"action":"retry_mission","label":"Retrying failed mission","data":{"mission_id":"UUID"}}
```

## trash_mission
**Required keys:** `mission_id`

Removes a mission permanently. This deletes the mission row — use with care. Logs a mission.trashed event before deletion.

```json
{"action":"trash_mission","label":"Removing mission","data":{"mission_id":"UUID"}}
```

## update_mission
**Required keys:** `mission_id`

Updates mission fields. Detail fields: title, brief, priority. Status fields: status (inbox/planning/todo/in_progress/review/blocked/done/error/failed/backlog), current_agent_key. Both can be sent in one call.

```json
{"action":"update_mission","label":"Updating mission status","data":{"mission_id":"UUID","status":"in_progress"}}
```

```json
{"action":"update_mission","label":"Updating mission brief","data":{"mission_id":"UUID","title":"New title","brief":"Updated brief","priority":"high"}}
```

## update_mission_subtask
**Required keys:** `mission_id`, `subtask_id`

Updates a subtask within a mission. Fields: status (pending/in_progress/done/revision/blocked/cancelled), assigned_agent_key, feedback (up to 4000 chars).

```json
{"action":"update_mission_subtask","label":"Updating subtask","data":{"mission_id":"UUID","subtask_id":"UUID","status":"done"}}
```

```json
{"action":"update_mission_subtask","label":"Requesting revision","data":{"mission_id":"UUID","subtask_id":"UUID","status":"revision","feedback":"Needs more clinical references"}}
```
