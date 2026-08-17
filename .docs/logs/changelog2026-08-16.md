# Changelog - August 16, 2026

## [2026-08-16 23:53] - [FIX]

What: Service Request “Open ROAS task” links now include the owning `org` query param, and `/spaces/{spaceId}?item=…` Portal-style paths redirect to the canonical `/spaces?space=&item=` route.

Why: Review lives outside the dashboard org bootstrap, so opening a task without `org` could land in the wrong workspace. Portal/ClickUp still emit path-style Space URLs that had no app route.

Impact: New finalize receipts open the correct org Space and deep-link the item; Portal-style Space URLs no longer 404.

Files: `work-request-review-security.ts`, `apps/web/src/app/(dashboard)/spaces/[spaceId]/page.tsx`, `space-item-href.ts`, related tests

## [2026-08-16 23:51] - [FIX]

What: Service Request client (and other long) choice steps now use a searchable closed dropdown that shows the selected client, with a **Continue** CTA on the step card. Composer **Send** stays the regular chat input action.

Why: The open numbered client list forced scrolling to find a preselected client, and Send on the composer felt like the step action.

Impact: Preselected clients appear on the dropdown trigger; Continue advances the step; Send only sends chat replies.

Files: `WorkRequestChatFlowParts.tsx`, `work-request-chat-steps.ts`, related tests

## [2026-08-16 23:48] - [FIX]

What: Service Request chat review now uses a team-member assignee dropdown, on-brand due-date calendar, asset link adder (no `Name | URL` textarea), and drops the dependencies step. Also stopped ClickUp mirrors from duplicating Notes/Source folder/Context/Operator note (no redundant `source_excerpt`, no `notes=description` copy, operator note only via top-level `note`).

Why: ClickUp showed the brief twice, and the review chat still used confusing free-text assignee / native date / dependency fields.

Impact: New reviews ask clearer fields; new finalizations mirror a single ClickUp body. Apply migration `20260816234500_work_request_finalize_notes_dedupe.sql`. Existing ClickUp tasks are unchanged.

Files: work-request chat steps/UI, page-grader send helpers, finalize migration, related tests

## [2026-08-16 15:38] - [FIX]

What: Broadened Pixel Service Request routing to every fulfillment type (design/copy/funnel/ghl/ad/video/other/general). Policy + vibey/atlas skills now forbid silent `create_task` for client fulfillment and require client name, draft status, and an openable `review_url` in the reply. Added DB migration so live agent skills/TOOLS pick this up.

Why: Pixel treated “make a task / ASAP” video (and similar) work as a native task, so Slack got no client confirmation and no continue/review link.

Impact: After migrate + agent sync/deploy, client fulfillment asks should create a Service Request draft and confirm client + openable review link instead of a bare “Created: …” native task.

Files: `packages/agent-policy/src/platform-tools-template.ts`, `docker/agents/vibey/skills/page-grader-operator/SKILL.md`, `docker/agents/atlas/skills/page-grader-operator/SKILL.md`, `docker/agents/atlas/skills/vibey-api/SKILL.md`, `docker/agents/templates/delegator/skills/delegation-desk/SKILL.md`, `supabase/migrations/20260816224000_service_request_all_types_intake.sql`, related tests

## 2026-08-16 03:15 - [FEATURE]

**What:** Added the canonical Service Request draft, public review, exactly-once native task finalization, Page Grader/ClickUp mirror, signed intake/refresh webhooks, Slack reminder processing, and mobile public review page.

**Why:** ROAS Platform must own draft authority and final task identity while Page Grader remains an onboarding and fulfillment mirror adapter.

**Impact:** Signed Page Grader intake now returns a 24-hour draft review link. Reviewers can safely complete scoped context before one native Space task is created; mirror failures retain that canonical task for retry.

**Files:** `supabase/migrations/20260816030000_work_request_drafts.sql`, `apps/api/src/modules/work-requests/`, `apps/api/src/app.module.ts`, `apps/web/src/app/request-review/`, `apps/web/src/features/work-requests/`, `apps/web/src/lib/work-requests/`, `apps/web/src/app/api/proxy/[...path]/route.ts`, `docker/agents/atlas/skills/page-grader-operator/SKILL.md`, `documentation/frontend-shared-surfaces.md`
