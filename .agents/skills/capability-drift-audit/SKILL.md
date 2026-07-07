---
name: capability-drift-audit
description: Audit drift across Vibey agent tool and action capability surfaces, then create or update known-gap guardrail tests and Markdown reports. Use when checking whether an action family is consistently exposed through executable schemas, registries, policies, MCP catalogs, generated vibey-api skill docs, protocol references, runtime artifacts, or production DB-backed agent skill rows; use for Flow, Space Builder, Brain, media, content/artifacts, contacts, tasks/missions, integrations, skill-management, or campaign capability drift.
---

# Capability Drift Audit

## Overview

Use this skill to turn "does this agent really have this capability?" into a deterministic audit. Compare the same action family across source-of-truth layers, preserve current gaps as an expected baseline, and write a report that separates contract drift from intentional product gaps.

Read `references/vibey-capability-surfaces.md` when you need the full surface matrix, file map, report structure, or examples.

## Workflow

1. Define the capability family in concrete action terms. Example families: Flow actions, Space schema mutation, Brain search/write, media generation, contacts, tasks/missions, MCP integrations.
2. Identify the intended consumers. Distinguish Loop/system agents, managed agents, MCP clients, generated runtime skills, and UI/editor surfaces.
3. Read the relevant executable source first: hard action schemas, DTOs, registries, handlers, policy allowlists, MCP catalog entries, generated skill/action docs, and protocol references.
4. Build a focused known-gap test. The test should pass with today's known drift and fail when a new unclassified gap appears. When a gap is fixed, shrink the expected baseline.
5. Write a Markdown audit report beside the other Vibey plans. Include compared surfaces, current drift rows, direct product gaps, likely failure points, recommended fix order, and acceptance criteria.
6. If the user asks about production/runtime truth, verify DB-backed `agent_definitions`, `agent_skills`, generated runtime files, and deployed runtime artifacts. Local source tests alone do not prove production sync.

## Test Rules

- Prefer tests that compare structured exports over regex scans.
- Keep the baseline explicit and readable, usually as formatted strings or table-like rows.
- Do not make CI fail for known drift just to prove the drift exists. Lock the known gaps, then shrink the list as fixes land.
- Separate `missing in surface`, `surface-only`, `requiredness mismatch`, `policy missing`, `docs missing`, and `not implemented anywhere`.
- Include at least one positive capability test for the critical intended path, not only drift rows.
- Do not treat model self-scores, flow compile success, or generated prose as quality proof.

## Examples

**Flow catalog audit**

Compare `packages/api-shared/src/types/flow-capabilities.ts` with the published automation DTO schemas. Report fields hidden from Loop, fields exposed only in the catalog, and required/optional mismatches.

**Space Builder audit**

Compare Space mutation actions across `ACTION_SCHEMAS`, `VALID_ACTIONS`, `ACTION_METHOD_MAP`, policy allowlists, MCP catalog, generated `vibey-api` docs, and instruction contracts. Distinguish "status can be added through `update_space_field`" from missing direct helpers like `append_space_field_option`.

**Runtime/production audit**

When a system agent still behaves incorrectly after source changes, query DB-backed skill/definition rows and inspect generated runtime artifacts before claiming the fix reached production.
