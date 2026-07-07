# User-Work Brain Eval History

Running log of Brain user-work eval runs. One row per live Vibey-agent run.

**Eval suite:** `apps/agent-api/src/modules/brain/evals/user-work/user-work-yc-demo-real-runner.ts`
**Default fixture:** `yc-demo-user-work-set.json` (20 Foundry Creative cases — L1–L5 ladder + 15 brain-verified ops cases)
**Primary metric:** `validationPassRate` (L1–L5 validation set) and suite `passRate`.

## How to run

Required environment:

- `BRAIN_USER_WORK_ACCESS_TOKEN`
- `BRAIN_USER_WORK_USER_ID`
- `OPENROUTER_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Optional environment:

- `BRAIN_USER_WORK_REFRESH_TOKEN`
- `BRAIN_USER_WORK_ORG_ID`
- `BRAIN_USER_WORK_AGENT_KEY` (defaults to `vibey`)
- `BRAIN_USER_WORK_MODEL`
- `BRAIN_USER_WORK_JUDGE_MODEL` (defaults to `google/gemini-3.5-flash`)
- `BRAIN_USER_WORK_CASE_ID` — run a single case by id (e.g. `yc-l5-saltline-day73-plan`)
- `BRAIN_USER_WORK_CONCURRENCY` — cases to run in parallel (default: all cases in one batch; use `1` for sequential)
- `BRAIN_USER_WORK_LIMIT`
- `BRAIN_USER_WORK_OFFSET` — skip first N cases (e.g. offset 10 + limit 10 for batch 2)
- `BRAIN_USER_WORK_VALIDATION_ONLY=1` — run only L1–L5 validation cases
- `BRAIN_USER_WORK_ADVERSARIAL=0` — skip adversarial judge pass 2 (default: on)
- `BRAIN_USER_WORK_OUTPUT_DIR`

Command:

```bash
pnpm --filter @vibey/agent-api exec tsx src/modules/brain/evals/user-work/user-work-yc-demo-real-runner.ts
```

## Metric glossary

Outcome judge (`user-work-v3`):

**Mechanical gate (pre-LLM):**

- Forbidden-claim substring hits → fail
- Missing `requiredContext` phrases → fail
- Insufficient-context cases without abstention/caveat language → fail

**Binary expectations (LLM pass 1):**

- Each case has 4–6 yes/no expectations with evidence
- `expectationPassRate` = passed / total

**Adversarial re-check (LLM pass 2, optional):**

- Re-evaluates passing expectations with hostile framing
- `adversarialFlips` in failure output when keyword-stuffing detected

**Soft rubric (LLM pass 1, diagnostic + gate):**

- `taskCompletion` = final answer helps complete the user task.
- `contextUsefulness` = answer includes the needed set of information.
- `groundedness` = useful claims are plausibly grounded, not invented.
- `synthesisQuality` = answer synthesizes context instead of dumping snippets.
- `irrelevanceControl` = noisy context did not distract the answer.
- `abstentionQuality` = insufficient-context cases abstain or caveat honestly.

**Claims extraction:** structured factual/quality claims with verified flag.

Pass rule: mechanical pass + all expectations pass + adversarial pass (when enabled) + no hard-fails + weighted score >= 3.5. Tool routing is not scored.

**Validation set:** L1–L5 cases tagged `validationSet: true`. Report `validationPassRate` separately for regression tracking.

Cost/latency metrics (suite `totalUsage`):

- `avgAgentLatencyMs` = average end-to-end chat response time per case.
- `avgJudgeLatencyMs` = average OpenRouter judge call time per case.
- `avgInputTokens` / `avgOutputTokens` / `avgTotalTokens` = average tokens per case (agent + judge).
- `avgBrainContextTokens` = average pre-injected Brain context tokens from chat `done` event.
- `providerCostUsd` = our cost (agent model pricing + OpenRouter judge cost when reported).
- `userCostUsd` = 2x margin user-billed equivalent.
- `estimatedCredits` = `ceil(userCostUsd * 200)`.

Tool-call metrics:

- `totalToolCalls` = all unique `tool_start` events per case (deduped by `tool_call_id`).
- `brainToolCalls` = subset where action is a Brain search tool.
- `avgToolCalls` / `avgBrainToolCalls` = suite averages across cases.
- `byToolName` / `byBrainAction` = per-case breakdown in run JSON.

## Runs

### 2026-05-26 — full suite parallel · agent `google/gemini-3.5-flash`

**dataset_baseline:** `baseline-v1`  
**Agent model:** `google/gemini-3.5-flash` · judge `google/gemini-3.5-flash`  
**Config:** preload 15/family · customer preload on · parallel batch  
**Result:** 3/5 pass · **60% pass rate** · avg score **3.83**  
**Wall time:** ~204s  
**Tools:** avg 5.6 total · avg 0 brain (L3/L5 used non-brain tools)  
**Output:** `logs/user-work-run-2026-05-26T11-18-13-156Z.json`

| Case                | Sonnet 4.6 | Gemini 3.5 Flash |
| ------------------- | ---------- | ---------------- |
| L1 Retainer cap     | Pass 5.0   | Pass 5.0         |
| L2 Devi homepage    | Pass 3.7   | Pass 4.0         |
| L3 Hero draft       | Pass 5.0   | Pass 5.0         |
| L4 Q2 paid decision | Fail 2.0   | Fail **1.8**     |
| L5 Saltline day 73  | Fail 4.0   | Fail **3.3**     |

### 2026-05-26 — full suite parallel (customer preload + 4-family)

**dataset_baseline:** `baseline-v1`  
**Config:** preload **15/family** · customer preload on · **parallel batch (default)**  
**Cases:** 5 Foundry Creative (L1–L5)  
**Result:** 3/5 pass · **60% pass rate** · avg score 3.93  
**Wall time:** ~76s (parallel) vs ~5× sequential  
**Tokens:** avg 7,970 brain context · avg 24,967/case  
**Output:** `logs/user-work-run-2026-05-26T11-13-24-036Z.json`

| Case                | Result | Score |
| ------------------- | ------ | ----- |
| L1 Retainer cap     | Pass   |       |
| L2 Devi homepage    | Pass   |       |
| L3 Hero draft       | Pass   |       |
| L4 Q2 paid decision | Fail   | 2.0   |
| L5 Saltline day 73  | Fail   | 4.0   |

### 2026-05-26 — L5 only smoke (post policy fix)

**dataset_baseline:** `baseline-v1`  
**Config:** preload **15/family** · local agent-api `:3003`  
**Case:** `yc-l5-saltline-day73-plan` only  
**Result:** Fail judge (4.17) — missing "launch window" in answer; brain preload working  
**Tokens:** 6,706 brain context · 0 tool calls  
**Trace:** `f24ff02f-d65f-4932-ad95-efb04f4ecc59` · conversation `28be24fa-4bad-4c7d-b856-57276931b736`  
**Output:** `logs/user-work-run-2026-05-26T10-59-39-505Z.json`

| Family   | Preload in trace                                                   |
| -------- | ------------------------------------------------------------------ |
| User     | ✅ `USER BRAIN — Retrieved Context` (Saltline, Eliza, scope-creep) |
| Company  | ✅ `COMPANY OPERATING CONTEXT` (cortex objects)                    |
| Customer | ❌ no `CUSTOMER BRAIN` section                                     |
| Agent    | ❌ empty (no Vibey agent brain row)                                |

### 2026-05-26 — preload limit 15 per family

**Config:** `BRAIN_LLM_RERANKER=1` · `BRAIN_MULTI_QUERY_RETRIEVAL=1` · `BRAIN_EVIDENCE_CHUNKS=1` · preload **15/family**
**Judge:** `user-work-v2`
**Cases:** 5 Foundry Creative (L1–L5)
**Result:** 2/5 pass · **40% pass rate** · avg score 3.57
**Latency:** avg agent 43.7s · avg judge 3.7s
**Tokens:** avg 20,365/case · avg brain context 87 tokens
**Tools:** avg 2.2 total · avg 2.0 brain
**Cost:** provider $0.074 · user $0.148 · 30 credits (partial pricing)
**Output:** `logs/user-work-run-2026-05-26T10-38-42-914Z.json`

| Case                | Result     | Tool calls        |
| ------------------- | ---------- | ----------------- |
| L1 Retainer cap     | Pass       |                   |
| L2 Devi homepage    | Pass       |                   |
| L3 Hero draft       | Fail (2.0) | 4 brain           |
| L4 Q2 paid decision | Fail (2.7) | 2 brain           |
| L5 Saltline day 73  | Fail (4.2) | 3 total / 2 brain |

### 2026-05-26 — 4-family preload retrieval alignment (limit 10)

**Config:** `BRAIN_LLM_RERANKER=1` · `BRAIN_LLM_RERANKER_MODEL=google/gemini-3.5-flash` · `BRAIN_MULTI_QUERY_RETRIEVAL=1` · `BRAIN_EVIDENCE_CHUNKS=1`
**Judge:** `user-work-v2` (outcome-only)
**Cases:** 5 Foundry Creative (L1–L5)
**Result:** 4/5 pass · **80% pass rate** · average weighted score ~4.0
**Output:** `logs/user-work-run-2026-05-26T10-29-34-323Z.json`

| Case                | Result     | Notes                               |
| ------------------- | ---------- | ----------------------------------- |
| L1 Retainer cap     | Pass       |                                     |
| L2 Devi homepage    | Pass       |                                     |
| L3 Hero draft       | Pass       |                                     |
| L4 Q2 paid decision | Fail (2.8) | Missing $4k cap, CAC kill threshold |
| L5 Saltline day 73  | Pass       |                                     |

**Failure pattern:** L4 still misses numeric guardrails from mission brief despite customer/company preload. May need agent-api restart to pick up preload changes fully.

### 2026-05-26 — 20-case brain-verified suite (2 batches × 10, Sonnet 4.6 default)

**Config:** preload limit 20 · customer preload ON · `BRAIN_USER_WORK_CONCURRENCY=4`
**Agent:** `openrouter/anthropic/claude-sonnet-4.6` (default)
**Judge:** `google/gemini-3.5-flash` · `user-work-v2`
**Dataset:** 20 cases (L1–L5 + u6–u20 brain-verified) · `baseline-v1`
**Result:** **15/20 pass · 75% · avg score 4.39**

| Batch             |       Pass | Avg score | Output                                             |
| ----------------- | ---------: | --------: | -------------------------------------------------- |
| 1 (L1–L5, u6–u10) | 6/10 · 60% |      4.27 | `logs/user-work-run-2026-05-26T11-36-37-387Z.json` |
| 2 (u11–u20)       | 9/10 · 90% |      4.52 | `logs/user-work-run-2026-05-26T11-39-13-495Z.json` |

**Rankings (score desc):**

| Rank | Case                     | Score | Pass |
| ---: | ------------------------ | ----: | :--: |
|    1 | L1 retainer cap          |   5.0 |  ✓   |
|    1 | L2 Devi homepage         |   5.0 |  ✓   |
|    1 | L3 hero draft            |   5.0 |  ✓   |
|    1 | L4 organic paid gate     |   5.0 |  ✓   |
|    1 | u7 three-call rule       |   5.0 |  ✓   |
|    1 | u12 launch window        |   5.0 |  ✓   |
|    1 | u13 Bloomberg headline   |   5.0 |  ✓   |
|    1 | u14 Adaeze homepage      |   5.0 |  ✓   |
|    1 | u15 Throughput Loom      |   5.0 |  ✓   |
|    1 | u19 engineer nod         |   5.0 |  ✓   |
|   11 | u20 month-three failure  |   4.5 |  ✗   |
|   12 | L5 Saltline day 73       |   4.2 |  ✗   |
|   13 | u6 Owen pricing          |   4.0 |  ✗   |
|   13 | u17 Cloverkin continuity |   4.0 |  ✓   |
|   13 | u18 Almanac course page  |   4.0 |  ✓   |
|   16 | u11 gift guide no paid   |   3.8 |  ✓   |
|   16 | u16 Cloverkin clinic ads |   3.8 |  ✓   |
|   18 | u9 organic before paid   |   3.7 |  ✓   |
|   19 | u8 async walkthrough     |   3.0 |  ✗   |
|   20 | u10 Friday cadence       |   2.8 |  ✗   |

**Failures:** L5 missing launch window · u6 missing P&L · u8 missing trust/walkthrough · u10 wrong Friday roles/times · u20 missing day 75 review.

---

## How to append the next run

After each eval finishes:

1. Copy the headline `passRate`, `averageScore`, case count, model, judge model, and output JSON path.
2. Note the number and names of failed cases.
3. Summarize the most common failure reasons from the judge.
4. Record any wrong Brain action routing separately from answer-quality failures.
5. Keep raw run JSON in this `logs/` folder or reference the output path if it was redirected.
