# Brain Library Actions

All actions use `vibey_backend`. Every Brain action must include `brain_type`. Examples use `brain_type: "user_default"`; when a job targets an agent, customer, company, or explicit non-default brain, use that `brain_type` and include `brain_id`.

## Narrative Pages

### get_brain_pages

Read pages. Returns title, slug, summary, page_type, status, version.

```json
{ "action": "get_brain_pages", "label": "Reading library pages", "data": { "brain_type": "user_default" } }
```

Filter by slug:
```json
{ "action": "get_brain_pages", "label": "Reading brand voice page", "data": { "brain_type": "user_default", "slug": "brand-voice" } }
```

Filter by page_type:
```json
{ "action": "get_brain_pages", "label": "Listing topic pages", "data": { "brain_type": "user_default", "page_type": "topic" } }
```

### create_brain_page

Create a new page. Slug must be URL-safe (lowercase, hyphens). Embedding is auto-generated from content_md.

```json
{
  "action": "create_brain_page",
  "label": "Creating brand voice page",
  "data": {
    "brain_type": "user_default",
    "slug": "brand-voice",
    "title": "Brand Voice & Communication Style",
    "page_type": "topic",
    "content_md": "The brand started casual-first...",
    "summary": "Coach at a conference: warm, authoritative",
    "tags": ["brand", "voice", "communication"],
    "source_refs": [
      { "type": "memory", "id": "uuid-1" },
      { "type": "memory", "id": "uuid-2" }
    ]
  }
}
```

Parameters:

| Param | Required | Description |
|-------|----------|-------------|
| slug | yes | URL-safe identifier (lowercase, hyphens). Must be unique per brain. |
| title | yes | Human-readable page title |
| page_type | yes | `topic`, `entity`, `synthesis`, or `capsule` |
| content_md | yes | Full markdown narrative content |
| summary | yes | One-line summary for INDEX.md |
| tags | no | String array for filtering |
| source_refs | no | Array of `{type, id}` linking to source memories/snapshots/SK |

### patch_brain_page

Edit a specific section of a page without rewriting the whole thing. Prefer this over `update_brain_page`.

Append to a section:
```json
{
  "action": "patch_brain_page",
  "label": "Adding Q2 insights to brand voice",
  "data": {
    "brain_type": "user_default",
    "id": "page-uuid",
    "operation": "append_to_section",
    "section": "The story",
    "content": "After the Q2 launch, the user leaned further into the coach persona.",
    "source_refs": [{ "type": "memory", "id": "uuid-4" }]
  }
}
```

Replace a section:
```json
{
  "action": "patch_brain_page",
  "label": "Updating key takeaways",
  "data": {
    "brain_type": "user_default",
    "id": "page-uuid",
    "operation": "replace_section",
    "section": "Key takeaways",
    "content": "Social: warm, coach-like\nB2B: structured, approachable"
  }
}
```

Add a new section:
```json
{
  "action": "patch_brain_page",
  "label": "Adding new section",
  "data": {
    "brain_type": "user_default",
    "id": "page-uuid",
    "operation": "add_section",
    "heading": "Channel Notes",
    "content": "Email subjects perform best lowercase.",
    "after": "The story"
  }
}
```

Parameters:

| Param | Required | Description |
|-------|----------|-------------|
| id | yes | Page UUID (from get_brain_pages) |
| operation | yes | `append_to_section`, `replace_section`, or `add_section` |
| section | yes (append/replace) | Heading text to target |
| heading | yes (add_section) | Heading text for new section |
| content | yes | Content to add or replace with |
| after | no (add_section) | Insert after this section. Omit to append at end. |
| source_refs | no | Additional source refs (APPENDED to existing) |

Section matching is case-insensitive. If section not found, returns error with available sections.

### update_brain_page

Full rewrite of a page. Use only for major restructures. Prefer `patch_brain_page` for incremental updates.

```json
{
  "action": "update_brain_page",
  "label": "Rewriting brand voice page",
  "data": {
    "brain_type": "user_default",
    "id": "page-uuid",
    "content_md": "Complete new narrative...",
    "summary": "Updated one-liner",
    "source_refs": [{ "type": "memory", "id": "uuid-3" }]
  }
}
```

### archive_brain_page

Mark a page as archived. Hidden from active queries but data preserved.

```json
{ "action": "archive_brain_page", "label": "Archiving old page", "data": { "brain_type": "user_default", "id": "page-uuid" } }
```

## Cross-References

### link_brain_pages

Create a link between two pages. link_type: related, supports, contradicts, evolved_from.

```json
{
  "action": "link_brain_pages",
  "label": "Linking pages",
  "data": { "brain_type": "user_default", "from_page_id": "uuid-1", "to_page_id": "uuid-2", "link_type": "related" }
}
```

### unlink_brain_pages

Remove a link between two pages.

```json
{ "action": "unlink_brain_pages", "label": "Removing link", "data": { "brain_type": "user_default", "from_page_id": "uuid-1", "to_page_id": "uuid-2" } }
```

## Brain Log

### log_brain_event

Record what you did. Call after every library sync.

```json
{
  "action": "log_brain_event",
  "label": "Logging library sync",
  "data": {
    "brain_type": "user_default",
    "event_type": "update_page",
    "summary": "Updated brand-voice and marketing-strategy with 4 new memories",
    "affected_pages": ["brand-voice", "marketing-strategy"]
  }
}
```

event_type options: create_page, update_page, archive_page, library_sync

### get_brain_log

Read recent log entries.

```json
{ "action": "get_brain_log", "label": "Reading recent activity", "data": { "brain_type": "user_default", "limit": 10 } }
```
