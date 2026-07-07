# Widget System v2 — Complete Architecture Reference

## Overview

Widget System v2 replaces freeform TSX generation with a **declarative JSON catalog** approach inspired by Google's A2UI protocol. Agents output JSON referencing pre-built UI components; the frontend renderer maps them to themed React implementations with Framer Motion animations. No agent writes code — it assembles JSON from the catalog.

v1 (TSX) widgets continue to render via the legacy `react-runner` iframe path. v2 and v1 coexist; the renderer chooses based on the presence of `widget_definition.version === 2`.

---

## Three Catalogs

| Catalog                | Purpose                                           | Source of Truth                                                                                      |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Component Catalog**  | ~28 UI components the agent can reference by type | `packages/widget-catalog/src/catalog.ts` + `catalog.schema.json`                                     |
| **Field Type Catalog** | Valid field types for custom object schemas       | `user_object_types.fields` JSONB (text, number, currency, enum, date, boolean, url, email, relation) |
| **Action Catalog**     | `vibey_backend` actions agents can trigger        | `artifact-action.dto.ts` VALID_ACTIONS + RBAC policy                                                 |

---

## Widget Definition Format

Stored in `user_widgets.widget_definition` (JSONB column).

```typescript
type WidgetDefinition = {
  version: 2
  root: string // ID of root component
  components: ComponentNode[] // flat list, each has unique id
  dataModel?: { path: string; value: unknown }[] // optional static data
  actions?: ActionMapping[] // button → backend mappings
  styles?: { font?: string; primaryColor?: string }
}

type ComponentNode = {
  id: string
  weight?: number // flex weight in Row/Column
  component: Record<string, unknown> // exactly one key = component type
}

type ActionMapping = {
  name: string // matches Button action.name
  backendAction: string // vibey_backend action to call
  dataTemplate: Record<string, unknown> // template with path references
}
```

### Agent Output Contract

Viktor returns:

```json
{
  "name": "Widget Name",
  "widget_definition": { "version": 2, "root": "root", "components": [...] },
  "data_dependencies": [{ "type": "internal", "adapter": "custom_objects", "params": { "object_type": "deal" } }]
}
```

---

## Component Catalog

### A2UI Base Components (16)

| Component      | Props                               | Render                                 |
| -------------- | ----------------------------------- | -------------------------------------- |
| Text           | value (binding)                     | `<p>` + Framer fade-in                 |
| Image          | url, alt (bindings)                 | `<img>` with rounded border            |
| Icon           | name                                | Text span (Lucide name)                |
| Row            | children (id[])                     | Horizontal flex                        |
| Column         | children (id[])                     | Vertical flex                          |
| List           | dataBinding (path), children (id[]) | Iterate array, clone template per item |
| Card           | child (id)                          | Elevated container + Framer scale-in   |
| Tabs           | tabItems ({label, child}[])         | Tab bar + first tab content            |
| Divider        | —                                   | `<hr>` with theme border               |
| Button         | label (binding), action ({name})    | `<button>` → Action Router             |
| TextField      | label, value (binding)              | Labeled text input                     |
| CheckBox       | label, value (binding)              | Checkbox + label                       |
| DateTimeInput  | —                                   | `<input type="datetime-local">`        |
| MultipleChoice | options ({id, label}[])             | `<select>` dropdown                    |
| Slider         | min, max, value (binding)           | `<input type="range">`                 |
| Modal          | child (id)                          | Container (renders as card)            |

### Vibey Business Components (13)

| Component   | Props                                 | Render                            |
| ----------- | ------------------------------------- | --------------------------------- |
| KPICard     | value, label, trend (bindings)        | Metric card with Framer animation |
| BarChart    | dataBinding, xKey, yKey               | Recharts `<BarChart>`             |
| LineChart   | dataBinding, xKey, yKeys[]            | Recharts `<LineChart>`            |
| PieChart    | dataBinding, nameKey, valueKey        | Recharts `<PieChart>`             |
| AreaChart   | dataBinding, xKey, yKey               | Recharts `<AreaChart>`            |
| DataTable   | dataBinding, columns ({key, label}[]) | Sortable HTML table               |
| ProgressBar | value (binding), max                  | Progress bar with percentage      |
| Gauge       | value, min, max                       | Progress-style gauge              |
| StatGrid    | children (id[]), columns (2/3/4)      | CSS grid of KPICards              |
| Badge       | text (binding), variant               | Pill badge                        |
| Timeline    | dataBinding, titleKey, dateKey        | Stacked event cards               |
| Avatar      | url, name (bindings)                  | Image or initials fallback        |
| Sparkline   | dataBinding, valueKey                 | Mini Recharts `<LineChart>`       |

### Value Bindings

Every value prop accepts either:

```json
{ "path": "/deals/0/value" }
```

or

```json
{ "literal": "Static Text" }
```

The renderer resolves paths against the widget's data model at render time.

---

## Runtime Pipeline

### 1. Widget Load

```
WidgetFrame mounts
  → fetch data_dependencies via /api/widgets/data
  → response becomes data model: { "/campaigns": [...], "/custom_objects": [...] }
  → check widget_definition.version
    → v2: WidgetRenderer (React components + Framer)
    → v1: react-runner iframe (legacy TSX)
```

### 2. v2 Rendering

```
WidgetRenderer receives (definition, dataModel)
  → indexComponentMap: Map<id, ComponentNode>
  → renderNode(definition.root)
    → lookup component type from the one key in node.component
    → resolve all { path: "..." } bindings against dataModel
    → render matching React component from catalog/index.tsx
    → recursively render children (Row/Column/Card/List)
```

### 3. Action Routing (Direct-to-Backend)

When a user clicks a Button with an action:

```
Button click → onAction(actionName)
  → widget-action-router.ts: routeWidgetAction()
    → find ActionMapping by name
    → resolveTemplatePaths(dataTemplate, dataModel) — fill in path references
    → POST /api/proxy/artifacts/stream { action, data }
    → parse SSE response
    → onActionComplete() → refetch data_dependencies → re-render
```

No LLM involved. The widget is self-contained.

---

## Data Binding Resolution

File: `apps/web/src/features/workspaces/lib/widget-data-resolver.ts`

| Function                                | Purpose                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `createWidgetDataModel(raw)`            | Converts API response `{ campaigns: { data: [...] } }` into nested model `{ campaigns: [...] }` |
| `resolvePathReference(model, path)`     | Walks `/deals/0/value` path through nested objects/arrays                                       |
| `resolveTemplatePaths(template, model)` | Deep-walks an object, replacing all `{ path: "..." }` refs with resolved values                 |
| `indexComponentMap(definition)`         | Builds `Map<id, ComponentNode>` for O(1) lookups during render                                  |

---

## Custom Object System

### Database Tables

**`user_object_types`** — Schema definitions

| Column  | Type               | Purpose                                                  |
| ------- | ------------------ | -------------------------------------------------------- |
| id      | UUID PK            |                                                          |
| user_id | UUID FK → profiles | Owner                                                    |
| name    | TEXT               | Display name (e.g., "Deal")                              |
| slug    | TEXT               | URL-safe identifier, unique per user                     |
| fields  | JSONB              | Array of `{ name, type, options?, required?, default? }` |
| icon    | TEXT               | Optional Lucide icon name                                |

**`user_object_records`** — Data rows

| Column           | Type                        | Purpose                       |
| ---------------- | --------------------------- | ----------------------------- |
| id               | UUID PK                     |                               |
| user_id          | UUID FK → profiles          | Owner                         |
| object_type_id   | UUID FK → user_object_types | Schema reference              |
| data             | JSONB                       | Record data                   |
| created_by_agent | TEXT                        | Agent key that created this   |
| campaign_id      | UUID                        | Optional campaign association |
| deleted_at       | TIMESTAMPTZ                 | Soft delete timestamp         |

### vibey_backend Actions (9)

| Action               | Level Required    | Purpose                              |
| -------------------- | ----------------- | ------------------------------------ |
| `define_object_type` | manager / c_level | Create schema with field definitions |
| `list_object_types`  | all levels        | List all schemas for user            |
| `get_object_type`    | all levels        | Get one schema by id or slug         |
| `update_object_type` | manager / c_level | Update schema fields                 |
| `create_object`      | all levels        | Create a record                      |
| `update_object`      | all levels        | Update record fields (merge)         |
| `list_objects`       | all levels        | List/filter records by type          |
| `get_object`         | all levels        | Get single record                    |
| `delete_object`      | all levels        | Soft delete                          |

### RBAC Integration

- CRUD actions (`create_object`, `list_objects`, `update_object`, `get_object`, `delete_object`) are in `MANAGED_BASELINE_ACTIONS` — every agent gets them.
- Schema mutation actions (`define_object_type`, `update_object_type`) are restricted to `manager` and `c_level` only.
- Vibey and C-level cross-domain agents also get schema mutation access.
- The dynamic vibey-api skill generator automatically includes these in each agent's scoped skill.

### Widget Data Adapter

The `custom_objects` adapter is available in `data_dependencies`:

```json
{
  "type": "internal",
  "adapter": "custom_objects",
  "params": { "object_type": "deal", "limit": 20 }
}
```

Resolves by looking up the object type slug, then querying `user_object_records` with RLS.

---

## Dual-Render in WidgetFrame

File: `apps/web/src/features/workspaces/components/WidgetFrame.tsx`

```
if widget.widget_definition?.version === 2:
  → inject theme CSS
  → merge static dataModel from definition
  → render WidgetRenderer (direct React, no iframe)
  → on action complete: increment refreshTick → refetch data

else:
  → useSelfHealingPreview (TSX validation + repair)
  → useRunner (react-runner)
  → render in sandboxed iframe with Tailwind
```

Both paths share the same data fetching pipeline (`resolveWidgetData` → `dataState`).

---

## Workspace State Management

File: `apps/web/src/features/workspaces/hooks/useWorkspace.ts`

Workspace state is a **shared Zustand store** — not per-component local state. Both the Sidebar and WorkspacePage read the same source of truth.

Key behaviors:

- Parallel `load()` calls are deduped via a single in-flight promise
- `createPage` throws a user-friendly error on duplicate slugs (no silent upsert)
- `setWidgets` and `setPages` accept both direct values and updater functions

---

## Viktor's Skill (DB-First)

All skill content lives in Supabase and is synced to disk by `AgentSyncService` on every `agent-api` restart.

### Skill Structure (in DB)

```
agent_skills WHERE skill_key = 'widget-builder':
  → markdown_content: JSON catalog v2 output contract, core rules, data dependency docs

agent_skill_resources WHERE skill_key = 'widget-builder':
  → references/component-catalog.md    — all 28 components with binding/action rules
  → references/data-adapters.md        — internal + integration adapter formats
  → references/integration-workflow.md — discovery/verify/build patterns (from v1)
  → references/theme-variables.md      — CSS variable reference (from v1)
```

### On-Disk After Sync

```
docker/agents/viktor/skills/widget-builder/
├── SKILL.md
└── references/
    ├── component-catalog.md
    ├── data-adapters.md
    ├── integration-workflow.md
    └── theme-variables.md
```

---

## File Reference

### New Files

| File                                                                               | Purpose                                            |
| ---------------------------------------------------------------------------------- | -------------------------------------------------- |
| `packages/widget-catalog/src/catalog.ts`                                           | Component type definitions + WidgetDefinition type |
| `packages/widget-catalog/src/catalog.schema.json`                                  | JSON Schema for LLM structured output validation   |
| `apps/web/src/features/workspaces/lib/widget-renderer.tsx`                         | v2 renderer: definition + data → React tree        |
| `apps/web/src/features/workspaces/lib/widget-data-resolver.ts`                     | Path binding resolution + data model creation      |
| `apps/web/src/features/workspaces/lib/widget-action-router.ts`                     | Button action → vibey_backend direct call          |
| `apps/web/src/features/workspaces/components/catalog/index.tsx`                    | React implementations of all 28 catalog components |
| `apps/agent-api/src/modules/artifacts/services/artifact-custom-objects.service.ts` | 9 custom object action handlers                    |

### Modified Files

| File                                                                          | Change                                                                               |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `apps/web/src/features/workspaces/types/index.ts`                             | Added `WidgetDefinition`, `ComponentNode`, `ActionMapping`, `custom_objects` adapter |
| `apps/web/src/features/workspaces/components/WidgetFrame.tsx`                 | Dual-render: v2 JSON renderer or v1 TSX iframe                                       |
| `apps/web/src/features/workspaces/hooks/useWorkspace.ts`                      | Converted from local state to shared Zustand store                                   |
| `apps/web/src/features/workspaces/hooks/useWidgetChat.ts`                     | Parses `widget_definition` from agent responses                                      |
| `apps/web/src/features/workspaces/components/WorkspacePage.tsx`               | Passes `widget_definition` through save/create flow                                  |
| `apps/web/src/features/workspaces/components/WidgetPreviewPane.tsx`           | Supports v2 preview + save without TSX validation gate                               |
| `apps/web/src/features/workspaces/services/workspaces.service.ts`             | Added `widget_definition` to create/update widget calls                              |
| `apps/api/src/modules/workspaces/services/workspaces.service.ts`              | Added `custom_objects` adapter + `widget_definition` column support                  |
| `apps/api/src/modules/workspaces/workspaces.controller.ts`                    | Accepts `widget_definition` in create/update widget endpoints                        |
| `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`            | Added 9 custom object actions to VALID_ACTIONS                                       |
| `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`   | Added 9 action → method mappings                                                     |
| `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts` | Added object actions to RBAC allowlists                                              |
| `apps/agent-api/src/modules/artifacts/services/artifact-widgets.service.ts`   | Supports `widget_definition` in create/update                                        |
| `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`          | Registered custom objects service + passes `widget_definition`                       |
| `apps/agent-api/src/modules/artifacts/artifacts.module.ts`                    | Added `ArtifactCustomObjectsService` provider                                        |
| `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`         | Added 9 custom object action docs                                                    |
| `apps/agent-api/src/modules/widgets/services/widget-generation.service.ts`    | Parses `widget_definition` from agent output                                         |
| `docker/tools/vibey-backend/index.ts`                                         | Added 9 custom object actions to SUPPORTED_ACTIONS + descriptions                    |

### Database Migrations

| Migration                                                         | What                                                                         |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `20260311150000_create_custom_object_tables.sql`                  | `user_object_types` + `user_object_records` tables with RLS + triggers       |
| `20260311151000_add_widget_definition_to_user_widgets.sql`        | `widget_definition JSONB` column on `user_widgets`                           |
| `20260311152000_rewrite_widget_builder_skill_to_json_catalog.sql` | Viktor/Rex skill rewrite + component-catalog.md + data-adapters.md resources |

---

## Checklist: Adding a New Catalog Component

1. Add type to `CatalogComponentType` union in `packages/widget-catalog/src/catalog.ts`
2. Add to `CATALOG_COMPONENTS` array in same file
3. Add `case` in `renderCatalogNode()` in `apps/web/src/features/workspaces/components/catalog/index.tsx`
4. Use only CSS variables for colors (`--color-*`, `--widget-*`)
5. Add Framer Motion entrance animation
6. Update `references/component-catalog.md` in DB via migration (not file edit)
7. Add to JSON schema if props have specific constraints

## Checklist: Adding a New Custom Object Action

1. Add action name to `VALID_ACTIONS` in `artifact-action.dto.ts`
2. Add method mapping in `artifact-action.registry.ts`
3. Implement handler in `artifact-custom-objects.service.ts`
4. Add to appropriate RBAC sets in `artifact-capability.policy.ts`
5. Add action doc in `vibey-api-action-docs.ts`
6. Add to `SUPPORTED_ACTIONS` + description in `docker/tools/vibey-backend/index.ts`
7. Run dispatch test to verify alignment

## Checklist: Adding a New Data Adapter

1. Add adapter name to `InternalAdapter` union in `apps/web/src/features/workspaces/types/index.ts`
2. Add adapter name to `WidgetDataDependency` type in `apps/api/src/modules/workspaces/workspaces.controller.ts`
3. Add `case` in `resolveInternalDependency()` in `apps/api/src/modules/workspaces/services/workspaces.service.ts`
4. Update `references/data-adapters.md` in DB via migration
