# Brain Eval History

Running log of all Brain needle-in-haystack eval runs. One row per run with config, results, and key takeaways.

**Eval suite:** `apps/agent-api/src/modules/brain/evals/needle-in-haystack/brain-yc-demo-real-runner.ts`
**Default fixtures:**

- `vibey-brain-yc-demo-golden-set.json` (100 cases)
- `vibey-brain-cortex-coverage-set.json` (28 cases — snapshots, perspectives, customer avatars, avatar axes, company signals)

**Metric glossary:**

- `retrieval_recall` = expected evidence in top 10 / expected count (avg across cases)
- `passAt10/20/50` = % of cases where ALL expected evidence is in top K
- `context_sufficiency` = % of cases where sufficiency decision matches expected
- `abstention_correctness` = % of "should abstain" cases where Brain correctly abstained
- `providerCostUsd` = our OpenRouter/Gemini cost
- `userCostUsd` = 2x margin user-billed equivalent
- `estimatedCredits` = `ceil(userCostUsd * 200)`

---

## Runs

### 2026-05-26 00:55 — Gemini 3.5 Flash reranker, 128 cases

**Config:** `BRAIN_LLM_RERANKER=1` · `BRAIN_LLM_RERANKER_MODEL=google/gemini-3.5-flash` · `BRAIN_CONTEXT_SUFFICIENCY_LLM=0` · `BRAIN_EVIDENCE_CHUNKS=1` · `BRAIN_MULTI_QUERY_RETRIEVAL=1`
**Fixture:** 128 cases (100 YC + 28 Cortex coverage)
**Code state:** Same as previous no-LLM run + LLM reranker active. Pricing row for `gemini-embedding-2-preview` added before this run so total cost is reported in USD.

**Headline:**

| metric                 | value     | vs no-LLM 128 |
| ---------------------- | --------- | ------------- |
| retrieval_recall       | **0.809** | +0.289        |
| passAt10               | **0.797** | +0.297        |
| passAt20               | **0.828** | +0.203        |
| passAt50               | 0.844     | +0.008        |
| context_sufficiency    | **0.836** | +0.211        |
| abstention_correctness | 1.0       | +0.008        |
| avg latency_ms         | 24,737    | +22,014 (~9x) |

**Lane scores (pass@10 / pass@50):**

| lane            | n   | pass@10 | pass@50 | vs no-LLM pass@10 |
| --------------- | --- | ------- | ------- | ----------------- |
| sk_entry        | 20  | 1.0     | 1.0     | +0.15             |
| snapshot        | 7   | 1.0     | 1.0     | +0.14             |
| perspective     | 6   | 1.0     | 1.0     | +0.83             |
| avatar_axis     | 5   | 1.0     | 1.0     | +1.0              |
| company_signal  | 4   | 1.0     | 1.0     | ~                 |
| memory          | 46  | 0.848   | 0.891   | +0.435            |
| belief_pattern  | 5   | 0.8     | 1.0     | +0.4              |
| customer_avatar | 6   | 0.667   | 0.667   | ~                 |
| narrative_page  | 5   | 0.4     | 1.0     | +0.4              |
| company_object  | 23  | 0.391   | 0.435   | +0.043            |

**Strategy breakdown (overall hits at top 10):**

| strategy       | count                                                                             |
| -------------- | --------------------------------------------------------------------------------- |
| semantic       | 102                                                                               |
| lexical        | 2                                                                                 |
| graph          | 0                                                                                 |
| rerank         | 0 (Gemini overwrites final score but candidate's semantic was still the surfacer) |
| metadata       | 0                                                                                 |
| **total hits** | **104**                                                                           |

**Cost:**

| metric                      | value                   |
| --------------------------- | ----------------------- |
| embedding calls             | 137                     |
| embedding input tokens      | 1,956                   |
| reranker (Gemini) calls     | 137                     |
| reranker prompt tokens      | 626,909                 |
| reranker completion tokens  | 627,018                 |
| reranker total tokens       | 1,253,927               |
| **providerCostUsd**         | **$6.58**               |
| **userCostUsd (2x margin)** | **$13.17**              |
| marginUsd                   | $6.58                   |
| **estimatedCredits**        | **2,634**               |
| pricingSource               | token_providers_pricing |
| costUnknownCount            | 0                       |

**Notes:**

- Huge quality jump: pass@10 from 0.50 → 0.80, recall from 0.52 → 0.81. The Gemini reranker fixes the ranking problem we identified — items already in pass@50 now mostly make it to top 10.
- 7 of 10 lanes now hit 100% pass@10: `sk_entry`, `snapshot`, `perspective`, `avatar_axis`, `company_signal`, plus `memory`/`belief_pattern` near-perfect.
- `company_object` remains stuck at pass@10 0.39 / pass@50 0.43. This is **not a ranking problem** — it's candidate generation. ~13 of 23 expected company objects never surface in top 50 at all. Likely the same RPC issue we hit before (`search_company_cortex_objects` threshold or filters dropping rows).
- `customer_avatar` capped at 0.67 same as before — RPC `status='active'` filter excludes 2 fixture avatars in `emerging`/`shifting` state.
- Cost: $6.58 us / $13.17 user-billed / 2,634 credits for 128 queries with full Gemini reranking. ~$0.05 us per query.
- Latency: 24.7s/query average — 9x slower than no-LLM. Production must keep reranker behind a flag and only call on hard queries.
- Strategy breakdown still shows semantic as the surfacing strategy because the candidate originally came in via semantic; Gemini just promoted it to the top. Reranker doesn't count as "surfacing", it counts as "reordering".

**Output file:** `terminals/119664.txt`

---

### 2026-05-25 23:56 — no-LLM, 128 cases (full coverage fixture)

**Config:** `BRAIN_LLM_RERANKER=0` · `BRAIN_CONTEXT_SUFFICIENCY_LLM=0` · `BRAIN_EVIDENCE_CHUNKS=1` · `BRAIN_MULTI_QUERY_RETRIEVAL=1`
**Fixture:** 100 YC + 28 cortex coverage = **128 cases**
**Code state:** First-class lanes for all object types + lane balancing + strategy-hit tracking + total-cost reporting. Cortex coverage fixture (snapshots, perspectives, customer avatars, avatar axes, company signals) added.

**Headline:**

| metric                 | value  |
| ---------------------- | ------ |
| retrieval_recall       | 0.520  |
| passAt10               | 0.500  |
| passAt20               | 0.625  |
| passAt50               | 0.836  |
| context_sufficiency    | 0.625  |
| abstention_correctness | 0.992  |
| avg latency_ms         | 2722.6 |

**Lane scores (pass@10 / pass@50):**

| lane            | n   | pass@10 | pass@50 |
| --------------- | --- | ------- | ------- |
| company_signal  | 4   | 1.0     | 1.0     |
| snapshot        | 7   | 0.857   | 1.0     |
| sk_entry        | 20  | 0.85    | 1.0     |
| customer_avatar | 6   | 0.667   | 0.667   |
| memory          | 46  | 0.413   | 0.848   |
| belief_pattern  | 5   | 0.4     | 1.0     |
| company_object  | 23  | 0.348   | 0.435   |
| perspective     | 6   | 0.167   | 1.0     |
| narrative_page  | 5   | 0       | 1.0     |
| avatar_axis     | 5   | 0       | 1.0     |

**Strategy breakdown (overall hits at top 10):**

| strategy       | count  |
| -------------- | ------ |
| semantic       | 64     |
| lexical        | 1      |
| graph          | 0      |
| rerank         | 0      |
| metadata       | 0      |
| **total hits** | **65** |

Same pattern through top 20 (80 semantic, 1 lexical) and top 50 (107 semantic, 2 lexical).

**Cost:**

| metric           | value                                                  |
| ---------------- | ------------------------------------------------------ |
| embedding calls  | 137                                                    |
| embedding tokens | 1956                                                   |
| reranker calls   | 0                                                      |
| providerCostUsd  | null (no pricing row for `gemini-embedding-2-preview`) |
| userCostUsd      | null                                                   |
| credits          | null                                                   |

**Notes:**

- Semantic embeddings are doing ~99% of the retrieval work. Lexical and graph signals are effectively unused in ranking right now.
- `narrative_page`, `avatar_axis`, `perspective` all have pass@50 = 1.0 but pass@10 = 0 / 0 / 0.17 — these are pure ranking-order problems, not candidate-gen problems.
- `customer_avatar` pass@50 capped at 0.667 (4/6 retrieved at all depths). The 2 missing avatars are `emerging` status or `shifting` — RPC filters by `status='active'` only.
- `company_object` stuck at pass@50 0.435 — many expected company objects are not surfacing even in top 50. Needs deeper investigation.
- Need to add `gemini-embedding-2-preview` to `token_providers_pricing` to enable cost reporting in $.

**Output file:** `agent-tools/2e4468cd-9957-4093-817f-d19b5bb0a10d.txt`

---

### 2026-05-25 22:56 — no-LLM, full lanes + cognition embeddings

**Config:** `BRAIN_LLM_RERANKER=0` · `BRAIN_CONTEXT_SUFFICIENCY_LLM=0` · `BRAIN_EVIDENCE_CHUNKS=1` · `BRAIN_MULTI_QUERY_RETRIEVAL=1`
**Fixture:** 100 cases (YC only — coverage fixture not yet added)
**Code state:** First-class lane retrieval, narrative pages semantic+lexical, belief/perspective embeddings backfilled, lane balancing, RRF.

**Headline:**

| metric                 | value   |
| ---------------------- | ------- |
| retrieval_recall       | 0.505   |
| passAt10               | 0.48    |
| passAt20               | 0.59    |
| passAt50               | 0.80    |
| context_sufficiency    | 0.62    |
| abstention_correctness | 0.99    |
| avg latency_ms         | 2619.64 |
| provider cost          | $0      |
| user cost              | $0      |
| credits                | 0       |

**Lane scores (pass@10 / pass@50):**

| lane           | pass@10 | pass@50 |
| -------------- | ------- | ------- |
| memory         | 0.391   | 0.826   |
| sk_entry       | 0.85    | 1.0     |
| company_object | 0.348   | 0.435   |
| narrative_page | 0       | 1.0     |
| belief_pattern | 0.4     | 1.0     |

**Notes:**

- Cognition is now found, but ranked too low — narrative pages never crack top 10.
- Company objects still missing from candidate set (pass@50 only 0.435).
- `context_sufficiency` regressed from 0.94 → 0.62 vs previous run (stricter abstention from Step 2 sufficiency gate; need to recalibrate).
- Embedding backfill added ~312k input tokens across `ns_belief_patterns`, `ns_perspectives`, `customer_avatars`, `avatar_discriminator_axes`, `company_cortex_signals`, plus filling missing rows in memories/snapshots/SK/narrative pages.

**Output file:** `agent-tools/73c7a57f-7d60-4b2d-a024-836e457aea47.txt`

---

### 2026-05-25 20:32 — no-LLM, baseline (pre full-lane refactor)

**Config:** `BRAIN_LLM_RERANKER=0` · `BRAIN_CONTEXT_SUFFICIENCY_LLM=0` · `BRAIN_EVIDENCE_CHUNKS=0` · `BRAIN_MULTI_QUERY_RETRIEVAL=1`
**Fixture:** 100 cases (YC only)
**Code state:** After Steps 1-2 (pass@k diagnostics, strict sufficiency, exact-title/decoy/multi-query). Cognition still appended as lexical-only after main candidate gen. No belief/perspective embeddings. No company signal lane. No customer avatar/axis lanes.

**Headline:**

| metric                 | value   |
| ---------------------- | ------- |
| retrieval_recall       | 0.495   |
| passAt10               | 0.47    |
| passAt20               | 0.59    |
| passAt50               | 0.70    |
| context_sufficiency    | 0.94    |
| abstention_correctness | 0.99    |
| avg latency_ms         | 2625.84 |
| provider cost          | $0      |
| user cost              | $0      |
| credits                | 0       |

**Failure buckets (68 failures of 100):**

| mode                         | count |
| ---------------------------- | ----- |
| not_found (in top 50)        | 29    |
| insufficient_context         | 22    |
| found_at_20                  | 7     |
| found_at_50                  | 7     |
| decoy_hit                    | 2     |
| found_at_10 (other mismatch) | 1     |

**Category gaps:**

- cognition: `retrieval_recall=0`, `pass@50=0` — cognition data exists in DB but lexical-only retrieval cannot surface it for paraphrased questions
- cross_brain / shared_access: `pass@50=0` — flat merge drowns small lanes
- multi_hop: `pass@10=0` — second evidence ID rarely in top window

**Output file:** `agent-tools/07442648-0549-4c61-9528-c106b87f8321.txt`

---

## Pending / blocked runs

### 2026-05-25 ~23:13 — Gemini 3.5 Flash reranker (aborted)

**Config:** `BRAIN_LLM_RERANKER=1` · `BRAIN_LLM_RERANKER_MODEL=google/gemini-3.5-flash` · multi-query on · evidence chunks on
**Status:** Killed by user mid-run (cost concern before per-strategy + total-cost reporting was wired). No final metrics.

---

## Backfill runs

### 2026-05-25 19:50 — full embedding backfill (all lanes)

**Config:** `BRAIN_BACKFILL_DRY_RUN=0` · `BRAIN_BACKFILL_LIMIT=2500`
**Embedded:**

| table                     | rows |
| ------------------------- | ---- |
| ns_memories               | 143  |
| ns_snapshots              | 20   |
| ns_sk_entries             | 24   |
| ns_narrative_pages        | 2    |
| ns_belief_patterns        | 420  |
| ns_perspectives           | 137  |
| customer_avatars          | 7    |
| avatar_discriminator_axes | 7    |
| company_cortex_objects    | 0    |
| company_cortex_signals    | 722  |

**Cost:** `inputTokens=312,521`, `outputTokens=0`. Pricing for `gemini-embedding-2-preview` not present in `token_providers_pricing` so USD/credits left null. Add pricing row to get future runs costed.

**Output file:** `terminals/567835.txt`

---

## How to append the next run

After each eval finishes:

1. Copy the `scores`, `passAt10/20/50`, `laneScores`, `strategyScores`, and `totalUsage` from the JSON output.
2. Add a new dated section at the top of "Runs".
3. Note any config flags, code-state changes since last run, and observable regressions vs prior row.
4. Reference the output file in `agent-tools/<uuid>.txt` or wherever it lives.
5. Keep needle-in-haystack eval run notes in this file. Other Brain eval types should keep their run logs under their own `logs/` folder.
