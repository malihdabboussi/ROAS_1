---
name: guidelines-follow
description: A protocol that should be used when editing code to be 100% sure that we follow code and feature development guidelines.
---

## CRITICAL: Context Gathering First

**BEFORE making ANY plan or implementation:**

1. Read `.docs/guidelines/development/code-guidelines.md` **ENTIRELY** (read ALL of it)
2. Read `.docs/guidelines/development/code-guidelines-backend.md` **ENTIRELY** (read ALL of it)
3. Read `.docs/guidelines/architecture/feature-guidelines.md` **ENTIRELY** (read ALL of it)
4. Read **ENTIRE target files** you'll modify (not excerpts)
5. Read **ALL files** that import or are imported by target files

**Context Checklist - MUST verify ALL:**

- [ ] Read ENTIRE code-guidelines.md (development folder - frontend patterns)
- [ ] Read ENTIRE code-guidelines-backend.md (development folder - backend patterns)
- [ ] Read ENTIRE feature-guidelines.md (architecture folder - feature development, AI content, error handling)
- [ ] Read ENTIRE target file (100% of lines)
- [ ] Read ALL importing files
- [ ] Read ALL imported files
- [ ] Understand complete data flow

**If ANY box unchecked -> STOP. Gather context first.**

---

## Guidelines Compliance

Please make sure that your plan/implementation follows:

- `.docs/guidelines/development/code-guidelines.md` (core architecture, styling, authentication)
- `.docs/guidelines/development/code-guidelines-backend.md` (backend code patterns, services)
- `.docs/guidelines/architecture/feature-guidelines.md` (feature development, AI content, error handling)

All files are in:
`.docs/guidelines/` folder structure.

**Key Rules:**

- READ ENTIRE FILES (not excerpts)
- NEVER make assumptions without context
- NEVER quick fix without understanding root cause
- ALWAYS read related files

---

## Post-Change Compliance Pass

**AFTER writing code, before final response:**

1. Run a LOC/architecture review for every changed code file:
   - Check line counts against `.docs/guidelines/architecture/project-architecture.md`
   - Verify files still follow feature boundaries, import rules, and smart/dumb component separation
   - Verify old/replaced code was removed in the same change

2. For feature work, verify user-facing message config:
   - Errors and retryable failures live in the feature's `config/errors.config.ts` or existing local equivalent
   - Toasts, loading text, confirmations, empty states, and icon tooltips live in `config/messages.config.ts` or existing local equivalent when they are feature-specific or reused
   - Messages use Vibey voice and are what the user sees; technical details stay in logs

3. If you find real work that is outside the current request:
   - Do **not** silently ignore it
   - Do **not** expand scope unless it is required for the requested fix
   - Append it to `.docs/plans/agent-follow-up-work.md` with date, feature/app, file path, evidence, needed work, and why it was deferred

**Post-Change Checklist - MUST verify ALL:**

- [ ] LOC checked for every changed code file
- [ ] Architecture/import boundaries checked
- [ ] Replaced/dead code removed or user asked
- [ ] Feature error config checked/updated when user-facing failures changed
- [ ] Feature message config checked/updated when toasts/loading/confirmations/tooltips changed
- [ ] Out-of-scope debt logged in `.docs/plans/agent-follow-up-work.md`
- [ ] Changelog entry added

**If ANY box unchecked -> STOP. Complete the pass first.**
