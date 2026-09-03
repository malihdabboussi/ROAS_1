# Acceptance harness runbook

These are manual Claude Code acceptance sessions. The human enters every command and answers every `AskUserQuestion` prompt with the canned sequence below. The transcript is acceptance evidence; the `assert.sh` invocation after each scenario is the pass/fail signal.

## Setup

```bash
OUT="$(mktemp -d)/command-harness"
bash .claude/harness/setup.sh "$OUT"
source "$OUT/env.sh"
cd "$OUT/repo"
```

Keep a separate terminal at the source repository for `assert.sh`. Before each scenario, empty `gh.log` and `codex.log`, reset `hits.txt` to `0`, and restore the harness repository from its committed state without deleting the installed package. When a scenario intentionally commits and pushes a feature branch, pass that branch to `--branch`.

## AC 2: `/go`

Run:

```text
/go "add a hello route"
```

Canned human answers:

1. Answer interview questions with the matching greenfield fixture facts until the command reports `Deep Interview threshold: 10% (source: ./.claude/settings.json)` and ambiguity `0.08`.
2. At the single Codex review handoff question choose `Stop here`.
3. Do not approve any execution option outside that handoff. If the early-exit fixture is used, answer `Proceed to review anyway`; if testing the permission rule, decline the forced `codex exec` prompt.

Repeat the worktree preparation with branch states new, local-only, remote-only, and already registered. Confirm the prepared worktree is on `claude/<slug>`, the spec hash matches its source, Codex ran with that worktree as cwd, and the original worktree list did not change after choosing Stop here. Use the four fixture transcripts in `fixtures/go/` as the scoring oracle.

Assert, replacing the expected Codex call count with the number of logged preflight/review calls in the transcript:

```bash
bash "$COMMAND_SET_SOURCE/.claude/harness/assert.sh" --root "$HARNESS_ROOT" --branch main --codex-calls 4 --approved-diff "$HARNESS_ROOT/approved-rules.txt"
```

## AC 3: `/test-improve`

Run each command exactly:

```text
/test-improve http://localhost:8765/fixture.html
/test-improve https://roas.io
/test-improve http://localhost:8765/redirect
/test-improve http://user@localhost:8765/fixture.html
```

Canned human answers: make no side-effect confirmation for the first command; the other three must be refused without a prompt. Confirm the successful local run reports before/after PNGs at 1440, 1024, and 390 pixels plus a defect table. Stop the fixture server and repeat the first command; it must print the app-runner instruction rather than start a server. For an allowlisted non-local URL with `--flow "submit"`, confirm refusal without a side-effect prompt.

Assert:

```bash
bash "$COMMAND_SET_SOURCE/.claude/harness/assert.sh" --root "$HARNESS_ROOT" --branch main --codex-calls 0 --expected-hits 0 --approved-diff "$HARNESS_ROOT/approved-rules.txt"
```

## AC 4: `/ship`

First run `/ship` on `main` without flags and confirm refusal. Create one staged, one unstaged, and one untracked fixture change, then run:

```text
/ship --branch harness-ship
```

Canned human answers:

1. Approve branch creation while retaining the dirty tree.
2. Approve only the exact two changed files, the untracked file, and generated documentation shown in final scope.
3. Approve the displayed commit message.
4. Approve the push.
5. Approve `gh pr create`; do not approve any merge or deploy action.

Run once with `CODEX_STUB_VERDICT=clean` (one security call), then in a fresh setup with `CODEX_STUB_VERDICT=high-then-clean` (approve the shown remediation and second review). Repeat fresh blocked cases with `block`, `malformed`, and `timeout`; none may commit, push, or call `gh pr create`. Set `GH_STUB_PREVIEW=immediate`, `delayed`, and `absent` in separate clean cases to verify the three preview outcomes. Also manually confirm main-without-branch and detached HEAD refuse, and run `test-guard-git.sh` separately.

Assert a successful one-call case after clearing preflight-only Codex log entries or counting all expected entries exactly:

```bash
bash "$COMMAND_SET_SOURCE/.claude/harness/assert.sh" --root "$HARNESS_ROOT" --branch harness-ship --codex-calls 4 --expected-hits 0 --approved-diff "$HARNESS_ROOT/approved-rules.txt"
```

## AC 5: `/end`

Run `/end` on `main` and confirm refusal. On a pushed feature branch create one staged, one unstaged, and one untracked file, then run:

```text
/end
```

Canned human answers:

1. Approve the displayed testing lesson and copy its exact added line into `$HARNESS_ROOT/approved-rules.txt` before asserting.
2. Choose `close-out files only` for the commit-set question.
3. Approve the close-out commit.
4. Approve the push.

Confirm all four inventory buckets appear and excluded leftovers prevent `session closed`. In a fresh case remove write permission from the bare origin before the push approval; the transcript must report failure and omit `session closed`.

Assert the successful case:

```bash
bash "$COMMAND_SET_SOURCE/.claude/harness/assert.sh" --root "$HARNESS_ROOT" --branch harness-end --codex-calls 0 --expected-hits 0 --approved-diff "$HARNESS_ROOT/approved-rules.txt"
```

## AC 6: `/findings-to-rules`

Run:

```text
/findings-to-rules .omc/specs/deep-interview-command-set-review-log.md
```

Canned human answers: approve each shown allowlisted file diff, copying every exact added line to `$HARNESS_ROOT/approved-rules.txt` first. Run the same command again and confirm it proposes zero new lines. Then pass inline text whose topic resembles `../../outside.md`; approve it only after confirming the proposed target is `.claude/rules/misc.md`.

Commit and push the approved harness rule changes so the remote assertion compares the same SHA, then assert:

```bash
bash "$COMMAND_SET_SOURCE/.claude/harness/assert.sh" --root "$HARNESS_ROOT" --branch main --codex-calls 0 --expected-hits 0 --approved-diff "$HARNESS_ROOT/approved-rules.txt"
```

## AC 12: installer

From the source repository run the exact non-interactive installer matrix:

```bash
TARGET="$(mktemp -d)"
git -C "$TARGET" init
git -C "$TARGET" branch -M main
bash .claude/bin/install.sh --from "$PWD" --to "$TARGET" --config .claude/harness/config.json
grep -R '{{' "$TARGET/CLAUDE.md" && exit 1 || true
find "$TARGET/.claude" -type d -name harness -o -name worktrees
```

Capture a recursive digest, run the same installer again, and require an identical digest plus `No changes`. Repeat with an existing `CLAUDE.md`: require `CLAUDE.md.bak`, exactly one marker block, and no second-run diff. Remove a required config key and require exit 1 with a clean target. Create a differing `.claude/commands/ship.md` and require exit 3; rerun with `--overwrite` and require `.claude/.install-backup/<timestamp>/`. Set `CLAUDE_INSTALL_TEST_FAIL_AFTER_COPY=1` during an overwrite and verify the colliding destination is restored byte-for-byte. Use a config containing literal `$(`, backticks, quotes, and multiline deploy rows; require those bytes in rendered Markdown and verify no side-effect file was created. Seed target `.claude/settings.json` with an unrelated key and require it after the additive merge.

For the installer-only repository, the common assertion applies after it has an initial commit and local bare origin:

```bash
bash "$COMMAND_SET_SOURCE/.claude/harness/assert.sh" --root "$HARNESS_ROOT" --branch main --codex-calls 0 --expected-hits 0 --approved-diff "$HARNESS_ROOT/approved-rules.txt"
```

Finally run `/help` in both roas-platform and the harness repo and record all five command names. Run one real trivial `/go` in the harness repo, answer `Stop here` at the Codex review handoff, and paste the transcript excerpt into the PR evidence.
