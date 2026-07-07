# Space Items `custom_data` Conventions for Drive Sync

Last updated: 2026-06-29

## Scope

This document defines the `custom_data` keys used by Drive-synced rows in `public.space_items`.

Drive mappings store structure in `space_items` and fetch body content on demand.

## Agent Awareness

Drive-synced rows are first-class Space Docs for Vibey.

- Docs UI focus emits a `space_doc` artifact context with `space_id`, item id, source, and kind.
- Dragging a Drive folder or file into chat attaches a `space_doc` reference.
- MCP agents can browse Space hierarchy with `list_spaces(campaign_id?)`, `get_space`, `list_space_views`, `get_space_view`, `list_space_view_items`, and `get_space_item` before calling exact document/task tools.
- List actions must push filters into the database query before `limit`. Use `fields: "summary"` for discovery and `include_count: true` for count workflows.
- `list_documents` defaults to the active Space in Space chat and returns rows from `space_items` where `_view_type = 'doc'`.
- `read_space_document` reads native Space Docs from `doc_body` / `notes` and Drive docs on demand from `_drive_file_id`.
- Folder rows return children and a recursive `document_index` tree instead of body text.
- `document_index` preserves the Drive hierarchy with folders and files clearly marked by `doc_kind`, `is_folder`, and `is_file`.

## MCP Navigation

External MCP clients should follow the same hierarchy as the UI:

```text
list_campaigns
→ list_spaces(campaign_id)
→ get_space(space_id) / list_space_views(space_id)
→ list_space_view_items(space_id, view_id, filters/search, fields: "summary", limit)
→ get_space_item(space_id, item_id)
```

Exact document and task paths remain:

```text
list_spaces(campaign_id)
→ list_documents(space_id, parent_item_id/search, limit)
→ read_space_document(space_id, document_id)
```

```text
list_spaces(campaign_id)
→ get_space(space_id)
→ list_tasks(space_id, status/category/filters/search, fields: "summary", include_count, limit)
→ get_task(space_id, task_id)
```

Schema field creation path:

```text
get_space(space_id)
→ create_space_field(space_id, name, type, options?, visible_in_view_ids?)
→ use the returned field.id in future custom_data writes
```

Schema field edit path:

```text
get_space(space_id)
→ update_space_field(space_id, field_id, name?, options?, visible_in_view_ids?)
```

## Agent Query Rules

- Use `get_space` and `list_space_views` to discover valid view ids and schema fields before choosing filters.
- Use `create_space_field` when the user asks to add a real Space field, column, or property. Call `get_space` first, then send `space_id`, `name`, and one creatable type: `select`, `multi_select`, `text`, `date`, `number`, `checkbox`, `currency`, `url`, `email`, `phone`, `rating`, `progress`, `media`, or `contact`.
- Use `update_space_field` when the user asks to rename a non-system field, replace select/multi-select options, or show a field in existing views. It cannot change field ids or field types.
- Do not fake new schema fields by writing only `custom_data`. `custom_data` stores values for existing field ids; schema changes must update `spaces.schema.fields`.
- Field deletion is not exposed to agents in V1.
- Use `list_tasks` for task rows. Top-level filters include `status`, `category`, `priority`, `assignee_id`, `parent_item_id`, `search`, `fields`, `include_count`, `sort_by`, `sort_direction`, and `limit`; `filters` maps additional schema/custom_data keys.
- Use `list_space_view_items` for custom/research/artifact views. Top-level `status`, `category`, and `priority` are accepted; pass `_view_type`, `_platform`, `_handle`, or other view-specific keys through `filters`.
- `list_tasks` and `list_space_view_items` return `schema_summary` with valid statuses, priorities, and categories, and returned rows include `status_label`, `priority_label`, and `category_label` when the option exists in the Space schema.
- For schema-backed `status`, `category`, and `priority`, agents may pass either option ids or human labels. Invalid guesses fail with valid options instead of returning an empty successful list.
- Use `filters`, not `filter`; singular `filter` is rejected so agents do not silently query the wrong slice.
- `create_task` and `update_task` normalize schema-backed task write values before saving. Top-level `category` is accepted as a convenience field, moved into `custom_data.category`, and resolved from option ids or human labels such as `bug`, `bugs`, or `BUGS` when the Space schema contains `bugs`.
- Invalid task write values for `status`, `priority`, or `category` fail with valid schema options instead of creating an uncategorized or miscategorized task.
- Use `list_documents` for Space Docs and folder children. `parent_item_id`, `doc_source`, and `search` are applied before `limit`.
- Use exact read actions only after the filtered list returns the ids needed for details or edits.

## Required Keys (Drive-synced Rows)

- `_view_type`: `'doc'`
- `_doc_source`: `'drive'`
- `_drive_folder_mapping_id`: UUID string from `public.space_drive_folder_mappings.id`
- `_drive_file_id`: Google Drive file/folder id
- `_drive_modified_time`: ISO timestamp (Google `modifiedTime`)

## Folder Rows

Drive folders mirrored as nodes in the docs tree:

- `_doc_kind`: `'folder'`
- `_drive_mime_type`: `'application/vnd.google-apps.folder'`

## File Rows

Drive files mirrored as leaf or intermediate nodes:

- `_doc_kind`: `'file'`
- `_drive_mime_type`: Google mime type
- `_drive_web_view_link`: Google `webViewLink` (or equivalent)
- `_drive_icon_link`: Google `iconLink` (optional but recommended)
- `_drive_thumbnail_link`: Google `thumbnailLink` (optional)
- `_drive_export_mime`: Export mime selected for body fetch (for Google-native types)

## Hierarchy Rules

- `parent_item_id` stores local parent chain.
- Parent pointers must resolve within the same mapping tree.
- Root mapped folder row has `parent_item_id = null`.

## Idempotency Rule

The effective unique key for sync is:

- `(_drive_folder_mapping_id, _drive_file_id)`

Sync diffs should treat this pair as identity for insert/update/delete decisions.

## Decision Log

- 2026-06-16: Added agent-side Space schema field actions. `create_space_field` creates visible schema fields for user-creatable field types; `update_space_field` renames non-system fields, replaces select/multi-select options, and shows fields in existing views. Field deletion remains outside the V1 agent toolkit.
- 2026-06-29: Space UI realtime now listens to active `spaces` row updates and merges `spaces.schema` changes into the Spaces store, so agent-updated field options such as task statuses appear without a manual refresh.
- 2026-06-29: Shared Space list caches reload from Supabase Realtime when visible `spaces`, `space_shares`, or `space_view_shares` rows change. The task detail modal also listens to active-Space `space_items` updates so externally created, edited, moved, or deleted subtasks update in the open modal without refresh.
