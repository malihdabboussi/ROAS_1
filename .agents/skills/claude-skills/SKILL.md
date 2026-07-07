---
name: claude-skills
description: Reference guide for building and managing Vibey agent skills. Use when creating, writing, editing, seeding, or backfilling a skill for any agent, or when the user mentions building a skill, writing a SKILL.md, agent capabilities, skill structure, the skill library, template skills, or system skills. MUST be used whenever the user asks to create, update, or manage skills — skills live in the database across several tables, and writing to the wrong one silently does nothing.
---

# Claude Skills Reference

Skills are **database-first**. Filesystem copies under `docker/agents/*/skills/` are runtime artifacts: on every Agent API restart, `AgentSyncService.syncAll()` wipes each agent's local `skills/` directory and rewrites it from the database. A skill that only exists as a file is deleted on the next restart.

## Where to write — pick by goal

| Goal                                                        | Write to                                                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| One specific agent in one workspace                         | `agent_skills` row (that user_id/org_id scope)                                                                                         |
| A system agent (vibey, atlas, hr, viktor) in ALL workspaces | `agent_skills` system row (`user_id IS NULL AND org_id IS NULL`, `source='system'`) + matching file in `docker/agents/<agent>/skills/` |
| All FUTURE hires of a template (copywriter, designer, …)    | `skill_library` + `template_skill_assignments`                                                                                         |
| All future hires of a capability DOMAIN, incl. custom roles | `DOMAIN_LIBRARY_SKILLS` map in `apps/api/.../mission-skill-seeder.service.ts` (code change)                                            |
| Agents that are ALREADY hired                               | Backfill their `agent_skills` copies — library/template updates never propagate to existing agents                                     |
| Every-turn routing or precedence rules                      | Not a skill — `agent_definitions` TOOLS.md rows, and `packages/agent-policy/src/platform-tools-template.ts` for all future agents      |

## The tables

- **`agent_skills`** — what an agent actually loads. Columns: `agent_key`, `skill_key`, `name`, `description`, `markdown_content`, `is_enabled`, `source` (`system|template|default|user`), `archetype_filter` (NULL = all archetypes). Three scopes with partial unique indexes: system `(agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL`, org `(org_id, agent_key, skill_key)`, user `(user_id, agent_key, skill_key)`.
- **`agent_skill_resources`** — bundled files per skill (`file_path` like `references/x.md`, `content`, `content_type`). Same three scopes.
- **`skill_library`** + **`skill_library_resources`** — canonical bodies copied to new hires.
- **`template_skill_assignments`** — maps `template_key` → `skill_key`; `seedTemplateSkills` copies the library content into `agent_skills` at hire time.
- **`agent_definitions`** — SOUL/ROLE/IDENTITY/AGENTS/TOOLS per agent (system + per-workspace rows). TOOLS.md is read every turn; skills only load when their description triggers.

## Hard-won rules

1. **Never put YAML frontmatter inside `markdown_content`.** The sync service rebuilds frontmatter from the `skill_key` and `description` columns (`buildSkillMarkdown` strips any embedded frontmatter). The `description` column IS the trigger — write it with WHAT + WHEN, pushy enough to fire.
2. **Seed through a committed migration**, not ad-hoc SQL: write `supabase/migrations/<ts>_<name>.sql`, dollar-quote the bodies (`$skillbody$...$skillbody$`), apply with Supabase MCP `apply_migration` — staging (`xeceeohfjugfwurailuq`) first, production (`qfrvykscoymiwwgysvsr`) with explicit user approval.
3. **Updating `skill_library` does NOT update hired agents.** Their rows are copies. Backfill safely by updating only unedited copies: `UPDATE agent_skills s SET ... FROM skill_library l WHERE s.skill_key=l.skill_key AND s.markdown_content = l.markdown_content` — run the backfill BEFORE changing the library body, so the equality guard still matches.
4. **One skill per concern — rewrite, don't duplicate.** Before creating a skill, check `skill_library` and `agent_skills` for an existing skill with an overlapping trigger surface; two skills competing for the same phrases means neither triggers reliably. Upgrade the existing one in place (keep its `skill_key` to avoid churn in assignments and copies).
5. **A skill cannot grant access.** Integration/service access is gated by capability domain in `artifact-capability.policy.ts` (e.g. `social_analysis` = marketing domain + Vibey only). Giving a blocked agent the skill produces failing calls — fix the agent's `config.capability_domain` (explicit config beats role-text inference) or include an `ask_agent` escape hatch in the skill body.
6. **`docker/agents/*` is bootstrap, not truth.** `pnpm seed:system-agents` overwrites DB system rows from those files. The DB accumulates newer edits via migrations and chat flows, so ALWAYS sync DB → repo (md5-compare) before re-running the seed. (2026-06-11: 12/20 definition files and ~36 skill files had drifted; a blind re-seed would have reverted a week of changes.)
7. **System-row upserts need the partial-index conflict syntax:** `ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE ...` (resources: add `file_path`).
8. **Verify after seeding**: count rows per scope, confirm `length(markdown_content)` changed, and remember agents pick changes up on the next skill sync / Agent API restart — not instantly.

## How hires get skills (so you know what to touch)

At hire (`agent-management.service.createAgent` and `agent-onboarding.service`), in order: `seedLeaderSkills` (manager+) → `seedTemplateSkills(skill_seed_key || role)` from the library → `seedDomainSkills(capability_domain)` from `DOMAIN_LIBRARY_SKILLS` → optional `cloneSelectedSkills` → `seedDefaultSkills` (skill-creator etc., hardcoded in the seeder). New agents' TOOLS.md comes from `PLATFORM_TOOLS_DEFAULT_MD` in `packages/agent-policy` — `create_agent` cannot supply TOOLS.md.

## Writing quality

Follow `.docs/.skills/claude-skill/SKILL.md` for process and `.agents/skills/context-eng/SKILL.md` for style: explain the why, lean body (<500 lines), 2+ concrete examples, one term per concept, progressive disclosure into `references/`, description that triggers.
