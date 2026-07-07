# Space Retrieval Eval Logs

Use `space-eval-history.md` as the running history for Space retrieval evals.

Every live run should also write a timestamped JSON file via `space-yc-demo-real-runner.ts` (`SPACE_EVAL_OUTPUT_DIR`, default this folder).

Raw terminal output can stay in the terminal, but every run that matters should be summarized in `space-eval-history.md` with config, scores, cost, latency, and output reference.
