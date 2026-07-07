# Foundry YC Demo — Brain Eval Dataset Baseline

**Version:** `baseline-v1`  
**Recorded:** 2026-05-26  
**Supabase project:** `qfrvykscoymiwwgysvsr`  
**Seed source:** `scripts/seed-yc-demo/README.md`

This is the canonical inventory for the live Foundry Creative demo account used by Brain evals. Log `dataset_baseline: baseline-v1` in every eval run until counts or policy change.

## Account

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| Org          | Foundry Creative — `9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800`    |
| Founder user | Garry Tan (yc-demo) — `ea216be9-d4c1-501a-b74e-4daf55e8d2ff` |
| Login        | `yc-demo@vibey.im`                                           |

## Primary brain families (eval targets)

| Family       | Brain ID                               | Name           | Primary store                                       | Counts (baseline-v1)                                  |
| ------------ | -------------------------------------- | -------------- | --------------------------------------------------- | ----------------------------------------------------- |
| **user**     | `a0af7dc8-5a4e-58ed-a80f-0cef293c65a9` | My Brain       | `ns_memories` + `ns_snapshots`                      | **1,552** memories · **85** snapshots                 |
| **company**  | `5a07eaf4-1e76-5874-aa95-23d57c36cd4b` | Company Cortex | `company_cortex_objects` + `company_cortex_signals` | **849** objects · **722** signals · **34** dream runs |
| **customer** | `a3631a4f-9ec4-51f9-8a5c-dcb769c0c222` | Customer Brain | `ns_memories` + `ns_snapshots`                      | **787** memories · **25** snapshots                   |

Company brain has **0** rows in `ns_memories` — retrieval goes through cortex tables, not memory rows.

## Agent brains (needle-in-haystack + cross-brain cases)

| Agent | Brain ID                               | Memories | SK entries |
| ----- | -------------------------------------- | -------: | ---------: |
| Casey | `7d619112-3670-5b7d-ba44-bcc350a0e2cb` |      550 |        924 |
| Devon | `31bb7d8d-c3cd-5cca-959f-3eab0d1a0420` |      550 |         30 |
| Leo   | `3b4b3ca1-a00f-5c70-8bc8-f68c41526448` |      550 |         30 |
| Maya  | `e71137c0-6aa0-55f4-b202-31bd468ec93b` |      250 |         30 |
| Sara  | `0884bc48-21bc-5598-8cc8-c575d46ac199` |      510 |        285 |

**Vibey agent brain:** no `ns_brains` row for `agent_id = 'vibey'` in this org. Agent preload for Vibey returns empty until seeded.

## Org-wide totals (approximate)

| Store                                               |                                              Org-scoped count |
| --------------------------------------------------- | ------------------------------------------------------------: |
| `ns_brains`                                         | 17 (5 agent + 9 campaign + company + customer + 1 empty user) |
| `ns_memories` (all org brains + founder user brain) |                                                        ~4,700 |
| `ns_snapshots`                                      |                                                          ~110 |
| `company_cortex_objects`                            |                                                           849 |
| `company_cortex_signals`                            |                                                           722 |

## Vibey policy state (Management team)

Team: **Management** — `1058aacc-3382-4b57-905a-eab2ce1252a8`

Required grants for 4-family preload + `search_brain_context`:

- `personal` (maps to `brain_access:personal`)
- `read_brain_personal`
- `read_brain_agent`
- `read_brain_company`
- `read_brain_customer`

## Chat preload config (baseline-v1 evals)

| Setting                              | Value                                              |
| ------------------------------------ | -------------------------------------------------- |
| `PRELOAD_RETRIEVAL_LIMIT`            | **15 per family** (user, company, agent, customer) |
| `BRAIN_LLM_RERANKER`                 | `1`                                                |
| `BRAIN_MULTI_QUERY_RETRIEVAL`        | `1`                                                |
| `BRAIN_EVIDENCE_CHUNKS`              | `1`                                                |
| `search_brain_context` default limit | 10 global (max 50)                                 |

## Eval fixtures that consume this dataset

| Eval type             | Fixture                                        |                                                                             Cases |
| --------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------: |
| `needle-in-haystack/` | `fixtures/vibey-brain-yc-demo-golden-set.json` |                                                                               100 |
| `space-retrieval/`    | `fixtures/vibey-space-yc-demo-golden-set.json` | 15 · see [`foundry-yc-demo-space-baseline.md`](foundry-yc-demo-space-baseline.md) |
| `user-work/`          | `fixtures/yc-demo-user-work-set.json`          |                  20 (L1–L5 validation set + 15 ops cases) · rubric `user-work-v3` |

**User-work validation set:** L1–L5 (`yc-l1-*` through `yc-l5-*`) tagged `validationSet: true`. Use `validationPassRate` as the primary regression metric.

## Reproduce from scratch

```bash
pnpm seed:yc-demo
pnpm seed:yc-demo --phase=12-verify   # row-count assertions
```

After seed, backfill embeddings if needed:

```bash
pnpm seed:yc-demo --phase=one-off/backfill-embeddings
```

Verify counts with:

```sql
-- founder default user brain
SELECT count(*) FROM ns_memories WHERE brain_id = 'a0af7dc8-5a4e-58ed-a80f-0cef293c65a9';

-- company cortex (not ns_memories)
SELECT count(*) FROM company_cortex_objects WHERE org_id = '9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800';
SELECT count(*) FROM company_cortex_signals WHERE org_id = '9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800';

-- customer brain
SELECT count(*) FROM ns_memories WHERE brain_id = 'a3631a4f-9ec4-51f9-8a5c-dcb769c0c222';
```

## Scale-up checklist (e.g. baseline-v2 @ 5K user memories)

1. Decide target family and delta (e.g. user brain 1,552 → 5,000).
2. Extend seed content in `scripts/seed-yc-demo/content/` or add a one-off backfill script.
3. Re-run affected seed phase(s) or one-off script against demo org.
4. Run `one-off/backfill-embeddings.ts` for new rows.
5. Re-query counts; update this file with new version tag and date.
6. Re-run needle-in-haystack golden set — pinned evidence IDs must still resolve.
7. Re-run user-work L1–L5 — note `dataset_baseline: baseline-v2` in eval logs.
8. Compare pass rate and avg brain context tokens vs prior baseline.
