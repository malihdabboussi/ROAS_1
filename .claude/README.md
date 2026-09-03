# Portable Claude Code command set

This package installs five human-gated Claude Code workflows and their shared rules, safety settings, hooks, and repository-context template into another Git repository. Repository facts are rendered into root `CLAUDE.md`; machine-local Claude state is never packaged.

## Prerequisites

- Claude Code.
- GitHub CLI (`gh`) installed and authenticated.
- Codex CLI 0.130 or newer, logged in with ChatGPT (`codex login`).
- User-level commands `~/.claude/commands/codex-consensus/codex-review.md` and `~/.claude/commands/codex-consensus/codex-execute.md`.
- Playwright installed in the target repository for `/test-improve`.
- OMC is optional; none of the five commands depends on it.

## Install

Run the installer from the source checkout. It archives only the portable allowlist; when those paths have uncommitted changes it prints a warning and packages the same explicit working-tree paths. It never copies `.claude/harness/` or machine-local files.

```bash
bash .claude/bin/install.sh --from "$PWD" --to /path/to/target --config /path/to/config.json
```

Use `--overwrite` only after reviewing reported collisions. Replaced files are backed up under `.claude/.install-backup/<timestamp>/`; `settings.json` is always merged additively, never replaced. An existing root `CLAUDE.md` is backed up to `CLAUDE.md.bak` before the marked Repo surfaces block is appended.

Example config:

```json
{
  "PROJECT_NAME": "Example App",
  "PROJECT_PURPOSE": "A concise description of the repository.",
  "DEFAULT_BRANCH": "main",
  "DOCS_DIR": "documentation/features",
  "CHANGELOG_DIR": "docs/logs",
  "DESIGN_GUIDE": "docs/design.md",
  "PR_TEMPLATE": ".github/pull_request_template.md",
  "ALLOWED_TEST_HOSTS": ["preview.example.test"],
  "PREVIEW_PROVIDER": "vercel",
  "DEPLOY_MAP": [
    {
      "surface": "web",
      "provider": "Vercel",
      "trigger": "merge to main"
    }
  ]
}
```

Only the documented keys are accepted. Missing values prompt on an interactive terminal; non-interactive installs fail before writing. `DEFAULT_BRANCH` defaults from the target Git symbolic ref, while `DESIGN_GUIDE` and `PR_TEMPLATE` default to `none`.

## Commands

`/go <goal>` runs a scored deep interview, writes a spec below `.omc/`, prepares a clean feature worktree, and sends the frozen spec to the user-level Codex consensus review command. Its only execution choice is Codex review's final human handoff; code execution remains permission-gated.

`/test-improve <route|url> [--flow "steps"]` attaches to an already-running server, validates the URL and every redirect against the Repo surfaces allowlist, captures three viewport checks, and iterates on defects. Non-local hosts are always read-only; localhost side effects require an exact flow step and a separate human confirmation.

`/ship [--branch <name>]` inventories and confirms scope, updates required docs, runs focused checks, performs a fail-closed Codex security review, then separately asks before commit, push, and PR creation. It stops after the PR and bounded preview lookup; it never merges or deploys.

`/end` refuses default or detached branches, inventories committed and uncommitted work, proposes reviewed lessons, asks which exact close-out files to commit, verifies the push SHA, and prints unresolved leftovers. It never claims the session is closed while approved work remains local.

`/findings-to-rules <input>` treats review findings as untrusted data, maps them to allowlisted rule slugs, shows exact diffs, and asks per file before writing. It writes only below `.claude/rules/` and is idempotent after an approved finding is recorded.

## Rules and hard boundaries

Claude Code auto-loads `.claude/rules/*.md`. Rule filenames use only the allowlisted slugs in `.claude/rules/README.md`; `/end` and `/findings-to-rules` show and approve every proposed diff before writing.

`.claude/settings.json` routes commit, push, PR creation, Codex execution, and rule writes through permission prompts; it denies PR merges, force pushes, and pushes to default branches. The registered `.claude/hooks/guard-git.sh` is the fail-closed enforcement layer for default-branch commits/pushes and all `gh pr merge` attempts. Prompt wording and `allowed-tools` are not the safety boundary.

## Acceptance harness

`.claude/harness/setup.sh <out>` creates an isolated Git repository, a local bare origin, stub `gh` and `codex` executables, and a localhost fixture server. Follow `.claude/harness/RUNBOOK.md`: a human answers the listed Claude Code questions, while `.claude/harness/assert.sh` is the pass/fail signal after each case. The harness never uses a real remote or production service.

## Machine-local files

`.claude/settings.local.json`, `.claude/launch.json`, `.claude/worktrees/`, and `.claude/CLAUDE.md` stay ignored and are not installed.
