# Above-threshold early-exit transcript

Type: brownfield

| Round | Goal `g` | Constraints `c` | Criteria `r` | Context `x` | Formula | Ambiguity `A` |
|---|---:|---:|---:|---:|---|---:|
| 1 | 0.55 | 0.45 | 0.50 | 0.45 | `1 - (0.35g + 0.25c + 0.25r + 0.15x)` | 0.50 |
| 2 | 0.70 | 0.65 | 0.70 | 0.70 | `1 - (0.35g + 0.25c + 0.25r + 0.15x)` | 0.31 |

Human: `Stop the interview.`

Final marker: `A = 0.31`

Expected status: `BELOW_THRESHOLD_EARLY_EXIT`

Expected gate: ask `Proceed to review anyway?` before review.
