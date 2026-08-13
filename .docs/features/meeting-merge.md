# Meeting Merge (WIP spec)

Merge duplicate meeting items (call-kind rows in the Meetings space) into one survivor.

## Data model

A meeting is a `space_items` row with `custom_data->>'entry_type' = 'call'` (resolved
liberally: `source = 'fathom'`, `Meeting:`/`Fathom meeting:` title prefix, or recording
keys also imply call). What hangs off it:

| Data | Table / link | Merge behavior |
| --- | --- | --- |
| Workspace | `meeting_workspaces` (PK `meeting_item_id`) | Field-by-field: survivor wins, null fields filled from duplicates. Duplicate row deleted first (unique `(space_id, calendar_event_id)`). |
| Recordings | `meeting_recordings.meeting_item_id` | Repointed. Duplicate primaries demoted when survivor already has a primary (partial unique index). |
| Action items (canonical) | child `space_items` via `parent_item_id` **and** `custom_data->>'source_call_item_id'` | Both links rewritten to survivor. |
| Action items (legacy) | `meeting_actions.meeting_item_id`, unique `(meeting_item_id, source_key)` | Repointed; colliding `source_key` rows on the duplicate deleted (survivor copy wins). |
| Agenda/context links | `meeting_context_links`, unique `(meeting_item_id, entity_type, entity_id)` | Repointed; collisions and would-be self-links (`entity_type='meeting'`) deleted. |
| Snippets | `meeting_snippets.meeting_item_id` | Repointed. |
| Transcript/recap docs | child `space_items` (`custom_data.meeting_item_id`) | `parent_item_id` + `custom_data.meeting_item_id` rewritten. |
| Comments/attachments | `space_item_activity.item_id` (CASCADE) | Repointed (would be destroyed by delete otherwise). |
| Deliverables | `space_item_deliverables.item_id` (CASCADE) | Repointed. |
| Continuity | `meeting_workspaces.next_meeting_item_id` | Rows pointing at a duplicate repointed to survivor. |
| Semantic index | `space_semantic_objects/chunks/edges` keyed `(source_type, source_id)`, no FK | Duplicate rows deleted (source_type `space_task`). |
| Meeting chat | `conversations`, deterministic id from item id | Cannot be repointed (id is derived); loser conversations archived best-effort after the merge, stamped `merged_into_meeting_item_id`. |
| Survivor fields | `space_items.custom_data`, `description`, `notes` | Patch computed in TS domain code (testable): survivor values win, missing scalars filled from duplicates (created_at order), `attendees`/`participant_emails`/`tags` unioned, `merged_from_item_ids` breadcrumb appended. |
| Duplicates | `space_items` row | Deleted at the end (remaining FKs cascade / SET NULL). |

## Atomicity

Supabase REST has no transactions, so the relational work is one Postgres function
`merge_meeting_items(p_space_id, p_survivor_item_id, p_duplicate_item_ids, p_survivor_patch)`
(SECURITY DEFINER, `can_write_meeting_item()` checked for survivor + every duplicate),
called via `supabase.rpc` — same pattern as `set_meeting_primary_recording` and
`apply_canvas_operations`. Returns per-table moved counts.

## API

`POST /api/spaces/:spaceId/meetings/merge`
body `{ survivor_item_id, duplicate_item_ids[] (1–9) }` → merge summary.
Controller/service/repository split in `apps/api/src/modules/meetings/`
(`meeting-merge.*`), domain rules in `domain/meeting-merge-plan.ts`.
Service validates: all ids are call-kind rows of the space, survivor not in duplicates.

## UI

Bulk bar "Merge" action (spaces list view), visible only when 2+ items are selected and
every selected item resolves to `call` (`resolveSpaceEntryType`). Opens
`MergeMeetingsPanel` (FloatingPanel): survivor picker list — defaults to the best
candidate (has recording > most-filled fields > oldest) via `rankMergeSurvivor` — plus
confirm/cancel. Copy in `config/meeting-merge-messages.config.ts`. On success: toast,
clear selection, refresh.

Related: duplicate creation is being fixed separately (dedupe natural keys); merge cleans
up existing duplicates.
