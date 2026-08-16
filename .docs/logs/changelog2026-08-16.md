# Changelog - August 16, 2026

## [2026-08-16 23:30] - [STYLE]

What: Removed the Home / New chat Try-tip banner and the Mission/Offer/artifact chip row above the composer. Active chats now show a rotating multi-concept Try-tip catalog (dismiss skips to the next remaining tip). Deleted `ShellEmptyChatQuickStartPills`.

Why: The Home composer was too cluttered, and the same tip stayed pinned on the landing screen instead of alternating useful concepts inside real chats.

Impact: Home stays greeting + input + Choose Space/Plugins. Open conversations get rotating tips. Create actions remain in the + Create menu.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/lib/chat/composer-try-tips.ts`, `apps/web/src/components/global-chat/components/ChatComposerTryTip.tsx`, deleted `apps/web/src/components/shell/ShellEmptyChatQuickStartPills.tsx`, related tests, `documentation/features/claude-chatgpt-shell.md`

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
