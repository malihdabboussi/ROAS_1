# Brain Evals

Brain evals are organized by eval type. Each eval type owns its runners, fixtures, and logs.

## Directory Layout

Use this shape for every eval type:

```text
evals/
  brain-eval-runner.ts
  brain-eval.types.ts
  README.md
  needle-in-haystack/
    fixtures/
    logs/
    *.ts
  space-retrieval/
    fixtures/
    logs/
    *.ts
  user-work/
    fixtures/
    logs/
```

- Keep shared harness code at the `evals/` root.
- Put type-specific runners and tests in a named subfolder like `needle-in-haystack/`, `user-work/`, or `external-market-benchmarks/`.
- Put fixture data beside the eval type that consumes it.
- Put run logs under that eval type's `logs/` folder.

## Eval Types

- `needle-in-haystack/`: evidence-finding evals. Use this for exact memories, document sentences, artifacts, conversations, and other cases where the goal is finding pinned evidence in a large corpus.
- `space-retrieval/`: Space-scoped retrieval evals. Use this for docs, tasks, missions, and deliverables indexed in `space_semantic_chunks` (separate from Brain memory).
- `user-work/`: task-outcome evals. Use this for the Brain product eval where the judge asks whether the returned Brain context helped the user answer a query, make a decision, write something, plan, or complete work.
- `external-market-benchmarks/`: future external benchmark evals. Use this for public or third-party market/reference suites when we add them.

## Reference Datasets

Live Supabase accounts used by multiple eval types are documented under `datasets/`.

- [`datasets/foundry-yc-demo-baseline.md`](datasets/foundry-yc-demo-baseline.md) — Foundry Creative YC demo account (`baseline-v1`). Brain IDs, row counts, policy grants, preload config, seed repro, and scale-up checklist.
- [`datasets/foundry-yc-demo-space-baseline.md`](datasets/foundry-yc-demo-space-baseline.md) — Same account, Space retrieval eval targets (Space IDs, pinned source assets, backfill commands).
- Seed operator manual: `scripts/seed-yc-demo/README.md`

Every eval log entry should include `dataset_baseline: <version>` so scores stay comparable when corpus size changes.

## Adding A New Eval Type

1. Create `evals/<type>/`.
2. Add `evals/<type>/fixtures/` for checked-in fixture data.
3. Add `evals/<type>/logs/` for run history and raw-output references.
4. Reuse `BrainEvalRunner` and shared types when the scoring model fits.
5. Add a type-specific runner or test file inside the type folder.
6. Document the run command and metrics in the type folder or its log file.

## Saving Logs

Every live or benchmark run should leave a durable note in the eval type's `logs/` folder.

Log entries should include:

- date and config flags
- fixture set and case count
- headline scores
- lane/category breakdowns when relevant
- cost and latency when providers are called
- output file reference for raw JSON or terminal output
- short takeaways and known blockers

Do not mix logs from different eval types in one file. Needle-in-haystack logs belong in `needle-in-haystack/logs/`; user-work logs belong in `user-work/logs/`; external benchmark logs should live with their own eval type.
