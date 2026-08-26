# Changelog - August 26, 2026

## 2026-08-26 10:28 - [FIX]

What: Made the Home New Chat composer inherit the globally selected Client Workspace campaign and prefer its mapped General Space, with a mapped-Space fallback.

Why: New Chat remained unscoped even while the platform-wide client filter was active.

Impact: The composer displays the selected client context immediately and seeds new conversations with the same client campaign and Space IDs.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `documentation/utilities/client-scope.md`

## 2026-08-26 10:36 - [FIX]

What: Made Page Grader Campaign Brain sync readiness depend on embedded Page Grader memories in the mapped `ns_brains` record, and fail deterministic imports when embedding repair is incomplete.

Why: A generic Campaign Knowledge row could mark catch-up successful while all Campaign Brain memories remained unembedded, causing Pixel to ask for onboarding details that already existed in the client package and Slack context.

Impact: Incomplete imports remain retryable, cannot advance sync stamps or success jobs, and catch-up repairs mapped clients until their Page Grader context is retrievable by chat.

Files: `apps/api/src/modules/integrations/page-grader/repositories/page-grader-brain-sync.repository.ts`, `apps/api/src/modules/integrations/page-grader/repositories/page-grader-brain-sync.repository.test.ts`, `apps/api/src/modules/brain/services/page-grader-brain-package-ingest.service.ts`, `apps/api/src/modules/brain/services/__tests__/page-grader-brain-package-ingest.service.test.ts`, `documentation/features/page-grader-campaign-brain-sync.md`
