# Space Templates

**Last Modified:** 2026-08-18 (Agenda pinned by default; pinned views render first in the tab strip)

## Overview

Space Templates are a DB-backed catalog of ready-made spaces. Users pick a template from the sidebar **+** menu or from **Create a Space**, then choose what to include (sample tasks, guide docs, channel, draft automations) before instantiating.

## Data Flow

1. **Catalog** — `space_templates`, `space_template_items`, `space_template_automations` (seeded from `apps/api/src/modules/space-templates/data/space-template-catalog.ts`).
2. **Browse** — `GET /api/space-templates` loads the library; `GET /api/space-templates/:slug` returns counts for the confirm dialog.
3. **Instantiate** — `POST /api/space-templates/:slug/instantiate` creates a normal `spaces` row (not `is_template`), optionally seeds items, channel, and draft automations. Template guide docs write their rich body to `space_items.doc_body`.
4. **Guide docs** — each template includes a welcome doc with first steps, view usage, and upkeep guidance. Templates with briefs/playbooks include fill-in prompts so users know what to replace.

## Personal Dashboard

| Slug                 | Title              | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `personal-dashboard` | Personal Dashboard | One role-neutral, private daily workspace per active organization member. It combines Today, Priorities, Agenda, All Meetings, Drafts, Notes, People, Missions, Fathom logs, and follow-up actions. All Meetings is the default Meetings tab. Morning/EOD, Fathom, and Call completed automations install disabled and draft-only. The legacy `ceo-hq` and `meetings` templates remain attached to existing Spaces but are no longer offered for new creation. |

Active organization membership automatically provisions exactly one `spaces.space_kind = 'personal_dashboard'` row for that member and organization. It is always `visibility = 'private'`, cannot be converted to team visibility, cannot expose public links, cannot be deleted, and rejects Space, view, and email-invite sharing at the database layer. Item rows are coerced to `is_private = true` (never shareable) on insert/update so prep/agent creates that omit privacy fields still succeed. Shared-read RLS policies explicitly exclude it, so organization owners/admins do not receive implicit access.

The dashboard layout and integration entry points can be preconfigured. OAuth authorization for Gmail, Outlook, Google Calendar, Slack, and Fathom remains owned by the individual user; administrators cannot authorize or reuse another member's personal credentials. A successful or existing Fathom connection always resolves or creates the **personal-account** Meetings / Personal Dashboard (`org_id IS NULL`) under the Personal system campaign when available — never the active org’s Personal Dashboard. Installed automations remain draft and disabled pending human confirmation.

Home Agenda prep, related call enrichment, and default Home feed scope also read that personal-account surface while the user is inside an organization.

## Backend

| File                                                                                     | Role                                                                                            |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/space-templates/space-templates.controller.ts`                     | List, get, instantiate                                                                          |
| `apps/api/src/modules/space-templates/space-templates.service.ts`                        | Orchestration                                                                                   |
| `apps/api/src/modules/space-templates/data/space-template-catalog-personal-dashboard.ts` | Personal Dashboard template seed                                                                |
| `apps/api/src/modules/space-templates/lib/wire-channel-into-schema.ts`                   | Channel view wiring                                                                             |
| `supabase/migrations/20260520120000_space_templates.sql`                                 | Schema + RLS                                                                                    |
| `supabase/migrations/20260520120100_seed_space_templates.sql`                            | 12 templates (generated)                                                                        |
| `supabase/migrations/20260715165000_seed_ceo_hq_meetings_space_templates.sql`            | Additive CEO HQ + Meetings seeds                                                                |
| `supabase/migrations/20260520132621_add_space_item_doc_body.sql`                         | Adds `space_items.doc_body`, backfills template docs, and updates template instantiation        |
| `supabase/migrations/20260520134332_improve_space_template_docs.sql`                     | Refreshes template guide docs with more complete user-facing instructions                       |
| `supabase/migrations/20260520134844_remove_template_ad_campaigns_view.sql`               | Removes legacy `ad_campaigns` from the Marketing Campaign template and makes Ads campaign-level |
| `supabase/migrations/20260719223000_provision_private_personal_dashboards.sql`           | Provisions/backfills owner-only org dashboards and enforces non-shareability                    |
| `supabase/migrations/20260720163000_coerce_personal_dashboard_item_privacy.sql`          | Coerces Personal Dashboard item privacy instead of failing inserts                              |

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
- **2026-07-15:** Added `ceo-hq` and `meetings` as space templates (not freeloaded campaigns). CEO loops are schedule+agent with draft-only prompts; Meetings uses Fathom → task + document artifact + suggested follow-ups.
- **2026-07-15:** Meetings views filter on `entry_type` (`field_value_filters`) so Follow-ups holds action items only; Fathom invitee emails upsert into campaign People.
- **2026-07-16:** Added `agency-client-webinar` — Agency Client (Webinar) with Missions + Docs seeds for Webinar Fulfillment playbook kickoff. Additive seed: `supabase/migrations/20260716102000_seed_agency_client_webinar_space_template.sql`.
- **2026-07-16:** `instantiate_space_template` writes `doc_body` again (was only `custom_data.body`, so Doc cards looked empty). Migration: `20260716104000_instantiate_space_template_doc_body.sql`. Agency webinar create seeds Vibey chat + opens Start Playbook.
- **2026-07-17:** Agency Client (Webinar) now seeds separate `WEB#6` editable Validate Messaging statics, `WEB#7` image briefs, and `WEB#8` media plan placeholders so template Docs mirror the split creative mission flow.
- **2026-07-18:** The nested Campaign flyout's **New space** action uses the shared Blank / Browse launcher, so templates remain available and inherit the selected Campaign destination.
- **2026-07-19:** A successful or existing Fathom connection reuses the Personal Dashboard (with legacy Meetings fallback) or creates the private `personal-dashboard` template. Its installed automations remain draft and disabled pending human confirmation.
- **2026-07-19:** Replaced new `ceo-hq` + `meetings` creation with one role-neutral `personal-dashboard`; active org membership now provisions one owner-only dashboard. Database constraints, immutable identity, share guards, and owner-only RLS protect the Space and its items. Existing legacy Spaces are preserved.
- **2026-07-20:** Personal Dashboard item privacy is coerced on insert/update (`is_private=true`) instead of raising, so pre-call prep and agent creates that omit privacy fields succeed. Space/view/item share tables still hard-block dashboard sharing.
- **2026-07-20:** Home + Fathom Meetings resolve the personal-account dashboard only (`org_id IS NULL`), optionally attached to `system_kind=personal` campaign. Org-scoped Personal Dashboards remain separate per-member org workspaces.
- **2026-07-20:** Home Agenda merges unmatched personal Meetings `entry_type=call` rows (Fathom) into the calendar window as `source: 'fathom'` events; matched calls stay related attachments on calendar rows.
- **2026-08-18:** Personal Dashboard All Meetings is the default Meetings view. It stores Host and Call status, hides Priority/Status on that list, defaults the date window to past + today + tomorrow, drops the Prep view, and adds a Call completed automation (call_status → completed) that clones Fathom Meeting Log actions.
- 2026-08-18 — Personal dashboard template sets `pinned_to_start: true` on **Agenda**. `pinned_to_start` is a display flag, not a storage position: the web tab strip renders the leading view (Meetings: `all-meetings`), then every pinned view in schema order, then the rest (`orderViewsForStrip`). Several views can be pinned; drag-reorder keeps pins; the Meetings surface also treats `agenda` as pinned by default until the user explicitly unpins it (`embed.defaultPinnedViewIds`).

## Regenerating seed SQL

```bash
node scripts/generate-space-templates-migration.mjs
```

Legacy CEO/Meetings templates were added by `supabase/migrations/20260715165000_seed_ceo_hq_meetings_space_templates.sql`; Personal Dashboard replacement/provisioning is `20260719223000_provision_private_personal_dashboards.sql`. Additive agency webinar template: `20260716102000_seed_agency_client_webinar_space_template.sql`.
