# Changelog - August 17, 2026

## [2026-08-17 01:30] - [FIX]

What: Empty Slack Brain imports no longer toast "Nothing to save from that Slack period." The notifier still acknowledges those skipped/empty jobs so they do not repeat.

Why: Daily Slack channel sync can finish several empty windows seconds apart. Each one toasted the same info message on top of chat.

Impact: Chat is not interrupted when Slack had nothing to save. Real import successes and real failures still toast.

Files: `apps/web/src/features/brain/components/brain-import-job-toast.ts`, `BrainImportJobNotifier.tsx`, `documentation/features/page-grader-campaign-brain-sync.md`

## [2026-08-17 00:45] - [FIX]

What: Fixed the chat HTML artifact PR so `next build` typecheck passes: `ChatMarkdownDocument` now types the mermaid/code/markdown segment union, and unused download mock params are prefixed.

Why: Vercel `roas-web` failed on PR #243 because `flatMap` inferred an incompatible segment union and `noUnusedParameters` flagged the artifact download mocks.

Impact: Preview deploy for clickable chat HTML/CSS/SVG cards can compile. Merge of `main` into `claude/chat-code-artifacts` is included.

Files: `apps/web/src/components/chat/ChatMarkdownDocument.tsx`, `apps/web/src/lib/chat/chat-code-artifact.test.ts`

## [2026-08-17 00:09] - [FIX]

What: Stop Spaces `?space=&item=` deep-link crash (React #185) by ending the missing-space reload storm, preferring URL space on load, resolving missing spaces via fetch-by-id once, and stabilizing org/work-context updates on Open ROAS task links.

Why: Opening a finalized Service Request task white-screened the app. Console showed Maximum update depth exceeded; `useSpaceUrlViewSync` reloaded on every `spaces` identity change when the target space was absent (wrong org / beyond first page), cascading setStates.

Impact: Open ROAS task / `/spaces?space=&item=` deep links no longer infinite-loop; org-param switches clear stale space snapshots; work-context updates no-op when unchanged.

Files: apps/web/src/features/spaces/hooks/use-space-url-view-sync.ts, apps/web/src/features/spaces/hooks/use-space-url-view-sync.test.ts, apps/web/src/features/spaces/store/use-spaces-store.ts, apps/web/src/features/spaces/containers/SpacesContainer.tsx, apps/web/src/components/global-chat/store/use-global-chat-store.ts, apps/web/src/components/shell/ShellRightPanelConnections.tsx, apps/web/src/app/(dashboard)/providers.tsx
