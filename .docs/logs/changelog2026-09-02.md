# Changelog - September 02, 2026

## 2026-09-02 10:44 - [FEATURE]

What: Added the portable Claude Code command-set installer, rendered repository overview, selective Git tracking, package documentation, and isolated manual acceptance harness.

Why: Make the approved command workflows safely reusable across repositories while preserving repo-specific context, machine-local exclusions, human gates, and deterministic acceptance signals.

Impact: The portable `.claude` allowlist can be installed transactionally from committed or explicitly warned uncommitted source state; ROAS deployment/data boundaries are documented; harness runs use local stubs, a bare origin, and a localhost side-effect fixture.

Files: `.gitignore`, `CLAUDE.md`, `.claude/README.md`, `.claude/templates/CLAUDE.md.template`, `.claude/bin/install.sh`, `.claude/harness/**`, `.docs/plans/agent-follow-up-work.md`.
