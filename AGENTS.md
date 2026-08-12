# Agent Operating Protocol

<!-- SINGLE SOURCE OF TRUTH for all AI agents in this repo (Claude Code, Codex, Cursor).
     Edit HERE only. Claude Code imports this via .claude/CLAUDE.md (@../AGENTS.md);
     Cursor references it via .cursor/rules/cursor-agent-rule.mdc (@AGENTS.md).
     Keep under ~200 lines — long instruction files reduce adherence. -->

These rules apply to any AI agent working in this repository ("you" = the agent). Keep every change scoped to exactly what was asked, and fix root causes rather than symptoms.

## 0. Git workflow (mandatory — read first)

Work only counts when it is pushed to GitHub. Uncommitted files in a local folder are one crash away from gone.

- **Announce yourself.** Your first message of a session states your working folder (`pwd`) and branch (`git branch --show-current`).
- **Never commit to or push `main`.** `main` changes only through PRs merged on GitHub. No exceptions, including "small" fixes.
- **New task = fresh branch off fresh main:** `git pull origin main`, then branch `codex/<task>` or `claude/<task>`. Resuming an old task = continue its existing branch (rebase on main if it's stale).
- **One working copy per agent.** Never edit in a folder another agent is using. Claude Code sessions use worktrees for parallel work.
- **Push your branch after every finished chunk, and ALWAYS before the session ends.** Pushing a branch is backup, not deployment — it triggers nothing. A session must never end with work that exists only as local uncommitted files.
- **Only the designated app-runner checkout runs dev servers** (this machine fits exactly one). Agents write code; they don't run the app. To test, the app-runner does `git fetch` + checks out the branch.
- **Testing several branches together:** create a fresh throwaway branch off main, merge the branches in, test that. Never reuse an old integration branch, and never merge the integration branch itself into main — after testing passes, merge the individual PRs.
- **If git is broken in your checkout** (hangs, corruption — the 2026-08 Codex checkout has a corrupted object store): make NO git write ops there. Tar your changed files to `~/Downloads/` and report the path.

## 1. Context before code

- Read the **full** target file plus its imports and consumers before editing — not a partial skim. Trace data: source → transform → destination.
- Grep for every usage of any symbol you change. Check git history for _why_ code exists.
- Don't guess: use the **Supabase MCP** for schema/data and **Context7 MCP** for library docs.
- For non-trivial or risky work, invoke the matching skill instead of reinventing the protocol: `100-sure-framework` (context SOP), `meticulously` (evidence-based root-cause), `plan-creator` (implementation plans).

## 2. Replace, don't accumulate

- When new code replaces old, delete the old in the **same change**: grep all usages, update imports, remove dead files and barrel exports.
- ≥90% confident it's unused → remove it and say what you removed. <90% → ask first, listing the old code, where it's used, and your uncertainty.

## 3. Scope & communication

- Do only what's requested. No unrequested features, error handling, or "best practices" unless asked. Let real errors surface.
- Answer first, direct and binary (works/doesn't, done/not done). No filler. Explain only when the user says "explain". English only.

## 4. Pre-change reading

Read the guideline that matches the work (or invoke the matching skill):

- **Always:** `.docs/guidelines/development/code-guidelines.md` + `.docs/guidelines/architecture/project-architecture.md` (skills: `guidelines-follow`, `architecture-follow`)
- **Backend:** `.docs/guidelines/development/code-guidelines-backend.md` + `.docs/guidelines/architecture/backend-architecture.md`
- **Microservices:** `.docs/guidelines/development/code-guidelines-miroservices.md`
- **Feature:** `.docs/guidelines/architecture/feature-guidelines.md`
- **UI/CSS:** `.docs/guidelines/design/design-guidelines.md` (skill: `design-guidelines`)
- **Performance:** `.docs/guidelines/development/performance-guidelines.md` (skill: `perf-optimize`)
- **Shared frontend surfaces:** check `documentation/frontend-shared-surfaces.md` before creating reusable web UI/contracts/helpers or importing from another feature. Use domain barrels only (`@/components/<domain>`, `@/lib/<domain>`); never create root mega barrels or import private feature internals.
- Grep `globals.css` for specific class names — never read the whole file.

## 5. Styling (zero exceptions)

- Use **only** utility classes from `globals.css`. No inline styles, raw CSS variables, hex/`rgb()`, hardcoded px/rem, or Tailwind arbitrary values wrapping tokens.
- Product-UI CSS changes go in **both** `apps/web/src/app/globals.css` and `apps/website/src/app/globals.css`. Other apps (`admin`, `funnels`, …) have their own `globals.css` — touch only if in scope.
- Missing a utility? Stop, report `Missing utility: [name] for [purpose]`, wait for approval. Write new utility classes one per line.

## 5.5. Design tokens & theming (zero exceptions)

- **Every visible color comes from a `--color-*` token via a utility class.** Never a hex, `rgb()`, Tailwind palette color (`text-red-500`), `text-white`/`bg-black`, `border-white/10`, or inline `style` color. Components must render correctly in **both** themes with **no** theme branching — `dark:` is only for a rare opacity tweak of an already-tokenised color. See `design-guidelines` §1–§2.
- **Canonical swaps:** `text-white`→`text-foreground`, `text-white/60`→`text-muted-foreground`, `bg-black`/`bg-[#hex]`→`bg-background` or `surface-card`, `bg-black/40`→`bg-secondary`, `border-white/10`→`border-border`, `text-red-400`→`text-destructive`. Pick the token by **role** (a muted label is `text-muted-foreground`, not `text-foreground`).
- **Create the token, don't hardcode.** Need a color with no token/utility? Add the `--color-*` token with **both** light and dark values plus its utility to `globals.css` — in **both** `apps/web` and `apps/website` (§5) — then use the class. Report `Missing utility: [name] for [purpose]` and wait for approval before inventing one.
- **Light mode is free when you conform:** light token values already exist, so token-correct code themes automatically. Bypassing tokens is what breaks light mode.
- **Two legitimate exceptions** — mark them inline so they read as intentional, not as misses: (1) **by-design fixed surfaces** — device/ad mockups that simulate another product's UI (Instagram chrome, phone frames) stay hardcoded; (2) **canvas / third-party widgets** (WebGL, Mermaid, charts, code editors) that can't take utility classes read token values in JS and pass them as config.

## 6. Changelog (after every change)

- Append to `.docs/logs/changelog$(date +%Y-%m-%d).md` (create it with a `# Changelog - [Month DD, YYYY]` header if missing). Never reuse yesterday's file; never hardcode the date.
- Entry: `## [YYYY-MM-DD HH:MM] - [TYPE]` then `What:` / `Why:` / `Impact:` / `Files:`. Types: `[FEATURE]` `[FIX]` `[REFACTOR]` `[STYLE]` `[ARCH]` `[UTIL]` `[DOCS]`.
- Prune logs older than 14 days: `find .docs/logs -name 'changelog*.md' -mtime +14 -delete`.

## 6.5. Follow-up work log (after every change)

- After edits, run LOC/architecture checks appropriate to the files touched. At minimum, check line counts against `.docs/guidelines/architecture/project-architecture.md` limits for every changed code file.
- If a touched file is over limit, near limit, or exposes adjacent cleanup that is real but out of scope, append it to `.docs/plans/agent-follow-up-work.md` with date, feature/app, file path, evidence, needed work, and reason it was not done now.
- Do not use the follow-up log to avoid requested work. Fix in-scope violations immediately; log only scoped deferrals or pre-existing debt found while working.

## 7. Documentation

- Feature behavior / API / schema changed → update `documentation/features/[feature].md` (Data Flow, Code Examples, Decision Log, "Last Modified"); ask before creating a new doc. WIP specs → `.docs/features/`; deep architecture → `.documentation/`; cross-cutting knowledge → `.docs/.knowledge/`. Workflow: `.cursor/commands/documentation-agent.md`.
- New/changed shared utility → update `documentation/utilities/[name].md` + the registry `documentation/utilities/README.md`.
- Skip docs for pure refactors, minor styling, and behavior-neutral fixes.
- Feature work that adds or changes user-facing failure/success/loading states must use the feature's config files (`config/errors.config.ts`, `config/messages.config.ts`, or the existing local equivalent). If the config is missing for the touched feature, add it when the current change needs user-facing errors/toasts; otherwise log the gap in `.docs/plans/agent-follow-up-work.md`.

## 8. MCP servers (prefer over guessing)

- **Supabase** — schema, SQL, migrations, `get_advisors`, TS types (skill: `supa-project`).
  - **Hard stop:** this repo’s production DB is only `lhfgtsjetcardinpgouq` (`lhfgtsjetcardinpgouq.supabase.co`). Never use legacy Vibey `qfrvykscoymiwwgysvsr` for credits/orgs/profiles/migrations. Confirm host/project_id before every data write; if sibling orgs look like Vibey/MFS/ROAS-PR-SEO, abort — wrong DB. Prefer `apps/agent-api/.env` or `scripts/roas/roas-secrets.env`; run `bash scripts/roas/verify-local-env-alignment.sh` when unsure.
- **Context7** — current library/framework docs.
- **Browser MCP** — whichever the tool exposes (Puppeteer, Cursor Browser, or Claude-in-Chrome): visual UI checks, flow/form validation, layout debugging.
- **Vercel** — deploy/runtime debugging. **Sentry** — incident/error triage. **Fathom** — meeting transcripts. **Stripe** — billing. **Railway / Fly.io** — workers and agent-api deploys.

## 8.1. Vibey context system

Vibey is the long-term memory and agent backend for this project. It stores durable knowledge in separate Brain families: User Brain, Agent Brain, Company Brain, Customer Brain, and Space/Campaign context. Agents use Vibey MCP so useful knowledge discovered during normal project work can become available later inside Vibey and other tools.

The repo-local `.vibey/` folder is the map between this project and Vibey. Vibey remains the source of truth; `.vibey/` exists so agents can quickly understand which Vibey agents, brains, permissions, and context routes matter for this repo.

When Vibey MCP is available and `.vibey/` does not exist, create lightweight markdown files only:

```text
.vibey/
  README.md
  context-map.md
  access-map.md
  brain-routing.md
  agents/
    index.md
  refresh-log.md
  pending-memory.md
```

Use the files this way:

- `.vibey/README.md`: what this project is and how it uses Vibey.
- `.vibey/context-map.md`: current project, organization, Space/Campaign context, and MCP assumptions.
- `.vibey/access-map.md`: what the current MCP connection can read/write, including known role, scopes, accessible agents, accessible Brain families, and denied actions.
- `.vibey/brain-routing.md`: which kinds of knowledge should go to which Brain family.
- `.vibey/agents/index.md`: Vibey agents relevant to this project, with role, skills, brain id if known, and short summary.
- `.vibey/refresh-log.md`: date, MCP tools used, what changed, and access limits found.
- `.vibey/pending-memory.md`: candidate memories that need user approval before saving.

If Vibey MCP is not available, do not block normal project work. If `.vibey/` exists, note the missing MCP access in `.vibey/refresh-log.md`; otherwise continue without creating it.

Vibey MCP access depends on the connected user's Vibey role, approved OAuth scopes, organization, team membership, and agent/brain permissions. A user may be able to read a Brain but not write it, or may have access to some agents and not others. Use read/list tools first to discover available campaigns, Spaces, agents, Brain scopes, and permissions. Use `describe_vibey_action` before unfamiliar writes. If a tool is missing, denied, or returns a scope/permission error, treat it as an access limitation for the current connection, not proof that Vibey lacks the feature. Do not work around missing access by guessing ids, switching Brain families, or saving sensitive context somewhere broader. Record known access limits in `.vibey/access-map.md`.

At the start of memory-heavy work, read `.vibey/context-map.md`, `.vibey/access-map.md`, and `.vibey/agents/index.md` if present. If `.vibey/refresh-log.md` shows the Vibey map is older than 3 days, refresh it with bounded read/list MCP calls: list accessible Brain scopes, list relevant Vibey agents, resolve agent brains only for agents relevant to this project or task, update `.vibey/agents/index.md` and `.vibey/access-map.md`, then append `.vibey/refresh-log.md`. Do not deep-search every brain during refresh; search only when the current task needs that context.

Use Vibey MCP when durable context would help future work, not for transient command output. Route knowledge by ownership: User Brain for user preferences, working style, repeated decisions, and personal operating rules; Agent Brain for knowledge that improves one specific Vibey agent's expertise; Company Brain for organization-wide standards, strategy, policies, reusable protocols, and product decisions; Customer Brain for customer, prospect, account, avatar, interview, or objection knowledge with explicit customer/contact context; Space/Campaign context for current project artifacts, tasks, documents, campaign work, or implementation context tied to a Space or Campaign.

Search before saving. Use the most specific Brain family first. Use broad cross-brain search only when the user asks for all accessible knowledge or the right family is unclear. Prefer `atlas_save_brain_context` for saves because it routes to the right Vibey surface. Use direct low-level tools only when the user explicitly asks for them or the MCP workflow requires them.

Save only durable, reusable knowledge: stable preferences, decisions, standards, workflows, project facts, agent expertise, or customer insights with contact context. Do not save secrets, raw logs, stack traces without summary, speculative guesses, temporary task state, one-off command output, or information the user has not approved when approval is needed. When unsure, write the candidate memory to `.vibey/pending-memory.md` with the proposed target Brain and ask the user before saving.

## 8.5. Agent tool schema & preflight

Every new or changed agent-facing action/tool must update the schema and preflight system in the same change.

Required:

- add or update the hard action schema
- add or update lifecycle classification (`active`, `on_hold`, or explicitly non-agent-facing)
- add or update preflight coverage classification
- add a preflight validator when schema alone is not enough
- update action contract/describe-action output when the agent needs guidance
- update PromptMode/plugin/policy/MCP drift tests when the action surface changes
- add tests before implementation

No agent-facing action may rely on opt-in/pass-through validation or skip lifecycle classification.

## 8.6. Agent tool errors & workflow circuits

Every new or changed agent-visible tool execution path must use the existing tool error contract and workflow circuit breaker in the same change. This keeps agents from seeing raw "platform/backend/internal" failures and from repeating a failed workflow through adjacent tools.

Required:

- Route through an existing chokepoint when possible: artifact classifier/executor, `vibey_backend` adapter, OpenClaw `toToolDefinitions`/`toClientToolDefinitions`, or `/tools/invoke`.
- If adding a new tool transport or bypass, return the same structured fields: `error_code`, `error_class`, `effect_state`, `retry_policy`, `correction`, `agent_instruction`, `user_explanation`, `forbidden_user_framing`, and `observability.fingerprint`.
- Map the tool/action to a `workflow_class` and record failures in the circuit breaker; unknown third-party tools must still circuit-break by tool name and payload fingerprint.
- Add regression coverage for thrown errors, returned error-shaped results, direct transport errors, same-payload repeats, corrected retry, and adjacent workflow-class loops for the new surface.
- Never add a model-visible raw error fallback. Preserve the structured contract in tool `details`, and use `user_explanation.sentence` for user-facing text.

## 9. Project conventions

- **DB tables:** domain-scoped names matching the existing schema (`space_shares`, `funnel_blocks`, `agent_definitions`). Do **not** use a `project_` prefix.
- **Page `<title>`:** append `| ROAS`. **All H1 headings:** UPPERCASE.
- **Never run builds automatically** — only on explicit request _(Claude Code: a hook gates build commands behind confirmation)_.
- Don't rename files arbitrarily — keep original names.

## 10. Root-cause fixes

Never patch symptoms. State the symptom, ask "why" until you reach the design decision or missing feature, then choose the fix that eliminates the whole **class** of error (fix data at its source, reduce complexity) over a workaround (fallback, silencing try/catch, one-off edge-case branch). If there's any doubt about the approach or its impact, state the root cause and proposed fix and ask before coding. The `meticulously` and `100-sure-framework` skills run this end-to-end.

## Checklist (every task)

Context read · matching guideline/skill checked · Vibey context checked when `.vibey/` applies · only requested changes · old code removed (or asked) · root cause fixed · LOC/architecture checked · follow-up work logged if deferred · user-facing errors/messages config checked for feature work · CSS synced web + website · changelog written · docs updated if behavior changed · builds only on explicit request.
