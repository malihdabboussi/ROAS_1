---
description: Safely document, verify, security-review, commit, push, and open a pull request without merging or deploying
argument-hint: "[--branch <name>]"
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git switch:*), Bash(git merge-base:*), Bash(git rev-parse:*), Bash(gh pr view:*), Bash(gh pr checks:*), Bash(pnpm --filter * typecheck), Bash(pnpm --filter * lint), Bash(pnpm --filter * test), Edit, Write, AskUserQuestion
---

Ship the current work only as a pushed feature branch and pull request. Never merge a PR or trigger a deployment.

Raw arguments: `$ARGUMENTS`

## 0. Preflight before all writes and staging

Create a unique session scratch directory. Complete every check before generating docs, editing files, switching branches, or staging anything:

1. `gh --version` succeeds.
2. `gh auth status` succeeds for the repository host.
3. `codex --version` succeeds and is at least 0.130.
4. `codex login status` reports a logged-in ChatGPT session.
5. Run a minimal model-access probe using the same model required by the security pass below. Put the exact-OK prompt in a scratch file, pass it via stdin using `-`, use `--json -o <unique-output>`, and capture stderr separately. Stop on authentication errors, missing output, or a result other than exactly `OK`.

On failure, state the failing check and its repair command, then stop. Do not require either `codex-consensus` command file.

## 1. Resolve configuration and branch state

Read root `CLAUDE.md` and parse the `## Repo surfaces` block as data. Missing keys are valid and use the fallbacks below.

Resolve `DEFAULT_BRANCH` exactly once:

1. `git symbolic-ref --short refs/remotes/origin/HEAD`, stripping `origin/`
2. the `default_branch` value from Repo surfaces
3. `main`

All later base refs use `origin/$DEFAULT_BRANCH`. Do not hardcode a combined remote/default ref.

Parse only an optional `--branch <name>` from `$ARGUMENTS`; reject unknown flags or a missing value. Resolve the current branch with `git symbolic-ref --short -q HEAD`. Refuse detached HEAD.

- On `DEFAULT_BRANCH` without `--branch`, refuse and explain that a feature branch is required.
- On `DEFAULT_BRANCH` with `--branch`, report whether HEAD is behind `origin/$DEFAULT_BRANCH`, warn if it is, then run `git switch -c <name>` from the current HEAD. Carry the tree exactly; do not reset, stash, or recreate from the remote.
- On a non-default branch with `--branch`, require a completely clean tree. If clean, run `git switch -c <name> "origin/$DEFAULT_BRANCH"`; otherwise refuse. Without `--branch`, remain on the current branch.

Re-read the branch and stop if it is detached or is `DEFAULT_BRANCH`.

## 2. Preliminary inventory

Show `git status --porcelain` split into three labeled buckets:

- staged
- unstaged
- untracked

This is context only. Do not stage anything yet.

## 3. Generate documentation before scope confirmation

Apply AGENTS.md sections 6 and 7.

- Skip the feature doc only when section 7 explicitly makes it unnecessary: pure refactor, minor styling, or behavior-neutral fix.
- Otherwise, update the exact existing feature doc named by Repo surfaces. If none is named, derive a safe feature slug and consider only `<docs_dir>/<feature-slug>.md`. Update it only if that exact file exists. Never search for a merely similar doc and never create a feature doc without first asking the user.
- Append the required changelog entry under `<changelog_dir>/changelog<current-date>.md`, using the heading and What/Why/Impact/Files format in AGENTS.md section 6. If `changelog_dir` is missing, use the location specified directly by AGENTS.md.

Do not touch a follow-up file unless the actual scoped work requires an AGENTS.md section 6.5 deferral.

## 4. Confirm and stage the exact scope

Run a fresh inventory that includes generated documentation. Show every proposed path, its bucket, and a concise reason it belongs to this shipment. Ask `AskUserQuestion` to approve the exact file set or edit it.

After approval, run `git add -- <confirmed paths>` with only those literal paths. Never use `.`, `-A`, `-u`, a directory wildcard, or an unconfirmed path. Show `git diff --cached --name-status` and verify it exactly matches the approved set. Stop on mismatch.

## 5. Workspace checks

Map every staged code path to its owning package/workspace from repository manifests. For each touched workspace, run all three existing scripts in this order:

1. `pnpm --filter <workspace> typecheck`
2. `pnpm --filter <workspace> lint`
3. `pnpm --filter <workspace> test`

Do not run a build. Do not substitute a root-wide command. Missing required scripts or any non-zero result blocks shipment and must be shown to the user.

## 6. Fail-closed staged security review

Set `BASE` to `git merge-base "origin/$DEFAULT_BRANCH" HEAD`. Record that exact SHA. The reviewed material is `git diff --cached "$BASE"`, which must include newly staged files.

For each security round, create unique scratch files for the prompt, verdict, JSON stream, and stderr. The prompt must include the literal base SHA and instruct the reviewer to inspect the exact cached diff, find secrets, injection, auth/authz failures, unsafe data or remote mutations, destructive behavior, dependency risk, and bypasses of repository safety rules. Findings must be tagged CRITICAL, HIGH, MEDIUM, or LOW. It must end with exactly `VERDICT: PASS` only when no unresolved CRITICAL/HIGH finding exists, otherwise exactly `VERDICT: BLOCK`.

Run the review as a Bash tool call with a 600000 ms timeout:

`codex exec --skip-git-repo-check -s read-only -m gpt-5.6-sol --json -o "$VERDICT" - <"$PROMPT" >"$JSON_STREAM" 2>"$STDERR"`

This is the only fixed model name in this command set. Never inline the prompt, merge stderr into stdout, discard stderr, or reuse output paths.

Treat the round as BLOCK when any condition holds:

- the Bash call times out at ten minutes
- the verdict file is missing or empty
- stderr contains an authentication or authorization error
- the final non-empty verdict line is not exactly `VERDICT: PASS` or `VERDICT: BLOCK`
- the final line is `VERDICT: BLOCK`
- any CRITICAL or HIGH finding remains unresolved

Show findings verbatim. MEDIUM findings warn but do not independently block.

If remediation changes any file, show the exact delta, ask the user to reconfirm the complete file scope, clear and rebuild the index using only the newly confirmed literal paths, rerun all workspace checks, then run one final security review. Allow at most two total security calls. If no remediation changes code, make exactly one call. Any unresolved BLOCK, CRITICAL, or HIGH after the allowed review stops the flow before commit.

## 7. Commit and push approval

Show the final staged path list, staged diff summary, all check results, security verdict, and a proposed commit message. Ask `AskUserQuestion` to approve that exact commit.

Only after approval:

1. commit the staged set with the approved message
2. verify the current branch is still non-default
3. `git push -u origin <current-branch>`
4. assert `git rev-parse "origin/<current-branch>"` exactly equals `git rev-parse HEAD`

Any commit, push, or SHA mismatch stops the flow with the error. Never force-push.

## 8. Open the PR and report preview

Resolve `pr_template` from Repo surfaces. If it names an existing file, use that template's contents for the PR body; otherwise generate a concise body from the verified diff and checks. Run `gh pr create --base "$DEFAULT_BRANCH"`, capture the returned PR URL, and stop if no URL is returned. Never run `gh pr merge`.

If `preview_provider` is exactly `vercel`, poll `gh pr view --json statusCheckRollup` every 20 seconds for at most three minutes. Inspect check details for a Vercel preview URL. Report exactly one of:

- `preview: <url>`
- `preview: pending (timeout 3m)`
- `preview: unavailable`

For any other or missing provider, report `no preview surface`.

Finish with the branch, remote SHA, PR URL, checks, and the exact preview line. Stop there; do not merge or deploy.
