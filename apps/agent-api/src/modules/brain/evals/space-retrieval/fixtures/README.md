# Space Retrieval Eval Fixtures

Tiny deterministic fixtures plus the Foundry YC demo Space golden set.

**Live Space inventory:** [`../../datasets/foundry-yc-demo-space-baseline.md`](../../datasets/foundry-yc-demo-space-baseline.md)

## Files

| File                                  | Level                 | Cases | Purpose                                                                      |
| ------------------------------------- | --------------------- | ----: | ---------------------------------------------------------------------------- |
| `space-retrieval-mvp-golden-set.json` | `tiny_golden_fixture` |     4 | CI mock adapter; category smoke (paraphrase, exact title, decoy, abstention) |
| `vibey-space-yc-demo-golden-set.json` | `yc_demo`             |    15 | Live eval against seeded Spaces (`company-wiki`, `helmsmark-workspace`)      |

## YC demo categories

- `factual_recall` — direct doc/mission evidence
- `paraphrase` — abstract wording
- `exact_title` — proper nouns / doc titles
- `multi_hop` — two mission sources in one Space
- `negative_decoy` — wrong Space asset must not win
- `abstention` — no matching Space evidence

Target: stable pass@10/pass@20/pass@50 by category after backfill, same bar as Brain needle-in-haystack.
