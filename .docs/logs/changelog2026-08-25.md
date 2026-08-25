# Changelog - August 25, 2026

## 2026-08-25 11:03 - [FIX]

What: Made the global Client Workspace selector independently scrollable, added a fixed search field, and hid inactive, blocked, and churned clients by default using the canonical Clients list pipeline rules.

Why: The complete client catalog expanded beyond the viewport and could not be navigated efficiently.

Impact: Users can scroll the client rows without losing the selector header or search, see active clients by default, and still find inactive accounts by searching for them.

Files: `apps/web/src/components/client-scope/ClientScopeSelector.tsx`, `apps/web/src/components/client-scope/ClientScopeSelector.test.tsx`, `documentation/utilities/client-scope.md`
