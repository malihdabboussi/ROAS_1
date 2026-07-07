# Agent Runtime Instruction Architecture

Last updated: 2026-06-05
Status: Phase 6 implemented for compact protocol indexes, protocol reference files, and consolidated Space retrieval routing.

## Purpose

This document captures how Vibey agents should be modeled as a platform system, not as loose prompt files.

It exists so future work on agent sync, runtime files, skills, API docs, and instruction drift can use one shared mental model.

## Core Model

```text
Agent = identity + platform protocols + tool contracts + workflow skills + runtime state
```

Each layer has a different job:

| Layer | Job | Examples |
| --- | --- | --- |
| Identity files | Define who the agent is and how it behaves by default. | `SOUL.md`, `IDENTITY.md`, `ROLE.md`, `AGENTS.md`, `TOOLS.md` |
| Platform protocols | Define how agents operate inside Vibey. These are cross-cutting SOPs. | Space retrieval, Brain knowledge, skill usage, tool schema, planning |
| Tool contracts | Define which backend actions exist and how to call them safely. | `skills/vibey-api/SKILL.md`, `references/*.md`, `ALLOWED_ACTIONS.json` |
| Workflow skills | Define how to do specific work well. | `presentation-builder`, `funnel-builder`, `email-sequence-builder` |
| Runtime state | Define what is active right now. | `STATE.md`, active campaign/space scope, current task context |

Short version:

```text
Protocols are the operating system.
Skills are the apps.
Tool/API actions are the system calls.
Identity files are the person running the OS.
```

## Why Protocols Exist

Protocols teach platform-native behavior that every working agent needs, regardless of the asset they are creating.

A presentation skill can teach how to build a premium deck, but it should not also carry the full rules for Brain search, Space retrieval, planning, schema validation, destructive actions, delegation, and persistence. Duplicating those rules in every skill creates stale copies.

Protocols solve that by putting shared operating rules in one contract layer.

## Runtime Flow

When an agent receives a user request, the intended routing order is:

```text
1. Understand intent.
2. Apply relevant platform protocols.
3. Read the relevant workflow skill.
4. Use `vibey-api` / `describe_action` for exact action schemas.
5. Execute tool actions.
6. Persist artifacts/state.
7. Report the user-facing result.
```

Example:

```text
User: "Edit this presentation slide and use the email angle from our notes."

Protocol: Space Retrieval Protocol if the notes live in Space context.
Protocol: Skill Usage Protocol.
Skill: presentation-builder.
Tool contract: vibey-api + describe_action(patch_presentation_file).
Actions: search_space_context -> read_presentation_file -> patch_presentation_file.
Result: saved change + concise summary.
```

## Protocol Contract Implementation

Canonical protocol definitions live in:

```text
apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.ts
```

The first platform protocols are:

| Protocol | Why it matters |
| --- | --- |
| Space Retrieval Protocol | Spaces are embedded work contexts. Agents should route active Space work into semantic, query, or exact-object mode from the user's intent. |
| Brain Knowledge Protocol | Brain is durable memory split by family. Agents should search the right family before claiming remembered facts or rules. |
| Skill Usage Protocol | Skills provide workflow and craft guidance. `vibey-api` provides action contracts. Agents need both layers. |
| Tool Schema Protocol | Backend actions are strict contracts. Agents should use exact schemas instead of guessing payload keys. |
| Planning Protocol | Multi-step or risky work needs a short execution route before tool calls. Trivial reversible edits do not. |
| Persistence Protocol | Work only becomes durable when saved into the platform, attached to the right scope, and carried forward by ids/state. |
| Clarification Protocol | Agents should ask when ambiguity is expensive, destructive, publish/send related, or changes the deliverable. |
| Delegation Protocol | Leadership agents should route specialist work instead of pretending to be every specialist. |

Each protocol contract carries a numeric `version`. Generated `skills/vibey-api/SKILL.md` renders a compact protocol index with the version and reference path:

```text
| Space Retrieval Protocol | v1 | `references/protocols/space-retrieval-protocol.md` | ... |
```

The versioned index gives audit and repair a machine-checkable signal without loading full protocol bodies into the entry skill. A protocol can now be present but stale when its index version or full reference block is older than the contract.

Runtime rendering now uses the same contracts:

```text
apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts
```

`skills/vibey-api/SKILL.md` renders compact protocol rows into `## Important Patterns` when the agent has the required actions for each protocol. Full protocol bodies render into:

```text
skills/vibey-api/references/protocols/*.md
```

This keeps `vibey-api/SKILL.md` as the lightweight platform router while preserving detailed protocol instructions one file away.

Decision recorded on 2026-06-05:

```text
Keep the `vibey-api` entry skill.
Move full platform protocol bodies into `references/protocols/*.md`.
Keep compact protocol metadata and reference paths in `vibey-api/SKILL.md`.
Consolidate Space Knowledge + Space Query into one Space Retrieval Protocol with semantic, query, and exact modes.
```

## Action-To-Skill Guidance

Workflow skill links live in:

```text
apps/agent-api/src/modules/agent-sync/contracts/agent-action-skill-links.ts
```

Generated action reference files now add relevant skill guidance where a backend action needs deliverable craft. Example:

```text
Relevant skill: read `skills/presentation-builder/SKILL.md`.
```

This bridges:

```text
backend action -> workflow skill -> craft/process guidance
```

Examples:

| Action family | Relevant skill |
| --- | --- |
| Presentation actions | `presentation-builder` |
| Funnel actions | `funnel-builder` |
| Sequence/email actions | `email-sequence-builder` |
| Ad actions | `ad-builder` |
| Social content actions | `social-content-builder` / `social-publisher` |
| Project actions | `project-builder` |
| Theme actions | `theme-builder` |
| Avatar actions | `avatar-builder` |

## Canonical TOOLS.md Navigation Layer

Canonical `TOOLS.md` runtime guidance lives in:

```text
packages/agent-policy/src/platform-tools-template.ts
```

This template explains the user benefit behind each runtime layer:

- protocols help the user get faster, more accurate work without repeating context
- skills help the user receive work that follows the right workflow and quality bar
- `vibey-api` prevents broken actions from guessed fields
- state keeps the user from explaining the same project twice

`TOOLS.md` should remain a navigation layer, not the full protocol manual. It points agents toward:

```text
protocols -> skills -> vibey-api -> state
```

Future HR-created dynamic agents inherit this guidance through:

```text
apps/api/src/modules/missions/services/templates/mission-agent-template.service.ts
```

Existing platform-owned system/library `TOOLS.md` rows were repaired in the database by inserting this runtime guidance while preserving existing role-specific tool content.

## Read-Only Instruction Audit

Read-only audit service lives in:

```text
apps/agent-api/src/modules/agent-sync/services/agent-instruction-audit.service.ts
```

Internal endpoint:

```text
POST /agents/instruction-audit
```

The audit compares instruction content against the canonical protocol contracts and reports:

- `agentKey`
- `userId`
- `orgId`
- `sourceKind`
- `status`
- `missingContracts`
- `staleContracts`
- `missingRequiredConcepts`
- `contractVersions`
- `missingActions`
- `classification` / `autoRepairAllowed` / `repairPolicyReason` for `TOOLS.md` rows
- `message`

Current status:

```text
Phase 1: Contract-to-runtime generation implemented.
Phase 2: Action-to-skill links implemented.
Phase 3: Read-only audit implemented.
Phase 4: Safe platform-owned repair implemented for `vibey-api` and `TOOLS.md`.
Phase 5: Protocol versioning and custom-row repair policy implemented.
Phase 6: Compact protocol index + protocol reference files implemented; Space protocols consolidated.
```

Repair boundary:

```text
Platform template copies and generated placeholders can be repaired automatically.
User-authored custom rows and org overrides are audited and reported but not overwritten.
```

## Custom TOOLS.md Repair Policy

`source = custom` is not enough to decide repair safety. Some custom rows are generated placeholders or copied platform templates, while others contain human-authored user/org instructions.

Canonical policy lives in:

```text
apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-custom-policy.ts
```

The policy classifies `TOOLS.md` rows as:

| Classification | Repair behavior |
| --- | --- |
| `generated_placeholder` | Auto-repair allowed. Replace empty or placeholder content with canonical platform guidance. |
| `platform_template_copy` | Auto-repair allowed. Apply runtime guidance updates to platform template copies. |
| `user_authored_custom` | Auto-repair blocked. Preserve user-authored instructions. |
| `org_override` | Auto-repair blocked. Org policy changes need explicit review. |

Repair uses the audit policy output instead of only checking `source`. This keeps idempotent platform repair available while avoiding accidental overwrites of user-authored instructions.

## What Goes Where

Use this separation when adding future agent behavior.

### Put In Protocols

- Cross-cutting Vibey operating rules.
- Tool-selection SOPs that apply across many skills.
- Guidance that should stay consistent across agents.
- Rules that future drift audits should enforce.

Examples:

- Route Space work through semantic, query, or exact-object mode before choosing Space actions.
- Use the most specific Brain family before cross-Brain search.
- Read a workflow skill before creating meaningful deliverables.
- Use `describe_action` when action payload shape is uncertain.

### Put In `vibey-api`

- Action names.
- Required and optional fields.
- Accepted aliases.
- Data types.
- `useWhen` / `doNotUseWhen`.
- Example payloads.
- Links from actions to relevant protocols or workflow skills.

### Put In Workflow Skills

- Domain craft and quality bars.
- Deliverable-specific sequence.
- Examples and templates for that asset.
- Domain-specific constraints that are not universal.

Examples:

- `presentation-builder` explains slide structure, HTML bundle source, and deck quality.
- `funnel-builder` explains page flow, conversion sections, and visual standards.
- `email-sequence-builder` explains sequence logic, timing, and copy patterns.

### Put In Identity Files

- Agent role.
- Personality.
- Authority boundaries.
- Communication style.
- Team responsibility.

Identity files should not become giant tool manuals.

## Drift Problem

The platform has several instruction sources:

- DB-backed `agent_definitions`.
- DB-backed `agent_skills`.
- DB-backed `agent_skill_resources`.
- Generated runtime `skills/vibey-api/SKILL.md`.
- Generated runtime reference files.
- Runtime workspace copies written by sync.
- Code-level generators and contracts.

If these drift, agents can become confused even when the platform code is correct. A protocol can exist in code but be missing from a DB skill or stale runtime workspace.

This is why Phase 0 defines machine-checkable contracts before adding repair automation.

## Audit And Repair Direction

The audit should compare:

```text
contract definitions
-> generated vibey-api output
-> DB-backed skill rows
-> runtime workspace files
```

The audit reports:

- missing protocols
- stale platform skills
- stale resources
- org/user overrides shadowing newer platform guidance
- runtime files not synced after DB/code changes
- action docs missing relevant skill/protocol links

Repair mode updates only policy-approved generated/platform rows and must not overwrite user-authored custom or org override content.

## Design Principle

Do not put everything everywhere.

```text
Cross-cutting SOPs -> protocols
Exact action payloads -> vibey-api
Deliverable craft -> workflow skills
Identity/personality -> SOUL / ROLE / IDENTITY
Active context -> STATE, Brain, Space retrieval
```

This separation is what lets the agent platform scale across more agents, more users, and enterprise clients without every new capability creating another stale prompt copy.
