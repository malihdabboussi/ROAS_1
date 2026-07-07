---
name: plan-creator
description: Creates hard-thought, zero-speculation implementation plans with exact file-level change maps. Use when the user asks for a meticulous plan, implementation plan, feature plan, architecture plan, step-by-step build plan, or asks how to take an idea from today to production-grade execution.
---

# Plan Creator

## Purpose

Create a hard thought and well written in depth plan that has a step by step implementation plan, has 0 speculations or hallucinations, and knows exactly where in each file code should be changed.

Use this skill to turn a rough request into a precise implementation plan before code changes.

## Non-Negotiables

- Do not invent APIs, tables, files, functions, routes, schemas, behavior, or product requirements.
- Do not write code while planning unless the user explicitly asks for implementation.
- Every technical claim must be backed by repository evidence, runtime evidence, documentation, or listed as unknown.
- If evidence is missing, stop and list the smallest experiment needed to obtain it.
- Prefer the existing project architecture, naming, API patterns, services, and tests over new abstractions.
- Plan the smallest complete path that satisfies the user's exact request.
- Do not add fallbacks, safety nets, or extra scope unless the user explicitly asks.

## Required Workflow

### 1. Parse The Exact Request

Extract only what the user asked for:

- Goal
- In scope
- Out of scope
- Required deliverable
- Acceptance criteria stated by the user
- Open questions that block a correct plan

If the request is ambiguous, ask only the minimum blocking questions.

### 2. Gather Evidence First

Before producing the plan, inspect the real system:

- Read the full target files, not excerpts.
- Search for all existing implementations of the same pattern.
- Search for all callers and consumers of the target behavior.
- Read required project guidelines for the affected area.
- Check package scripts, tests, schemas, API docs, and types that define the contract.
- Check git history when the reason for existing code is unclear.

Use MCP servers when they are the source of truth for the question:

- Supabase for database schema, SQL, migrations, RLS, and stored data.
- Vercel for deployments, logs, env vars, and production behavior.
- Sentry for production incidents.
- Context7 for current library documentation.
- Browser MCP for UI flow verification.

### 3. Build The Evidence Pack

Before choosing an approach, collect:

- Existing files and symbols involved.
- Current data flow from input to storage to output.
- Existing API contracts and schemas.
- Existing auth, permissions, rate limit, and validation patterns.
- Existing tests and missing test coverage.
- Existing docs that need updates.
- Known constraints from package versions, environment, deploy target, or runtime.

Do not proceed from memory if the repo can answer it.

### 4. Identify The Root Design

Explain the current system in plain language:

- What happens today.
- Where the new behavior belongs.
- Which existing boundary owns it.
- Which files should change and which should not.
- What old code would be replaced, if any.

If more than one design is possible, present the options with trade-offs and recommend one.

### 5. Produce The Implementation Plan

The plan must be file-specific and ordered:

```markdown
## Architect Summary

[Plain-English explanation of what will be built, why this is the right shape, and what changes for the user.]

## Evidence Pack

- `[path]`: [what evidence this file provides]
- `[path]`: [what evidence this file provides]

## Recommended Approach

[One approach, with why it fits the existing system.]

## Step-By-Step Implementation Plan

1. `[path]`
   - Change: [exact function/type/route/component/schema to add/edit/remove]
   - Why: [reason tied to evidence]
   - Contract: [inputs/outputs/auth/data behavior]
   - Tests: [specific tests to add/update]

2. `[path]`
   - Change: [exact change]
   - Why: [reason tied to evidence]
   - Contract: [inputs/outputs/auth/data behavior]
   - Tests: [specific tests]

## Data And Contract Map

- Input:
- Validation:
- AuthZ/AuthN:
- Storage:
- Output:
- Side effects:
- Idempotency:

## Test Plan

- Unit:
- Integration:
- E2E or manual:
- Regression:

## Rollout And Verification

- Commands to run:
- Logs/metrics to inspect:
- Feature flags or deploy steps:
- Rollback path:

## Missing Evidence

- [Unknown]:
  - Smallest experiment:
  - Risk if skipped:
```

### 6. Quality Gate

Before finalizing the plan, verify:

- The plan only covers the user's request.
- Every changed file path exists or is intentionally new.
- Every new file has a clear owner and reason.
- Every changed symbol was found in the repo or is explicitly new.
- Every API/schema claim has evidence.
- Tests cover the risky parts.
- Old code removal is included when new code replaces old code.
- Documentation and changelog updates are included only when required by project rules.
- Unknowns are listed instead of guessed.

## Output Rules

- Start with the Architect Summary.
- Then provide Technical Evidence.
- Use exact file paths in backticks.
- Use short paragraphs and concrete bullets.
- Do not use vague phrases like "probably", "maybe", "should be easy", or "just".
- If the correct plan cannot be made yet, return Missing Evidence instead of guessing.
