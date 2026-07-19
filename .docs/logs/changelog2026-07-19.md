# Changelog - July 19, 2026


## [2026-07-19 12:14] - [FIX]

What: Added `page_grader` to `INTEGRATION_IDS_FOR_OVERVIEW` and vault-linked protection so Page Grader stays visible as connected after a successful connect.
Why: Connect stored vault secrets + `user_integrations` and showed a success toast, but overview never queried `page_grader`, so Library/Manage still offered Connect.
Impact: After `roas-api` deploy, refresh Settings → Integrations; Page Grader appears connected (Map clients). No reconnect needed if credentials already saved.
Files: `apps/api/src/modules/integrations/services/integrations-overview.service.ts`, overview service test, changelog
