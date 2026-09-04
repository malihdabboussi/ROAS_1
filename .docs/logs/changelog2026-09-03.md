# Changelog - September 03, 2026

## 2026-09-03 14:13 - [FIX]

What: Closed nested-shell bypasses in the portable Git safety hook, added regression coverage for common wrapper forms, made off-policy browser redirects return the required policy-block result even when navigation itself fails, and rejected symbolic links in installer payloads.

Why: The command-set release claimed default-branch pushes, PR merges, redirects, and portable file copying were fail-closed, but wrapped Git commands bypassed the top-level parser, redirect network errors could mask an already-detected host-policy violation, and copied symlinks could dereference content outside the portable payload.

Impact: Dangerous Git and GitHub operations are rejected consistently across direct and common nested Bash forms, browser redirects preserve the explicit policy-violation exit contract, and installation cannot copy through source-controlled symlinks.

Files: `.claude/hooks/guard-git.sh`, `.claude/harness/test-guard-git.sh`, `.claude/bin/visual-check.mjs`, `.claude/bin/install.sh`.

## 2026-09-03 20:38 - [FEATURE]

What: Removed the sidebar More container and promoted Programs, Team, Brain, Projects, and Flows to direct entries in the Simple, compact, Advanced, and mobile sidebars.

Why: Core destinations should be immediately visible in the main navigation instead of being hidden behind a secondary menu.

Impact: All former More destinations are now one interaction away. Projects remains admin-only and opens the existing project list and creation flyout; account controls remain in the sidebar footer.

Files: `apps/web/src/components/layout/sidebar/*`, `apps/web/src/components/layout/config/sidebar-messages.config.ts`, `documentation/features/claude-chatgpt-shell.md`.
