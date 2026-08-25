# Changelog - August 25, 2026

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
