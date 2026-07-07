# ROAS — Lovable Cloud schema migration plan

**Target DB:** Standalone Supabase **`roas-production`** ref `lhfgtsjetcardinpgouq` (org DVTEST, us-east-1)  
**Source:** `supabase/migrations/` in VibeyV2 monorepo (~734 SQL files)  
**Status:** In progress — Batch 0 + base `schema.sql` bootstrap applied 2026-07-06 via Lovable MCP.

### Applied (2026-07-06)

| Step | Status | Notes |
|------|--------|-------|
| Batch 0 extensions | Done | `uuid-ossp` (preinstalled), `vector` enabled |
| Base schema bootstrap | Done | 26 core tables, indexes, RLS, `handle_new_user` + `update_updated_at` |
| pg_cron | On standalone Supabase Pro | Apply 3 pg_cron migration files (skipped only on Lovable Cloud) |
| Remaining migrations (~734) | Pending | Use `scripts/roas/apply-lovable-migrations.sh` with `DATABASE_URL` |

### Bulk apply (Dylan — one-time)

1. Lovable Cloud → ROAS Studio → **Database** → copy **connection string** (service role / direct Postgres)
2. Share via 1Password or paste in terminal (never commit):
   ```bash
   DATABASE_URL='postgresql://...' ./scripts/roas/apply-lovable-migrations.sh
   ```
3. Re-run safe; script logs applied files in `scripts/roas/.lovable-applied-migrations.log`

Optional batches:
```bash
MIGRATION_LIMIT=50 DATABASE_URL='...' ./scripts/roas/apply-lovable-migrations.sh
MIGRATION_FROM=048_campaign_knowledge_graph.sql DATABASE_URL='...' ./scripts/roas/apply-lovable-migrations.sh
```

---

## Approach

Apply migrations in **ordered batches** via Lovable Cloud SQL (Cloud tab → or `query_database` MCP), not a single dump.

1. **Batch 0 — Extensions + auth helpers** — `pgvector`, `uuid-ossp`, etc. (grep migrations for `CREATE EXTENSION`)
2. **Batch 1 — Core identity** — profiles, orgs, memberships, RLS on user tables
3. **Batch 2 — Studio** — conversations, messages, campaigns, artifacts
4. **Batch 3 — Spaces + automations**
5. **Batch 4 — Brain** — memories, embeddings, snapshots
6. **Batch 5 — Integrations** — user_integrations, capabilities, email recipes
7. **Batch 6 — Funnels/forms** — funnels, funnel_pages, forms, domains
8. **Batch 7 — Workers/Missions** — missions, queues, outbox tables
9. **Batch 8 — Remaining** — admin, billing (skip Stripe seed if no billing), observability

After each batch: smoke query + fix RLS policies if Lovable auth differs.

---

## Prerequisites (Dylan)

- Lovable Cloud enabled (done)
- Copy `SUPABASE_SERVICE_ROLE_KEY` for agent-side migration scripts (local only, never commit)
- Confirm Cloud region locked (Americas recommended)

---

## Execution options

| Method | Pros | Cons |
|--------|------|------|
| **Lovable SQL migrations** (ask Lovable agent) | Integrated, typed | 734 files may hit limits — use batches |
| **Local script** `psql $SUPABASE_DB_URL -f batch.sql` | Full control | Need direct DB URL from Cloud |
| **Supabase CLI** against Lovable-linked project | Familiar | Only if external Supabase linked (prefer native Cloud) |

---

## Skip / defer for ROAS v1

- Stripe billing tables seed data
- Prod-specific runtime URLs in migrations (e.g. Railway defaults) — replace with `api.roas.io` / Fly URLs in env, not DB
- Vibey-specific demo seeds unless wanted

---

## Agent next step (when Dylan ready)

1. Grep migrations for `CREATE EXTENSION` → run Batch 0
2. Identify earliest core schema files (profiles, auth hooks)
3. Run Batch 1–2 before backend deploy smoke test
4. Log applied migration IDs in this file to avoid double-apply

---

## Blockers

- Backend deploy needs schema through at least Batch 2 (auth + conversations + campaigns)
- Funnel publish needs Batch 6 + Vercel funnels app
