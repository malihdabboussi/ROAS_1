# Custom Object System

## What This Solves

Today, every data type in Vibey is hardcoded: offers, funnels, ads, sequences — each has its own table, its own `create_*` action, its own schema. A user who wants to track "Deals" or "Invoices" or "Tickets" has no way to do it because there's no `deals` table and no `create_deal` action.

The custom object system lets users define their own entity types. A Sales agent defines "Deal" objects. A Finance agent defines "Invoice" objects. A CS agent defines "Ticket" objects. All through the same generic actions.

## How It Works

### 1. User defines an object type

Through Vibey or any agent:

```
define_object_type({
  name: "Deal",
  fields: [
    { name: "value", type: "currency" },
    { name: "stage", type: "enum", options: ["prospect", "qualified", "proposal", "closed_won", "closed_lost"] },
    { name: "contact_name", type: "text" },
    { name: "close_date", type: "date" },
    { name: "notes", type: "text" }
  ]
})
```

### 2. Agents create/read/update records

```
create_object({ type: "Deal", data: { value: 50000, stage: "qualified", contact_name: "John" } })
list_objects({ type: "Deal", filter: { stage: "qualified" }, limit: 20 })
update_object({ object_id: "uuid", data: { stage: "proposal" } })
```

### 3. Widgets display the data

Widget data dependencies can reference custom objects:

```json
{
  "type": "internal",
  "adapter": "custom_objects",
  "params": { "object_type": "Deal", "limit": 20 },
  "label": "deals"
}
```

### Database Design

Two tables:

**`user_object_types`** — schema definitions

- `id` (UUID)
- `user_id` (UUID)
- `name` (TEXT, e.g. "Deal")
- `slug` (TEXT, e.g. "deal", unique per user)
- `fields` (JSONB — array of field definitions with name, type, options, required)
- `created_at`, `updated_at`

**`user_object_records`** — actual data

- `id` (UUID)
- `user_id` (UUID)
- `object_type_id` (UUID FK to user_object_types)
- `data` (JSONB — the actual record data, validated against the type's field schema)
- `created_by_agent` (TEXT, optional — which agent created this)
- `campaign_id` (UUID, optional — scope to campaign)
- `created_at`, `updated_at`

### New vibey_backend Actions

- `define_object_type` — create a new object type with field schema
- `list_object_types` — list all object types for the user
- `get_object_type` — get schema for a specific type
- `update_object_type` — add/modify fields (append-only for safety)
- `create_object` — create a record of a given type
- `update_object` — update a record
- `list_objects` — list/filter/sort records of a type
- `get_object` — get a single record
- `delete_object` — soft-delete a record

### New Widget Data Adapter

Add `custom_objects` to the internal adapter list in the widget runtime. Accepts `object_type` (slug) and standard params (`limit`, `filter`, `sort`).

## What This Solves (Domain Problem)

Instead of needing a `sales` domain with sales-specific actions, a `finance` domain with finance-specific actions, etc., you need ONE generic object system. Every domain works through:

1. **Integrations** — pull data from external tools (HubSpot, Stripe, Zendesk)
2. **Custom objects** — store structured data the user defines (deals, invoices, tickets)
3. **Widgets** — display both integration data and custom object data
4. **Documents/PDFs** — produce reports and exports

All through the same set of `vibey_backend` actions, available to any domain.

## Open Question: Context Window Noise

**Does this solve context window noise?**

Partially, but not fully. Here's why:

**What it DOES solve:** The action set becomes smaller and more uniform. Instead of 50+ marketing-specific actions, new domains only need ~10 generic object actions + baseline. The dynamic vibey-api skill generation (from the identity pipeline fix) will scope the skill to only include these actions. Less documentation = less tokens in the system prompt.

**What it does NOT solve:** The custom object SCHEMAS themselves (what fields a "Deal" has, what stages exist, what a "Ticket" looks like) need to be in the agent's context for it to create valid records. If a user has 15 custom object types, the agent needs to know all their schemas to work with them correctly.

**Possible solutions for schema context (to explore during implementation):**

- Lazy loading: agent calls `get_object_type("Deal")` before creating a record, instead of having all schemas in the system prompt
- Schema summary injection: during chat, inject a compact summary of the user's object types (just names + field names, no full descriptions) — similar to how integration context is injected today
- Skill-per-type: when a user defines a complex object type, auto-generate a mini skill that teaches the agent how to work with that specific type

This is an open design question that should be answered when building the system. The identity pipeline fix (which generates vibey-api skills dynamically from RBAC) provides the infrastructure to add these actions — they'll automatically appear in agents' skills once implemented.

## Relation to Identity Pipeline Fix

The identity pipeline fix (steps 1-7 in the current plan) is a prerequisite:

- Steps 1-3 connect the file systems so agents get correct identity + tool deny lists
- Step 4 fixes widget routing
- Steps 5-7 build the dynamic skill generation from RBAC

Once custom object actions exist (`create_object`, `list_objects`, etc.), they get added to the RBAC action sets, and the dynamic skill generator automatically includes them in the right agents' skills. No additional wiring needed.

## Files That Would Be Created/Modified

- `supabase/migrations/` — new tables (`user_object_types`, `user_object_records`)
- `apps/agent-api/src/modules/artifacts/services/artifact-custom-objects.service.ts` — new service
- `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts` — register new actions
- `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts` — add actions to domain allowlists
- `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts` — add to valid action enum
- `docker/tools/vibey-backend/index.ts` — add to SUPPORTED_ACTIONS + descriptions
- `apps/web/src/features/workspaces/lib/widget-runner-scope.ts` — add `custom_objects` adapter
- `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts` — add action documentation
