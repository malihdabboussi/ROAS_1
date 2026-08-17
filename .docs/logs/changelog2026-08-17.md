# Changelog - August 17, 2026

## [2026-08-17 00:45] - [FIX]

What: Fixed the chat HTML artifact PR so `next build` typecheck passes: `ChatMarkdownDocument` now types the mermaid/code/markdown segment union, and unused download mock params are prefixed.

Why: Vercel `roas-web` failed on PR #243 because `flatMap` inferred an incompatible segment union and `noUnusedParameters` flagged the artifact download mocks.

Impact: Preview deploy for clickable chat HTML/CSS/SVG cards can compile. Merge of `main` into `claude/chat-code-artifacts` is included.

Files: `apps/web/src/components/chat/ChatMarkdownDocument.tsx`, `apps/web/src/lib/chat/chat-code-artifact.test.ts`
