UPDATE public.agent_skills
SET
  description = 'Build workspace widgets using declarative JSON from the Vibey component catalog',
  markdown_content = $$# Widget Builder (JSON Catalog v2)

Generate widget payloads using JSON only.

## Output Contract

Return:

```json
{
  "name": "Widget Name",
  "widget_definition": {
    "version": 2,
    "root": "root",
    "components": [],
    "actions": []
  },
  "data_dependencies": []
}
```

Never return TSX for new widgets when v2 is available.

## Core Rules

1. Use only catalog components from `component-catalog.md`.
2. All dynamic values must use `{ "path": "/..." }` bindings.
3. Use `actions[]` mappings for user interactions.
4. Keep definitions deterministic and schema-valid.
5. For backward edits, preserve existing `tsx_source` only if user explicitly asks to stay on v1.

## Data Dependencies

Use `data_dependencies` to fetch internal or integration data.

Internal adapters include:
- campaigns
- tasks
- contacts
- analytics
- agents
- leads
- missions
- custom_objects

Example:

```json
{
  "type": "internal",
  "adapter": "custom_objects",
  "params": { "object_type": "deal", "limit": 20 }
}
```
$$,
  updated_at = NOW()
WHERE skill_key = 'widget-builder';

DELETE FROM public.agent_skill_resources
WHERE skill_key = 'widget-builder'
  AND file_path IN ('component-catalog.md', 'data-adapters.md');

INSERT INTO public.agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
SELECT
  s.user_id,
  s.agent_key,
  'widget-builder',
  'component-catalog.md',
  $$# Vibey Component Catalog (Widget v2)

Use these components in `widget_definition.components`.

## A2UI Base

- Text
- Image
- Icon
- Row
- Column
- List
- Card
- Tabs
- Divider
- Button
- TextField
- CheckBox
- DateTimeInput
- MultipleChoice
- Slider
- Modal

## Vibey Business Components

- KPICard
- BarChart
- LineChart
- PieChart
- AreaChart
- DataTable
- ProgressBar
- Gauge
- StatGrid
- Badge
- Timeline
- Avatar
- Sparkline

## Binding Rules

Use one of:

```json
{ "path": "/deals/0/value" }
```

or

```json
{ "literal": "Static Value" }
```

## Action Rules

Buttons/actions must map through `actions[]`:

```json
{
  "name": "move_to_proposal",
  "backendAction": "update_object",
  "dataTemplate": {
    "object_id": { "path": "/deal/id" },
    "data": { "stage": "proposal" }
  }
}
```
$$
FROM public.agent_skills s
WHERE s.skill_key = 'widget-builder';

INSERT INTO public.agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
SELECT
  s.user_id,
  s.agent_key,
  'widget-builder',
  'data-adapters.md',
  $$# Data Adapters (Widget v2)

Internal adapter payload:

```json
{ "type": "internal", "adapter": "custom_objects", "params": { "object_type": "deal", "limit": 20 } }
```

Supported internal adapters:

- campaigns
- tasks
- contacts
- analytics
- agents
- leads
- missions
- custom_objects

Integration adapter payload:

```json
{ "type": "integration", "integration": "youtube", "action": "list_videos", "params": {} }
```
$$
FROM public.agent_skills s
WHERE s.skill_key = 'widget-builder';
