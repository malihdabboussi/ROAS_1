# Changelog - July 19, 2026

## [2026-07-19 15:09] - [FEATURE]

What: Added a gated Meta Ads Launch mission, a read-only PageGrader account-context bridge, aligned Meta action contracts, and the `roas-meta-ads-launch` agent skill.
Why: Approved ad assets need a reliable path from campaign context into correctly mapped, paused Meta campaigns without asking Blaze to design creative or activating spend before human review.
Impact: Teams can start a dedicated Meta launch playbook, reconcile supplied or Space assets, confirm the mapped Meta setup, build paused campaign assets, and approve activation separately. PageGrader remains read-only and written outputs use Dylan Super Voice rules.
Files: Meta Ads mission playbook and tests, Missions picker and PageGrader context service, Meta action schemas/docs/tests, `20260719143000_meta_ads_launch_skill.sql`, missions documentation

## [2026-07-19 14:40] - [FEATURE]

What: Shipped Page Grader Create & import brain, full client pagination, and `campaign_type: get-more-leads` create-path fix onto a main-based branch; split `page-grader-api` send-work/helpers and client-map row to pass LOC gates.
Why: Multi-agent WIP left those fixes uncommitted while changelog already described them; agents need one branch from current main.
Impact: After merge + `roas-api`/`roas-web` deploy, Map clients lists the full roster and unmapped **Create & import brain** works.
Files: page-grader API/integration/DTO/brain-import/client-import, `PageGraderClientScopeMapModal.tsx`, `PageGraderClientScopeMapRow.tsx`, helpers/send-work split, unit tests

## [2026-07-19 14:31] - [FEATURE]

What: Connected the administrator Shadow Mode test loop: create a harmless proposal, approve or dismiss it, and explicitly send an approved message only after the target person is Active.
Why: Admins need to validate the complete review experience safely before automated observation and proposal generation are introduced.
Impact: Proposal creation and review never send Slack messages. Off blocks proposals, Shadow blocks delivery, approval is mandatory, and Slack receives a DM only when an admin clicks Send now for an Active person.
Files: Slack people controller/service/repository/DTO/types/tests, Team People UI/hook/service/messages/tests, integration documentation, follow-up plan

## [2026-07-19 14:20] - [FEATURE]

What: Added an organization-admin Slack people directory and Shadow Mode foundation: workspace identities persist as platform teammates, external contacts, or ghost profiles; per-person delivery intent defaults to Shadow; proposed messages and workflows have a durable review ledger; and Team now has a People + Shadow inbox view.
Why: Proactive team help needs durable person memory and an observable, reversible rollout path before any automated Slack outreach is allowed to send.
Impact: Admins share one view of Slack-discovered people and can record Off, Shadow, or Active intent. No proactive outbound runner was enabled in this slice, so existing Slack messaging behavior is unchanged.
Files: `20260719142000_slack_people_shadow_mode.sql`, Slack people controller/service/repository/types/tests, Slack sender resolution, Team People UI/hook/service/navigation/tests, integration documentation

## [2026-07-19 13:42] - [FIX]

What: Added an authoritative current UTC timestamp and temporal-comparison rule to every Mission OpenClaw instruction packet.
Why: Ivy correctly received the July 22, 2026 webinar date but labeled it past during a July 19, 2026 run because Mission execution supplied no current-date reference.
Impact: Mission agents compare full calendar dates against the execution timestamp before describing deadlines or events as past, current, or upcoming.
Files: `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `apps/mission-worker/src/modules/missions/services/__tests__/mission-tool-access-smoke.test.ts`, `documentation/features/missions.md`

## [2026-07-19 13:43] - [FIX]

What: Preserve TipTap `<br>` / hard breaks as separate Markdown paragraphs during Google Docs export (also treat `<div>` like block paragraphs).
Why: Soft breaks inside a single `<p>` were stripped, so labels like Subject/Preview and Webinar date/Event collapsed onto one line in Docs.
Impact: Re-export docs after API deploy — field lines and section spacing stay separated.
Files: `html-to-google-docs-markdown.ts`, unit tests


## [2026-07-19 13:42] - [FIX]

What: Added an authoritative current UTC timestamp and temporal-comparison rule to every Mission OpenClaw instruction packet.
Why: Ivy correctly received the July 22, 2026 webinar date but labeled it past during a July 19, 2026 run because Mission execution supplied no current-date reference.
Impact: Mission agents compare full calendar dates against the execution timestamp before describing deadlines or events as past, current, or upcoming.
Files: `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `apps/mission-worker/src/modules/missions/services/__tests__/mission-tool-access-smoke.test.ts`, `documentation/features/missions.md`

## [2026-07-19 13:35] - [FIX]

What: Page Grader client listing now supports `offset` (max page 500) and ROAS Settings auto-pages until all clients are loaded (113 today), with dedupe if offset is ignored.
Why: Map clients only fetched the first 50 alphabetically, so the list stopped around “Ak…” and later clients (e.g. Multifamily Strategy) never appeared.
Impact: After `roas-api` deploy (+ Portal `roas-api` already live), Map clients shows the full Portal roster; search can find every client.
Files: Page Grader `supabase/functions/roas-api/index.ts` (deployed); ROAS `page-grader.integration.ts`, `page-grader-api.service.ts`, `page-grader.dto.ts`, api service unit test

## [2026-07-19 13:31] - [FIX]

What: Page Grader create/import now inserts campaigns with `campaign_type: 'get-more-leads'` (valid CHECK value) instead of `'strategy'`, and surfaces DB failures as `BadRequestException` instead of opaque 500s.
Why: Create & import brain failed with Internal server error because `campaigns.campaign_type` only allows `get-more-leads` | `book-more-calls` | `launch-a-webinar`.
Impact: After `roas-api` deploy, unmapped clients (e.g. 7-Figure CEOs) can create a campaign + space and import brain successfully.
Files: `apps/api/src/modules/brain/services/page-grader-client-import.service.ts`, `page-grader-client-import.service.test.ts`

## [2026-07-19 13:23] - [FIX]

What: Export Open in Google Docs via `GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN` after converting space-doc HTML to Markdown (headings, lists, tables, links, marks).
Why: `GOOGLEDRIVE_CREATE_FILE_FROM_TEXT` wrote the HTML source as plain text, so Docs showed raw tags instead of formatted content.
Impact: New exports open as real formatted Google Docs. Re-export existing docs to replace ugly HTML dumps.
Files: `html-to-google-docs-markdown.ts`, `google-drive-composio-files.service.ts`, unit tests

## [2026-07-19 13:05] - [FIX]

What: Create Google Docs via Composio `GOOGLEDRIVE_CREATE_FILE_FROM_TEXT` instead of a raw Drive upload using a Composio-extracted OAuth token; treat Composio `REDACTED` tokens as missing.
Why: Composio now redacts access tokens from `connectedAccounts.get`, so Open in Google Docs got a fake token and Google returned 401 → “Failed to create Google Doc”.
Impact: Open in Google Docs works again with a connected Google Drive account. Hard-refresh after API deploy.
Files: `google-drive-composio-files.service.ts`, `composio.service.ts` (api + agent-api), google-drive-api unit test

## [2026-07-19 12:45] - [FIX]

What: Home dashboard card order/size now persists on the user account (`profiles.preferences.home_layout`) via `PATCH /api/profile/preferences`, with a per-user localStorage cache (`vibey-home-layout:{userId}`) and one-shot migrate from the old global key.
Why: Reorder only wrote device-local `vibey-home-layout`, so layouts were lost across browsers/devices and could leak between accounts on a shared browser.
Impact: After API + web deploy, reorder Home once; the same layout loads when you sign in elsewhere. First Home visit claims any leftover global local layout into the signed-in account, then removes it.
Files: `profile.controller.ts`, `profile.service.ts`, `profile-preferences.dto.ts`, `use-home-layout.ts`, `home-layout-api.ts`, `home-cards.config.ts`, agent preference dump skip for UI blobs

## [2026-07-19 12:44] - [FIX]

What: Stopped integrations overview from remapping collapsed/disconnected Composio rows back to `connected`, clear shared `composio_connected_account_id` on duplicates, prefer active rows during personal sync, filter Manage + composio accounts to active statuses.
Why: After disconnecting Google Calendar duplicates, overview still forced every row sharing the active Composio account id to `connected`, so Manage kept showing 5× the same gmail account.
Impact: Manage shows one row per live connection (gmail + dylan@). Hard-refresh Settings → Integrations → Manage after API/web deploy.
Files: `integrations-overview.service.ts`, `integrations-overview-personal-composio-sync.ts`, `integrations-composio.service.ts`, `IntegrationsManage.tsx`, overview unit tests

## [2026-07-19 12:40] - [FEATURE]

What: One-click Page Grader **Create & import brain** for unmapped clients — creates campaign + space named after the client, queues brain import, and persists the client→campaign/space mapping.
Why: Most portal clients (e.g. 1DS Collective) have no ROAS campaign yet; Import brain looked like it required a pre-mapped campaign and did not sync mappings after create.
Impact: Unmapped rows show **Create & import brain**; mapped rows keep **Import brain**. After success the modal selects the new campaign/space without a separate Save.
Files: `page-grader-brain-import.service.ts`, `page-grader-api.service.ts` (`mergeClientScopeEntry`), `PageGraderClientScopeMapModal.tsx`, `page-grader-scope-api.ts`, brain-import unit tests

## [2026-07-19 12:36] - [FIX]

What: Shortened the webinar Copy Package instruction packet to fit the mission-plan API contract, restored the shared Dylan Super Voice rule for agent-owned steps, and added regression coverage for every generated intent field's 1,000-character limit.
Why: The V3 Webinar Fulfillment mission generated all 21 steps but Task 10's `intent.ecology` exceeded the API limit, so the worker retried the same invalid plan three times and marked the mission failed.
Impact: New webinar plans pass API validation without losing the copy formatting, review-map, or voice requirements.
Files: `apps/mission-worker/src/modules/missions/playbooks/webinar-fulfillment.playbook.ts`, `apps/mission-worker/src/modules/missions/playbooks/__tests__/webinar-fulfillment.playbook.test.ts`

## [2026-07-19 12:34] - [FIX]

What: Rebuilt Page Grader client map as a nested Radix dialog (`z-modal-layer-4`) with an explicit scroll pane utility and search.
Why: The createPortal popup sat under Workspace Settings’ focus/pointer trap, so clicks and scrolling did not work even though the UI appeared.
Impact: Hard-refresh. Map clients → dialog is interactive, searchable, and the client list scrolls.
Files: `PageGraderClientScopeMapModal.tsx`, `page-grader-client-scope-map.ts`, `globals.css` (web + website)

## [2026-07-19 12:30] - [FIX]

What: Page Grader client map modal scrolls reliably (`overflow-hidden` on the card + scrollable body) and includes a client search field.
Why: Long client lists could not be scrolled, and there was no way to find a client by name.
Impact: Hard-refresh. Open Map Page Grader clients → search and scroll the list; save still applies all draft mappings.
Files: `PageGraderClientScopeMapModal.tsx`, `page-grader-client-scope-map.ts`, `page-grader-client-scope-map.test.ts`

## [2026-07-19 12:54] - [FIX]

What: Typed collapse metadata as `Record<string, unknown>` so deleting `composio_connected_account_id` typechecks on Vercel.
Why: `roas-api` production build failed TS2551 on PR #20 merge tip.
Impact: Unblocks API deploy of the Google Calendar duplicate remap fix.
Files: `integrations-overview-personal-composio-sync.ts`
