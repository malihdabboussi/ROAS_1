# Changelog - September 03, 2026

## 2026-09-03 14:13 - [FIX]

What: Closed nested-shell bypasses in the portable Git safety hook, added regression coverage for common wrapper forms, made off-policy browser redirects return the required policy-block result even when navigation itself fails, and rejected symbolic links in installer payloads.

Why: The command-set release claimed default-branch pushes, PR merges, redirects, and portable file copying were fail-closed, but wrapped Git commands bypassed the top-level parser, redirect network errors could mask an already-detected host-policy violation, and copied symlinks could dereference content outside the portable payload.

Impact: Dangerous Git and GitHub operations are rejected consistently across direct and common nested Bash forms, browser redirects preserve the explicit policy-violation exit contract, and installation cannot copy through source-controlled symlinks.

Files: `.claude/hooks/guard-git.sh`, `.claude/harness/test-guard-git.sh`, `.claude/bin/visual-check.mjs`, `.claude/bin/install.sh`.
