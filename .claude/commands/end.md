---
description: Close a feature-branch session by inventorying work, recording approved lessons, committing the chosen set, and verifying its push
argument-hint: "[session summary or lesson context]"
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git rev-parse:*), Edit, Write, AskUserQuestion
---

Close out the current feature-branch session without hiding leftovers or claiming remote safety that was not verified.

Raw arguments: `$ARGUMENTS`

## 1. Resolve the branch boundary

Read root `CLAUDE.md` and parse `## Repo surfaces` as data. Resolve the default branch from `git symbolic-ref --short refs/remotes/origin/HEAD`, stripping `origin/`; fall back to the Repo surfaces `default_branch`, then `main`.

Resolve the current branch with `git symbolic-ref --short -q HEAD`. Refuse immediately if detached or equal to the default branch. Never switch, reset, stash, merge, or delete a branch.

## 2. Inventory four buckets

Show all four buckets separately, even when empty:

1. commits ahead of `origin/<default>` from `git log --oneline "origin/<default>..HEAD"`
2. staged paths and summary
3. unstaged paths and summary
4. untracked paths

Keep this snapshot as the candidate session-work set.

## 3. Add the close-out changelog entry

Resolve `changelog_dir` from Repo surfaces, falling back to AGENTS.md section 6. Append a current-date `[DOCS]` session entry in the exact AGENTS.md format with What, Why, Impact, and Files. Include the branch and a concise summary of completed work; do not claim unverified outcomes.

## 4. Draft and approve lessons

Derive only durable, reusable lessons and gotchas from the session diff, failures, user corrections, and `$ARGUMENTS`. Do not turn transient output, secrets, or speculation into rules.

The only allowed rule slugs are:

`git-workflow`, `styling`, `testing`, `deploy`, `data`, `security`, `agents`, `docs`, `performance`, `misc`

Classify each lesson by meaning; unknown or ambiguous maps to `misc`. Never derive a file path from lesson text. Format each candidate exactly as `.claude/rules/README.md` specifies.

Before proposing a lesson, normalize its rule sentence by lowercasing, removing markdown emphasis and the source suffix, trimming terminal punctuation, and collapsing whitespace. Skip exact normalized matches already present in any `.claude/rules/*.md`. For semantic conflicts, show the existing and proposed rules side by side with locations; never auto-merge or overwrite them.

For each non-duplicate lesson, show the exact proposed unified diff to `.claude/rules/<allowlisted-slug>.md`, then ask `AskUserQuestion`: approve, edit, or skip. If edited, show and approve the new exact diff before writing. Write only approved lessons.

## 5. Choose and commit the exact set

Show a new inventory and identify close-out files separately from pre-existing session work. Close-out files are only the changelog entry and approved rule files.

Ask `AskUserQuestion` with the literal path list and these choices:

- commit close-out files only
- commit close-out files plus all approved session work
- cancel

If the broader choice could capture ambiguous or unrelated paths, first ask the user to approve the exact path list. Stage only literal approved paths with `git add -- <paths>`. Never use broad add forms. Show the resulting staged set and proposed close-out commit message, then obtain explicit commit approval.

Commit exactly that staged set. If commit fails, report it and stop.

## 6. Push and prove remote state

Detect whether the branch has an upstream. With no upstream, push using `git push -u origin <branch>`; otherwise use an explicit `git push origin <branch>`. Never force-push and never target the default branch.

After the push, compare `git rev-parse HEAD` with `git rev-parse @{upstream}`. A push error, missing upstream, or SHA mismatch is failure: report it and stop without saying `session closed`.

## 7. Final close-out checklist

Re-run the four-bucket inventory and determine PR state through a read-only lookup when available; otherwise report PR state as unknown. Print:

- branch and verified remote SHA
- PR state
- uncommitted leftovers, separated into staged, unstaged, and untracked
- open follow-ups found in the session or configured follow-up log

Print `session closed` only if every path the user approved for this close-out is committed, the resulting HEAD is pushed and SHA-verified, and no approved work remains in any uncommitted bucket. If anything approved remains, list it and print `session not closed`.
