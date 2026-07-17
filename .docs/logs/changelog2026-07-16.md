# Changelog - July 16, 2026

## [2026-07-16 16:10] - [ARCH]

What: Production sync — committed/pushed local `main` (`7e896094` + retrigger `9656d977`), applied 17 pending Supabase migrations on ROAS prod, redeployed Fly `roas-runtimes` (health ok, sync 66/66).
Why: Bring production DB + agent runtime current with the large local working tree (Page Grader send, Slack search fallback, integrations, etc.).
Impact: DB + Fly are live. Vercel `roas-web`/`roas-api`/`roas-funnels` still on older SHAs — GitHub is partially degraded so create-deployment/webhooks hang; retry Vercel when GitHub recovers (our tip already includes the `onExpandMyTasks` web TS fix). Railway workers not manually redeployed (no CLI token path). Page Grader edge is a separate repo.
Files: `supabase/migrations/20260714*`–`20260716*`, `scripts/roas/deploy-fly-runtimes.sh`, git `main`

## [2026-07-16 15:45] - [FIX]

What: Meeting detail CTA says Vibey (not DiBi). Prep agenda status reconciles `task_execution_status` so failed agent runs show Prep failed; task-agent writes `prep_status` on done/failed and retries OpenClaw session-lock timeouts.
Why: Nate check-in prep sat on “pending” after a Fly session-store lock timeout; UI never flipped to failed/retry. CTA used DiBi branding.
Impact: Hard-refresh after deploy. Retry prep on failed chips. Live prep re-invoked for Nate item.
Files: `HomeMeetingDetailHost.tsx`, `ask-meeting-in-chat.ts`, `meetings-precall-prep.helpers.ts` (+test), `space-items.repository.ts`, `task-agent.repository.ts`, `task-agent.service.ts`

## [2026-07-16 15:23] - [FEATURE]

What: Home Agenda meeting workspace slice — single-event prep API, reliable Prep chip (open / retry), meeting detail dialog (who / where / prep / related call tasks), DiBi chat seed, calendar `location` + related-call enrichment, Meetings template **Agenda** calendar view with Google/Outlook sources.
Why: Prep pending opened a half-broken task modal; users need a real meeting surface that ties calendar → prep → Fathom call/follow-ups → agent chat.
Impact: Deploy `roas-api` + `roas-web`. Hard-refresh Home → expand a meeting → **Open meeting** / Prep. Existing Meetings spaces need Agenda view backfill (logged).
Files: `space-precall-prep.controller.ts`, `meetings-precall-prep.service.ts` (+helpers/tests), `integrations-calendar.service.ts`, `calendar-api.ts`, `HomeMeetingDetailHost.tsx`, `AgendaCard*.tsx`, `use-agenda-prep-actions.ts`, `ask-meeting-in-chat.ts`, `home-dashboard-content.tsx`, `HomeTaskDetailHost.tsx`, `space-template-catalog-ceo.ts`

## [2026-07-16 14:46] - [FIX]

What: Shipped missing `@vibey/api-shared` `sanitizeFathomSummaryMarkdown` source + barrel export so `roas-api` Nest builds succeed again.
Why: Prep today kept toasting "Could not start pre-call prep" because production API deploys failed (`TS2305` — export not on main) and the prep route never went live.
Impact: Redeploy `roas-api`; then retry **Prep today** on Home Agenda.
Files: `packages/api-shared/src/utils/sanitize-fathom-summary-markdown.ts` (+test), `sanitize-fathom-summary-markdown.ts` barrel, `index.ts`, `package.json`, matching `dist/`

## [2026-07-16 14:40] - [FIX]

What: Page Grader `/launcher?task=<id>` now opens the task detail dialog (was ignored — Launcher hub only). `roas-api` `work.url` always returns the Portal deep-link (ClickUp on `clickup_task_*`).
Why: ROAS “Open in Page Grader” landed on the request tiles page with no task open.
Impact: After Portal frontend + `roas-api` redeploy, `https://portal.roas.io/launcher?task=9925e4af-…` opens that workload task.
Files: page-grader `useLauncherTaskDeepLink.ts`, `Launcher.tsx`, `useUnifiedTasks.ts`, `roas-api/index.ts`

## [2026-07-16 14:37] - [FIX]

What: Exported missing `peekCachedFetch` from `keyed-fetch-cache` so production `roas-web` builds again.
Why: AgendaCard on main imported it, but the helper never shipped — Vercel failed TypeScript compile.
Impact: Unblocks `roas-web` Production deploy (deadline UI + Page Grader activity link).
Files: `apps/web/src/lib/cache/keyed-fetch-cache.ts`

## [2026-07-16 14:34] - [ARCH]

What: Confirmed Page Grader production deploy of `roas-api` + `clickup-push-workload-task` via Lovable. Stuck Impact Elite slides task now has ClickUp `868kd91q6`; new `/work` returns `clickup_task_id` on 201; idempotent re-hit returns same ClickUp URL.
Why: Close the ClickUp gap for ROAS → Portal creates.
Impact: Launcher should no longer show that task as Not in ClickUp; future ROAS sends push ClickUp after create.
Files: Page Grader edge functions `roas-api`, `clickup-push-workload-task` (live)

## [2026-07-16 14:20] - [FIX]

What: Diagnosed Prep today 404 (`Cannot POST …/precall-prep/today`) — route existed locally but not on `api.roas.io`. Backfilled ROAS Meetings space schema (`prep` entry type, `calendar_event_id`, `prep_status`, Prep view). Redeploying `roas-api` with the prep controller.

Why: Clicking Prep today failed with a sanitized toast; production Nest had no prep route, and live Meetings schema lacked prep fields.

Impact: Retry **Prep today** on Home Agenda — route is live (401 without auth vs previous 404). Meetings space has Prep schema. Deploy `roas-rnl92iliz` → `api.roas.io`.

Files: live `spaces` row `d957d348-…`, `space-precall-prep.controller.ts`, `meetings-precall-prep.service.ts`, Vercel `roas-api` redeploy

## [2026-07-16 14:17] - [FIX]

What: Pushed mission-worker stuck-loop fixes (`07e1d5d2`) and redeployed Railway `mission-worker` + `queue-worker` to SUCCESS.

Why: Claim/abort/awareness fixes were local-only until git deploy.

Impact: Blocked Pre-call retries can claim again; duplicate runs abort cleanly; awareness scheduler no longer crashes on missing column (column already live).

Files: Railway `roas-workers` mission-worker + queue-worker; commit `07e1d5d2`

## [2026-07-16 14:15] - [FIX]

What: Unstuck Webinar Fulfillment Pre-call runs (manual manager retry). Root fixes: execute claim now accepts `blocked` (was only pending/revision → silent skip), abort-registry aborts prior run on re-register, humanize `terminated`, soft-fail + migration for missing `profiles.awareness_loop_enabled`. Applied column on live DB. Fly runtime was healthy again after 502/503 storm.

Why: Missions looked “in progress” but Pre-call sat blocked after runtime drops; retries/triage could enqueue execute while status stayed blocked so claim no-oped; scheduler also crashed on missing awareness column.

Impact: Latest mission Pre-call requeued to in_progress. Needs mission-worker deploy for durable claim/abort fixes. Prefer the newest Webinar Fulfillment mission.

Files: `mission-execute-phase.service.ts`, `subtask-abort-registry.service.ts`, `mission-error-messages.ts`, `agent-pattern-evaluator.service.ts`, `20260716214500_profiles_awareness_loop_enabled.sql`

## [2026-07-16 14:11] - [FEATURE]

What: Mission Activity composer is Vibey again (`Message Vibey...`). Clicking a subtask opens a full Subtask detail modal (live run stream, intent, output, step activity) with its own “tell Vibey about this step” composer that posts a scoped mission comment into the existing Vibey directive pipeline.

Why: “Steer Atlas / restarts step” reframed the mission composer incorrectly — users expect mission Activity to hit Vibey like before, and each subtask to have an extensive window.

Impact: After web deploy — Activity = Vibey; click any subtask → detail modal + scoped Vibey guidance.

Files: `SubtaskDetailModal.tsx`, `SubtasksSection.tsx`, `MissionDetailOverlayModals.tsx`, `MissionDetailModalView.tsx`, `MissionDetailModal.tsx`, `ActivityTimelineComposer.tsx`; removed `SubtaskExpandedPanel.tsx`

## [2026-07-16 14:00] - [FEATURE]

What: Pre-call prep for Meetings — morning schedule action `meetings_precall_prep` + manual **Prep today** on Home Agenda. Creates/refreshes Prep items keyed by `calendar_event_id`, invokes Vibey for a prep document, and surfaces Prep chips on agenda events (opens the Meetings prep item).
Why: Complete the CEO meeting loop: prep before the call (Agenda) + Fathom log after.
Impact: After deploy, enable **Morning Pre-call Prep** on Meetings (or use Prep today). Existing Meetings spaces need schema/automation backfill (entry_type prep, calendar_event_id, prep_status, Prep view).
Files: `space-template-catalog-ceo.ts`, `meetings-precall-prep.*`, `space-precall-prep.controller.ts`, `space-automation-*.ts`, `integrations-calendar.service.ts`, `AgendaCard*.tsx`, `calendar-api.ts`, `space-schema.ts`, `automation-catalog.ts`, `automation-publishable.ts`

## [2026-07-16 13:54] - [FEATURE]

What: Mission subtasks show the live agent stream on expand (auto-opens the in-progress row). “Locked in” stays open while the run is live instead of collapsing between tools. Activity composer explains that mid-run guidance restarts the working agent’s step; comment-directive `retry_subtask`/`edit_subtask` now abort in-progress runs so guidance actually applies.

Why: Users saw Working/Atlas but no usable stream, and Send a message never steered the live turn.

Impact: Open the mission → Pre-call (or any working) subtask expands with Live run tools/thinking. Send guidance to restart that step with the new note. Needs web + mission-worker deploy.

Files: `SubtaskExpandedPanel.tsx`, `SubtasksSection.tsx`, `MissionLockedIn.tsx`, `useMissionExecStream.ts`, `ActivityTimeline*.tsx`, `MissionDetailModalView.tsx`, `mission-comment-directive.service.ts`, `mission-openclaw.gateway.ts`

## [2026-07-16 13:53] - [FIX]

What: Page Grader send now (1) pushes ClickUp after Portal create via `clickup-push-workload-task`, (2) accepts a Deadline on the send panel and writes it to Page Grader `due_date` + ROAS `due_date`, (3) appends operator notes onto the ROAS Space task. Re-send of already-linked items retries ClickUp. Activity “Open in Page Grader” link still ships with web.
Why: ROAS-created workload rows never called ClickUp push (stuck “Not in ClickUp”); send UI had no deadline and notes/due weren’t written back to ROAS.
Impact: After Page Grader `roas-api` redeploy + ROAS api/web deploy: new sends sync to ClickUp; deadline/note on send update both sides. Slack launch posts still only on typed Portal service-request path (same as Quick Add).
Files: `page-grader/.../roas-api/index.ts`, `clickup-push-workload-task/index.ts`, `page-grader-api.service.ts`, `page-grader.dto.ts`, `PageGraderBulkSendPanel.tsx`, `BulkActionBar.tsx`, `page-grader-send.service.ts`, `page-grader-send-preview.ts`, activity format files

## [2026-07-16 13:44] - [FIX]

What: Task Activity now labels Page Grader sync as “sent this to Page Grader” and shows a clickable **Open in Page Grader** link from `custom_data.page_grader.work_url` (fixes the generic “You updated Page Grader” row).
Why: After bulk send, users need confirmation in Activity plus a one-click jump to the Portal work item.
Impact: Existing send activity rows pick this up after `roas-web` deploy (no re-send). New sends keep writing the same payload.
Files: `page-grader-activity.ts`, `page-grader-activity.test.ts`, `task-activity-format.ts`, `TaskActivityTimeline.tsx`

## [2026-07-16 13:36] - [FIX]

What: Set `AGENT_RUNTIME_MODE=shared` on Railway `mission-worker` and `queue-worker` (project `roas-workers`) via GraphQL `variableUpsert` with `Project-Access-Token`, then redeployed both. Latest deployments SUCCESS (`bf4e6b83…` mission, `9e13cc98…` queue).

Why: Workers were resolving bare personal gateway agent IDs; shared Railway runtime needs scoped `user-{userId}-{agentKey}` IDs. Bearer auth fails for project tokens — use `Project-Access-Token` header.

Impact: Live workers pick up shared runtime mode. Retry blocked Pre-call / mission subtasks if they still show the old 404 class of failure.

Files: Railway env (mission-worker, queue-worker); ops note for `RAILWAY_TOKEN` auth header

## [2026-07-16 13:32] - [FEATURE]

What: Home Agenda loads all connected Google Calendar accounts (merged), parallelizes per-calendar Composio fetches, caches/SWR day–week–month switches, adds Ask Vibey on the Agenda header, and lets personal multi-account connections set a default (star) for sending invites.

Why: Second Calendar account was invisible in Agenda (single-connection resolve); range switches refetched the slow sequential Google path; users need a default work calendar for invites and a fast ask-Vibey path.

Impact: Hard-refresh Home — both calendars’ events appear (with account labels when multiple). Star your work account in Integrations for invites. Day/Week within a cached month should feel instant. API live on `api.roas.io` (`roas-5v8ca4frr`); web UI (Ask Vibey / cache) needs local refresh or web deploy.

Files: `integrations-calendar.service.ts`, `integrations-calendar-google-agenda.ts`, `integrations-calendar-connections.ts`, `integrations-core.service.ts`, AgendaCard + cache helpers, `ConnectedIntegrationCard.tsx`, `integration-connections.md`

## [2026-07-16 13:14] - [FIX]

What: Personal Composio overview sync now matches/updates/labels each connected-account id separately (no one-row-per-integration upsert), reclaims stomped duplicate rows, and re-resolves colliding connection labels.

Why: Add another Google Calendar account created a second row but both UI lines showed the same email — sync stomped metadata onto the latest personal row and reused the first account’s label.

Impact: Hard-refresh Integrations — two Calendar accounts should show distinct emails. Deployed to `api.roas.io` (`roas-228i2y2kb`).

Files: `integrations-overview.service.ts`, `integrations-overview-personal-composio-sync.ts`, `integrations-overview-composio-row.ts`, overview tests, `integration-connections.md`

## [2026-07-16 13:10] - [FIX]

What: Deployed `force_new` Composio connect to production `api.roas.io` so Add another account skips reuse and opens a new OAuth link. Also fixed blocking Nest TS errors (Page Grader filter, calendar agenda push, mission log agent_key).

Why: Local web already sent `force_new`, but production API always reused the existing Google Calendar connection → client error toast with no OAuth window.

Impact: Retry **+ Add another account** on Google Calendar — should open Google/Composio authorize. Hard refresh if needed.

Files: `integrations-composio.service.ts`, `integrations-core.service.ts`, `composio.service.ts`, page-grader/calendar/mission TS fixes; Vercel `roas-api` → `api.roas.io`

## [2026-07-16 13:10] - [FIX]

What: Restored OpenClaw `/v1/responses` by removing invalid `whatsapp` from live config + `docker/openclaw.json` (reintroduced Jul 12; machine restart reverts to image). Fixed shared-mode agent `/register`. Mission-worker now scopes personal gateway IDs when `profiles.agent_runtime_type=shared_railway` even without `AGENT_RUNTIME_MODE`. Added `AGENT_RUNTIME_MODE=shared` to Railway paste block. Fly image redeploy started.

Why: Mission execute hit `Agent gateway error (404): Not Found` — invalid OpenClaw plugin config disables `/v1/responses`. Worker also called bare `nate` while ensure-ready repaired `user-…-nate`.

Impact: Live responses restored after config strip + gateway restart. Durable after Fly redeploy finishes. Railway `AGENT_RUNTIME_MODE=shared` is now set and workers redeployed (see 13:36 entry).

Files: `docker/openclaw.json`, `agent-sync.controller.ts`, `agent-runtime.service.ts` (mission-worker), tests, `scripts/roas/roas-secrets.env(.template)`

## [2026-07-16 12:46] - [FIX]

What: Media API OpenRouter GPT Image calls now send `modalities: ["image","text"]` + `image_config` (matching the agent path), parse `message.images`, and abort after 120s. Client generate/edit streams also abort at 120s so UI can’t stick on “Creating your image…”.
Why: Direct media generate for ChatGPT omitted OpenRouter image modalities, so the stream could hang for minutes with no image returned.
Impact: GPT Image generation should complete or fail fast with a timeout; hard-refresh Media to pick up the chat-routed composer (no under-bar status).
Files: `gemini-image.integration.ts`, `use-media-image-generation.ts`, `MediaGenerateComposer.tsx`

## [2026-07-16 12:43] - [FEATURE]

What: Media composer uses the home chat widget shell (centered); always defaults to ChatGPT (`gpt-5.4-image-2`); submit opens the chat sidebar via `seedComposer` so image creation runs in chat. Phase 2 image workspace: history rail, aspect-ratio regen, download, Open in chat, describe-edits bar.
Why: Nano Banana was still showing from stale API defaults; status text under the bar wasn’t the product UX; deep view was preview-only.
Impact: Generate/edit flows pull out global chat; deep media is an editable workspace. Canva handoff and pin-comments still deferred.
Files: `MediaGenerateComposer.tsx`, `use-media-image-generation.ts`, `MediaImageWorkspace.tsx`, `MediaDeepView.tsx`, `SpaceMediaView.tsx`, `media/dto/index.ts`, `image-models.ts`

## [2026-07-16 12:39] - [FIX]

What: Library shows the same connected accounts + “Add another account” as Manage (not trash-only). Stopped false green success toasts when adding another Google Calendar account while already connected; hardened `force_new` Composio connect with alias + unit test.

Why: Library/Manage mismatched once connected; status polling treated the existing Calendar connection as OAuth success, stacking green toasts behind the force_new error.

Impact: Connected providers look the same in Library and Manage. Add another account no longer fires fake success toasts; OAuth should open for a second account (needs `roas-api` deploy for alias/`force_new` hardening).

Files: `IntegrationAccountsGroup.tsx`, `IntegrationsLibrary.tsx`, `IntegrationsManage.tsx`, `IntegrationsView.tsx`, `IntegrationsContainer.tsx`, `integrations-composio.service.ts`, `composio.service.ts`, composio accounts test, `integration-connections.md`

## [2026-07-16 12:34] - [FEATURE]

What: Space Media now has a ChatGPT-style generate composer at the top (attach reference, prompt, model, aspect ratio, send) with the gallery below; default image model is GPT Image 2 (`gpt-5.4-image-2`). Toolbar Generate dropdown replaced with Upload (generation lives in-page).
Why: Make Media a functional create surface instead of an empty gallery that only opened a modal.
Impact: Users generate/edit-from-reference images in Space Media without a modal; Nano Banana remains selectable. Next: image workspace (history/edit bar/Canva), chat + Generate, localized comments.
Files: `MediaGenerateComposer.tsx`, `use-media-image-generation.ts`, `SpaceMediaView.tsx`, `SpaceMediaToolbar.tsx`, `image-models.ts`, `media-image-generation.controller.ts`, `media-image-stream.controller.ts`, `dto/index.ts`, `artifact-legacy-media-provider.service.ts`

## [2026-07-16 12:28] - [FIX]

What: Webinar human gates now apply on personal missions (not only org). Mission subtask hover/expand shows the real blocked detail (`_internal_error` / mission progress notes) instead of only the soft “small issue” line; execute failures store technical detail + Activity log. Live mission got Gate 1/2/3 + backfilled 404 detail.
Why: Personal playbooks skipped human gates; gateway 404 was humanized away so the UI couldn’t explain the block.
Impact: Personal webinar runs include Your-turn gates; hover shows agent runtime 404 detail. Root cause remains agent gateway 404 (needs runtime fix).
Files: `webinar-fulfillment.playbook.ts`, `mission-execute-phase.service.ts`, `mission-error-messages.ts`, `SubtasksSection.tsx`, `detail-helpers.tsx`, `MissionDetailModalView.tsx`

## [2026-07-16 12:22] - [FIX]

What: Completed Dylan’s Page Grader `user_integrations` row after a partial connect (vault secrets saved, FK insert failed).
Why: Connect stored API URL/key before catalog seed, so Manage could look half-connected while the row was missing.
Impact: Page Grader shows connected in Manage; Send to Page Grader can list clients.
Files: ROAS DB `user_integrations` for `page_grader`

## [2026-07-16 12:21] - [FIX]

What: Seeded `integrations_available.page_grader` on ROAS and call `ensureAvailable` before `user_integrations` upsert on connect. Send panel shows Connect CTA when not connected.
Why: Connect hit FK `user_integrations_integration_id_fkey` because catalog row was missing and ensure ran after insert.
Impact: Retry Page Grader Connect in Settings (API Base URL + API key) should succeed now; then Send to Page Grader can list clients.
Files: `20260716203000_seed_page_grader_integrations_available.sql`, `page-grader-api.service.ts`, `PageGraderBulkSendPanel.tsx`

## [2026-07-16 12:13] - [FIX]

What: Renamed `use-update-item-with-subtask-complete-confirm.ts` → `.tsx` so Turbopack can parse the JSX dialog return.
Why: Hook returns `<CompleteSubtasksConfirmDialog />` inside a `.ts` file → “Expected '>', got 'ident'” build error on Home.
Impact: Local Home compile unblocks for SpaceStatusCascadeConfirmProvider.
Files: `use-update-item-with-subtask-complete-confirm.tsx`

## [2026-07-16 12:12] - [FIX]

What: Mission detail Activity no longer crushes “Executing subtask” into vertical letter stacking (agent chip moves above the message; chips use short first name). Subtask rows show status + relative timestamp + feedback preview; mark-complete requires confirm. Subtask status/reassign now writes Activity logs.
Why: Long Name · Role labels sat `shrink-0` beside the note in a narrow column; circle toggle marked done with no confirm; status changes never logged to Activity.
Impact: Activity stays readable; accidental completes need confirmation; Activity shows subtask status updates after API deploy.
Files: `ActivityTimelineLogItem.tsx`, `SubtasksSection.tsx`, `detail-helpers.tsx`, `ConfirmDialog.tsx`, `mission-lifecycle.service.ts`, `missions-repository-plans.base.ts`

## [2026-07-16 12:10] - [FIX]

What: Restore local Next.js by adding a root `@vibey/api-shared/sanitize-fathom-summary-markdown` re-export so web tsconfig paths no longer fall through to the Nest/`pg` barrel from client `TaskDescription`.
Why: Import resolved via `@vibey/api-shared/*` → `src/sanitize-fathom-summary-markdown` (missing); Turbopack pulled `api-shared` index into the browser and crashed on `tls` / Express.
Impact: Local `pnpm dev:app` serves again; Home task detail no longer bundles Node-only modules.
Files: `packages/api-shared/src/sanitize-fathom-summary-markdown.ts`, `packages/api-shared/package.json`, `apps/web/vitest.config.ts`

## [2026-07-16 12:08] - [FIX]

What: My tasks expand control is now a Maximize icon in the card header (upper right). Opening a task from the expand panel closes the panel first so it no longer stacks under the task detail modal.
Why: Count-as-expand was unclear; panel stayed open under the task popup.
Impact: Expand is obvious in the header; task detail opens cleanly alone.
Files: `MyTasksCard.tsx`, `MyTasksPanel.tsx`

## [2026-07-16 12:05] - [FEATURE]

What: Auto-provision Webinar Fulfillment team (strategist/copywriter/designer/ads_manager) on playbook plan + Agency Client (Webinar) space template; hireable `ads_manager` employee template; playbook `pickAgent` resolves name-derived keys (nate/ivy/lux/blaze); Name · Role display renames. Live-hired Ivy/Lux/Blaze for Dylan’s Impact campaign, renamed Nate→Reed · Agency Strategist, remapped mission subtasks, resumed triage.
Why: Webinar playbook fell back to a single hired strategist because role-shaped keys were missing and ads_manager was not in the hire catalog; users should not manually hire the roster per Space.
Impact: New webinar Spaces/playbooks get the roster automatically after deploy. Current campaign already has Reed/Ivy/Lux/Blaze on the team with template skills seeded.
Files: `webinar-fulfillment-team.*`, `webinar-fulfillment-team.service.ts`, `internal-agents.controller.ts`, `mission-plan-phase.service.ts`, `webinar-fulfillment.helpers.ts`, `space-templates.service.ts`, `20260716200000_ads_manager_employee_template_and_reed_strategist.sql`

## [2026-07-16 11:59] - [FIX]

What: Stop false “connected” toast when Add another account reuses OAuth without a redirect; merge Slack status into the existing overview row (was showing 2 unlabeled Accounts); show Slack workspace name (`ROAS`), skip opaque UUID Codex labels, and backfill Slack `connection_label` from `metadata.team_name`. Reject Composio connect responses that omit an authorize URL.
Why: force_new against a reused/missing-redirect response was treated as synchronous success; Map-by-id loadData stopped collapsing Slack duplicates; Slack team name lived in metadata but never became the display label.
Impact: Add another account either opens Google OAuth or errors clearly. Manage shows one Slack row named ROAS after refresh. Hover actions unchanged (rename / scope / refresh / disconnect); social page pickers remain the only extra per-connection config on this surface.
Files: `useIntegrations.ts`, `ConnectedIntegrationCard.tsx`, `integrations-composio.service.ts`, `slack.repository.ts`, Slack label backfill SQL

## [2026-07-16 11:55] - [ARCH]

What: Confirmed production ship for Page Grader send + Slack org visibility + notification Ask in chat (`7664ebaa` on `main`). Vercel `roas-api` (`api.roas.io`) and `roas-web` (`app.roas.io`) Production Ready. Page Grader edge function `roas-api` is live at `https://mjaxhuehopzbsuhmseeg.supabase.co/functions/v1/roas-api` (returns auth 401, not 404). Local Supabase CLI (DVTEST org) cannot redeploy that project (403 privileges).
Why: User asked to commit + deploy ROAS api/web and the Page Grader function.
Impact: Connect Page Grader in Settings with base URL + API key (`ROAS_API_KEY` secret or `agent_api_keys` row), then bulk-send from Spaces. Future PG function deploys need a Supabase login that owns project `mjaxhuehopzbsuhmseeg`.
Files: Vercel Production `roas-api` / `roas-web`; Page Grader `supabase/functions/roas-api`

## [2026-07-16 11:54] - [FEATURE]

What: Home My tasks card now opens a polished full-panel of all assigned tasks (search, scope picker, Overdue/Today/Upcoming/No due date groups). Card stays a glance preview (15 rows) with “View all” / count expand.
Why: User wanted a simple Home glance that expands into a proper personal task list without building a dedicated Personal Tasks space yet.
Impact: From Home → My tasks → Open full list / count / empty-state CTA. Row click still opens the existing task detail host. Still powered by the Your-turn feed (no new Space).
Files: `MyTasksPanel.tsx`, `group-my-tasks-by-due.ts`, `group-my-tasks-by-due.test.ts`, `MyTasksCard.tsx`, `HomeCardRenderer.tsx`, `HomeCardsGrid.tsx`

## [2026-07-16 11:50] - [FEATURE]

What: Google Calendar multi-account + auto-label + multi-calendar agenda. Personal connections can add another Google account (`force_new`), connections label from `GOOGLECALENDAR_LIST_CALENDARS` email, agenda pulls up to 15 calendars (not only primary), `/settings` OAuth callback redirects to `/home`, and existing Calendar connection labeled `dylanvanas@gmail.com`.
Why: One Google OAuth account was capped by unique indexes + reuse short-circuit; identity used Gmail profile without Gmail scopes; agenda ignored secondary calendars; callback hit a 404 `/settings` route.
Impact: Manage shows "+ Add another account"; refresh should show the Gmail address as the connection name; home agenda includes events from other calendars in that Google account. Needs `roas-api` + `roas-web` deploy for full code path (DB migration + label backfill already live on ROAS).
Files: `integrations-identity-tools.ts`, `integrations-composio.service.ts`, `integrations-core.service.ts`, `integrations-calendar*.ts`, `integrations-composio-callback-url.ts`, `useIntegrations.ts`, `IntegrationsManage.tsx`, `IntegrationsView.tsx`, `settings/page.tsx`, `20260716190000_allow_multiple_personal_integration_connections.sql`

## [2026-07-16 11:50] - [FIX]

What: Redeployed Railway mission-worker + queue-worker and Vercel `roas-api`/`roas-web` (`6ac5af77`/`c463f69b`). Fixed plan save (`ad_artifact`/`funnel_artifact` enum). Removed broken Vercel `SUPABASE_DIRECT_DB_URL` that caused plan-create 503; confirmed plan save 201 and mission pending approval.

Why: Worker was not claiming outbox; playbook plans failed API validation then native-TX 503.

Impact: Dispatch LISTEN live; Webinar Fulfillment mission can be approved in UI. Local `RAILWAY_TOKEN` still Unauthorized for CLI-only.

Files: mission plan DTO/execute normalize, Vercel env, deploys

## [2026-07-16 11:48] - [FIX]

What: Seed missing `integrations_available` rows for Google Calendar, Google Sheets, HubSpot, Notion, and Salesforce.
Why: Composio connect got past auth-config creation, then failed FK `user_integrations_integration_id_fkey` because toolkit configs existed without catalog parents.
Impact: Google Calendar Connect can insert the pending `user_integrations` row and continue OAuth.
Files: `supabase/migrations/20260716184000_seed_missing_composio_integrations_available.sql`

## [2026-07-16 11:45] - [FIX]

What: Recreate ROAS Composio managed OAuth auth configs and update `project_composio_toolkit_config` IDs (Google Calendar/Drive/Sheets plus other Composio OAuth apps). Catch Composio initiate failures so connect returns a clear error instead of a raw 500.
Why: ROAS Composio project had zero auth configs; DB still pointed at Vibey leftover IDs, so Google Calendar Connect 404'd into "Internal server error".
Impact: Google Calendar Connect should open the OAuth popup again. Same fix covers Drive, Sheets, Outlook, HubSpot, Notion, GitHub, LinkedIn, Instagram, YouTube, Zoom, Salesforce, Airtable. ElevenLabs still needs API-key auth config separately.
Files: `supabase/migrations/20260716183000_roas_composio_google_auth_configs.sql`, `apps/api/src/modules/integrations/services/integrations-composio.service.ts`

## [2026-07-16 11:38] - [FEATURE]

What: Home dashboard reorder mode now supports per-card width — half (1 column) or full (span both columns). Toggle appears on each card while Reorder is active; sizes persist in `vibey-home-layout`.
Why: Users wanted to resize cards when customizing layout, not only drag-reorder.
Impact: Open Reorder → hover a card → pick half/full. Full-width cards stretch across the dashboard grid on desktop; mobile stays single column.
Files: `home-cards.ts`, `home-cards.config.ts`, `use-home-layout.ts`, `HomeSortableCardsGrid.tsx`, `HomeCardsGrid.tsx`, `globals.css`, `home-cards.config.test.ts`

## [2026-07-16 11:35] - [FIX]

What: Home dashboard Mission Approval queue and My tasks rows show the full title in a hover tooltip when the label is truncated.
Why: Long titles were cut off with ellipsis and had no way to read the full text without opening the item.
Impact: Hover any truncated queue/task title to see the full name; click still opens the item.
Files: `ApprovalQueueCard.tsx`, `MyTasksCard.tsx`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 11:32] - [FIX]

What: Home minimize now also hides the recommendation carousel (sliding "For you" cards), so collapsed Home starts at Your dashboard with only the tiny Chat expand control.
Why: Minimize left the carousel visible; day-to-day use wanted that block tucked away too.
Impact: Collapsed = Chat chip + dashboard cards; Expand restores greeting, composer, templates, and carousel.
Files: `home-dashboard-content.tsx`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 11:30] - [FIX]

What: Clicking task artifact cards in Space/global Vibey chat now opens `TaskDetailModal` (via the existing `?space=&item=` deep link + modal opener). Cross-space opens switch the active Space first.
Why: Cards dispatched `vibey-open-artifact` with `artifactType: 'task'`, but the Spaces listener only handled mapped view types (funnels/docs/…) and silently no-op'd tasks.
Impact: Task cards in chat open the task popup again; docs path unchanged. Preference for space switch uses the same URL deep-link as list opens.
Files: `apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 11:28] - [FEATURE]

What: Home dashboard chat hero (greeting + composer + template fan) can collapse to a tiny "Chat" chevron so the page starts at the recommendation carousel / dashboard cards. Preference persists in localStorage.
Why: Day-to-day use doesn't need the hero UI dominating the viewport; users still need a one-click way to expand chat when they want it.
Impact: Click Minimize under the templates to hide the top block; click Chat at the top to bring it back. Collapsed state also dims the hero glow/grid and tightens top padding.
Files: `home-dashboard-content.tsx`, `HomeDashboardV4Shell.tsx`, `use-home-chat-hero-collapsed.ts`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 11:25] - [FIX]

What: Accept playbook output contracts `ad_artifact`, `funnel_artifact`, and `media_artifact` on mission plan create + execute normalize.

Why: Webinar Fulfillment plan expansion succeeded but `POST /internal/missions/plan` 400'd on artifact_kind enum — missions failed with "Had trouble saving the plan".

Impact: Playbook missions with ads/funnel contracts can save plans after roas-api + mission-worker redeploy.

Files: `mission-plan.dto.ts`, `mission-deliverables.repository.ts`, `mission-execute-phase.service.ts`

## [2026-07-16 11:20] - [FIX]

What: Pushed `6ac5af77` and redeployed production — Railway `roas-platform` (mission-worker) + `queue-worker` SUCCESS; Vercel `roas-api` + `roas-web` READY on that commit. Confirmed mission-worker `LISTEN mission_outbox_new` on ROAS DB.

Why: Worker was not claiming outbox; API/web needed the outbox + description fixes live.

Impact: Mission dispatch path is live again. Local `RAILWAY_TOKEN` in secrets remains Unauthorized for CLI logs (GitHub-connected deploys still work).

Files: deploy `6ac5af77`

## [2026-07-16 11:10] - [FIX]

What: Fixed personal-user mission create never enqueueing `mission.plan.requested` (RLS blocked `mission_outbox` writes; Vercel API had no `SUPABASE_DIRECT_DB_URL`). Outbox enqueue now uses service role; added personal outbox write RLS; mission description is expandable; list status label aligned to Queue. Manually expanded both stuck Webinar Fulfillment missions to `pending_approval` with plans/subtasks. Added `SUPABASE_DIRECT_DB_URL` on Vercel `roas-api`.

Why: Deleting a Space does not delete campaign missions; Playbook create succeeded for the mission row then failed to enqueue planning, so missions sat in Queue with empty execution plans. Description used `md:truncate` with only a tooltip.

Impact: Refresh Missions — both Webinar Fulfillment rows should show pending approval with an Execution Plan. Approve to continue. **Agent execution still needs mission-worker claiming outbox** (worker is not connected to ROAS DB right now; Railway token in secrets is unauthorized). Deploy `roas-api` for service-role outbox path; RLS already live so user-JWT enqueue works after deploy of web description UI optional.

Files: `20260716183000_mission_outbox_personal_write_rls.sql`, `mission-outbox.service.ts`, `MissionMetaRow.tsx`, `mission-list-config.ts`, `missions.native-pg.test.ts`

## [2026-07-16 11:03] - [FIX]

What: Sanitize Fathom call summaries before they land in (and when shown in) Space task descriptions. Unwraps long timestamp links to plain takeaway text, repairs mid-URL newlines, and strips `##` headers so the plain-text description UI is readable.
Why: Fathom's `markdown_formatted` wraps every takeaway in a long `fathom.video` link and often breaks URLs across lines; we stored that raw and rendered it as plain text, so meetings looked like broken markdown.
Impact: Existing Fathom meeting descriptions clean up on view; new webhook-created meetings store the cleaned text. Recording URL still lives on `custom_data.recording_url`.
Files: `packages/api-shared/src/utils/sanitize-fathom-summary-markdown.ts`, `packages/api-shared/package.json`, `apps/api/.../space-automation-service-19.base.ts`, `apps/web/.../TaskDescription.tsx`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 10:50] - [ARCH]

What: Deployed `e9983486` — Railway `roas-platform` (mission-worker) + `queue-worker` SUCCESS. Synced Nate’s runtime skills from DB (`/api/agents/nate/sync` → 57 files healthy).

Why: Playbook Phase B/C expansion and seeded skills needed live mission-worker + agent workspace materialization.

Impact: New Webinar Fulfillment missions expand through Gates 1–3. Nate has updated `roas-market-research`. Hire copywriter/designer/ads_manager when those roles are needed (template skills already in `skill_library`).

Files: push `e9983486`, Fly runtime sync for Nate

## [2026-07-16 10:45] - [FEATURE]

What: Seeded Agency Ops Phase B/C skills from the packaged zip into agent templates + `skill_library` / assignments, and wired Pre-B → Copy Package → Gate 2 → Phase C → Gate 3 → deck build into `webinar-fulfillment`.

Why: Spine was live; production skills needed owners, DB seed, and playbook step keys so missions invoke real capabilities.

Impact: New webinar missions expand through research/copy/creative with Gates 1–3. **Blocked:** `roas-webinar-emails` missing (Copy Package section 2). Gate 2 surgical re-run is encoded in gate ecology only (no auto fan-out yet). Redeploy mission-worker for playbook; agents need skill sync / re-hire to pick up new skills.

Files: `docker/agents/templates/{ads_manager,copywriter,designer,strategist}/skills/*`, `20260716120000_webinar_pipeline_skills.sql`, `generate-webinar-pipeline-skills-migration.ts`, `seed-webinar-pipeline-skills.ts`, `webinar-fulfillment.playbook.ts`, helpers + tests, web playbook description

## [2026-07-16 10:40] - [FIX]

What: Truncated space list/table task names now show the full title in a hover tooltip (wide Tooltip on the name cell).
Why: Long task and subtask names were cut off with ellipsis and had no way to read the full text without widening the column.
Impact: Hovering a truncated Name cell in Spaces list/table (and other views using the same TextCell path) reveals the full task name.
Files: `apps/web/src/features/spaces/components/cells/TextCell.tsx`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 10:27] - [FIX]

What: Template-seeded Docs now write/backfill `doc_body` (cards were empty because instantiate only stored `custom_data.body`). Agency Client (Webinar) create opens Vibey chat with kickoff guidance and the Start Playbook modal; Missions empty state CTA points at Webinar Fulfillment.

Why: First-run after instantiate looked blank and unclear — Docs had no preview and Missions empty state never explained Playbook.

Impact: Refresh Docs on existing Agency Client (Webinar) Spaces to see content; new instantiates get chat + playbook kickoff. Deploy web for UI; playbook expansion still needs mission-worker.

Files: `20260716104000_instantiate_space_template_doc_body.sql`, `UseTemplateConfirmDialog.tsx`, `MissionsViewEmptyState.tsx`, `SpaceItemsContainer.tsx`, `MissionsView.tsx`

## [2026-07-16 10:13] - [FEATURE]

What: Shipped Agency Ops Phase 1–2 spine — `agency-client-webinar` Space template (+ DB seed), deterministic `webinar-fulfillment` mission playbook (Phase A skills 1→2→3 + Gate 1), and Missions **Playbook** kickoff UI.

Why: Start webinar client fulfillment as guided missions without freeform invent or Flow playbook editor.

Impact: Instantiate Agency Client (Webinar) → Missions → Playbook → kickoff; mission-worker expands `input.playbook_id` into a fixed plan. Phase B/C copy+creative still TBD.

Files: `space-template-catalog-agency-client-webinar.ts`, `20260716102000_seed_agency_client_webinar_space_template.sql`, `webinar-fulfillment.playbook.ts`, `mission-plan-phase.service.ts`, `StartPlaybookModal.tsx`, `MissionsView.tsx`, `MissionsToolbar.tsx`

## [2026-07-16 10:05] - [DOCS]

What: Revised Agency Ops plan — Mission Playbook as runtime UI; v1 = canned Space template + Start playbook; Flow “mission playbook” type deferred.

Why: Align on one living mission entity now; use Flows later only as the config surface for custom playbooks.

Impact: Build order is template → guided mission phases/gates → copy/creative; no Add Flow chooser in v1.

Files: `.docs/plans/agency-operations-webinar-fulfillment.md`

## [2026-07-16 09:45] - [DOCS]

What: Wrote Agency Operations webinar fulfillment plan — Space template + Flow `human_gate` spine, skill-4 / webinar copy gaps, build order.

Why: Align CEO dashboard → client fulfillment with existing Ad Kit / strategist skills before coding.

Impact: Plan at `.docs/plans/agency-operations-webinar-fulfillment.md`; implementation not started.

Files: `.docs/plans/agency-operations-webinar-fulfillment.md`

## [2026-07-16 10:13] - [DOCS]

What: Planned Manage Agents as an employee work surface (idle/working focus, assign mission, agent Work desk, phased Autopilot).
Why: Humans need one place to see what agents are doing and send them to work without campaign/chat babysitting.
Impact: Plan at `.docs/plans/manage-agents-work-surface.md`; implementation not started.
Files: `.docs/plans/manage-agents-work-surface.md`

## [2026-07-16 10:16] - [DOCS]

What: Extended Manage Agents plan — default landing is Vibey Ops Desk (named greeting, live “what’s happening” summary, composer to deploy work); Jaime stays HR; roster/assign/desks remain secondary.
Why: User wants to talk to Vibey first and have Vibey deploy the team, not start from a cold employee grid.
Impact: Plan Phase 1 is now Ops Desk; visibility/assign/desks follow.
Files: `.docs/plans/manage-agents-work-surface.md`

## [2026-07-16 10:18] - [DOCS]

What: Locked Ops Desk campaign rule — if campaign is unclear, Vibey asks before creating a mission (no silent General default).
Why: User confirmed product decision for Vibey-deployed work from Manage Agents.
Impact: Plan + ops awareness instructions include ask-when-unclear.
Files: `.docs/plans/manage-agents-work-surface.md`

## [2026-07-16 10:25] - [FEATURE]

What: Shipped Manage Agents Vibey Ops Desk — named greeting, live team summary, Vibey chat with ops awareness (ask campaign when unclear), Autopilot toggle, roster always below with Working/Idle filters, focus lines, and Assign work modal.
Why: Turn `/team` from a chat roster into an ops floor where Vibey briefs and deploys work.
Impact: Opening Manage Agents shows Vibey first; specialists stay visible and assignable; Phase 3 Work desks still pending.
Files: `apps/web/src/features/team-2/components/VibeyOpsDesk.tsx`, `VibeyOpsDeskBriefing.tsx`, `AgentAssignWorkModal.tsx`, `Team2ManageContent.tsx`, `AgentsGrid.tsx`, `AgentGridCard.tsx`, `Team2Toolbar.tsx`, `ChatTab.tsx`, `Team2AgentChatWithConversations.tsx`, `agents-grid-utils.ts`, `lib/ops-desk-summary.ts`, `lib/build-team-ops-awareness-context.ts`, `config/messages.config.ts`, tests, `.docs/plans/manage-agents-work-surface.md`

## [2026-07-16 10:33] - [FIX]

What: Fixed janky Vibey Ops Desk layout (compact briefing + composer, no empty-thread scroll void) and shipped Phase 3 agent Work desks (Now / Queue / Recent) with mission detail open.
Why: Half-height full AgentChatPanel left a giant empty scroll area; desks still lacked work visibility.
Impact: `/team` Ops Desk is compact; opening a specialist defaults to Work tab.
Files: `VibeyOpsDesk.tsx`, `AgentChatPanel.tsx`, `AgentChatThread.tsx`, `ChatTab.tsx`, `Team2AgentChatWithConversations.tsx`, `Team2DetailView.tsx`, `tabs/AgentWorkTab.tsx`, `Team2ManageContent.tsx`

## [2026-07-16 10:22] - [FEATURE]

What: Meetings now ingest all team Fathom recordings (cleared Dylan-only recorded_by filter), tag each call Personal vs Team by whether Dylan was on it (`call_kind`), dedupe by Fathom meeting_id, and nest follow-ups under All Meetings via `parent_item_id` (Follow-ups / Action items still show them as main tasks).
Why: CEO needs team calls without duplicates, Group by Personal/Team, and per-meeting action visibility without leaving All Meetings.
Impact: Hard-refresh All Meetings — Call Kind column; Group by Call Kind; expand a call to see action items. New team-hosted recordings that hit the Fathom webhook will land. Deploy roas-api for ingest path.
Files: fathom-call-kind.ts, space-automation-service-06/13, space-items.repository, catalog-ceo, ListView/KanbanView, apply-space-toolbar-filters, live ROAS Meetings schema/trigger/backfill, tests

## [2026-07-16 10:23] - [FEATURE]

What: Follow-up action items now get the same Attendees multi_select tag as the inferred Fathom owner (match existing tags by name/email, else upsert). Live ROAS backfilled 23 follow-ups; Follow-ups / Action items views show Attendees.
Why: System Assignee only works for resolvable internal profiles; CEO triage needs Nate/Bryce/etc. as the same people tags used on calls.
Impact: Hard-refresh Follow-ups / Action items — owner chip on tagged tasks. New Fathom suggestions tag owners automatically after API deploy.
Files: fathom-follow-up-enrichment.ts, space-automation-service-13.base.ts, space-template-catalog-ceo.ts, live ROAS Meetings, tests

## [2026-07-16 10:28] - [FIX]

What: Row “Ask in chat” (was Attach to ROAS chat) expands the global chat panel before attaching the task, so the composer opens with the task chip.
Why: Attach only mutated composer state while chat stayed collapsed — especially broken on mobile where the panel unmounts.
Impact: Click the link icon on a Meetings row — chat opens with that task attached so you can ask whether Nouman completed it.
Files: SpaceItemRow.tsx, MediaCell.tsx

## [2026-07-16 10:38] - [FEATURE]

What: Replaced Ops Desk embedded composer with **Talk to Vibey** — opens sidebar global chat as Vibey and attaches live Ops Desk awareness (same attach idea as Spaces task → ROAS). Team work surface defaults to Vibey; chip shows "Ops Desk". Roster `agents_registry` status now patches live (missions refetch for focus); no more waiting on 60s list cache for idle/working.
Why: Embedded chat made the Ops Desk feel like another DM; sidebar attach is cleaner and matches existing platform attach patterns.
Impact: `/team` Ops Desk is briefing + CTA + floor; continue the conversation in the rail with team context. Working/idle badges update in realtime.
Files: `VibeyOpsDesk.tsx`, `VibeyOpsDeskTalkButton.tsx`, `GlobalChatPanel.tsx`, `SpaceVibeyChatPanel.tsx`, `work-context.config.ts`, `global-chat-storage.ts`, `use-team-roster-realtime.ts`, `apply-agents-registry-realtime-delta.ts`, messages/plan/changelog


## [2026-07-16 10:41] - [FIX]

What: Fixed Manage Agents Ops Desk roster clip (floor wrapper is now a flex column so AgentsGrid can scroll). Default agent group-by is **none**. Hardened `min-h-0` on Team / Brain / Flows / Spaces page roots after a cross-page scroll-chain audit.
Why: Ops Desk floor used `overflow-hidden` without flex, so `flex-1` + inner `overflow-auto` never got a height bound and the roster was clipped. Group-by team was a poor default when most orgs have no real teams.
Impact: `/team` roster scrolls under the briefing; agents render flat unless you group. Brain/Flows/Spaces page shells less likely to break nested scroll.
Files: `VibeyOpsDesk.tsx`, `AgentsGrid.tsx`, `AgentsGrid.test.tsx`, `team/page.tsx`, `brain/page.tsx`, `flows/page.tsx`, `spaces-page-client.tsx`


## [2026-07-16 10:49] - [FIX]

What: Clarified ROAS Autopilot on Manage Agents Ops Desk — enable modal explains what Autopilot does (watch campaigns, create/assign missions, retry stuck work); when on, Ops Desk shows an Autopilot badge, status hint, and Set strategy link into workspace Autopilot. Deduped Talk-to-Vibey copy. Added 10,000 org credits to dylan+vibeytest@roas.co.
Why: Turning Autopilot on felt like a dead switch — no explanation of what happens next.
Impact: Users see what Autopilot means and where to set campaign strategy; test account has more runway.
Files: `AwarenessToggle.tsx`, `VibeyOpsDesk.tsx`, `VibeyOpsDeskBriefing.tsx`, `messages.config.ts`, org_credit_purchases (prod)


## [2026-07-16 11:13] - [FIX]

What: Personal Slack connections are now visible and usable in org/workspace context — same cross-context pattern as Fathom/Fireflies. Status/overview/agent integration context include personal Slack; `getIntegration` (and metadata/error updates) fall back to the personal row when org-scoped lookup misses.
Why: Slack OAuth saved as `scope_mode: personal` / `org_id: null`, but chat/agent status checks filtered by org and reported disconnected even when Settings showed connected.
Impact: Agent `check_integration_connection` and Slack tools see a personally connected Slack workspace while the user is in an org workspace.
Files: `integrations-status.service.ts`, `integrations-overview.service.ts`, `integration-context.service.ts`, `slack.repository.ts`, tests

## [2026-07-16 11:15] - [DOCS]

What: Drafted Page Grader native send-tasks API contract + implementation plan (locked decisions: bulk bar, pick client, sync-back, assignee mapping).
Why: Need a shared contract before ROAS + Page Grader build the handoff.
Impact: Plan ready at `.docs/plans/page-grader-send-tasks.md`.
Files: `.docs/plans/page-grader-send-tasks.md`

## [2026-07-16 11:33] - [FEATURE]

What: Implemented Page Grader native send-tasks end-to-end — Page Grader `roas-api` edge function (list clients + idempotent workload create); ROAS connect/status/clients/send module; Settings catalog card; Spaces bulk bar **Page Grader** send panel with client picker; sync-back on `custom_data.page_grader`.
Why: Locked product path: multi-select Space tasks → Page Grader client work without inventing a second task system.
Impact: After deploying `roas-api` + setting `ROAS_API_KEY`, and shipping ROAS api/web, users can connect Page Grader and send selected tasks.
Files: `page-grader/supabase/functions/roas-api/`, `apps/api/.../page-grader/`, `BulkActionBar.tsx`, `PageGraderBulkSendPanel.tsx`, `useIntegrations.ts`, plan/docs

## [2026-07-16 11:36] - [FEATURE]

What: Notification feed rows now have **Ask in chat** (same Link2 pattern as Space tasks) — opens global chat, attaches a notification chip, prefills the composer with that item’s type/title/body; agent context resolves `user_notifications` / `agent_awareness_points` for the chip.
Why: Users need to talk to ROAS about a specific feed item without copy-paste.
Impact: Hover a notification → Ask in chat → composer ready with that context.
Files: `NotificationFeedRowMeta.tsx`, `NotificationFeedRow.tsx`, `ask-notification-in-chat.ts`, `use-chat-input-external-attachments.ts`, `attached-artifact.ts`, `chat-reference-context.service.ts`


## [2026-07-16 11:18] - [FIX]

What: Home My tasks detail loads personal team roster (self + agents) instead of forcing `roster=[]` for non-org spaces; Assignee falls back to “Me” when assignee_id is the current user.
Why: CEO HQ tasks are personal — opening from Home left Assignee Empty and activity showed a raw user UUID even though assignee_id was set correctly.
Impact: Open a My tasks item from Home — Assignee shows Me, not Empty.
Files: HomeTaskDetailHost.tsx, task-meta-fields-helpers.ts, TaskMetaFields.tsx, TaskMetaCoreFields.tsx

## [2026-07-16 11:24] - [FIX]

What: Restored Fathom→Brain auto-ingest and stuck “Crystallize beliefs and perspectives” processing for ROAS. Railway workers now use the IPv4 Supabase session pooler (direct DB host is IPv6-only and was ENETUNREACH), AGENT_API_URL points at Fly, and OpenClaw config no longer references a missing whatsapp plugin that disabled `/v1/responses` (404). Requeued failed Fathom imports — both succeeded.
Why: Auto-crystallize was ON and webhooks arrived, but workers could not claim outbox rows and Atlas calls hit a broken gateway, so last capture stayed ~22 days old and crystallize jobs sat In queue forever.
Impact: New Fathom meetings enqueue and complete into User Brain again; night-janitor crystallize jobs drain instead of stacking. Deploy Fly with updated `docker/openclaw.json` so whatsapp does not return on image rebuild.
Files: Railway env (SUPABASE_DIRECT_DB_URL/DATABASE_URL/AGENT_API_URL), `apps/mission-worker/.../database.service.ts`, `apps/queue-worker/.../database.service.ts`, `docker/openclaw.json`, `scripts/roas/roas-secrets.env`, Fly live `/home/node/.openclaw/openclaw.json`

## [2026-07-16 12:02] - [FIX]

What: Strip markdown bold/italic markers (`**…**`, `__…__`) from Fathom meeting summaries in the plain-text task description sanitizer; also detect leftover `**` so existing items get cleaned on display (not only fathom.video markdown links / ATX headers).
Why: Summaries showed literal stars like `- **Professional Wins:**` because detection skipped prose-only dumps and the sanitizer never removed emphasis.
Impact: Meeting task descriptions show `Professional Wins:` without asterisks; new writes strip them too.
Files: `packages/api-shared/src/utils/sanitize-fathom-summary-markdown.ts`, tests, `packages/api-shared/src/index.ts`

## [2026-07-16 12:07] - [FEATURE]

What: When marking a parent Space task Done/closed, show a ClickUp-style confirm if it has open subtasks — Yes completes parent + open subtasks, No completes parent only, Cancel aborts.
Why: Completing a parent left subtasks open with no way to cascade status in one step.
Impact: List/kanban/detail/menu status changes prompt when needed; bulk status skips the prompt.
Files: `complete-open-subtasks-on-status.ts`, `CompleteSubtasksConfirmDialog.tsx`, `use-update-item-with-subtask-complete-confirm.ts`, `SpaceStatusCascadeConfirmProvider.tsx`, `SpaceItemsContainer.tsx`, `BulkActionBar.tsx`, `TaskDetailModal.tsx`, `HomeTaskDetailHost.tsx`, `use-task-menu-actions.ts`

## [2026-07-16 12:09] - [FIX]

What: List/table SelectCell triggers for generic selects (e.g. Call Kind) now show the option label beside the color dot, matching category/kanban.
Why: Non-status selects reused the status-only “dot” closed trigger, so Call Kind looked like an unlabeled color chip.
Impact: Call Kind (and other custom selects) show Personal/Team etc. in the list cell; status remains dot-only.
Files: `apps/web/src/components/ui/forms/SelectCell.tsx`, `SelectCell.test.tsx`

## [2026-07-16 12:26] - [FEATURE]

What: Page Grader bulk send is multi-step (client → work type → Send), shows Selected client + checkmark, maps each client to a Space tag (creates/reuses on send), and defaults the client from that tag on later sends.
Why: Picking Impact Elite Coaching should tag the Space tasks and pre-select that client next time; Send was finishing too early before choosing task vs task request.
Impact: Select tasks → Page Grader → client (check / pinned) → Continue → Task or Task request → Send; matching tag becomes the default client.
Files: `PageGraderBulkSendPanel.tsx`, `page-grader-client-tag.ts` (+test), `page-grader-send.service.ts`, `BulkActionBar.tsx`, `page-grader.dto.ts`, `page-grader-api.service.ts` (+test)

## [2026-07-16 12:37] - [FEATURE]

What: Page Grader clients can map to ROAS campaigns (optional space). Settings → Integrations → Page Grader → Map clients; send flow defaults from space/campaign map, then tags, then name match (Impact → Impact Elite Coaching), with optional “Map this campaign” on send.
Why: Portal clients and ROAS campaigns/spaces need a durable link so work from Impact defaults to the right Page Grader client.
Impact: Map once in Settings (or check map on send); later sends from that campaign pre-select the client.
Files: `page-grader.dto.ts`, `page-grader.controller.ts`, `page-grader-api.service.ts`, `page-grader-client-tag.ts` (+test), `page-grader-send.service.ts`, `PageGraderBulkSendPanel.tsx`, `BulkActionBar.tsx`, `PageGraderClientScopeMapModal.tsx`, `page-grader-scope-api.ts`, `ConnectedIntegrationCard.tsx`

## [2026-07-16 12:40] - [FIX]

What: Page Grader client picker loads once and filters locally; typing no longer refetch/auto-selects. Selected client is pinned above Cancel/Continue and only changes on click.
Why: Search was reloading clients and picking the first match on every keystroke.
Impact: Search filters the list only; your pick stays until you click another client.
Files: `PageGraderBulkSendPanel.tsx`

## [2026-07-16 12:46] - [FEATURE]

What: Page Grader send picks Portal service-request types (Graphics, Copywriting, Video Editing, …) instead of Task vs Task request. ROAS pulls types from Page Grader `GET /task-types` (with Portal-aligned fallback) and sends `work.task_type` + `kind: task_request`.
Why: Page Grader creates service requests by type; the previous Task/Task request step didn’t match Portal.
Impact: Client → request type → Send; workload rows get the correct `task_type`. Deploy Page Grader `roas-api` for live `/task-types`.
Files: `page-grader/supabase/functions/roas-api/index.ts`, ROAS `page-grader.integration.ts`, `page-grader-api.service.ts`, `page-grader.dto.ts`, `page-grader.controller.ts`, `PageGraderBulkSendPanel.tsx`, `page-grader-send.service.ts`, `BulkActionBar.tsx`

## [2026-07-16 13:19] - [FEATURE]

What: Chat + menu now has Generate image (prefills composer). Media image workspace has Open in Canva via `POST /api/media/assets/:id/canva-handoff` (Composio URL import → design → edit_url).
Why: Continue Space Media ChatGPT-style phases — generate from any chat, hand off assets to Canva for polish.
Impact: + → Generate image anywhere with ChatInput; Open in Canva on image workspace (needs Canva connected + API deploy). Pin comments and parent lineage still deferred.
Files: `chat-input-plus-menu-view.tsx`, `use-chat-input-plus-controller.ts`, `ChatInput.tsx`, `MediaImageWorkspace.tsx`, `media-api.ts`, `media-toast-errors.config.ts`, `media-canva-handoff.service.ts`, `media-canva-composio-payload.ts`, `media-assets.controller.ts`, `media.module.ts`, tests

## [2026-07-16 13:22] - [FEATURE]

What: Page Grader send flow adds Assignee + Preview steps. Suggests Portal assignee from Space assignees/attendees (email/name match); otherwise pick from Page Grader people or Unassigned. Preview shows title/description/priority/due before Send. Page Grader `GET /assignees` lists profiles; send accepts explicit assignee.
Why: Operators need to assign work and see what Portal will receive before bulk-sending.
Impact: Client → type → assignee → preview → Send. Deploy Page Grader `roas-api` for live `/assignees`.
Files: `page-grader/.../roas-api/index.ts`, ROAS page-grader module, `PageGraderBulkSendPanel.tsx`, `page-grader-send-preview.ts` (+test), `BulkActionBar.tsx`, `page-grader-send.service.ts`

## [2026-07-16 13:24] - [FIX]

What: Media composer now uses Home HD4 shell (tokens, hero grid/glow, hd4 chips/menus). Provisioned missing `media` + `campaigns` storage buckets on ROAS Supabase (`lhfgtsjetcardinpgouq`) that caused generate_image "Bucket not found"; added migration for durable repair.
Why: Composer sat outside `.home-dashboard-v4` so HD4 tokens never applied; ROAS DB never had `media` bucket INSERT (policies assumed it).
Impact: Media tab matches Home composer look after refresh. Image generate/save should work now without Bucket not found. Retry the donkey prompt.
Files: `MediaGenerateComposer.tsx`, `SpaceMediaView.tsx`, `MediaImageWorkspace.tsx`, `globals.css`, `20260716192000_provision_media_campaigns_storage_buckets.sql`

## [2026-07-16 13:36] - [FIX]

What: Media Aspect/Model menus portal above the gallery (no more clipping). Media composer seed with `railIntent: new` now forces a fresh chat thread (was racing into the old busy conversation). `generate_image` accepts `space_id`/`campaign_id` and prefers them when saving so Space Media gallery can list the asset.
Why: Seed event fired before React cleared the selected conversation; menus were clipped by overflow; uploads often had null `space_id` so the Media tab stayed empty.
Impact: Hard-refresh web; redeploy agent-api for space_id save. New generates from Media should open a new chat, show the prompt, and land in the Space Media gallery.
Files: `SpaceVibeyChatPanel.tsx`, `MediaGenerateComposer.tsx`, `SpaceMediaView.tsx`, `HomeDashboardV4Menu.tsx`, `globals.css`, `artifact-legacy-media-generate.service.ts`, `artifact-action-additional-schemas.ts`, `vibey-api-action-docs.ts`

## [2026-07-16 13:40] - [FEATURE]

What: Clicking a generated image (inline or "Generated image" card) in Space chat opens the Media workspace editor (`MediaImageWorkspace`) instead of a new browser tab, when `mediaAssetId` is present.
Why: ChatGPT-style flow — edit/history should stay in-app on the asset, not dump a raw URL.
Impact: Hard-refresh web. Needs a real media asset id on the block (new generates after space_id deploy). Legacy URL-only images still open in a new tab.
Files: `open-media-asset-in-app.ts` (+test), `SpaceItemsContainer.tsx`, `GeneratedMedia.tsx`, `InlineImageGen.tsx`, `MessageContentBlockSwitchPartA.tsx`, `FinalOutputCards.tsx`, `components/media/index.ts`

## [2026-07-16 13:58] - [FIX]

What: `generate_image` media asset insert now uses allowed `source_surface: 'generated'` (was `agent_generated_media`, rejected by `media_assets_source_surface_check`). DB insert failure returns `success: false` instead of a false OK with only a signed URL. Media composer footer wraps/`min-w-0` so Aspect/Model/Send stay visible when the chat rail narrows the pane.
Why: Image bytes uploaded but gallery stayed empty; composer was clipped by overflow when the Space pane was narrow.
Impact: Redeploy/restart agent-api, hard-refresh web, retry generate — asset should land in Space Media.
Files: `artifact-legacy-media-upload.service.ts`, `artifact-runtime-data-access.service.test.ts`, `MediaGenerateComposer.tsx`, `SpaceMediaView.tsx`, `globals.css`

## [2026-07-16 14:00] - [FIX]

What: Clarified ChatGPT image default is OpenAI GPT Image 2 (`gpt-5.4-image-2`), not GPT-5.6 chat. `generate_image` success now returns `space_id`, `asset_ref`, and `media_library` status; action docs forbid inventing a "URL-only / can't register Space Media" limitation.
Why: Users confuse GPT-5.6 (chat) with image models; agents were narrating a stale save failure as a product limitation.
Impact: After agent-api redeploy + skill sync, agents should confirm Space Media registration; UI copy says GPT Image 2 ≠ GPT-5.6.
Files: `artifact-legacy-media-generate.service.ts`, `vibey-api-action-docs.ts`, `MediaGenerateComposer.tsx`, `image-models.ts`, `use-media-image-generation.ts`, `media/dto/index.ts`

## [2026-07-16 14:05] - [FIX]

What: Chat image cards auto-retry thumbnail load (no flash of "Failed to load image"). Clicking a generated-image card switches to Space Media workspace by deferring `?media=` until the Media view is active (was racing clear → fell through to new tab when asset id missing). `media_asset` blocks now carry UUID `mediaAssetId` + `spaceId` from generate_image results.
Why: Signed URLs fail once on first paint; opening media from List/Board cleared `?media=` before the view switched; cards without a registered asset id opened a raw URL tab.
Impact: Hard-refresh web; redeploy agent-api for asset-id-on-block. New generates with a saved asset open the editor; regenerate if older cards only have a URL.
Files: `use-resilient-image-src.ts`, `InlineImageGen.tsx`, `GeneratedMedia.tsx`, `FinalOutputCards.tsx`, `SpaceItemsContainer.tsx`, `ui-block-extractor.ts`, `message-content-blocks.ts`

## [2026-07-16 14:23] - [FIX]

What: Media Library gallery click now opens the same `MediaImageWorkspace` editor used from chat (`?media=` deep view). Removed the separate right-side `MediaPreviewPanel` slide-over so there is one image editor surface.
Why: Gallery click opened a simpler preview panel while chat opened the full editor (history, aspect regen, describe edits, Canva) — two different UIs for the same asset.
Impact: Hard-refresh web. Click any media thumbnail → full editor; back clears `?media=` to the gallery.
Files: `SpaceMediaView.tsx`, `SpaceItemsContainer.tsx`, `SpaceContentRouter.tsx`, `SpaceMediaToolbar.tsx`, `views/types.ts`, deleted `MediaPreviewPanel.tsx`

## [2026-07-16 14:24] - [FIX]

What: Open in Canva on NOT_CONNECTED now starts Canva Composio OAuth (popup) instead of only toasting "connect in Settings". After connect succeeds, retries handoff automatically.
Why: Missing Canva integration blocked the feature with a dead-end toast; user asked to run/prompt the integration flow.
Impact: Hard-refresh web. Click Open in Canva → connect popup if needed → design opens after auth.
Files: `connect-composio-integration.ts` (+test), `MediaImageWorkspace.tsx`, `media-toast-errors.config.ts`, `lib/integrations/index.ts`

## [2026-07-16 14:30] - [FIX]

What: Subtask detail modal now portals to `document.body` and uses `z-modal-layer-4` so it renders above the mission detail shell.

Why: It used nonexistent `z-modal-layer-2` and lived inside the mission shell, so the mission card (`z-10`) painted over it.

Impact: Clicking a subtask shows the Subtask popup on top of Webinar Fulfillment (and any other mission modal).

Files: `SubtaskDetailModal.tsx`

## [2026-07-16 14:37] - [FIX]

What: Media gallery/chat open restored as a right slide-out (`MediaImageWorkspacePanelHost`) instead of replacing the Media view. Aspect/describe edits now fall back to Google Gemini when OpenRouter returns 401/auth failure (local key was returning "User not found"). Edit seeds include `space_id`; removed unused full-page `MediaDeepView`.
Why: Full-view replace felt like a screen reload; edits failed because OpenRouter auth was broken while Gemini was available — agent framed it as "image generation unavailable".
Impact: Hard-refresh web; agent-api hot-reload. Click media → gallery stays, editor slides from the right. Aspect ratio + describe edits should succeed via Gemini when OpenRouter is unauthorized. Fix/rotate `OPENROUTER_API_KEY` in `apps/api/.env` for GPT Image 2 path.
Files: `MediaImageWorkspacePanelHost.tsx`, `SpaceMediaView.tsx`, `SpaceItemsContainer.tsx`, `MediaImageWorkspace.tsx`, deleted `MediaDeepView.tsx`, `artifact-legacy-media-generate.service.ts` (+test), `artifact-legacy-media-provider.service.ts`, `platform-failure.ts`

## [2026-07-16 14:39] - [FIX]

What: Open in Canva connect no longer fails when Composio reuses an existing account (`redirect_url: null`). Treats reuse as already connected and retries handoff; force_new OAuth if needed; same-tab fallback when popup blocked.
Why: Connect API returned 201 with reused connection and no authorize URL; frontend threw "Couldn't start Canva connect" instead of completing the handoff.
Impact: Hard-refresh web. Open in Canva → if Canva is already linked in Composio, design opens; otherwise OAuth starts (popup or same tab).
Files: `connect-composio-integration.ts` (+test), `MediaImageWorkspace.tsx`

## [2026-07-16 14:43] - [FIX]

What: Removed OpenRouter→Gemini auth fallback for image generate/edit. GPT Image 2 (`openai/gpt-5.4-image-2`) stays on OpenRouter only.
Why: User wants GPT image generation, not a silent Gemini fallback when the OpenRouter key fails.
Impact: Image gen/edit fail clearly if `OPENROUTER_API_KEY` is invalid. Local key currently returns OpenRouter 401 User not found — replace key in `apps/api/.env` (and root `.env`) then restart `pnpm dev:agentapi`.
Files: `artifact-legacy-media-generate.service.ts` (+test), `artifact-legacy-media-provider.service.ts`


## [2026-07-16 14:47] - [FIX]

What: Synced local `OPENROUTER_API_KEY` in `apps/api/.env` and root `.env` to the working OpenClaw `openrouter:default` key (OpenRouter auth/key now 200). Restarted agent-api so GPT Image 2 uses that key.
Why: Chat worked via OpenClaw auth-profiles; image gen used a different dead env key (401 User not found). User asked to use GPT with the correct key.
Impact: Aspect/edit image gen should hit OpenRouter GPT Image 2 successfully after refresh. Backups of previous env lines saved as `.bak-openrouter-*`.
Files: `apps/api/.env`, `.env` (local only)

## [2026-07-16 15:03] - [FEATURE]

What: Space Media "Show in chat" opens the origin conversation that generated the image and attaches the asset to the composer (no auto-send). Persists `media_assets.conversation_id` on generate/upload; resolves older assets via `find_media_asset_origin_conversation`.
Why: "Open in chat" was seeding a new thread with a prompt instead of returning to the original chat with the image ready to work from.
Impact: Hard-refresh web; restart agent-api for new generations to store conversation_id. Click Show in chat on a chat-generated image → origin thread opens, image attached to the sheet. Recent clock asset backfilled to conversation `747b8c2d-…`.
Files: `MediaImageWorkspace.tsx`, `SpaceVibeyChatPanel.tsx`, `use-global-chat-store.ts`, `media-api.ts`, `artifact-legacy-media-upload.service.ts`, `artifact-legacy-media-generate.service.ts` (+test), `artifact-legacy-media-status.service.ts`, `media.repository.ts`, `media-service-03.base.ts`, `media/dto`, migrations `20260716150000_media_assets_conversation_id.sql`, `20260716220000_find_media_asset_origin_conversation.sql`

## [2026-07-16 15:11] - [FIX]

What: Fixed Open in Canva (seeded missing `canva` catalog + Composio auth config), chat image click → Space Media slide-out (edit_image UI blocks + URL→asset resolve), live Media gallery updates (`media_assets` realtime publication), and composer overlaying the editor (z-index).
Why: Canva connect could not persist FK rows; edit_image results had no mediaAssetId so clicks opened a new tab; gallery realtime was not published; generate composer used `z-dropdown` over the slide-out.
Impact: Hard-refresh web; restart agent-api. Open in Canva should start OAuth then handoff. New chat images open in the right editor. New space media appears without reload. Editor History stays above the generate composer.
Files: Canva/realtime migrations, `ui-block-extractor.ts` (+test), `media-assets.controller.ts`, `media.repository.ts`, `media-service-03.base.ts`, `media-api.ts`, `InlineImageGen.tsx`, `GeneratedMedia.tsx`, `SpaceMediaView.tsx`, `MediaImageWorkspacePanelHost.tsx`, `MediaImageWorkspace.tsx`, `connect-composio-integration.ts`

## [2026-07-16 15:22] - [STYLE]

What: Space Media aspect-ratio menu matches ChatGPT: hollow size glyphs + Square/Portrait/Story/Landscape/Widescreen labels beside ratios.
Why: Plain ratio strings lacked the visual size cue from the ChatGPT picker.
Impact: Hard-refresh → open Aspect ratio in the media editor (and Media generate Aspect chip) to see shape + name + ratio.
Files: `aspect-ratio-menu.tsx`, `MediaImageWorkspace.tsx`, `MediaGenerateComposer.tsx`, `components/media/index.ts`

## [2026-07-16 15:16] - [FEATURE]

What: Space Media "Describe a new image" composer can be minimized (same Home chat toggle pattern); preference persists in localStorage.
Why: Users want more gallery space when they are not generating a new image.
Impact: Hard-refresh Media tab → Minimize under the composer collapses it to a "New image" chip; click again to expand.
Files: `SpaceMediaView.tsx`, `use-space-media-composer-collapsed.ts`, `HomeDashboardV4Shell.tsx`

## [2026-07-16 15:04] - [FIX]

What: Added renewable mission execution leases, a six-minute runtime-start lease, a dedicated 30-second recovery sweep that runs on worker startup, exact-timestamp atomic reclaim guards, short orphan recovery, and surfaced recovery outbox failures. The lease switches to the 90-second active window on the first stream event; recovered state preserves completed actions while clearing zombie tool UI state.

Why: A worker/runtime restart could leave a subtask looking active for 10–25 minutes because ordinary stream traffic did not renew `updated_at`, recovery only ran on the 15-minute scheduler, and stale snapshots could still enqueue after losing an update race.

Impact: With defaults, a dead execution becomes eligible after 90 seconds and is normally requeued on the next 30-second sweep; healthy stream traffic renews every 15 seconds and cannot be reclaimed from an older snapshot. Requires mission-worker deployment; the API retry-state clear remains part of the pending API deployment.

Files: `mission-execution-lease.ts`, `missions.scheduler.ts`, `missions.scheduler-recovery.service.ts`, `missions.scheduler-recovery.types.ts`, `missions.scheduler-recovery.outbox.ts`, `missions.scheduler-recovery.watchdogs.phase-b.ts`, `mission-execute-phase.service.ts`, mission recovery tests, `apps/mission-worker/.env.example`, `documentation/features/missions.md`

## [2026-07-16 15:16] - [FIX]

What: Coordinated mission retry paths so a delayed comment directive does not abort a subtask that triage already restarted. Intentional mid-run steering still aborts and restarts. Removed triage's second ready-subtask enqueue after manager retry/reassign already queued execution.

Why: Production created three execute intents within two seconds for the same Pre-call subtask. Triage began retrying blocked work while the user's delayed "try again" directive observed the new `in_progress` state, aborted it, reset it, and produced the internal error `This operation was aborted`.

Impact: Concurrent recovery paths converge on one execution instead of killing each other. Requires mission-worker deployment.

Files: `mission-comment-directive.service.ts`, `mission-subtask-triage.service.ts`, `mission-retry-coordination.test.ts`, `documentation/features/missions.md`

## [2026-07-16 16:39] - [FIX]

What: Removed the unavailable WhatsApp plugin from the Fly OpenClaw config and made the headless gateway reject invalid configuration before opening its HTTP listener.

Why: OpenClaw treated the missing WhatsApp plugin as a whole-config validation failure, silently loaded an empty config, and returned 404 from the mission-critical `/v1/responses` route while `/v1/models` still appeared healthy.

Impact: The corrected runtime exposes `/v1/responses` again. Future plugin/config drift fails startup with exact validation issues instead of presenting a false-green runtime that blocks Missions.

Files: `docker/openclaw.json`, `apps/openclaw/src/gateway/headless-http-server.ts`, `.docs/plans/agent-follow-up-work.md`

## [2026-07-16 17:18] - [FIX]

What: Exempted unowned Fly machines marked `AGENT_RUNTIME_MODE=shared` from orphan reconciliation while preserving cleanup for profile, pool, and genuine orphan drift.

Why: The five-minute machine reconciliation job could not find the always-on shared `roas-runtimes` machine in `profiles` or `machine_pool`, classified it as orphaned, and repeatedly stopped it during active Mission streams.

Impact: Shared Mission/Brain runtime streams are no longer terminated by routine machine cleanup. Dedicated and pooled machine reconciliation behavior is unchanged.

Files: `machine-reconciliation.service.ts`, `machine-reconciliation.service.test.ts`, `documentation/features/missions.md`

## [2026-07-16 17:38] - [FIX]

What: Made recovered `queued` mission subtasks use the six-minute startup lease, and passed their execution state into orphan-watchdog lease checks.

Why: The stalled watchdog requeued Pre-call, but the orphan watchdog treated the queued row as abandoned after only 90 seconds and created a second execute intent. The overlapping execution aborted the first run.

Impact: Recovered jobs get enough time to leave BullMQ and claim the subtask without a competing watchdog retry; genuinely lost queued work is still recovered after the startup lease.

Files: `mission-execution-lease.ts`, `missions.scheduler-recovery.watchdogs.phase-b.ts`, mission recovery tests, `documentation/features/missions.md`
