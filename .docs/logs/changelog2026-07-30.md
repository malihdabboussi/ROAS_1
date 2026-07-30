# Changelog - July 30, 2026

## 2026-07-30 12:16 - [FIX]

**What:** Preserved bounded originating-chat evidence and Space/campaign scope across direct agent delegation, added a corrective provider-verification pass for unsupported missing-call responses, and repaired Delegator's Fathom/meeting retrieval instructions for existing and future runtimes.

**Why:** Delegator received only the shortened task description, then searched local workspace context without checking the connected Fathom source and incorrectly reported that an available call was missing.

**Impact:** Delegated meeting work can reuse the source chat's known task and call details, retrieve the matching provider transcript, and no longer asks users to resend a recording before accessible evidence sources have been checked.

**Files:** `apps/agent-api/src/modules/artifacts/`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/api/src/modules/space-templates/data/__tests__/delegation-desk-provisioning.contract.test.ts`, `docker/agents/templates/delegator/TOOLS.md`, `supabase/migrations/20260730121500_repair_delegator_meeting_retrieval.sql`, `documentation/features/spaces-automation.md`
