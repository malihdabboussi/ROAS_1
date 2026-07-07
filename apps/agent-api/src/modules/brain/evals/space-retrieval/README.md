# Space Retrieval Evals

Needle-in-haystack evals for the **Space semantic retrieval layer** (operational Space assets: docs, tasks, missions, deliverables, activity, social research, view configs, media, artifacts, contacts, channels, and reporting snapshots).

Use this eval type when the question is "did Space retrieval surface the pinned chunk for this Space-scoped asset?" — not Brain memory/cortex recall.

**Dataset:** Foundry Creative YC demo — see [`../datasets/foundry-yc-demo-baseline.md`](../datasets/foundry-yc-demo-baseline.md) (Brain) and [`../datasets/foundry-yc-demo-space-baseline.md`](../datasets/foundry-yc-demo-space-baseline.md) (Space). Log `dataset_baseline: baseline-v1` in every run.

## Directory layout

```text
space-retrieval/
  fixtures/
    space-retrieval-mvp-golden-set.json   # 4 tiny deterministic cases (CI mock)
    vibey-space-yc-demo-golden-set.json # 15 live YC demo cases (source tags)
  logs/
    space-eval-history.md
  space-retrieval-backfill.ts
  space-yc-demo-real-runner.ts
  space-retrieval-golden-set.eval.ts
```

## Prerequisite: index the Space

Backfill indexes every asset in one Space (docs, tasks, missions, subtasks, deliverables, activity, conversation docs, first-class social research rows, view configs, media, contacts, channel messages, and campaign artifacts) into `space_semantic_chunks`.

Required env:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Space scope (one of):

- `SPACE_EVAL_SPACE_ID` — explicit UUID
- `SPACE_EVAL_SPACE_SLUG` — demo slug (`company-wiki`, `helmsmark-workspace`, …); see space baseline doc

Optional:

- `SPACE_EVAL_USER_ID` (defaults to YC demo founder)
- `SPACE_EVAL_ORG_ID` (defaults to Foundry org)
- `SPACE_BACKFILL_DRY_RUN=0` — actually embed (default dry-run skips writes)
- `SPACE_BACKFILL_LIMIT` — max index jobs (default 500)
- `SPACE_BACKFILL_SOURCE_TYPES` — comma-separated source-type allowlist for scoped backfills
- `SPACE_BACKFILL_SOCIAL_HANDLES` — comma-separated lowercase handle allowlist for social research rows

```bash
# Dry-run inventory (no embeddings)
pnpm --filter @vibey/agent-api exec tsx src/modules/brain/evals/space-retrieval/space-retrieval-backfill.ts

# Index Company Wiki for evals
SPACE_EVAL_SPACE_SLUG=company-wiki SPACE_BACKFILL_DRY_RUN=0 \
  pnpm --filter @vibey/agent-api exec tsx src/modules/brain/evals/space-retrieval/space-retrieval-backfill.ts

# Index Helmsmark workspace
SPACE_EVAL_SPACE_SLUG=helmsmark-workspace SPACE_BACKFILL_DRY_RUN=0 \
  pnpm --filter @vibey/agent-api exec tsx src/modules/brain/evals/space-retrieval/space-retrieval-backfill.ts
```

## Live retrieval eval

Resolves `source:<type>:<id>` tags in fixtures to live `space_semantic_chunks.id` values, then runs `SpaceRetrievalService` + `BrainEvalRunner` scoring (pass@10/20/50, lane/strategy breakdowns).

Required env:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` or embedding provider configured for `EmbeddingService`

Rollout flags (set by runner/backfill):

- `SPACE_SEMANTIC_RETRIEVAL=1`

Optional:

- `SPACE_EVAL_LIMIT` / `SPACE_EVAL_OFFSET`
- `SPACE_EVAL_LEVEL` — `tiny_golden_fixture` | `yc_demo`
- `SPACE_EVAL_CONCURRENCY` — parallel case workers (default `10`)
- `SPACE_EVAL_OUTPUT_DIR` — raw JSON run output (default: `logs/`)
- `BRAIN_LLM_RERANKER=1` — enable LLM rerank (same as Brain evals)

```bash
# Full suite (backfill company-wiki + helmsmark first)
pnpm --filter @vibey/agent-api exec tsx src/modules/brain/evals/space-retrieval/space-yc-demo-real-runner.ts

# YC demo cases only
SPACE_EVAL_LEVEL=yc_demo pnpm --filter @vibey/agent-api exec tsx src/modules/brain/evals/space-retrieval/space-yc-demo-real-runner.ts
```

## CI-safe unit eval

```bash
pnpm --filter @vibey/agent-api test -- space-retrieval-golden-set
```

## Metric glossary

Same as Brain needle-in-haystack (see `needle-in-haystack/logs/brain-eval-history.md`):

- `retrieval_recall` — expected chunk IDs in top 10
- `passAt10/20/50` — all expected chunks found within top K
- `context_sufficiency` — sufficiency decision matches fixture
- `laneScores` — by `source_type` (space_doc, instagram_research_item, funnel, media_asset, campaign_overview_snapshot, …)
- `strategyScores` — semantic vs lexical surfacing

## Fixture conventions

- `space:<uuid>` — scopes retrieval to `current_space`
- `source:<source_type>:<source_id>` — pins expected evidence (resolved to chunk UUIDs at run time)
- `decoy:<source_type>:<source_id>` — must not appear in results (negative-decoy cases)

Source IDs are deterministic YC demo seed IDs (see `foundry-yc-demo-space-baseline.md`).
