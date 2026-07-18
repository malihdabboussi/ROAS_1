# Space Templates

**Last Modified:** 2026-07-17

## Overview

Space Templates are a DB-backed catalog of ready-made spaces. Users pick a template from the sidebar **+** menu or from **Create a Space**, then choose what to include (sample tasks, guide docs, channel, draft automations) before instantiating.

## Data Flow

1. **Catalog** — `space_templates`, `space_template_items`, `space_template_automations` (seeded from `apps/api/src/modules/space-templates/data/space-template-catalog.ts`).
2. **Browse** — `GET /api/space-templates` loads the library; `GET /api/space-templates/:slug` returns counts for the confirm dialog.
3. **Instantiate** — `POST /api/space-templates/:slug/instantiate` creates a normal `spaces` row (not `is_template`), optionally seeds items, channel, and draft automations. Template guide docs write their rich body to `space_items.doc_body`.
4. **Guide docs** — each template includes a welcome doc with first steps, view usage, and upkeep guidance. Templates with briefs/playbooks include fill-in prompts so users know what to replace.

## CEO personal templates

| Slug | Title | Purpose |
|------|-------|---------|
| `ceo-hq` | CEO HQ | Personal command center: Today, Priorities, Calendar, Missions, Drafts (emails), Notes, channel. Morning CEO Brief (07:30 PT) + End of Day Close (17:30 PT). Prompts enforce **always draft, never send**. |
| `meetings` | Meetings | Split **calls** (`entry_type=call` → All Meetings) vs **follow-up action items** (`entry_type=follow_up` → Follow-ups / Action items). **Source call** links each follow-up back to its meeting. **Call Date** (`call_date`) is when the meeting happened; **Due Date** is for action-item deadlines. Status funnel Processing→To action→Following up→Waiting→Done; Attendee tags; Recording URL. Fathom creates the call row + People contacts from invitee emails; `agent_suggest_tasks` creates follow-up rows. Meeting Logs = per-call docs. |

Instantiate both on the **personal account** (no `X-Org-Id`). Slack audit for HQ assumes personal Slack; Meetings assumes personal Fathom. Automations install as drafts — enable after connecting integrations.

## Backend

| File                                                                       | Role                                                                                            |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/space-templates/space-templates.controller.ts`       | List, get, instantiate                                                                          |
| `apps/api/src/modules/space-templates/space-templates.service.ts`          | Orchestration                                                                                   |
| `apps/api/src/modules/space-templates/data/space-template-catalog-ceo.ts`  | CEO HQ + Meetings template seeds                                                                |
| `apps/api/src/modules/space-templates/lib/wire-channel-into-schema.ts`     | Channel view wiring                                                                             |
| `supabase/migrations/20260520120000_space_templates.sql`                   | Schema + RLS                                                                                    |
| `supabase/migrations/20260520120100_seed_space_templates.sql`              | 12 templates (generated)                                                                        |
| `supabase/migrations/20260715165000_seed_ceo_hq_meetings_space_templates.sql` | Additive CEO HQ + Meetings seeds                                                          |
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
- **2026-07-15:** Visualize dual-writes a linked HTML presentation (`presentations` + `presentation_files`) and stores `custom_data._doc_visual_presentation_id` so Design/Markup/Tweaks work while the Doc stays in Docs.
- **2026-05-20:** Template guide docs should teach the workflow, not just label views. Welcome docs include "Start here" and "Keep it alive"; placeholder docs include concrete prompts to fill in.
- **2026-05-20:** Marketing Campaign templates use one unified `ads` view with `ads_config.paid_ads_mode = structure`; the old separate `ad_campaigns` view is no longer seeded.
- **2026-05-20:** Automations install as `is_draft: true`, `enabled: false`.
- **2026-07-15:** Added `ceo-hq` and `meetings` as space templates (not freeloaded campaigns). CEO loops are schedule+agent with draft-only prompts; Meetings uses Fathom → task + document artifact + suggested follow-ups. Default personal bootstrap of these templates is not automatic yet.
- **2026-07-15:** Meetings views filter on `entry_type` (`field_value_filters`) so Follow-ups holds action items only; Fathom invitee emails upsert into campaign People.
- **2026-07-16:** Added `agency-client-webinar` — Agency Client (Webinar) with Missions + Docs seeds for Webinar Fulfillment playbook kickoff. Additive seed: `supabase/migrations/20260716102000_seed_agency_client_webinar_space_template.sql`.
- **2026-07-16:** `instantiate_space_template` writes `doc_body` again (was only `custom_data.body`, so Doc cards looked empty). Migration: `20260716104000_instantiate_space_template_doc_body.sql`. Agency webinar create seeds Vibey chat + opens Start Playbook.
- **2026-07-17:** Agency Client (Webinar) now seeds separate `WEB#6` editable Validate Messaging statics, `WEB#7` image briefs, and `WEB#8` media plan placeholders so template Docs mirror the split creative mission flow.

## Regenerating seed SQL

```bash
node scripts/generate-space-templates-migration.mjs
```

Additive CEO templates use `supabase/migrations/20260715165000_seed_ceo_hq_meetings_space_templates.sql` (do not overwrite the original 12-template seed for a two-slug add). Additive agency webinar template: `20260716102000_seed_agency_client_webinar_space_template.sql`.
