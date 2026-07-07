# Space Templates

**Last Modified:** 2026-05-20

## Overview

Space Templates are a DB-backed catalog of ready-made spaces. Users pick a template from the sidebar **+** menu or from **Create a Space**, then choose what to include (sample tasks, guide docs, channel, draft automations) before instantiating.

## Data Flow

1. **Catalog** — `space_templates`, `space_template_items`, `space_template_automations` (seeded from `apps/api/src/modules/space-templates/data/space-template-catalog.ts`).
2. **Browse** — `GET /api/space-templates` loads the library; `GET /api/space-templates/:slug` returns counts for the confirm dialog.
3. **Instantiate** — `POST /api/space-templates/:slug/instantiate` creates a normal `spaces` row (not `is_template`), optionally seeds items, channel, and draft automations. Template guide docs write their rich body to `space_items.doc_body`.
4. **Guide docs** — each template includes a welcome doc with first steps, view usage, and upkeep guidance. Templates with briefs/playbooks include fill-in prompts so users know what to replace.

## Backend

| File                                                                       | Role                                                                                            |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/space-templates/space-templates.controller.ts`       | List, get, instantiate                                                                          |
| `apps/api/src/modules/space-templates/space-templates.service.ts`          | Orchestration                                                                                   |
| `apps/api/src/modules/space-templates/lib/wire-channel-into-schema.ts`     | Channel view wiring                                                                             |
| `supabase/migrations/20260520120000_space_templates.sql`                   | Schema + RLS                                                                                    |
| `supabase/migrations/20260520120100_seed_space_templates.sql`              | 12 templates (generated)                                                                        |
| `supabase/migrations/20260520132621_add_space_item_doc_body.sql`           | Adds `space_items.doc_body`, backfills template docs, and updates template instantiation        |
| `supabase/migrations/20260520134332_improve_space_template_docs.sql`       | Refreshes template guide docs with more complete user-facing instructions                       |
| `supabase/migrations/20260520134844_remove_template_ad_campaigns_view.sql` | Removes legacy `ad_campaigns` from the Marketing Campaign template and makes Ads campaign-level |

## Frontend

| File                            | Role                             |
| ------------------------------- | -------------------------------- |
| `SidebarAddSpaceDropdown.tsx`   | **+** → Blank / Browse           |
| `SpaceTemplatesBrowsePanel.tsx` | Full-screen browse (Flows-style) |
| `UseTemplateConfirmDialog.tsx`  | Opt-in checkboxes + create       |
| `space-template-nav.ts`         | Category filters                 |

## Decision Log

- **2026-05-20:** Templates live in dedicated tables (not `spaces.is_template`) so the catalog is global and read-only via RLS; instantiation creates a normal space row.
- **2026-05-20:** Doc bodies use `space_items.doc_body`; `notes` remains task/list notes and visual docs remain generated into `custom_data._doc_visual_html`.
- **2026-05-20:** Template guide docs should teach the workflow, not just label views. Welcome docs include "Start here" and "Keep it alive"; placeholder docs include concrete prompts to fill in.
- **2026-05-20:** Marketing Campaign templates use one unified `ads` view with `ads_config.paid_ads_mode = structure`; the old separate `ad_campaigns` view is no longer seeded.
- **2026-05-20:** Automations install as `is_draft: true`, `enabled: false`.

## Regenerating seed SQL

```bash
node scripts/generate-space-templates-migration.mjs
```
