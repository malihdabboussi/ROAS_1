# User-Work Brain Evals

This folder is for task-outcome Brain evals.

Use this eval type when the question is not "did Brain find one pinned memory?" but "did Brain return the set of context the user needed to complete work?"

The live runner uses the real Vibey agent path. It prompts Vibey through `ChatService.processMessage()`, captures the final answer, and grades it through a layered **user-work-v3** pipeline: mechanical pre-checks, binary expectations + soft rubric (LLM pass 1), and optional adversarial re-check (LLM pass 2).

Brain tool calls are still logged in run JSON for diagnostics, but they do not affect pass/fail.

Examples:

- answer a user query with enough grounded context
- write or rewrite something using Brain context
- make a decision from company, customer, or agent knowledge
- plan next steps from multiple Brain facts
- abstain when the Brain does not contain enough useful context

Keep fixtures in `fixtures/` and run history in `logs/`.

**Dataset:** live Foundry Creative Supabase account — see [`../datasets/foundry-yc-demo-baseline.md`](../datasets/foundry-yc-demo-baseline.md). Log `dataset_baseline` in every run.

## Files

- `fixtures/yc-demo-user-work-set.json`: 20 Foundry Creative user-work cases (L1–L5 validation set + 15 brain-verified ops cases), each with 4–6 binary `expectations`.
- `user-work-mechanical-checks.ts`: deterministic forbidden/required/abstention gates.
- `user-work-eval.types.ts`: case, transcript, judge, and suite result types.
- `user-work-eval-runner.ts`: mechanical → pass1 → adversarial pipeline orchestration.
- `user-work-judge.ts`: v3 skeptical rubric, expectations, claims, adversarial judge.
- `user-work-yc-demo-real-runner.ts`: live Vibey-agent runner.
- `user-work-harness.eval.ts`: CI-safe plumbing tests with fake agent/judge data.

## v3 pass rule

A case passes only when **all** are true:

1. Mechanical gate passes (no forbidden hits, required-context phrases present, abstention when expected)
2. Every binary expectation passes (LLM pass 1)
3. Adversarial re-check passes (LLM pass 2, when enabled)
4. No hard-fail flags
5. Weighted soft score >= 3.5

**Primary regression metric:** `validationPassRate` over L1–L5 cases (`validationSet: true`).

## Live Run

The live run requires real auth and provider env vars. See `logs/user-work-eval-history.md` for the command and environment list.

Optional env:

- `BRAIN_USER_WORK_VALIDATION_ONLY=1` — run only L1–L5 validation cases
- `BRAIN_USER_WORK_ADVERSARIAL=0` — skip adversarial pass 2 (default: on)
