---
description: Interview a goal to a measured implementation spec, prepare a safe worktree, and send it through Codex consensus review
argument-hint: "<goal>"
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(git log:*), Bash(git worktree:*), Bash(codex --version), Bash(codex login status), AskUserQuestion, Write(.omc/**)
---

Turn the raw goal into a reviewable spec through a self-contained deep interview, then prepare its execution worktree before handing control to the existing consensus-review command.

Raw arguments: `$ARGUMENTS`

## 0. Preflight

Complete this before asking interview questions or writing a spec. Fail closed and give the stated repair instruction for every failed check.

1. `codex --version` must succeed and report version 0.130 or newer. Otherwise stop and tell the user to install or upgrade the Codex CLI.
2. `codex login status` must report a logged-in ChatGPT session. Otherwise stop and tell the user to run `codex login` and choose ChatGPT sign-in.
3. Both user-level files must exist:
   - `~/.claude/commands/codex-consensus/codex-review.md`
   - `~/.claude/commands/codex-consensus/codex-execute.md`
   If either is absent, stop and tell the user to install the `codex-consensus` user commands.
4. Read the consensus-review command's Step 0 model-access probe and run that exact probe with the same model. Write its prompt to the session scratch directory, pass it to `codex exec` through stdin using `-`, write the final response through `-o` to a unique file, and capture stderr in a separate file. Stop on a missing output, non-empty authentication error, or any response other than exactly `OK`. Never retry an authentication failure or silently choose another model.

There is no `gh` preflight for `/go`.

Print `Deep Interview threshold: 10% (source: ./.claude/settings.json)` after preflight. If the settings key is missing, still use the frozen 0.10 threshold and identify the source as the command contract.

## 1. Establish interview type

Use `$ARGUMENTS` as the initial goal. If it is empty, ask for the goal. Classify the work:

- Greenfield: no existing system behavior or repository context is material.
- Brownfield: the goal changes, integrates with, or depends on an existing system.

Explain the classification in one sentence. Read only the repository context needed to ask grounded questions. Ask one focused question at a time with `AskUserQuestion`, prefer concrete choices when they are genuinely exclusive, and record every question and answer verbatim for the transcript.

## 2. Score every round

After each answer, score each applicable dimension from 0.00 to 1.00 and round every dimension to two decimals:

- `g`: goal clarity
- `c`: constraint clarity
- `r`: acceptance-criteria clarity
- `x`: existing-context clarity, brownfield only

Calculate ambiguity with the exact formula for the interview type:

- Greenfield: `A = 1 - (0.40g + 0.30c + 0.30r)`
- Brownfield: `A = 1 - (0.35g + 0.25c + 0.25r + 0.15x)`

Round `A` to two decimals after the weighted calculation. Show the current clarity table and ambiguity after each round. Pass only when `A <= 0.10`.

- At round 10, warn that the interview is taking longer than expected and show the remaining unclear dimensions. This is a warning, not an exit.
- At round 20, stop asking questions. This is the hard cap.
- If the user says to stop before passing, stop immediately.
- Do not expose an execution option during the interview.

Set `Status: PASSED` only when the rounded ambiguity is at or below 0.10. On user early exit, or at the hard cap while ambiguity is above 0.10, set `Status: BELOW_THRESHOLD_EARLY_EXIT`, write the spec, then ask exactly: `proceed to review anyway?` Do not prepare a worktree unless the user explicitly approves. A rejection ends after reporting the spec path and score.

## 3. Write and validate the spec

Derive a descriptive slug from the goal. Normalize it to lowercase ASCII letters, numbers, and hyphens, collapse repeated hyphens, trim edge hyphens, and require `[a-z0-9-]{3,40}`. If a safe slug cannot be derived, ask the user to choose one and validate it against that expression. Never derive any other path from free text.

Write `.omc/specs/go-<slug>.md`. It must contain, in this order:

1. title and metadata, including interview type, rounds, rounded ambiguity, threshold, and Status
2. Goal
3. Constraints
4. Non-goals
5. Acceptance criteria with observable pass/fail outcomes
6. ADR with Decision, Drivers, Alternatives considered, Why chosen, Consequences, and Follow-ups
7. final clarity table, including weights and weighted values
8. full interview transcript

Read the completed file back and stop if any required section is missing. Treat the spec as immutable after this validation.

## 4. Resolve the default branch and worktree

Resolve `DEFAULT_BRANCH` with `git symbolic-ref --short refs/remotes/origin/HEAD` and strip `origin/`. If unavailable, choose the first existing branch among `main`, `master`, and `trunk`. Stop if none can be resolved. All remote references below use `origin/$DEFAULT_BRANCH`; never assume a fixed default branch.

Set `BR=claude/<slug>` and choose a unique session scratch path `WT=<session-scratch>/wt-<slug>`. Before changing worktrees, show the branch and proposed worktree path.

Handle exactly one of these cases, always producing an attached branch:

1. Existing registered worktree for `BR`: obtain its registered path from `git worktree list --porcelain` and reuse that exact path. Run `git -C "$WT" status --short`. If dirty, ask whether to reuse it; stop unless explicitly approved.
2. Local-only `BR`: when `refs/heads/$BR` exists and no worktree is registered, run `git worktree add "$WT" "$BR"`.
3. Remote-only `BR`: when `refs/remotes/origin/$BR` exists but the local branch does not, fetch that branch and run `git worktree add --track -b "$BR" "$WT" "origin/$BR"`.
4. New `BR`: run `git worktree add -b "$BR" "$WT" "origin/$DEFAULT_BRANCH"`.

Verify `git -C "$WT" branch --show-current` equals `BR`; an empty result is detached and must stop the flow.

Create `$WT/.omc/specs/`, copy the validated spec content to `$WT/.omc/specs/go-<slug>.md`, and compute its SHA-256 using the platform's available `sha256sum` or `shasum -a 256`. Write only the digest to `$WT/.omc/specs/go-<slug>.sha256`. Recompute both source and copied hashes and stop unless they match.

## 5. Consensus review and native handoff

Change the command's working directory to `$WT`. From that worktree cwd, invoke:

`/codex-consensus:codex-review .omc/specs/go-<slug>.md --max-rounds 3`

Do not add an approval prompt before or after it. The review command's native APPROVE handoff is the single execution approval and launches its own execution command in the current worktree when the user chooses Execute now. Its native cap/stall choices also remain authoritative. `/go` never applies a diff back to the original checkout.

When control returns after execution or Stop here, copy any review log produced for the spec into `$WT/.omc/specs/` if it is not already there. Recompute the spec hash and compare it to `go-<slug>.sha256`; report and stop on mutation.

## 6. Final report

Print only the useful handoff facts:

- worktree path
- branch
- spec path and SHA-256
- interview rounds spent and final ambiguity
- consensus-review rounds spent
- execution outcome, if the review command returned one
