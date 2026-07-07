# Space Retrieval Eval History

Running log of Space retrieval needle-in-haystack eval runs.

**Eval suite:** `apps/agent-api/src/modules/brain/evals/space-retrieval/space-yc-demo-real-runner.ts`
**Backfill:** `apps/agent-api/src/modules/brain/evals/space-retrieval/space-retrieval-backfill.ts`
**Default fixtures:**

- `space-retrieval-mvp-golden-set.json` (4 tiny cases)
- `vibey-space-yc-demo-golden-set.json` (15 YC demo cases)

**Metric glossary:** same as Brain needle-in-haystack (`../needle-in-haystack/logs/brain-eval-history.md`).

---

## Runs

_No live runs recorded yet. After backfill + eval, the runner appends a row here automatically._

**Command:**

```bash
SPACE_EVAL_SPACE_SLUG=company-wiki SPACE_BACKFILL_DRY_RUN=0 \
  pnpm --filter @vibey/agent-api exec tsx src/modules/brain/evals/space-retrieval/space-retrieval-backfill.ts

pnpm --filter @vibey/agent-api exec tsx src/modules/brain/evals/space-retrieval/space-yc-demo-real-runner.ts
```

### 2026-05-27 12:39 — space retrieval eval

- dataset_baseline: baseline-v1
- cases: 19
- pass@10: 0.579
- pass@20: 0.579
- pass@50: 0.684
- retrieval_recall: 0.649
- failures: 10
- output: `/Users/2fun/Documents/1 - Creation/vibey2.0/apps/agent-api/src/modules/brain/evals/space-retrieval/logs/space-retrieval-run-2026-05-27T12-39-36-618Z.json`

### 2026-05-27 12:41 — space retrieval eval

- dataset_baseline: baseline-v1
- cases: 19
- pass@10: 0.895
- pass@20: 0.895
- pass@50: 1.000
- retrieval_recall: 0.965
- failures: 5
- output: `/Users/2fun/Documents/1 - Creation/vibey2.0/apps/agent-api/src/modules/brain/evals/space-retrieval/logs/space-retrieval-run-2026-05-27T12-41-41-968Z.json`

### 2026-05-27 13:27 — space retrieval eval

- dataset_baseline: baseline-v1
- cases: 19
- pass@10: 1.000
- pass@20: 1.000
- pass@50: 1.000
- retrieval_recall: 1.000
- failures: 3
- output: `/Users/2fun/Documents/1 - Creation/vibey2.0/apps/agent-api/src/modules/brain/evals/space-retrieval/logs/space-retrieval-run-2026-05-27T13-27-16-897Z.json`

### 2026-05-27 13:30 — space retrieval eval

- dataset_baseline: baseline-v1
- cases: 19
- pass@10: 0.895
- pass@20: 0.895
- pass@50: 1.000
- retrieval_recall: 0.965
- failures: 5
- output: `/Users/2fun/Documents/1 - Creation/vibey2.0/apps/agent-api/src/modules/brain/evals/space-retrieval/logs/space-retrieval-run-2026-05-27T13-30-07-125Z.json`

### 2026-05-27 13:32 — space retrieval eval

- dataset_baseline: baseline-v1
- cases: 19
- pass@10: 0.895
- pass@20: 0.895
- pass@50: 1.000
- retrieval_recall: 0.965
- failures: 5
- output: `/Users/2fun/Documents/1 - Creation/vibey2.0/apps/agent-api/src/modules/brain/evals/space-retrieval/logs/space-retrieval-run-2026-05-27T13-32-04-128Z.json`

### 2026-05-27 13:34 — space retrieval eval

- dataset_baseline: baseline-v1
- cases: 19
- pass@10: 1.000
- pass@20: 1.000
- pass@50: 1.000
- retrieval_recall: 1.000
- failures: 3
- output: `/Users/2fun/Documents/1 - Creation/vibey2.0/apps/agent-api/src/modules/brain/evals/space-retrieval/logs/space-retrieval-run-2026-05-27T13-34-29-167Z.json`

### 2026-05-27 13:44 — space retrieval eval

- dataset_baseline: baseline-v1
- cases: 19
- pass@10: 1.000
- pass@20: 1.000
- pass@50: 1.000
- retrieval_recall: 1.000
- failures: 2
- output: `/Users/2fun/Documents/1 - Creation/vibey2.0/apps/agent-api/src/modules/brain/evals/space-retrieval/logs/space-retrieval-run-2026-05-27T13-44-24-040Z.json`
