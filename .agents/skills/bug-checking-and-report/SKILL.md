---
name: bug-checking-and-report
description: 'Triage production or development incidents: trace errors to the correct host (Vercel frontend, Vercel backend, Vercel funnels, Fly.io agent stack, Supabase, Railway workers) and respond with a short plain-English summary plus evidence and durable fixes. Use whenever the user pastes an error, stack trace, 4xx/5xx, timeout, failed deploy, Sentry alert, Vercel or Fly log lines, broken UX in prod/staging/dev, or asks what broke and where to fix it. Tools: Supabase MCP with skill supa-project; Vercel MCP for prj_MTRba5SdYBFbiymrKqieGnGPjcBh (frontend), prj_YwUti53Q9vB6rMKPB5cpW8w7h0qL (backend), and prj_QPESSHik40T2659GTyfZSOalJe4T (funnels) when logs or deploys matter; Fly.io when agent-api, OpenClaw gateway, or machine health is implicated.'
---

# Bug checking and report

The user supplies the **error from production or development** (message, status code, request path, timestamps, screenshots, or log lines). Your job is to **locate the real source**, then deliver a **compact report** in simple language.

## Primary operator (DB and machines)

For **Supabase** queries and **Fly.io** machine mapping (e.g. `profiles.fly_machine_id`, `fly_runtime_app`, `USER_ID`, user-owned rows), treat the active human as **`sefy@olympus-digital.com`**. Resolve `auth.users` / `profiles` from that email when the investigation needs this workspace’s user context unless the user specifies a different account.

## Source of truth (Agent API / Fly machines)

Per **`.cursor/skills/claude-skills/SKILL.md`**:

- Skills are **database-first**: rows in **`agent_skills`** (and optional **`agent_skill_resources`**).
- **`AgentSyncService.syncAll()`** deletes each agent’s local **`skills/`** tree and rewrites it from Supabase.
- A skill that exists **only** under `.cursor/skills/` in the repo is **not** loaded onto agents after sync — it will disappear on restart.

**Persist this skill for runtime agents** using **Supabase MCP** with the **`skill/supa-project`** database config (see **`supa-project`** skill for URL and safety rules).

**What to store in `markdown_content`:** Put the **instruction body only** (no YAML frontmatter). `AgentSyncService` rebuilds each `SKILL.md` with `name: <skill_key>` and `description: <description column>`; if `markdown_content` starts with `---` frontmatter, sync **strips** that block first.

**Identifiers for this skill**

| Field              | Value                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `skill_key`        | `bug-checking-and-report`                                                                                    |
| `name` (DB column) | `Bug checking and report`                                                                                    |
| `description`      | Same string as the YAML `description` above (keep in sync when editing).                                     |
| `agent_key`        | e.g. `vibey` (match the agent that should receive it).                                                       |
| `user_id`          | `NULL` for a **system** skill shared by all machines for that `agent_key`; otherwise the owning user’s UUID. |

**Insert (new row)**

```sql
INSERT INTO agent_skills (user_id, agent_key, skill_key, name, description, markdown_content, is_enabled)
VALUES (
  NULL,
  'vibey',
  'bug-checking-and-report',
  'Bug checking and report',
  '<paste description column — same as skill YAML description>',
  '<paste entire markdown body after YAML frontmatter: from # Bug checking and report through Report format section; no leading --- block>',
  true
);
```

**Update (after editing repo or copy)**

```sql
UPDATE agent_skills
SET markdown_content = '<new body>',
    description = '<new trigger description if changed>'
WHERE agent_key = 'vibey' AND skill_key = 'bug-checking-and-report' AND user_id IS NULL;
```

Bundled files (if you add any later): **`agent_skill_resources`** with matching `agent_key`, `skill_key`, `file_path`, `content` (and same `user_id` pattern as the parent skill).

**Activation:** Row goes live on **next Agent API restart** or when sync runs. For authoring quality and eval patterns, see **`.docs/.skills/claude-skill/SKILL.md`**.

**Repo copy:** `.cursor/skills/bug-checking-and-report/SKILL.md` is the **version-controlled draft** for Cursor and code review; **Supabase is authoritative** for agents.

## Where things run (single map)

| Surface               | What lives there                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel — Frontend** | Web app UI and client / edge behavior — project **`prj_MTRba5SdYBFbiymrKqieGnGPjcBh`**.                                                                                                |
| **Vercel — Backend**  | API / server workloads on Vercel — project **`prj_YwUti53Q9vB6rMKPB5cpW8w7h0qL`**.                                                                                                     |
| **Vercel — Funnels**  | Funnels app — project **`prj_QPESSHik40T2659GTyfZSOalJe4T`**.                                                                                                                          |
| **Fly.io**            | **Agent API** (NestJS, exposed port) and **OpenClaw gateway** (internal). Same image; see **`fly-io-deploy`** (`vibey-runtimes` primary, `vibey-machines` legacy), `fly logs`, health. |
| **Supabase**          | Database, auth, storage, edge functions, advisors, Postgres logs — **Supabase MCP** + **`supa-project`**.                                                                              |
| **Railway**           | Workers (auto-deploy from **main** per deploy runbook) — when the failure is worker/queue/cron related.                                                                                |

Start from the error: URL/host, service name, or stack frame should tell you whether to open **Vercel** (which project), **Fly**, **Supabase**, or **Railway** first.

## Tools (use only when needed)

1. **Supabase MCP** — Schema, data, `execute_sql`, advisors, Postgres logs. Align with **`supa-project`**; do not delete branches or tables without explicit user approval. For user-scoped rows, default to **`sefy@olympus-digital.com`** (see Primary operator).
2. **Vercel MCP** — Deployments, build logs, runtime logs for **`prj_MTRba5SdYBFbiymrKqieGnGPjcBh`** (frontend), **`prj_YwUti53Q9vB6rMKPB5cpW8w7h0qL`** (backend), **`prj_QPESSHik40T2659GTyfZSOalJe4T`** (funnels). Pick the project that matches the failing hostname or route.
3. **Fly.io** — When the failure mentions the machine URL, agent-api, gateway, OpenClaw, or Fly health. Use `fly logs`, `fly status`, and **`fly-io-deploy`**. Tie machines to this user via **`sefy@olympus-digital.com`** in `profiles` when you need their `fly_machine_id` / app.
4. **Railway** — When the symptom points at background workers, not the web or Fly stack.

## Analysis standard

Follow the **`meticulously`** skill: full context, evidence (files, lines, logs), root cause vs symptoms, no guessing. Trace data and requests end-to-end before concluding.

## Report format (required)

Keep the **first answer** easy to read:

1. **Simple summary — 2–3 short lines** in plain words: what broke, what the user would notice (UX), and why it matters.
2. **Evidence** — Key files/paths and (if useful) functions or routes; optional one-line quotes from logs.
3. **Fix options** — Prefer changes that improve **long-term reliability** and **user experience** (clear errors, stable behavior, fewer silent failures), not one-off hacks. Name the best option first and why it lasts.

Do not bury the 2–3 line summary under long analysis; put it at the top, then details if the user needs them.
