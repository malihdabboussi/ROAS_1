# Changelog - July 15, 2026

## [2026-07-15 17:06] - [FIX]

What: Slack OAuth callback now sets `user_integrations.scope_mode` (`personal` / `org_shared`) on insert and update.

Why: Connect hit Internal Server Error — insert violated NOT NULL `scope_mode`, so Slack never saved.

Impact: After `roas-api` deploy with this fix, retry Slack Connect (do not reuse the old callback URL; OAuth codes are one-time).

Files: `slack.repository.ts`, `slack.repository.save-integration.test.ts`

## [2026-07-15 16:21] - [UTIL]

What: Wired native Slack OAuth env vars onto Vercel `roas-api` Production and redeployed; noted Verification Token is unused (Signing Secret is used).

Why: Slack Connect needs client id/secret, signing secret, redirect URI, and state secret live on the API.

Impact: After the Slack app’s redirect/events URLs point at `api.roas.io`, Workspace Integrations → Slack Connect should work.

Files: `scripts/roas/roas-secrets.env.template`, Vercel `roas-api` Production env + redeploy

## [2026-07-15 15:20] - [FIX]

What: Left Chat stays collapsed when switching Spaces / HQ places (including space row switches); only the Chat button reopens it. Agent pages still use middle chat + skills with the rail collapsed.

Why: Persisted or leftover open Chat kept the Vibey rail visible on Spaces Meetings, crowding the workspace after place switches.

Impact: Spaces/Team/Brain/Flows/Home navigate full-width until Chat is opened explicitly; agent select keeps one middle composer.

Files: `GlobalChatLayout.tsx`, `SidebarHqRail.tsx`, `SidebarHqHubMenuContent.tsx`, `SidebarHqSpacesRows.tsx`

## [2026-07-15 15:17] - [ARCH]

What: Redeployed Fly `roas-runtimes` (agent-api) so Option A visual-doc → presentation dual-write is live.

Why: Local agent-api changes needed a runtime image update before Visualize could create linked presentations in production.

Impact: Health OK on `roas-runtimes.fly.dev`. Re-visualize Space docs to get `_doc_visual_presentation_id` + Presentations entries. Web still needs a Vercel deploy for Open Design UI.

Files: Fly app `roas-runtimes` image `deployment-01KXKXGMJ0AY6BWNK374H82F0N`

## [2026-07-15 15:10] - [FIX]

What: Opening a Team agent collapses the global Chat rail and drops the mid-page Conversations list so the page is one blank agent composer + the right skills/info panel.

Why: Agent detail showed double chat (global left rail + middle composer/history), which duplicated the new global Chat history surface.

Impact: `/team?agent=…` starts with global Chat collapsed and a blank middle thread; history stays in the global Chat button. Right skill bar unchanged.

Files: `GlobalChatLayout.tsx`, `Team2AgentChatWithConversations.tsx`

## [2026-07-15 11:23] - [FIX]

What: Redeployed Vercel `roas-api` Production so newly added `FATHOM_*` OAuth env vars are live on `api.roas.io`.

Why: Connect still returned "Fathom OAuth is not configured" because vars were on the project but the last production deploy was from before they were added.

Impact: Fathom Connect should now get past config and open Fathom authorize. Retry Connect in Workspace Settings → Integrations.

Files: Vercel `roas-api` Production redeploy (`api.roas.io`)

## [2026-07-15 11:05] - [UTIL]

What: Documented Fathom OAuth env vars in `apps/api/.env.example` and `scripts/roas/roas-secrets.env.template`; wired Production Fathom credentials into local gitignored secrets + Vercel `roas-api` Production.

Why: Connect Fathom failed with missing `FATHOM_*` config on `api.roas.io`.

Impact: After a `roas-api` redeploy, Settings → Integrations → Fathom Connect should start OAuth. Dev Fathom pair kept in secrets comments only (Fathom blocks localhost redirects).

Files: `apps/api/.env.example`, `scripts/roas/roas-secrets.env.template`, Vercel `roas-api` Production env (not in git)

## [2026-07-15 10:24] - [FEATURE]

What: Visual docs dual-write a linked HTML presentation on `generate_visual_html`, store `_doc_visual_presentation_id` on the Space Doc, and open Presentation Design from Visual Full mode / deliverable Maximize when linked.

Why: Visual HTML lived only on the Doc `custom_data` blob — no Presentations / All Artifacts entry and no Design–Markup–Tweaks editor.

Impact: After Visualize/Re-visualize, the same HTML is a presentation artifact; Visual tab still previews on the Doc; Open Design jumps to the linked presentation. Soft-fails presentation sync if the space has no campaign.

Files: `artifact-visual-doc.service.ts`, `artifact-visual-doc-presentation.sync.ts`, sync tests, `vibey-api-action-docs.ts`, `doc-editor-settings.ts`, `DocEditorPanel.tsx`, `DocEditorPanelInner.tsx`, `VisualDocView.tsx`, `SpaceDocDeliverablePreview.tsx`

## [2026-07-15 10:12] - [FIX]

What: Fixed All Artifacts Internal Server Error — funnels summary no longer selects missing `path`/`source_mode` page columns; presentations summary selects light columns instead of `*`/`generated_html`/`slides`; All Artifacts keeps partial rows when one kind fails (`Promise.allSettled`).
Why: Impact Space All Artifacts blanked because `api.roas.io` returned 500 on funnels + presentations list, and `Promise.all` failed the whole grid.
Impact: Web fix helps immediately (other artifact kinds still show). API fix restores funnels/presentations lists after `roas-api` deploy.
Files: `funnels.repository.ts`, `campaign-artifact-presentations.repository.ts`, `artifacts-presentation-files.base.ts`, `use-all-artifact-rows.ts`, repo tests

## [2026-07-15 10:03] - [FIX]

What: Fixed Space Docs markdown→HTML conversion so agent docs render as real headings/bold (not monospace `#` / `**` or `<pre>` dumps). Doc editor always runs bodies through the shared converter. Repaired both Impact Pre-Call docs in DB to proper HTML.

Why: `markdownToHtml` treated any HTML as final, so markdown wrapped in `<pre>` or `<p># ...<br>` skipped `marked` and TipTap showed raw markdown like a code block.

Impact: Opening those docs shows formatted Doc prose; future agent dual-writes convert the same way on web + agent-api.

Files: `apps/web/src/lib/content/markdown-to-html.ts`, `markdown-to-html.test.ts`, `DocEditorPanel.tsx`, `apps/agent-api/.../markdown-to-html.util.ts`

## [2026-07-15 10:01] - [FIX]

What: Docs cards show `created_at` (not `updated_at`) with minute-level relative times (`48m ago`) plus absolute tooltip; restored Impact Space Doc timestamps to match original conversation document create times.

Why: Anything under 1 hour displayed as "just now", and cards used `updated_at`, so the dual-write/backfill time looked newer than Nate's real saves.

Impact: Docs freshness reflects when the document was made; hover shows full date/time.

Files: `apps/web/src/features/spaces/lib/format-relative-date.ts`, `format-relative-date.test.ts`, `DocsView.tsx`

## [2026-07-15 09:54] - [FIX]

What: Personal/General default workspace no longer conflates with Flow concepts. `ensureGeneral` skips Flow-concept spaces and creates `New Workspace` (with Docs view). Doc dual-write skips Flow concepts when picking a campaign space. Home composer default + Impact Overview Docs deep-link to the linked Space Doc item. Provisioned `New Workspace` under General for the test account.

Why: Flow concepts is the Flows sandbox only; treating it as the personal default emptied Docs expectations and mis-routed personal/campaign work. Overview doc clicks only opened the space without the specific item.

Impact: General now has a catch-all `New Workspace` beside Flow concepts. Agent/campaign doc filing prefers non-flows spaces. Overview docs open the actual Space Doc when linked.

Files: `spaces-service-01.base.ts`, `flows-concept-space.constants` import path, `artifact-space-scope.ts`, `HomeDashboardV4Composer.tsx`, `CampaignOverviewTab.tsx`, `CampaignOverviewDocsSection.tsx`, tests

## [2026-07-15 09:27] - [FIX]

What: Campaign-scoped `save_document` / `create_pdf` / `create_docx` now dual-write into the campaign's Space Docs when `space_id` is missing (resolve latest campaign space). Document cards with `spaceItemId` deep-link to `/spaces?space=&item=`. Campaign Overview shows a Docs list. Backfilled Nate's two Impact docs into Impact Space.

Why: Team/campaign chat saved only `conversation_documents`, so Impact Space Docs stayed empty and DOCUMENT cards couldn't open Space Docs. Root cause was dual-write gated solely on explicit `space_id`.

Impact: New agent saves from campaign chat appear in Space Docs without refresh once realtime is connected; card clicks open the space doc when dual-write succeeds; Impact already shows the two strategy docs after backfill.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-space-scope.ts`, `artifact-documents.service.ts`, `artifact-pdf.service.ts`, `artifact-docx.service.ts`, `ensure-space-view.ts`, `vibey-api-action-docs.ts`, `apps/web/src/features/studio/components/chat/DocumentCard.tsx`, `CampaignOverviewTab.tsx`, `CampaignOverviewDocsSection.tsx`, `artifact-space-scope.resolve-document-space.test.ts`
## [2026-07-15 09:34] - [FIX]

What: Switched ROAS OpenClaw `web_search` provider from Perplexity/OpenRouter to Brave, and corrected hireable agent TOOLS.md so it no longer claims `web_search`/`web_fetch` are disabled.
Why: Nate’s red search failed with OpenRouter `401 User not found` (treated as capability unavailable). Brave Search works with the live `BRAVE_API_KEY`. Misleading TOOLS.md also biased the agent to say web search isn’t available.
Impact: Live `roas-runtimes` now uses Brave for `web_search`; Strategist (Nate) TOOLS.md guidance allows web research. Re-run competitor research in a new turn to confirm green search chips.
Files: docker/openclaw.json, docker/agents/templates/strategist/TOOLS.md, docker/agents/templates/shared/TOOLS.md, docker/agents/templates/{designer,copywriter,media_producer,brand_manager}/TOOLS.md, agent_definitions TOOLS.md (nate)


## [2026-07-15 09:47] - [FEATURE]

What: Added CEO HQ and Meetings space templates for personal-account command center + Fathom meeting library (draft-only Slack/email prompts, morning/EOD schedules, meeting log automation).
Why: Build the agency-CEO personal operating system as space templates instead of freeloaded campaigns, without inventing a new campaign type.
Impact: After migration, users can instantiate CEO HQ and Meetings from Space Templates on personal account; flows install as drafts until Slack/Fathom are connected and published.
Files: apps/api/src/modules/space-templates/data/space-template-catalog-ceo.ts, space-template-catalog.ts, space-template-catalog.test.ts, apps/web/src/features/spaces/components/templates/space-template-nav.ts, supabase/migrations/20260715165000_seed_ceo_hq_meetings_space_templates.sql, documentation/features/space-templates.md

## [2026-07-15 09:55] - [FEATURE]

What: Seeded CEO HQ + Meetings templates on Vibey production and ROAS production; instantiated private personal spaces + draft automations for Dylan and Nick.
Why: User approved applying the migration / seed with full DB access so the templates are live and usable without waiting for a full migration push.
Impact: Templates visible in Space Templates catalog; Dylan and Nick each have personal CEO HQ and Meetings under General with seeded docs/tasks and draft flows (not enabled until Slack/Fathom publish).
Files: live DB seed (space_templates/items/automations), personal spaces for dylan + nick

## [2026-07-15 10:08] - [FIX]

What: Removed CEO HQ / Meetings spaces and templates from Vibey production; left catalog seed only on ROAS production.
Why: ROAS is the target app/DB; Vibey production should not receive these personal spaces or templates.
Impact: Vibey cleaned (0 matching spaces/templates). ROAS still has ceo-hq + meetings templates; no personal instantiate yet (ROAS currently only has test@gmail.com).
Files: live ROAS DB (templates kept), Vibey DB (spaces + templates removed)

## [2026-07-15 10:09] - [FEATURE]

What: Instantiated personal CEO HQ + Meetings spaces for ROAS account test@gmail.com (General campaign, seed items, draft automations).
Why: User confirmed test@gmail.com is their ROAS account; spaces belong only on ROAS, not Vibey.
Impact: test@gmail.com can open CEO HQ and Meetings in personal scope; flows remain draft until Slack/Fathom publish.
Files: live ROAS DB spaces/items/automations/channels

## [2026-07-15 11:50] - [FIX]

What: Published Meetings Fathom Meeting Log for test@gmail.com with recorded_by_contains dylan@dylanvanas.com; set profile fathom_aliases; activated external trigger route.
Why: Team Fathom connection can receive all team recordings; filter keeps Meetings focused on Dylan’s hosted calls only.
Impact: New Fathom recordings recorded by dylan@dylanvanas.com should create meeting rows + log docs in Meetings; other teammates’ calls are ignored by this flow.
Files: live ROAS DB (profiles.fathom_aliases, space_automations, space_external_automation_triggers)

## [2026-07-15 11:52] - [FEATURE]

What: Backfilled last 10 Fathom meetings recorded by dylan@dylanvanas.com into ROAS test account Meetings space (light rows: title, notes, link, status logged).
Why: User requested a small personal backfill after connecting team Fathom with self filter.
Impact: Meetings space shows 10 recent Dylan-hosted calls; future calls still come from published Fathom Meeting Log flow.
Files: live ROAS DB space_items on Meetings space d957d348-c30a-4dbb-a089-ba3092332543

## [2026-07-15 11:58] - [FEATURE]

What: Meetings list now shows Call Date (renamed due_date) + editable Attendees text column; backfilled Fathom invitees onto the 10 ROAS test meetings; updated live schema, flow, and meetings template.
Why: Assignments only support app users/agents (cannot invent external attendees); Contact fields are single-person. Plain-text Attendees matches Fathom’s multi-person list and stays editable.
Impact: All Meetings view columns = Name, Attendees, Call Date, Priority, Status. Refresh Meetings to see Call Date + Attendees populated.
Files: apps/api/src/modules/space-templates/data/space-template-catalog-ceo.ts, live ROAS Meetings space/schema/items/automation, documentation/features/space-templates.md (pending if needed)

## [2026-07-15 12:05] - [FEATURE]

What: Meetings Attendees → multi_select tags; added Recording URL column; Impromptu meetings renamed from Fathom summary; future Fathom flow agent renames generic titles + sets recording_url.
Why: Plain-text attendees truncated oddly; recording link missing; Fathom often titles solo calls “Impromptu Zoom Meeting”.
Impact: All Meetings shows Name / Attendee tags / Call Date / Recording / Priority. Refresh Meetings to see tags, links, and better titles. Future imports auto-rename via Vibey on the Fathom Meeting Log flow.
Files: space-template-catalog-ceo.ts, live ROAS Meetings space/items/automation, documentation/features/space-templates.md

## [2026-07-15 13:11] - [FIX]

What: Fathom Meeting Log no longer creates a duplicate task; it processes the existing Fathom synthetic item (status Processing → Logged). Synthetic create now fills Recording URL, Call Date, and Attendee tags — and when Fathom lists only the host, attendees come from transcript speakers (or title hints like "Carol <> Dylan"). Live ROAS Meetings reprocessed: Status column first, incomplete Impromptu rows enriched/deduped, Dylan-only tags corrected where speakers existed.
Why: Webhook created a blank item then create_task made a second incomplete row (todo/in_progress — not Meetings statuses), so new calls looked unlogged. Host-only invitee lists are a Fathom bug and were skipping real attendees + action-item review.
Impact: Refresh Meetings → Status shows Logged/Processing; new imports enrich the one row; Dylan-only rows get speakers when Fathom diarizes them.
Files: space-template-catalog-ceo.ts, fathom-meeting-item-enrichment.ts, space-automation-service-06/19.base.ts, live ROAS Meetings space/items/automation, tests


## [2026-07-15 13:33] - [FIX]

What: Meetings Attendees default column wider (360px) + live column_widths; Call Date uses date display (no overdue urgency colors unless relative deadlines); Meeting statuses relabeled to Processing → To action → Following up → Waiting → Done; Fathom flow ends on Following up after action suggestions; Dylan host tag recolored off rose/red.
Why: Attendee tags collapsed to +N; past Call Dates looked overdue; Status was "logged" and didn’t map to the action-item follow-through goal.
Impact: Refresh Meetings — Status first, wider Attendees, Call Date looks like a date, statuses drive Processing→Done. Existing rows stay To action until you move them.
Files: DueDateCell.tsx, DraggableColumnHeaders.tsx, space-template-catalog-ceo.ts, live ROAS Meetings schema/automation, tests

## [2026-07-15 14:58] - [FEATURE]

What: Meetings space now splits **calls** vs **follow-up action items** via `entry_type` + view `field_value_filters`. All Meetings = calls only; Follow-ups board + Action items list = follow-ups only. Fathom create tags `entry_type=call` and upserts People from invitee emails; `agent_suggest_tasks` creates `entry_type=follow_up` To-action rows. Live ROAS Meetings backfilled: 12 call logs, 46 Fathom action-item follow-ups, 11 campaign People contacts, schema/views/welcome updated.
Why: Follow-ups was showing the same call rows as All Meetings; Meeting Logs and People looked empty because the space only had call rows + starter docs, not action items or CRM contacts.
Impact: Hard-refresh Meetings — All Meetings = calls; Follow-ups / Action items = to-dos; Meeting Logs has per-call docs; People has invitees with emails. New imports need an `api` deploy for auto call tagging + People upsert + follow-up typing.
Files: space-template-catalog-ceo.ts, apply-space-toolbar-filters.ts, space-schema.ts, fathom-meeting-item-enrichment.ts, fathom-meeting-people-upsert.ts, space-automation-service-06/13.base.ts, ContactsView.tsx, live ROAS Meetings + contacts, tests

## [2026-07-15 15:06] - [FIX]

What: Split Meetings **Call Date** (`call_date`) from action-item **Due Date** (`due_date`); All Meetings shows Call Date only; Action items / Follow-ups show Due Date. Migrated live call rows off `due_date` onto `call_date`. Hardened Action items `entry_type` matching so Fathom/`Meeting:` rows never count as follow-ups.
Why: One shared Date column mixed call times into Action items; Action items tab was still showing call rows when the client did not treat them as `entry_type=call` cleanly.
Impact: Hard-refresh Meetings — Action items should be tasks only; All Meetings has Call Date; Due Date is for follow-ups. Needs web build with `field_value_filters` support to hide calls from Action items.
Files: space-template-catalog-ceo.ts, space-automation-service-06.base.ts, apply-space-toolbar-filters.ts, live ROAS Meetings schema/items, tests

## [2026-07-15 15:08] - [FIX]

What: Kanban Follow-ups columns scroll vertically again — card list is `min-h-0 overflow-y-auto`, board/columns height-constrained, router wraps board in `min-h-0 flex-1`.
Why: Flex default `min-height: auto` let tall columns grow to content; parent `overflow-hidden` clipped cards with no scroll.
Impact: Refresh Follow-ups — To Action (and other columns) scroll inside the column to reach all tasks.
Files: KanbanView.tsx, SpaceContentRouter.tsx

## [2026-07-15 15:12] - [FIX]

What: All Meetings only shows calls — view-id fallback filters (`all-meetings` → `entry_type=call`), stop treating unknown rows as calls, and preserve `field_value_filters` when customize-saving column widths.
Why: Action items were appearing on All Meetings when filters were missing from the loaded/saved view schema.
Impact: Hard-refresh All Meetings — only Fathom/call rows; tasks stay on Follow-ups / Action items.
Files: apply-space-toolbar-filters.ts, use-view-patch-flush.ts, tests, live ROAS Meetings schema

## [2026-07-15 15:25] - [FEATURE]

What: Follow-ups / Action items show a clickable **Source call** column (opens the parent meeting). New Fathom suggestions denormalize `source_call` + `source_call_item_id`; live ROAS backfilled 46 follow-ups.
Why: CEO/agency triage needs every action item to answer “which call did this come from?” without hunting the board.
Impact: Hard-refresh Follow-ups or Action items — Source call sits next to the task name; click opens that meeting.
Files: SourceCallCell.tsx, source-call.ts, SpaceCell/SpaceItemRow/KanbanView, space-template-catalog-ceo.ts, space-automation-service-13.base.ts, live ROAS Meetings, tests

## [2026-07-15 16:15] - [FEATURE]

What: CEO Follow-ups now enrich **Due Date**, **Priority**, and internal **Assignee** hints from Fathom action items (match by title; parse dates from text when Fathom omits deadline; raise priority from urgency language). Assigns humans only when the email is `@roas.co` / `@dylanvanas.com` and resolves to space owner / org member; otherwise stores `suggested_assignee_*` only. Live ROAS: 12 due dates, priorities split (urgent/high vs medium), 23 suggested assignees.
Why: Follow-ups were unusable for triage — everything Medium, no due dates, no owner signal.
Impact: Hard-refresh Follow-ups — some rows have Due Date + Urgent; Assignee column fills only when profile resolves (personal ROAS `test@gmail.com` usually won’t auto-assign Dylan/Bryce). Deploy API/agent-api for new imports on next Fathom webhook.
Files: fathom-follow-up-enrichment.ts, space-automation-service-13.base.ts, task-agent-suggestions.service.ts, space-template-catalog-ceo.ts, tests, live ROAS Meetings items


## [2026-07-15 16:20] - [FIX]

What: Verified Meetings Fathom live ingest for Dylan — last 7 days (10 calls) already in space; re-synced active `space_external_automation_triggers` route (`recorded_by_contains=dylan@dylanvanas.com`, source=self). Confirmed webhook events processed today (`164143851`, `164183304`).
Why: User asked to pull today’s/recent calls and ensure continuous pull is running.
Impact: No missing last-7d rows to add; future Dylan recordings should keep landing via Fathom webhook → ROAS API → Meetings automation. Older history (~36 calls before Jul 8) still not in space unless backfilled.
Files: live ROAS `space_external_automation_triggers`, Meetings space items (verify only)

## [2026-07-15 16:50] - [FIX]

What: Meetings naming — drop `Meeting:`/`Fathom meeting:` prefixes; always AI-suggest a purpose-first CEO title on new Fathom ingest (`/api/agents/suggest-meeting-title`); send_to_agent prompt now requires rename every time (not only Impromptu). Live ROAS calls re-titled (e.g. Stripe → Weekly client update; Jason → Sales call).
Why: Titles were coming from Fathom calendar scare-headings / summary section titles, plus a redundant Meeting: prefix.
Impact: Hard-refresh Meetings — clearer purpose names, no Meeting: prefix. Future auto-rename needs API + agent-api deploy for the new suggest-meeting-title route.
Files: fathom-meeting-title.ts, space-automation-service-06.base.ts, task-agent-suggestions.service.ts, agents-automation.controller.ts, space-template-catalog-ceo.ts, live ROAS Meetings items, tests
