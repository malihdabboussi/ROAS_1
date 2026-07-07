# Space Item Query Utility

Last updated: 2026-06-11

## Purpose

`space-item-query.util.ts` centralizes agent-facing `space_items` list query behavior in `apps/agent-api`.

Use it when an action lists Space items and needs filters, search, count metadata, sorting, summary projection, or bounded limits before rows are returned to an agent.

## When To Use

Use this utility for Space item list actions such as:

- `list_tasks`
- `list_space_view_items`
- future Space-backed research/artifact list actions

Do not use it for exact reads (`get_task`, `get_space_item`, `read_space_document`) or non-`space_items` tables.

## API

- `parseSpaceItemLimit(value, fallback, max)`: clamps list limits.
- `getSpaceItemSelect(input)`: returns full select or summary projection when `fields` is `"summary"`.
- `shouldIncludeSpaceItemCount(input)`: detects `include_count`.
- `collectSpaceItemFilters(input, additionalFilters)`: merges top-level filters and `filters`.
- `applySpaceItemFilters(query, input, additionalFilters)`: applies top-level and `custom_data->>key` filters.
- `applySpaceItemAssignedToMeFilter(query, input, userId)`: applies the session-user "My Tasks" filter.
- `applySpaceItemSearch(query, input)`: applies title search.
- `applySpaceItemOrder(query, input, fallbackColumn)`: applies bounded sort fields.

## Behavior

Known top-level columns use direct filters. Unknown safe field keys map to `custom_data->>key`, so a Space custom field like `category` becomes `custom_data->>category`.

`doc_source` maps to `custom_data->>_doc_source`; `item_type` and `view_type` map to `custom_data->>_view_type`.

`assigned_to_me: true` resolves to the current session user and matches tasks where either the primary legacy assignee is `{ assignee_type: "human", assignee_id: userId }` or the multi-assignee `assignees` JSONB array contains `{ type: "human", id: userId }`. This mirrors Home > My Tasks semantics.

## Used By

- `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`

## Change History

- 2026-06-11: Added `assigned_to_me` filtering for current-user task lists, including multi-assignee rows.
- 2026-06-05: Added to push Space item filters before `limit` for task and view item list actions.
