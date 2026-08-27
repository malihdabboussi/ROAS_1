# Changelog - August 25, 2026

## 2026-08-25 12:05 - [TEST]

What: Added a fail-closed ROAS entrypoint for the Page Grader and ClickUp task lifecycle E2E.

Why: The migration had focused tests and manual evidence, but no durable command that proves the task lifecycle across both repositories and ClickUp.

Impact: Maintainers can explicitly opt into a live test that verifies outbound priority and comment sync, inbound webhook activity, and restores the selected task afterward.

Files: `package.json`, `scripts/e2e/roas-clickup-task-lifecycle.mjs`

## [2026-08-25 09:00] - [STYLE]

What: Moved the Client Campaigns New campaign action into the shared search and filter controls row.

Why: The primary creation action was visually detached above the controls it belongs with.

Impact: Search, grouping, inactive visibility, and campaign creation now sit in one responsive toolbar while the existing Pixel chat creation flow remains unchanged.

Files: `apps/web/src/features/agency-clients/ClientCampaignsPage.tsx` and `apps/web/src/features/agency-clients/ClientCampaignsPage.test.tsx`.

## 2026-08-25 11:03 - [FIX]

What: Made the global Client Workspace selector independently scrollable, added a fixed search field, and hid inactive, blocked, and churned clients by default using the canonical Clients list pipeline rules.

Why: The complete client catalog expanded beyond the viewport and could not be navigated efficiently.

Impact: Users can scroll the client rows without losing the selector header or search, see active clients by default, and still find inactive accounts by searching for them.

Files: `apps/web/src/components/client-scope/ClientScopeSelector.tsx`, `apps/web/src/components/client-scope/ClientScopeSelector.test.tsx`, `documentation/utilities/client-scope.md`

## 2026-08-25 11:29 - [STYLE]

What: Replaced the selected client name in the global selector trigger with a compact `1` count and pinned the selected client directly beneath **All clients** in the menu.

Why: Keep the sidebar control compact while leaving the active client name immediately visible when the selector opens.

Impact: A selected scope consumes less header space, and users can confirm or change the current client from the first client row.

Files: `apps/web/src/components/client-scope/ClientScopeSelector.tsx`, `apps/web/src/components/client-scope/ClientScopeSelector.test.tsx`, `documentation/utilities/client-scope.md`
