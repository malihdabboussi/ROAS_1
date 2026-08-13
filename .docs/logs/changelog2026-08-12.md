# Changelog - August 12, 2026

## [2026-08-12 22:15] - [FEATURE]

What: Added first-class Clients and Client Campaigns workspaces to ROAS Platform, backed by an expanded Page Grader agency contract. Clients default to pipeline-stage grouping with an account-manager alternative, open into a concise overview/campaign/task/request card, and automatically bootstrap missing ROAS campaign/Brain mappings. Page Grader client campaigns reconcile to stable ROAS Spaces and appear in both all-campaign and by-client views.

Why: Agency operators need Page Grader's client context and fulfillment work inside ROAS without switching through the embedded portal or maintaining duplicate client records.

Impact: Page Grader remains authoritative for client, campaign, task, and request fields; ROAS remains authoritative for the mapped campaign container, Space experience, and Brain. Shared updates write through Page Grader, existing Brain/webhook sync continues, unmapped clients such as Clogged Club provision on first agency load, and SSO remains available.

Files: Page Grader `roas-api`; ROAS Page Grader integration/controller/agency workspace service; Clients and Client Campaigns routes, navigation, API client, focused tests; `documentation/features/page-grader-campaign-brain-sync.md`.
