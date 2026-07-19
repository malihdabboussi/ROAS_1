# Changelog - July 19, 2026

## [2026-07-19 12:36] - [FIX]

What: Shortened the webinar Copy Package instruction packet to fit the mission-plan API contract, restored the shared Dylan Super Voice rule for agent-owned steps, and added regression coverage for every generated intent field's 1,000-character limit.
Why: The V3 Webinar Fulfillment mission generated all 21 steps but Task 10's `intent.ecology` exceeded the API limit, so the worker retried the same invalid plan three times and marked the mission failed.
Impact: New webinar plans pass API validation without losing the copy formatting, review-map, or voice requirements.
Files: `apps/mission-worker/src/modules/missions/playbooks/webinar-fulfillment.playbook.ts`, `apps/mission-worker/src/modules/missions/playbooks/__tests__/webinar-fulfillment.playbook.test.ts`


## [2026-07-19 12:14] - [FIX]

What: Added `page_grader` to `INTEGRATION_IDS_FOR_OVERVIEW` and vault-linked protection so Page Grader stays visible as connected after a successful connect.
Why: Connect stored vault secrets + `user_integrations` and showed a success toast, but overview never queried `page_grader`, so Library/Manage still offered Connect.
Impact: After `roas-api` deploy, refresh Settings → Integrations; Page Grader appears connected (Map clients). No reconnect needed if credentials already saved.
Files: `apps/api/src/modules/integrations/services/integrations-overview.service.ts`, overview service test, changelog

## [2026-07-19 12:29] - [FIX]

What: Collapse duplicate `user_integrations` rows that share the same Composio connected-account id during personal overview sync; cleaned existing Google Calendar duplicates for the affected user.
Why: Reconnect races left 5 connected rows for one Google Calendar Composio account, so Manage listed the same email repeatedly.
Impact: Overview keeps one canonical row per Composio connection; Manage shows one entry per real account. Existing duplicates disconnected immediately in prod DB.
Files: `integrations-overview-personal-composio-sync.ts`, overview service test
