# Foundry YC Demo — Space Retrieval Dataset Baseline

**Version:** `baseline-v1`  
**Recorded:** 2026-05-27  
**Supabase project:** `qfrvykscoymiwwgysvsr`  
**Seed source:** `scripts/seed-yc-demo/README.md`  
**Brain baseline:** [`foundry-yc-demo-baseline.md`](foundry-yc-demo-baseline.md)

Log `dataset_baseline: baseline-v1` in every Space retrieval eval run.

## Account

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| Org          | Foundry Creative — `9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800`    |
| Founder user | Garry Tan (yc-demo) — `ea216be9-d4c1-501a-b74e-4daf55e8d2ff` |
| Login        | `yc-demo@vibey.im`                                           |

## Primary eval Spaces (deterministic IDs)

IDs from `scripts/seed-yc-demo/lib/ids.ts` → `id('space', orgId, slug)`.

| Slug                    | Space ID                               | Eval role                              |
| ----------------------- | -------------------------------------- | -------------------------------------- |
| `company-wiki`          | `9ccdb39d-2369-5b87-a35c-fe504369ef0e` | Default backfill + wiki doc/task cases |
| `helmsmark-workspace`   | `8ffb35ec-4728-5821-9926-7cfddde683f4` | Mission + decoy cases                  |
| `plinthworks-workspace` | `1fb5d2e0-1c69-5821-bd8b-563d08b8bd06` | Cross-space decoy source               |
| `operations`            | `fa9c0215-636b-5e7b-896a-4851e75fb3d3` | Optional scale-up                      |

## Pinned source assets (fixtures)

### Company Wiki — docs

| Title                               | `space_items.id`                       | Fixture case                        |
| ----------------------------------- | -------------------------------------- | ----------------------------------- |
| Foundry — who we are not            | `ecd3212c-3473-5f0e-9227-db8a820fd283` | `yc-space-wiki-who-we-are-not`      |
| Foundry — brand voice cheatsheet    | `564ae49b-4967-5389-bc2e-6ada59925d4d` | `yc-space-wiki-brand-voice-exact`   |
| Foundry — kickoff SOP               | `3dec677a-a766-54eb-b003-33d45afa83c0` | `yc-space-wiki-kickoff-paraphrase`  |
| Foundry — approvals SOP             | `5b0cec22-148f-55a0-9ae5-3bd91e21f81a` | `yc-space-wiki-approvals-sop`       |
| Foundry — retro standard            | `3db26834-c444-54b2-95c1-29d317ba9f61` | `yc-space-wiki-retro-standard`      |
| Foundry — retainer scope guardrails | `9e9325ca-0d54-5230-9d79-e68ebcce9896` | `yc-space-wiki-retainer-guardrails` |

### Company Wiki — tasks

| Title                                     | `space_items.id`                       | Fixture case                     |
| ----------------------------------------- | -------------------------------------- | -------------------------------- |
| Audit wiki pages for stale scope language | `ced17bcb-5ae2-5f0d-a530-118ade7ab71d` | `yc-space-wiki-task-stale-scope` |

### Helmsmark — missions

| Slug                                                   | `missions.id`                          | Fixture case                    |
| ------------------------------------------------------ | -------------------------------------- | ------------------------------- |
| `mission-helmsmark-controller-repositioning-narrative` | `c72c7085-bd26-59fe-8ddf-9437d00813ca` | positioning / multi-hop / decoy |
| `mission-helmsmark-new-site-ia-copy`                   | `afd30097-4168-5270-a547-d38d7e632b61` | site copy rules / multi-hop     |

### Decoy (other Space)

| Title                        | Space                 | `space_items.id`                       |
| ---------------------------- | --------------------- | -------------------------------------- |
| Plinthworks — positioning v3 | plinthworks-workspace | `cbd0b3e6-b7d2-5125-adb1-5066a4166d92` |

Chunk UUIDs are assigned at index time. Fixtures pin **source** IDs; the live runner resolves `space_semantic_chunks.id` before scoring.

## Eval fixtures

| Eval type          | Fixture                                        | Cases |
| ------------------ | ---------------------------------------------- | ----: |
| `space-retrieval/` | `fixtures/vibey-space-yc-demo-golden-set.json` |    15 |
| `space-retrieval/` | `fixtures/space-retrieval-mvp-golden-set.json` |     4 |

## Reproduce indexing

```bash
# Company Wiki (required for most cases)
SPACE_EVAL_SPACE_SLUG=company-wiki SPACE_BACKFILL_DRY_RUN=0 \
  pnpm --filter @vibey/agent-api exec tsx src/modules/brain/evals/space-retrieval/space-retrieval-backfill.ts

# Helmsmark (mission cases)
SPACE_EVAL_SPACE_SLUG=helmsmark-workspace SPACE_BACKFILL_DRY_RUN=0 \
  pnpm --filter @vibey/agent-api exec tsx src/modules/brain/evals/space-retrieval/space-retrieval-backfill.ts
```

Verify chunk counts:

```sql
SELECT source_type, count(*)
FROM space_semantic_chunks
WHERE space_id = '9ccdb39d-2369-5b87-a35c-fe504369ef0e'
GROUP BY source_type;
```

## Rollout flags

- `SPACE_SEMANTIC_RETRIEVAL=1` — retrieval + eval runners set this
- `SPACE_ASSET_INDEXING=1` — backfill sets this for writes
