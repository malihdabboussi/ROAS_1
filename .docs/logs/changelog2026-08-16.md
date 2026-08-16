# Changelog - August 16, 2026

## [2026-08-16 23:48] - [FIX]

What: ChatGPT-style work summary: empty Outputs/Sources/Tasks/Connections start collapsed; loading uses skeleton bars instead of a Loading label; the panel docks as an in-flow column at ≥1024px chat-pane width and stays closed (header overlay) when narrower; Summary and Show page sit together in the chat header top-right. Slack chats seed as `Slack Chat` and wait for a Gemini topic title instead of using the first message as the Recents name.

Why: Empty sections opened with a loading flash then empty art; Slack Recents rows were first-message dumps; the summary overlaid chat and its toggle sat apart from Show page.

Impact: Wide chats show a right-hand summary column by default. Narrow chats keep it closed until the header toggle. Slack (and other first-message titles) get a short generated topic when Gemini returns one.

Files: `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/shell/ShellRightPanelSkeleton.tsx`, `apps/web/src/components/shell/use-summary-panel-docked.ts`, `apps/web/src/components/shell/ShellChatHeaderPageControl.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.tsx`, `apps/web/src/lib/conversations/conversation-title.ts`, `apps/api/src/modules/slack/services/slack-conversation-title.ts`, `documentation/features/claude-chatgpt-shell.md`


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
