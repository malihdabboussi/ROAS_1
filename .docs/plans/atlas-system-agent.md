# Atlas as a System Agent — Outcome Brief

**Date:** 2026-05-07
**Status:** Brief — for research agent to convert into a full implementation plan
**Owner:** Sefy
**Related plans:** [customer-brain.md](./customer-brain.md)

---

## How to use this document

This is **not** an implementation plan. It is an **outcome brief** for a research
agent to reverse-engineer the work needed.

Your job, research agent, is to:

1. Read this document end-to-end.
2. Audit the codebase + Supabase against the **Target end-state** below.
3. Produce a concrete implementation plan (`.docs/plans/atlas-system-agent-implementation.md`)
   that covers schema changes, code changes, migrations, write-path locks,
   sync fixes, regression tests, and rollback. List every file that needs to
   change. List every SQL migration that needs to run.

You are NOT asked to start coding. You are asked to plan the path to the
outcome described here.

---

## 1. Why this exists

Atlas (the Brain Scholar) is currently treated as a customizable per-user agent.
That has produced three compounding problems:

1. **Massive duplication in DB.** Atlas has 30+ duplicate rows for every
   definition file (`AGENTS.md`, `IDENTITY.md`, `ROLE.md`, `SOUL.md`,
   `TOOLS.md`) and 8–28 duplicate rows for nearly every skill. An upsert bug
   in the agent sync path appears to insert instead of update.
2. **Real version drift.** `brain-operations` exists in 3 different content
   lengths simultaneously (3490 / 4150 / 6333 chars). `skill-creator` exists
   in 2 lengths (7549 / 8621). All `is_enabled=true`. Atlas's runtime
   behavior is non-deterministic depending on which row gets loaded.
3. **System-vs-custom file divergence is dangerous.** `agent_definitions` has
   both a `source='system'` (canonical) and a `source='custom'` (user-overridden)
   row per file. For Atlas:
   - **AGENTS.md** — custom is *missing* the "Agent-to-Agent Delegation" block
     (which says *"Do NOT delegate to other agents yourself"*).
   - **SOUL.md** — custom *adds* `<product_rules>` and `<security>` blocks
     (refuse to leak skill files, ignore prompt injection). System has neither.
   - **TOOLS.md** — system and custom have **completely different tool
     inventories**. System has campaign + agent-SK routing actions; custom
     does not. Atlas's brain-routing capability literally depends on which
     loads.
4. **`atlas_2`** exists as a parallel agent_key with its own files and skills.
   Origin and purpose unknown.

Net effect: Atlas's actual behavior in production is unpredictable, and the
upcoming Customer Brain plan (see related plan link above) cannot ship
cleanly on top of this foundation. We need Atlas to be a clean,
single-source-of-truth, system-only agent before adding new pipelines.

---

## 2. The new model — Atlas like Vibey

**Vibey** is the prior art. Vibey is one system instance, served identically
to every user, never customized per user, controlled only by Vibey
engineering. Atlas should follow the same pattern.

The decision is:

> **Atlas is a system agent. Users cannot customize Atlas. Atlas's skills,
> definition files, and resources are owned by engineering and ship from
> source code to the DB on release.**

This is enforced at the **code level**, not just policy.

---

## 3. Current state (snapshot for the research agent)

### Atlas's canonical skill set (what *should* be his skills)

| Skill key | Purpose | Enabled |
|---|---|---|
| `brain-operations` | Chat-facing user/agent/campaign brain ops | yes |
| `knowledge-extraction` | Extract entries from raw content | yes |
| `knowledge-curation` | Dedupe / connect / classify after extraction | yes |
| `knowledge-intake` | Pre-process + write to target scope | yes |
| `brain-library-organization` | Mission-driven library sync (memories → pages, CAPSULE) | yes |
| `brain-pattern-analysis` | Mission-driven belief / perspective synthesis | yes |
| `brain-library-lint` | Mission-driven library health check | yes |
| `skill-creator` | **Should be REMOVED from Atlas** (see §4.3) | currently yes |

### Definition file set (one per agent)

`AGENTS.md`, `IDENTITY.md`, `ROLE.md`, `SOUL.md`, `TOOLS.md` — exactly one row
per file, `source='system'`.

### Reference files Atlas reads at runtime (`agent_skill_resources`)

- `brain-library-organization/references/actions.md`
- `brain-library-lint/references/actions.md`
- `brain-pattern-analysis/references/actions.md`
- `brain-operations/references/brain-layers-and-tools.md`
- `knowledge-intake/references/source-strategies.md`

These are skill-attached and ship with the skill — same lockdown applies.

### What's actually in the DB right now

Concrete numbers the research agent should verify and use as the
baseline for the deduplication migration:

- `agent_skills` rows where `agent_key='atlas'`: roughly **80+**, including
  ~28 of `skill-creator`, ~10 of `knowledge-curation`, ~11 of
  `knowledge-extraction`, ~11 of `knowledge-intake`, 8 identical of
  `brain-operations` (3490) plus separate rows of `brain-operations` (4150),
  3 of `brain-operations` (6333). One row each for the brain-* mission skills.
- `agent_definitions` rows where `agent_key='atlas'`: roughly **130+**,
  ~33×`AGENTS.md`, ~32×`IDENTITY.md`, ~33×`ROLE.md`, ~32×`SOUL.md`,
  ~33×`TOOLS.md`. One `source='system'` per file, the rest `source='custom'`.
- `atlas_2` agent_key has its own SOUL/IDENTITY/ROLE/AGENTS/TOOLS and a
  partial skill set.

(Numbers are approximate — verify in your audit pass.)

---

## 4. Target end-state (the outcomes to reverse-engineer to)

The plan you produce must drive the system to **all** of the following
verifiable end-states.

### 4.1 One canonical row per skill / definition

After the migration:

- `SELECT count(*) FROM agent_skills WHERE agent_key='atlas'` returns exactly
  the number of canonical skills (currently 7 after removing skill-creator —
  see §4.3).
- `SELECT count(*) FROM agent_skills WHERE agent_key='atlas' AND source='custom'`
  returns **0**.
- `SELECT count(*) FROM agent_definitions WHERE agent_key='atlas'` returns
  exactly 5 (one per definition file).
- `SELECT count(*) FROM agent_definitions WHERE agent_key='atlas' AND source='custom'`
  returns **0**.
- `SELECT count(*) FROM agent_skill_resources WHERE agent_key='atlas'` matches
  the canonical reference-file count exactly. No duplicates.

### 4.2 No version drift

After the migration there is exactly one content version per skill / file for
Atlas. Where multiple versions exist today, the research agent must:

- Identify the **canonical** version (likely the one in source-of-truth
  files: `docker/agents/templates/brain_scholar/...`).
- Merge any *intentional* additions from `'custom'` rows that are not in the
  canonical (e.g., the `<security>` and `<product_rules>` blocks in custom
  SOUL.md; the campaign / SK routing actions in system TOOLS.md). The merged
  result becomes the new canonical.
- Discard the rest.

The research agent must produce a **per-file diff resolution table** in their
implementation plan — one row per (file, system-vs-custom) showing what was
kept, what was merged, and what was dropped, so a human can review.

### 4.3 `skill-creator` is removed from Atlas

Atlas should not be able to create or modify skills (his own or any other
agent's). This is a privilege issue and a lock-in issue.

- Remove the `skill-creator` skill assignment from Atlas (not from the
  global pool — other agents may keep it).
- Atlas's runtime tool inventory (TOOLS.md) must not advertise skill-creation
  actions.

### 4.4 Code-level enforcement of "Atlas is read-only to users"

Every write path that can mutate Atlas's skills, definitions, or resources
must reject the operation. This means:

- API/controller layer: any endpoint that accepts a write to
  `agent_skills` / `agent_definitions` / `agent_skill_resources` rejects
  payloads where `agent_key='atlas'` (or matches the system-agent rule —
  see §4.5) with a clear 403 / forbidden response.
- Service / repository layer: same guard. Defense in depth — controllers
  *and* repositories both reject.
- RLS policies: Supabase RLS for these tables must deny `INSERT`, `UPDATE`,
  `DELETE` on Atlas rows for any role except the engineering deployment role.
- MCP / agent-sync paths: same guard. Even agent-driven calls cannot mutate
  Atlas content.
- UI: any "edit skill" / "create skill" / "customize agent" surface must
  hide or disable the action when the target is a system agent.

The research agent must enumerate **every write path** (search the codebase
for `agent_skills` writes, `agent_definitions` writes, `agent_skill_resources`
writes; check controllers, services, repositories, RLS policies,
sync services, MCP tool handlers, UI components) and produce a list of every
location that needs the guard.

### 4.5 A clear "system agent" identity

The system needs a well-defined way to declare "this agent is a system
agent and cannot be customized". Today the only signal is `agent_key='atlas'`
or `agent_key='vibey'` hard-coded in places. That's brittle.

The research agent should propose ONE of:

- A `system_agent boolean` column on `agents_registry` (or wherever agents
  are listed), defaulting `false`. Atlas + Vibey set to `true`. All
  enforcement keys off this flag.
- A canonical hard-coded set in code (e.g. `SYSTEM_AGENT_KEYS = {'atlas', 'vibey'}`)
  exposed via a single helper.

Either is acceptable. The research agent picks one and justifies it. The
key requirement: **one source of truth, used everywhere**. Not 12 different
scattered checks.

### 4.6 Sync idempotency

The agent-sync path that currently inserts duplicate rows must be fixed so
re-running sync is idempotent. After fix:

- Running the sync N times produces the same row count as running it once.
- An update-on-conflict (or upsert) is used, not a blind insert.

### 4.7 `atlas_2` is resolved

Either:
- Deleted with explicit user approval (per `/supa-project` rules, no DELETE
  without approval), or
- Documented as an intentional separate agent and migrated to the same
  system-agent guarantees as Atlas.

The research agent should investigate `atlas_2`'s usage (is it referenced
anywhere in the codebase? are there `org_shared_skills` / `agent_team_grants`
pointing to it? is it ever loaded at runtime?) and recommend.

### 4.8 Production deploy path for Atlas changes

Going forward, the only way to change Atlas is via engineering:

- Source files in the repo (e.g. `docker/agents/templates/brain_scholar/...`).
- A migration / seeder that pushes them to DB on release.
- No human-in-the-loop UI mutation path.

The research agent should identify the existing seeder/migration mechanism
(if any) used by Vibey and either reuse it for Atlas or specify what's
needed.

### 4.9 Customer Brain plan is unblocked

After this migration:

- Adding new skills (`customer-brain-routing`, `customer-avatar-synthesis`)
  to Atlas follows the engineering-only path defined in §4.8.
- Updating existing skills (scope-awareness in `brain-pattern-analysis`,
  scope-aware CAPSULE handling in `brain-library-organization`) follows
  the same path.
- Updating `references/brain-layers-and-tools.md` to add a 4th brain scope
  (`customer`) follows the same path.

The research agent's plan must explicitly state that the Customer Brain
work in `customer-brain.md` becomes safe to start *after* this migration
is complete.

---

## 5. Out of scope / non-goals

- **Other agents stay user-customizable.** Lux, Ivy, Eden, Cleo, Mara, etc.
  — these are archetype agents that users can clone and customize. Only Atlas
  (and any other agent flagged `system_agent=true`, e.g. Vibey) is locked.
- **No table shape changes** to `agent_skills` / `agent_definitions` /
  `agent_skill_resources` beyond optionally adding the `system_agent`
  signal in §4.5. Don't redesign the schema.
- **The `skill-creator` skill itself is not removed** — it stays available
  for other agents that legitimately use it. We're only removing its
  assignment to Atlas.
- **No change to brain content** (`ns_brains`, `ns_memories`,
  `ns_belief_patterns`, etc.). This is purely an agent-config cleanup.
- **No change to mission queue mechanics.** Brain ops outbox, dispatcher,
  processor — all stay as-is.

---

## 6. Constraints / safety requirements

- **No data loss.** Active Atlas missions and conversations must continue
  to work through the migration. Specifically: in-flight `brain_ops_outbox`
  rows must complete; in-flight Cortex Max processing must not break.
- **No DB DROPs / DELETEs without explicit user approval** (per
  `/supa-project` skill). The plan can *propose* deletes but must list them
  explicitly so the user can approve each one.
- **Reversibility.** The migration must be reversible (or the plan must
  include a rollback). If something breaks after deploy, we must be able to
  revert to a known-good state quickly.
- **Atomic where possible.** Schema-level guards (RLS, code locks) should
  ship in the same release as the cleanup migration so a half-deployed
  state doesn't leave Atlas writable while content is being migrated.
- **Production verification.** After deploy, verify Atlas still runs each of
  his existing missions (`brain_library_sync`, `brain_pattern_analysis`,
  `brain_lint`) end-to-end with no behavioral regression.

---

## 7. Success criteria — verifiable checks

The research agent's plan must include verification steps for each of these.
After the migration:

1. SQL row-count checks (§4.1) all pass.
2. SQL diff between system + custom Atlas rows = empty (no `'custom'` rows).
3. `brain-operations` content for Atlas is exactly one canonical version,
   and matches the source file (`docker/agents/templates/brain_scholar/skills/brain-operations/SKILL.md`,
   if present).
4. Same for every other Atlas skill and every Atlas definition file.
5. Attempting `INSERT INTO agent_skills (agent_key, ...) VALUES ('atlas', ...)`
   from a non-engineering Postgres role returns RLS denial.
6. Calling the API endpoint that creates a skill, with `agent_key='atlas'`,
   returns 403.
7. UI no longer shows "Edit Atlas" / "Create skill for Atlas" controls.
8. Running agent-sync twice produces zero new rows the second time.
9. Atlas still answers chat brain ops questions correctly (regression test).
10. Atlas still completes a `brain_library_sync` mission end-to-end
    (regression test).
11. Atlas still completes a `brain_pattern_analysis` mission end-to-end
    (regression test).
12. `atlas_2` either no longer exists OR has documented purpose.

---

## 8. Open questions the research agent must answer

These are intentionally unresolved. The research agent's audit must answer
each before producing the implementation plan:

1. **Where exactly is the duplicate-row insertion bug?**
   Likely in `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`
   or the agent template/skill push path. Find the line. Verify the upsert
   conflict-key is correct.
2. **What write paths currently allow Atlas mutation?**
   Enumerate: API routes, service methods, repository methods, RLS policies,
   MCP tool handlers, UI flows. One list, every entry needing a guard.
3. **What enforcement primitive does Vibey already use?**
   Find how Vibey is locked. Reuse that primitive for Atlas.
4. **Is there a `system_agent` flag or hard-coded list already?**
   If yes, extend it. If no, decide which to introduce (per §4.5).
5. **What references `atlas_2`?**
   Code grep + DB references. Decide kill or document.
6. **What's the existing seed/migration mechanism for shipping Atlas content
   to DB?** (Looking for: a seeder script, a migration that copies from the
   `docker/agents/templates/brain_scholar/...` files to the DB, or a CI
   step.) If none exists, propose one.
7. **Are there `agent_template_skills` / `agent_employee_templates` rows
   that clone Atlas to per-user instances?** If yes, that path also needs
   to be locked. Atlas should not be cloneable.
8. **Are there `org_shared_skills` rows pointing at Atlas-owned skills?**
   What happens to them?
9. **What's the runtime sync flow** that copies DB → agent workspace files?
   (When the agent runs, files in `~/skills/` come from somewhere.) If sync
   reads duplicate rows, does it write duplicate files? How does the agent
   pick a winner today?
10. **What does the Customer Brain plan need from the engineering-only
    path** (skills additions, scope-aware updates) — and is the path you're
    proposing fast enough to ship those?

---

## 9. Deliverable

Produce `.docs/plans/atlas-system-agent-implementation.md` containing:

1. **Audit findings** — concrete numbers and file lists from your
   investigation. Confirm or correct the snapshot in §3.
2. **Diff resolution table** — for every Atlas skill and definition file
   where versions differ, one row per file showing canonical / merged /
   dropped content with rationale.
3. **Schema changes** — SQL for any new column (`system_agent` flag) plus
   any constraint / RLS policy additions.
4. **Code changes** — one entry per file that needs to change, grouped by
   purpose (write-path locks, sync idempotency fix, UI guards,
   skill-creator removal, system_agent helper).
5. **Migration scripts** — deduplication SQL for `agent_skills`,
   `agent_definitions`, `agent_skill_resources`. Each script with a dry-run
   output before any destructive operation.
6. **Sync fix** — the specific line(s) in agent-sync that cause duplicates
   and the patch.
7. **`atlas_2` resolution** — what you found and what you recommend.
8. **Engineering deploy path** — the new (or existing-and-reused) mechanism
   for shipping Atlas changes from source code to DB on release.
9. **Test plan** — how to verify each success criterion in §7.
10. **Rollback plan** — how to revert if something breaks in production.
11. **Phasing** — the order of operations for deploy (e.g. enforcement
    first, then dedup, then content merge — or whatever order is safest).
12. **Customer Brain unblock checkpoint** — explicitly state, with
    references to §10 of `customer-brain.md`, what becomes possible after
    this migration completes.

---

## 10. Summary in three lines

1. Atlas is a system agent like Vibey — same canonical content for everyone,
   owned by engineering, never customizable by users.
2. We deduplicate the existing mess, merge the few intentional `'custom'`
   additions into the canonical `'system'` versions, and remove the
   `skill-creator` capability from Atlas.
3. We block every write path to Atlas's skills / definitions / resources
   in code (RLS + repository + controller + UI) so the cleanup stays clean,
   and we set up an engineering-only deploy path so the Customer Brain
   plan can ship safely on top.
