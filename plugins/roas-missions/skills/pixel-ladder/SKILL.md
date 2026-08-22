---
name: pixel-ladder
description: >-
  Execute or report the Pixel Ladder & Process 1–30 validation runbook for ROAS. Use when the
  user mentions Pixel Ladder, Pixel process tests, the 30 Pixel missions/checks, Slack spine,
  Connections binding, Brain retrieval, Pixel QC, or asks Claude to validate Pixel end to end.
argument-hint: '[optional item numbers or constraints]'
---

# Validate the Pixel Ladder

Read [the canonical runbook](references/pixel-ladder-runbook.md) before acting. It defines the 30 checks, safe fixtures, deployment gates, and evidence required for each item.

## Preflight

1. Generate a unique run label such as `pixel-ladder-YYYYMMDD-HHMM` and use it in mission titles and notes.
2. Determine which required surfaces are currently available: ROAS MCP, Claude browser access, Slack connector/session, GitHub/deployment visibility, and read-only production database access.
3. Classify every requested item before execution:
   - `READY`: dependency is live and the required surface is available.
   - `BLOCKED`: dependency, credential, fixture, approval, or external surface is unavailable.
   - `NOT BUILT`: the runbook explicitly marks the capability unimplemented.
4. Never turn missing access into a product failure. Record it as `BLOCKED` with the missing prerequisite.

## Execute

- Use channel `2` or a direct Pixel message for Slack fixtures. Never post fixtures into client channels.
- Ask for explicit approval immediately before any live Slack posting or other externally visible fixture if the user has not already approved that exact live run.
- Keep production database validation read-only. The runbook's production project id is authoritative; abort if the resolved project differs.
- Use the ROAS mission workflow when a check needs Pixel or another ROAS agent to perform bounded work. Include the item number, exact acceptance criteria, fixture, and run label in the brief.
- Use direct read tools for evidence. Mission creation, planning text, or an agent's unsupported statement is not proof.
- Run safe independent checks in batches, but keep evidence attributable to one item.
- Do not run deploys, migrations, cleanup scripts, one-time backfills, or UI “Populate brains” writes unless the user explicitly authorizes that operation.

## Evidence and verdicts

For each item, emit exactly:

`#N PASS|FAIL|BLOCKED — evidence — notes`

- `PASS`: observed output satisfies every acceptance criterion.
- `FAIL`: the dependency was available and exercised, but observed behavior violated a criterion.
- `BLOCKED`: the check could not be validly exercised, including `NOT BUILT` items.

Include exact conversation/mission ids, timestamps, reply links, tool receipts, deploy ids, or read-only query output as applicable. Never infer a PASS from code presence alone.

## Examples

**Deploy gate:** Item 17 is merged but the required agent-api deploy cannot be verified. Report `#17 BLOCKED — agent-api deployment unavailable — code presence is not live behavior evidence`.

**Observed regression:** Item 3 runs through a Pixel DM, and the trace shows a client lookup for the haiku request. Report `#3 FAIL — <conversation id and timestamp>; list_clients called — general DM incorrectly entered client resolution`.
