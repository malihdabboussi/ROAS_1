# Custom Object System

## Purpose

Allows users (via agents) to define their own business entities — Deal, Ticket, Contact Record, Inventory Item, etc. — without requiring backend code changes. Agents create the schema, populate records, and widgets display them.

This solves the "domain gap" where a user creates a Sales Representative agent but there's no backend `create_deal` action. Custom objects make every domain self-service.

---

## Database Schema

### user_object_types

Defines the shape of a custom entity.

```sql
CREATE TABLE user_object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- "Deal"
  slug TEXT NOT NULL,           -- "deal" (unique per user)
  fields JSONB NOT NULL,        -- [{ name: "title", type: "text", required: true }, ...]
  icon TEXT,                    -- optional Lucide icon name
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE (user_id, slug)
);
```

### user_object_records

Stores actual data rows for a given type.

```sql
CREATE TABLE user_object_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  object_type_id UUID NOT NULL REFERENCES user_object_types(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',  -- actual record data
  created_by_agent TEXT,             -- agent_key that created this
  campaign_id UUID,                  -- optional campaign association
  deleted_at TIMESTAMPTZ,            -- soft delete
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Field Type Catalog

The `type` values supported in `fields[]`:

| Type         | Description                               |
| ------------ | ----------------------------------------- |
| `text`       | Free text                                 |
| `number`     | Numeric                                   |
| `currency`   | Number with currency formatting           |
| `enum`       | Single select from predefined `options[]` |
| `multi_enum` | Multi select                              |
| `date`       | Date only                                 |
| `datetime`   | Date + time                               |
| `boolean`    | True/false                                |
| `url`        | Validated URL                             |
| `email`      | Validated email                           |
| `relation`   | FK to another object type (future)        |

---

## Backend Actions

Implemented in `apps/agent-api/src/modules/artifacts/services/artifact-custom-objects.service.ts`.

### Schema Management (manager/c_level only)

| Action               | Parameters                                  | Returns                       |
| -------------------- | ------------------------------------------- | ----------------------------- |
| `define_object_type` | `name`, `slug`, `fields[]`, optional `icon` | `{ success, object_type }`    |
| `list_object_types`  | —                                           | `{ success, object_types[] }` |
| `get_object_type`    | `object_type_id` or `slug`                  | `{ success, object_type }`    |
| `update_object_type` | `object_type_id`, `fields[]`                | `{ success, object_type }`    |

### Record CRUD (all agent levels)

| Action          | Parameters                                                                | Returns                                 |
| --------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| `create_object` | `object_type_id`, `data`, optional `campaign_id`                          | `{ success, object }`                   |
| `update_object` | `object_id`, `data`                                                       | `{ success, object }` (merge semantics) |
| `list_objects`  | `object_type_id` or `object_type` (slug), optional `limit`, `campaign_id` | `{ success, objects[] }`                |
| `get_object`    | `object_id`                                                               | `{ success, object }`                   |
| `delete_object` | `object_id`                                                               | `{ success }` (soft delete)             |

### Update Semantics

`update_object` uses **merge**: existing `data` fields are preserved, only the provided fields are overwritten. This prevents accidental field loss when an agent updates one field.

---

## RBAC Placement

| Action Set                                                                 | In Which RBAC Group                                                                                                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| CRUD (create/list/get/update/delete_object) + read (list/get_object_types) | `MANAGED_BASELINE_ACTIONS` — every managed agent                                                                              |
| Schema mutation (define/update_object_type)                                | `C_LEVEL_CROSS_DOMAIN_ACTIONS` + `VIBEY_ALLOWED_ACTIONS` + conditional for manager/c_level in `resolveManagedActionAllowlist` |

This means:

- Any employee can create/read/update/delete records
- Only managers and above can define or modify schemas
- The dynamic vibey-api skill generator auto-includes these per agent's RBAC

---

## Widget Integration

Custom objects feed into widgets via the `custom_objects` data adapter:

```json
{
  "type": "internal",
  "adapter": "custom_objects",
  "params": { "object_type": "deal", "limit": 20, "campaign_id": "optional-uuid" }
}
```

The adapter resolves the slug → `object_type_id`, then queries `user_object_records` with RLS.

Data arrives in the widget's data model as `/custom_objects` and can be bound to any component:

```json
{ "component": { "DataTable": { "dataBinding": { "path": "/custom_objects" }, "columns": [...] } } }
```

---

## Example Flow

1. **Agent defines schema**: `define_object_type { name: "Deal", slug: "deal", fields: [{ name: "title", type: "text" }, { name: "value", type: "currency" }, { name: "stage", type: "enum", options: ["lead", "proposal", "closed"] }] }`

2. **Agent creates records**: `create_object { object_type_id: "...", data: { title: "ACME Corp", value: 50000, stage: "proposal" } }`

3. **Widget displays records**: Agent builds a widget with `data_dependencies: [{ type: "internal", adapter: "custom_objects", params: { object_type: "deal" } }]` and a DataTable component bound to `/custom_objects`.

4. **User takes action**: Widget has a "Move to Closed" button with action mapping `{ backendAction: "update_object", dataTemplate: { object_id: { path: "/custom_objects/0/id" }, data: { stage: "closed" } } }`. Click triggers direct backend call, widget refreshes.

---

## File Reference

| File                                                                               | Purpose                                  |
| ---------------------------------------------------------------------------------- | ---------------------------------------- |
| `apps/agent-api/src/modules/artifacts/services/artifact-custom-objects.service.ts` | All 9 action handlers                    |
| `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`      | RBAC placement                           |
| `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`              | Action documentation for skill generator |
| `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`                 | VALID_ACTIONS enum                       |
| `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`        | Action → method mapping                  |
| `docker/tools/vibey-backend/index.ts`                                              | OpenClaw tool descriptions               |
| `apps/api/src/modules/workspaces/services/workspaces.service.ts`                   | `custom_objects` data adapter            |
| `supabase/migrations/20260311150000_create_custom_object_tables.sql`               | Table creation + RLS                     |
