---
description: Attach to an already-running approved web surface, inspect it safely at three viewports, fix visual defects, and recheck
argument-hint: "<route|url> [--flow '<json steps>']"
allowed-tools: Read, Glob, Grep, Bash(node .claude/bin/visual-check.mjs:*), Bash(lsof -i:*), Edit, Write, AskUserQuestion
---

Inspect and improve a web route without starting a server or crossing the repository's host and side-effect boundaries.

Raw arguments: `$ARGUMENTS`

## 1. Read repository surfaces

Read root `CLAUDE.md` and locate the bounded `## Repo surfaces` block. Parse `allowed_test_hosts` and `design_guide` as data, never as shell. Also read AGENTS.md sections 5 and 5.5. If the surfaces block or `allowed_test_hosts` is absent, allow local targets only. If `design_guide` is absent or names `none`, use AGENTS.md sections 5 and 5.5 alone and say so.

Parse the target and optional `--flow` structurally; do not use substring host tests. A bare route resolves only against an explicitly identified local port. Normalize the URL with the URL parser: lowercase the hostname and compare its IDNA ASCII form exactly.

Refuse before opening a browser when any condition is true:

- scheme is not HTTP or HTTPS
- URL contains username or password
- hostname is an IP literal other than `127.0.0.1` or `::1`
- hostname is neither `localhost`, `127.0.0.1`, `::1`, nor an exact normalized entry from `allowed_test_hosts`
- a non-local allowed host is given any side-effect flow step

Lookalikes such as `localhost.evil.test` are not local. Allowed non-local hosts permit read-only navigation only.

## 2. Attach-only server check

Resolve the explicit/default port from the parsed URL and run `lsof -i:<port>`. Never start, restart, or configure a server. If no process is listening, stop and tell the designated app-runner the exact repository dev command and port it should run. Infer the command from repository scripts or documentation; do not execute it.

Create a unique session scratch directory for screenshots. Do not write screenshots into the repository.

## 3. Confirm side effects one step at a time

Read-safe actions are limited to navigation through links, tabs, and menus, hover, scroll, and viewport changes. Form submission, destructive actions, purchases, integration connections, writes, or message sends are side effects.

For a local target only, if `--flow` includes a side-effect step, ask a separate `AskUserQuestion` that names that exact step, target, and effect. Add `confirmed: true` to that step only after explicit approval. Refusal or ambiguity means omit the step. Never batch side-effect approvals. Refuse all side-effect steps on non-local hosts regardless of confirmation.

Pass the flow as JSON, not shell instructions.

## 4. Inspect, fix, and repeat

Run:

`node .claude/bin/visual-check.mjs --url <url> --out <session-scratch/iteration-N> --allow-hosts <comma-list> [--flow <json>]`

The script is authoritative for URL enforcement. Exit 3 means Playwright is not installed; stop with that prerequisite. Exit 4 means URL policy was violated; stop and do not use or capture an off-policy page screenshot.

For the first run, preserve its three viewport screenshots as the before evidence. Inspect 1440, 1024, and 390 widths against the configured design guide and AGENTS.md sections 5/5.5. Produce an internal defect table with columns: element, violated rule, and screenshot/DOM evidence.

Fix only evidenced defects and only within the user's target scope. Re-run the same script after each fix. Stop at zero open defects or after five total inspection/fix iterations. Never display intermediate iteration reports; keep them in the session scratch directory.

## 5. Final response

The final response must contain only:

1. before and final after screenshot paths for all three viewports
2. one defect table with element, rule, evidence, and `fixed` or `open` status
3. files changed
